import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { isIP } from 'node:net'
import { createServer } from 'node:http'
import jwt from 'jsonwebtoken'
import WebSocket, { WebSocketServer } from 'ws'
import { createRealtimeRedisStore } from './realtime-redis.mjs'

const MAX_PUBLISH_BYTES = 8 * 1024
const MAX_CLIENT_FRAME_BYTES = 2 * 1024
const AUTH_TIMEOUT_MS = 5_000
const TYPING_TTL_MS = 4_000
const PRESENCE_LEASE_MS = 30_000
const PRESENCE_REFRESH_MS = 10_000
const STATE_RECONCILE_MS = 5_000
const MEMBERSHIP_RECHECK_MS = 10_000
const MAX_TICKET_TTL_MS = 300_000
const TICKET_ISSUER = 'study-group-realtime'
const TICKET_AUDIENCE = 'study-group-ws'
const DEFAULT_RATE_LIMITS = Object.freeze({
  'upgrade-ip': { limit: 300, windowMs: 60_000 },
  'auth-ip': { limit: 60, windowMs: 60_000 },
  'publish-ip': { limit: 6_000, windowMs: 60_000 },
  'publish-actor': { limit: 120, windowMs: 60_000 },
  'typing-user': { limit: 6, windowMs: 1_000 },
})

function writeJson(res, statusCode, body, extraHeaders = {}) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    ...extraHeaders,
  })
  res.end(JSON.stringify(body))
}

function writeUpgradeResponse(socket, statusCode, message, retryAfterMs = 0) {
  const headers = [
    `HTTP/1.1 ${statusCode} ${message}`,
    'Connection: close',
    'Cache-Control: no-store',
  ]
  if (retryAfterMs > 0) headers.push(`Retry-After: ${Math.max(1, Math.ceil(retryAfterMs / 1_000))}`)
  socket.end(`${headers.join('\r\n')}\r\n\r\n`)
}

async function readLimitedBody(req, limit) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) return null
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function normalizedOrigin(origin) {
  try {
    const url = new URL(origin)
    if (!['http:', 'https:'].includes(url.protocol)) return ''
    return url.origin === 'null' ? '' : url.origin
  } catch {
    return ''
  }
}

export function publicationSignature(secret, timestamp, body) {
  return createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')
}

function signatureIsValid(secret, timestamp, body, received, currentTime = Date.now()) {
  if (!/^\d{13}$/.test(timestamp) || !/^[a-f0-9]{64}$/i.test(received)) return false
  const age = currentTime - Number(timestamp)
  if (!Number.isFinite(age) || Math.abs(age) > 30_000) return false
  const expected = Buffer.from(publicationSignature(secret, timestamp, body), 'hex')
  const actual = Buffer.from(received, 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function clientAddress(req, trustProxy) {
  if (trustProxy) {
    const forwarded = req.headers['x-forwarded-for']
    if (typeof forwarded === 'string') {
      const first = forwarded.split(',')[0]?.trim()
      if (first && isIP(first)) return first.toLowerCase()
    }
  }
  const remote = req.socket.remoteAddress
  return typeof remote === 'string' && isIP(remote) ? remote.toLowerCase() : 'unknown'
}

function sameUsers(left, right) {
  return Boolean(left) && left.length === right.length && left.every((userId, index) => userId === right[index])
}

function rateLimitConfig(values) {
  const limits = { ...DEFAULT_RATE_LIMITS, ...values }
  for (const [scope, config] of Object.entries(limits)) {
    if (!/^[a-zA-Z0-9_-]{1,48}$/.test(scope) || !Number.isInteger(config?.limit) || config.limit < 1 || !Number.isInteger(config?.windowMs) || config.windowMs < 1) {
      throw new Error(`Invalid realtime rate-limit configuration for ${scope}`)
    }
  }
  return limits
}

export async function createRealtimeServer({
  prisma,
  redis,
  redisPrefix = 'study-group:realtime:v1',
  ticketSecret,
  publishSecret,
  allowedOrigins = [],
  trustProxy = false,
  rateLimits,
  instanceId = randomUUID(),
  now = Date.now,
  membershipRecheckMs = MEMBERSHIP_RECHECK_MS,
  maintenanceIntervalMs = 1_000,
  presenceLeaseMs = PRESENCE_LEASE_MS,
  presenceRefreshMs = PRESENCE_REFRESH_MS,
  stateReconcileMs = STATE_RECONCILE_MS,
}) {
  if (!prisma) throw new Error('A Prisma client is required')
  if (!redis?.isReady) throw new Error('A ready Redis client is required by the realtime service')
  if (!ticketSecret || Buffer.byteLength(ticketSecret) < 32) throw new Error('Realtime ticket secret must contain at least 32 bytes')
  if (!publishSecret || Buffer.byteLength(publishSecret) < 32) throw new Error('Realtime publish secret must contain at least 32 bytes')
  if (!Number.isInteger(membershipRecheckMs) || membershipRecheckMs < 50) throw new Error('Membership recheck interval must be at least 50ms')
  if (!Number.isInteger(maintenanceIntervalMs) || maintenanceIntervalMs < 25) throw new Error('Maintenance interval must be at least 25ms')
  if (!Number.isInteger(presenceLeaseMs) || presenceLeaseMs < 1_000) throw new Error('Presence lease must be at least 1000ms')
  if (!Number.isInteger(presenceRefreshMs) || presenceRefreshMs < 100 || presenceRefreshMs >= presenceLeaseMs) throw new Error('Presence refresh must be less than its lease')
  if (!Number.isInteger(stateReconcileMs) || stateReconcileMs < 250) throw new Error('State reconciliation interval must be at least 250ms')

  const limits = rateLimitConfig(rateLimits)
  const origins = new Set(allowedOrigins.map(normalizedOrigin).filter(Boolean))
  const store = createRealtimeRedisStore({ redis, keyPrefix: redisPrefix, now })
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_CLIENT_FRAME_BYTES, perMessageDeflate: false })
  const httpServer = createServer(async (req, res) => {
    let pathname = ''
    try {
      pathname = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`).pathname
    } catch {
      return writeJson(res, 400, { error: 'Bad request' })
    }

    if (req.method === 'GET' && pathname === '/livez') return writeJson(res, 200, { ok: true })
    if (req.method === 'GET' && pathname === '/healthz') {
      const ready = redis.isReady && subscriber.isReady
      return writeJson(res, ready ? 200 : 503, { ok: ready, redis: ready ? 'ready' : 'unavailable' })
    }
    if (req.method !== 'POST' || pathname !== '/publish') return writeJson(res, 404, { error: 'Not found' })

    const body = await readLimitedBody(req, MAX_PUBLISH_BYTES)
    if (!body) return writeJson(res, 413, { error: 'Payload too large' })
    const timestamp = String(req.headers['x-realtime-timestamp'] ?? '')
    const signature = String(req.headers['x-realtime-signature'] ?? '')
    if (!signatureIsValid(publishSecret, timestamp, body, signature, now())) {
      return writeJson(res, 401, { error: 'Unauthorized' })
    }

    let event
    try {
      event = JSON.parse(body.toString('utf8'))
    } catch {
      return writeJson(res, 400, { error: 'Invalid JSON' })
    }
    if (event?.type !== 'messages.changed' || typeof event.groupId !== 'string' || !event.groupId || event.groupId.length > 128 || typeof event.actorId !== 'string' || !event.actorId || event.actorId.length > 128) {
      return writeJson(res, 422, { error: 'Invalid event' })
    }

    try {
      const address = clientAddress(req, trustProxy)
      const ipLimit = await store.consumeRateLimit('publish-ip', address, limits['publish-ip'])
      if (!ipLimit.allowed) {
        const seconds = Math.max(1, Math.ceil(ipLimit.retryAfterMs / 1_000))
        return writeJson(res, 429, { error: 'Too many requests', retryAfter: seconds }, { 'Retry-After': String(seconds) })
      }
      const actorLimit = await store.consumeRateLimit('publish-actor', event.actorId, limits['publish-actor'])
      if (!actorLimit.allowed) {
        const seconds = Math.max(1, Math.ceil(actorLimit.retryAfterMs / 1_000))
        return writeJson(res, 429, { error: 'Too many requests', retryAfter: seconds }, { 'Retry-After': String(seconds) })
      }
      await store.publish({ ...event, instanceId })
      broadcast(event.groupId, {
        type: 'messages.changed',
        groupId: event.groupId,
        actorId: event.actorId,
        publishedAt: typeof event.publishedAt === 'string' ? event.publishedAt : new Date(now()).toISOString(),
      })
      return writeJson(res, 202, { accepted: true })
    } catch {
      closeForRedisFailure()
      return writeJson(res, 503, { error: 'Realtime coordination unavailable' })
    }
  })

  const byGroup = new Map()
  const clients = new Map()
  const socketMetadata = new WeakMap()
  const membershipCache = new Map()
  const membershipChecks = new Map()
  const presenceSnapshots = new Map()
  const typingSnapshots = new Map()
  let maintenanceBusy = false
  let lastStateReconcile = 0
  let subscriber
  let maintenance
  let heartbeat

  const membershipKey = (groupId, userId) => `${groupId}\u0000${userId}`

  function closeForRedisFailure() {
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN) ws.close(1013, 'Realtime coordination unavailable')
    }
  }

  async function hasMembership(groupId, userId) {
    const key = membershipKey(groupId, userId)
    const cached = membershipCache.get(key)
    if (cached && cached.expiresAt > now()) return cached.allowed
    const inflight = membershipChecks.get(key)
    if (inflight) return inflight

    const check = prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
      select: { id: true },
    }).then((row) => {
      const allowed = Boolean(row)
      membershipCache.set(key, { allowed, expiresAt: now() + membershipRecheckMs })
      return allowed
    }).finally(() => membershipChecks.delete(key))
    membershipChecks.set(key, check)
    return check
  }

  function groupClients(groupId) {
    let set = byGroup.get(groupId)
    if (!set) {
      set = new Set()
      byGroup.set(groupId, set)
    }
    return set
  }

  function send(ws, data) {
    if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data))
  }

  function broadcast(groupId, data, exceptWs = null) {
    for (const ws of byGroup.get(groupId) ?? []) {
      if (ws !== exceptWs) send(ws, data)
    }
  }

  async function syncPresence(groupId, exceptWs = null, announceExpired = false) {
    const result = await store.readPresence(groupId)
    const localClients = byGroup.get(groupId)
    if (localClients?.size) {
      const previous = presenceSnapshots.get(groupId)
      if (!sameUsers(previous, result.users)) {
        presenceSnapshots.set(groupId, result.users)
        broadcast(groupId, { type: 'presence', users: result.users }, exceptWs)
      }
    } else {
      presenceSnapshots.delete(groupId)
    }
    if (announceExpired && result.removed > 0) await store.publish({ type: 'presence.changed', groupId, instanceId })
    return result.users
  }

  async function syncTyping(groupId, exceptWs = null, announceExpired = false) {
    const result = await store.readTyping(groupId)
    const localClients = byGroup.get(groupId)
    if (localClients?.size) {
      const previous = typingSnapshots.get(groupId)
      if (!sameUsers(previous, result.users)) {
        typingSnapshots.set(groupId, result.users)
        broadcast(groupId, { type: 'typing', users: result.users }, exceptWs)
      }
    } else {
      typingSnapshots.delete(groupId)
    }
    if (announceExpired && result.removed > 0) await store.publish({ type: 'typing.changed', groupId, instanceId })
    return result.users
  }

  async function publishClusterEvent(event) {
    await store.publish({ ...event, instanceId })
  }

  async function announcePresence(groupId, exceptWs = null) {
    const users = await syncPresence(groupId, exceptWs)
    if (exceptWs) send(exceptWs, { type: 'presence', users })
    await publishClusterEvent({ type: 'presence.changed', groupId })
  }

  async function announceTyping(groupId, exceptWs = null) {
    const users = await syncTyping(groupId, exceptWs)
    if (exceptWs) send(exceptWs, { type: 'typing', users })
    await publishClusterEvent({ type: 'typing.changed', groupId })
  }

  async function handleClusterMessage(raw) {
    if (typeof raw !== 'string' || raw.length > MAX_PUBLISH_BYTES) return
    let event
    try { event = JSON.parse(raw) } catch { return }
    if (!event || event.instanceId === instanceId || typeof event.groupId !== 'string' || !event.groupId || event.groupId.length > 128) return
    try {
      if (event.type === 'presence.changed') {
        await syncPresence(event.groupId)
      } else if (event.type === 'typing.changed') {
        await syncTyping(event.groupId)
      } else if (event.type === 'messages.changed' && typeof event.actorId === 'string' && event.actorId.length > 0 && event.actorId.length <= 128) {
        broadcast(event.groupId, {
          type: 'messages.changed',
          groupId: event.groupId,
          actorId: event.actorId,
          publishedAt: typeof event.publishedAt === 'string' ? event.publishedAt : new Date(now()).toISOString(),
        })
      }
    } catch {
      closeForRedisFailure()
    }
  }

  async function detach(ws) {
    const client = clients.get(ws)
    if (!client) return
    clients.delete(ws)
    const groupSet = byGroup.get(client.groupId)
    groupSet?.delete(ws)
    const groupNowEmpty = groupSet?.size === 0
    if (groupNowEmpty) byGroup.delete(client.groupId)

    try {
      await store.removePresence(client.groupId, client.presenceMember)
      if (client.typingMember) await store.removeTyping(client.groupId, client.typingMember)
      await syncPresence(client.groupId)
      await publishClusterEvent({ type: 'presence.changed', groupId: client.groupId })
      if (client.typingMember) {
        await syncTyping(client.groupId)
        await publishClusterEvent({ type: 'typing.changed', groupId: client.groupId })
      }
    } catch {
      closeForRedisFailure()
    } finally {
      if (groupNowEmpty) {
        presenceSnapshots.delete(client.groupId)
        typingSnapshots.delete(client.groupId)
      }
    }
  }

  async function authenticate(ws, token) {
    const metadata = socketMetadata.get(ws) ?? { address: 'unknown' }
    const authLimit = await store.consumeRateLimit('auth-ip', metadata.address, limits['auth-ip'])
    if (!authLimit.allowed) {
      send(ws, { type: 'rate_limited', retryAfterMs: authLimit.retryAfterMs })
      ws.close(4429, 'Authentication rate limited')
      return false
    }

    let payload
    try {
      payload = jwt.verify(token, ticketSecret, {
        algorithms: ['HS256'],
        issuer: TICKET_ISSUER,
        audience: TICKET_AUDIENCE,
      })
    } catch {
      return false
    }
    if (!payload || typeof payload !== 'object') return false
    const { sub: userId, groupId, purpose, jti, exp } = payload
    if (typeof userId !== 'string' || !userId || typeof groupId !== 'string' || !groupId || groupId.length > 128 || purpose !== 'group' || typeof jti !== 'string' || !jti || !Number.isInteger(exp)) return false
    const ticketTtlMs = exp * 1_000 - now()
    if (ticketTtlMs < 1 || ticketTtlMs > MAX_TICKET_TTL_MS) return false
    if (!await store.claimTicket(jti, ticketTtlMs)) return false
    if (!await hasMembership(groupId, userId)) return false
    if (ws.readyState !== WebSocket.OPEN) return false

    const connectionId = randomUUID()
    const presenceMember = await store.addPresence(groupId, connectionId, userId, now() + presenceLeaseMs, presenceLeaseMs)
    const client = {
      userId,
      groupId,
      connectionId,
      presenceMember,
      typingMember: null,
      typingUntil: 0,
      lastTypingAt: 0,
      lastPresenceRefresh: now(),
      lastMembershipCheck: now(),
    }
    clients.set(ws, client)
    groupClients(groupId).add(ws)
    ws.isAlive = true
    send(ws, { type: 'ready', groupId, userId })
    await announcePresence(groupId, ws)
    const typing = await syncTyping(groupId, ws)
    send(ws, { type: 'typing', users: typing })
    return true
  }

  async function handleAuthenticatedFrame(ws, message) {
    const client = clients.get(ws)
    if (!client) return
    if (message?.type === 'ping') {
      send(ws, { type: 'pong', at: now() })
      return
    }
    if (message?.type !== 'typing' || typeof message.active !== 'boolean') return

    const currentTime = now()
    if (message.active) {
      if (currentTime - client.lastTypingAt < 250) return
      const limit = await store.consumeRateLimit(
        'typing-user',
        JSON.stringify([client.groupId, client.userId]),
        limits['typing-user'],
      )
      if (!limit.allowed) return
      client.lastTypingAt = currentTime
      client.typingUntil = currentTime + TYPING_TTL_MS
      client.typingMember = await store.addTyping(client.groupId, client.connectionId, client.userId, client.typingUntil, TYPING_TTL_MS)
      await announceTyping(client.groupId)
      return
    }

    if (!client.typingMember) return
    const typingMember = client.typingMember
    client.typingMember = null
    client.typingUntil = 0
    await store.removeTyping(client.groupId, typingMember)
    await announceTyping(client.groupId)
  }

  function handleWebSocketMessage(ws, raw, isBinary) {
    if (isBinary) {
      ws.close(1003, 'Text frames only')
      return
    }
    let message
    try { message = JSON.parse(raw.toString()) } catch {
      ws.close(1008, 'Invalid message')
      return
    }

    const client = clients.get(ws)
    if (!client) {
      if (ws.isAuthenticating || message?.type !== 'auth' || typeof message.ticket !== 'string' || message.ticket.length > 4096) {
        ws.close(4401, 'Invalid authentication')
        return
      }
      ws.isAuthenticating = true
      void authenticate(ws, message.ticket).then((authenticated) => {
        clearTimeout(ws.authTimer)
        if (!authenticated && ws.readyState === WebSocket.OPEN) ws.close(4403, 'Not authorized')
      }).catch(() => {
        clearTimeout(ws.authTimer)
        closeForRedisFailure()
        if (ws.readyState === WebSocket.OPEN) ws.close(1013, 'Realtime coordination unavailable')
      })
      return
    }

    void handleAuthenticatedFrame(ws, message).catch(() => {
      closeForRedisFailure()
      if (ws.readyState === WebSocket.OPEN) ws.close(1013, 'Realtime coordination unavailable')
    })
  }

  wss.on('connection', (ws, req) => {
    ws.authTimer = setTimeout(() => ws.close(4401, 'Authentication required'), AUTH_TIMEOUT_MS)
    ws.authTimer.unref?.()
    ws.on('error', () => {})
    ws.on('message', (raw, isBinary) => handleWebSocketMessage(ws, raw, isBinary))
    ws.on('pong', () => {
      ws.isAlive = true
      const client = clients.get(ws)
      if (client) client.lastPresenceRefresh = 0
    })
    ws.on('close', () => {
      clearTimeout(ws.authTimer)
      void detach(ws)
    })
    if (req) socketMetadata.set(ws, { address: clientAddress(req, trustProxy) })
  })

  httpServer.on('upgrade', (req, socket, head) => {
    let url
    try {
      url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    } catch {
      return writeUpgradeResponse(socket, 400, 'Bad Request')
    }
    const origin = normalizedOrigin(String(req.headers.origin ?? ''))
    if (url.pathname !== '/ws' || !origin || !origins.has(origin)) {
      return writeUpgradeResponse(socket, 403, 'Forbidden')
    }

    if (!redis.isReady || !subscriber?.isReady) {
      closeForRedisFailure()
      return writeUpgradeResponse(socket, 503, 'Service Unavailable')
    }

    const address = clientAddress(req, trustProxy)
    void store.consumeRateLimit('upgrade-ip', address, limits['upgrade-ip']).then((result) => {
      if (!result.allowed) return writeUpgradeResponse(socket, 429, 'Too Many Requests', result.retryAfterMs)
      if (socket.destroyed) return
      wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req))
    }).catch(() => {
      closeForRedisFailure()
      writeUpgradeResponse(socket, 503, 'Service Unavailable')
    })
  })

  async function reconcileGroup(groupId) {
    const [presence, typing] = await Promise.all([
      syncPresence(groupId, null, true),
      syncTyping(groupId, null, true),
    ])
    return { presence, typing }
  }

  maintenance = setInterval(async () => {
    if (maintenanceBusy) return
    maintenanceBusy = true
    try {
      if (!redis.isReady || !subscriber?.isReady) {
        closeForRedisFailure()
        return
      }

      const currentTime = now()
      const renewals = []
      const stalePairs = new Map()
      const changedTypingGroups = new Set()
      for (const [ws, client] of clients) {
        if (client.typingMember && client.typingUntil <= currentTime) {
          const typingMember = client.typingMember
          client.typingMember = null
          client.typingUntil = 0
          changedTypingGroups.add(client.groupId)
          renewals.push(store.removeTyping(client.groupId, typingMember))
        }
        if (currentTime - client.lastPresenceRefresh >= presenceRefreshMs) {
          client.lastPresenceRefresh = currentTime
          renewals.push(store.addPresence(client.groupId, client.connectionId, client.userId, currentTime + presenceLeaseMs, presenceLeaseMs))
        }
        if (currentTime - client.lastMembershipCheck >= membershipRecheckMs) {
          const key = membershipKey(client.groupId, client.userId)
          if (!stalePairs.has(key)) stalePairs.set(key, { groupId: client.groupId, userId: client.userId, sockets: [] })
          stalePairs.get(key).sockets.push(ws)
        }
      }
      await Promise.all(renewals)
      for (const groupId of changedTypingGroups) await announceTyping(groupId)

      await Promise.all([...stalePairs.values()].map(async (pair) => {
        try {
          const allowed = await hasMembership(pair.groupId, pair.userId)
          for (const ws of pair.sockets) {
            const client = clients.get(ws)
            if (!client) continue
            client.lastMembershipCheck = currentTime
            if (!allowed) ws.close(4403, 'Group membership revoked')
          }
        } catch {
          for (const ws of pair.sockets) ws.close(1011, 'Authorization check unavailable')
        }
      }))

      if (currentTime - lastStateReconcile >= stateReconcileMs) {
        lastStateReconcile = currentTime
        await Promise.all([...byGroup.keys()].map((groupId) => reconcileGroup(groupId)))
      }
    } catch {
      closeForRedisFailure()
    } finally {
      maintenanceBusy = false
    }
  }, maintenanceIntervalMs)
  maintenance.unref?.()

  heartbeat = setInterval(() => {
    for (const ws of wss.clients) {
      if (ws.isAlive === false) {
        ws.terminate()
        continue
      }
      ws.isAlive = false
      if (ws.readyState === WebSocket.OPEN) ws.ping()
    }
  }, 30_000)
  heartbeat.unref?.()

  subscriber = redis.duplicate()
  subscriber.on('error', () => {})
  try {
    await subscriber.connect()
    await subscriber.subscribe(store.eventsChannel, (raw) => { void handleClusterMessage(raw) })
  } catch (error) {
    clearInterval(maintenance)
    clearInterval(heartbeat)
    await subscriber.close().catch(() => {})
    throw error
  }

  async function close() {
    clearInterval(maintenance)
    clearInterval(heartbeat)
    const active = [...clients.keys()]
    for (const ws of active) ws.terminate()
    await Promise.all(active.map((ws) => detach(ws)))
    await new Promise((resolve) => wss.close(() => resolve()))
    if (httpServer.listening) await new Promise((resolve) => httpServer.close(() => resolve()))
    await subscriber.close().catch(() => {})
  }

  return { httpServer, webSocketServer: wss, close, instanceId }
}
