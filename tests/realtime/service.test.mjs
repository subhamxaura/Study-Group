import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { createClient } from 'redis'
import WebSocket from 'ws'
import { createRealtimeServer, publicationSignature } from '../../server/realtime-core.mjs'

const ticketSecret = 'test-ticket-secret-that-is-at-least-32-bytes-long'
const publishSecret = 'test-publish-secret-that-is-also-at-least-32-bytes-long'
const issuer = 'study-group-realtime'
const audience = 'study-group-ws'
const origin = 'http://localhost:3000'
const groupId = 'group-alpha'
const userId = 'user-alpha'
const redisUrl = process.env.REALTIME_TEST_REDIS_URL
if (!redisUrl) throw new Error('Set REALTIME_TEST_REDIS_URL to a disposable Redis instance; do not point tests at production Redis')

let isMember = true
let redis
let app
let app2
let baseUrl
let websocketUrl
let baseUrl2
let websocketUrl2
const redisPrefix = `study-group:realtime:test:${randomUUID()}`
const rateLimits = {
  'upgrade-ip': { limit: 1, windowMs: 60_000 },
  'auth-ip': { limit: 500, windowMs: 60_000 },
  'publish-ip': { limit: 500, windowMs: 60_000 },
  'publish-actor': { limit: 1, windowMs: 60_000 },
  'typing-user': { limit: 6, windowMs: 1_000 },
}
let clientIpCounter = 1

function nextTestIp() {
  const value = clientIpCounter++
  return `198.51.100.${((value - 1) % 250) + 1}`
}

function signTicket({ group = groupId, user = userId, jti = `ticket-${randomUUID()}`, expiresIn = 120 } = {}) {
  return jwt.sign(
    { groupId: group, purpose: 'group' },
    ticketSecret,
    { algorithm: 'HS256', subject: user, issuer, audience, expiresIn, jwtid: jti },
  )
}

function openSocket(url = websocketUrl, socketOrigin = origin, clientIp = nextTestIp()) {
  const ws = new WebSocket(url, { headers: { origin: socketOrigin, 'x-forwarded-for': clientIp } })
  ws.on('error', () => {})
  return new Promise((resolve, reject) => {
    ws.once('open', () => resolve(ws))
    ws.once('unexpected-response', (_request, response) => {
      response.resume()
      reject(new Error(`Handshake rejected: HTTP ${response.statusCode}`))
    })
    ws.once('error', reject)
  })
}

function frameQueue(ws) {
  const pending = []
  const waiters = []
  ws.on('message', (raw) => {
    let frame
    try { frame = JSON.parse(raw.toString()) } catch { return }
    const index = waiters.findIndex((waiter) => waiter.predicate(frame))
    if (index >= 0) {
      const [waiter] = waiters.splice(index, 1)
      clearTimeout(waiter.timer)
      waiter.resolve(frame)
    } else {
      pending.push(frame)
    }
  })
  return {
    next(type, timeoutMs = 2_000) {
      const index = pending.findIndex((frame) => frame.type === type)
      if (index >= 0) return Promise.resolve(pending.splice(index, 1)[0])
      return new Promise((resolve, reject) => {
        const waiter = {
          predicate: (frame) => frame.type === type,
          resolve,
          timer: setTimeout(() => {
            const i = waiters.indexOf(waiter)
            if (i >= 0) waiters.splice(i, 1)
            reject(new Error(`Timed out waiting for ${type}`))
          }, timeoutMs),
        }
        waiters.push(waiter)
      })
    },
  }
}

async function authenticatedSocket(token = signTicket(), url = websocketUrl) {
  const ws = await openSocket(url)
  const queue = frameQueue(ws)
  ws.send(JSON.stringify({ type: 'auth', ticket: token }))
  return { ws, queue }
}

function waitForClose(ws, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for WebSocket close')), timeoutMs)
    ws.once('close', (code, reason) => {
      clearTimeout(timer)
      resolve({ code, reason: reason.toString() })
    })
  })
}

async function listen(service) {
  await new Promise((resolve, reject) => {
    service.httpServer.once('error', reject)
    service.httpServer.listen(0, '127.0.0.1', resolve)
  })
  const address = service.httpServer.address()
  assert.ok(address && typeof address === 'object')
  return {
    http: `http://127.0.0.1:${address.port}`,
    websocket: `ws://127.0.0.1:${address.port}/ws`,
  }
}

async function signedPublish(base, event) {
  const body = JSON.stringify(event)
  const timestamp = Date.now().toString()
  const signature = publicationSignature(publishSecret, timestamp, body)
  return fetch(`${base}/publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-realtime-timestamp': timestamp, 'x-realtime-signature': signature },
    body,
  })
}

async function removeTestKeys() {
  let cursor = '0'
  do {
    const response = await redis.sendCommand(['SCAN', cursor, 'MATCH', `${redisPrefix}:*`, 'COUNT', '100'])
    if (!Array.isArray(response) || response.length !== 2) throw new Error('Unexpected Redis SCAN response')
    cursor = String(response[0])
    const keys = response[1]
    if (Array.isArray(keys) && keys.length) await redis.sendCommand(['UNLINK', ...keys])
  } while (cursor !== '0')
}

before(async () => {
  redis = createClient({ url: redisUrl, socket: { connectTimeout: 2_000 } })
  redis.on('error', () => {})
  await redis.connect()
  const dependencies = {
    groupMember: {
      findUnique: async () => (isMember ? { id: 'membership-row' } : null),
    },
  }
  app = await createRealtimeServer({
    prisma: dependencies,
    redis,
    redisPrefix,
    instanceId: 'test-instance-a',
    ticketSecret,
    publishSecret,
    allowedOrigins: [origin],
    trustProxy: true,
    rateLimits,
    membershipRecheckMs: 150,
    maintenanceIntervalMs: 30,
    presenceLeaseMs: 2_000,
    presenceRefreshMs: 500,
    stateReconcileMs: 250,
  })
  app2 = await createRealtimeServer({
    prisma: dependencies,
    redis,
    redisPrefix,
    instanceId: 'test-instance-b',
    ticketSecret,
    publishSecret,
    allowedOrigins: [origin],
    trustProxy: true,
    rateLimits,
    membershipRecheckMs: 150,
    maintenanceIntervalMs: 30,
    presenceLeaseMs: 2_000,
    presenceRefreshMs: 500,
    stateReconcileMs: 250,
  })
  const first = await listen(app)
  const second = await listen(app2)
  baseUrl = first.http
  websocketUrl = first.websocket
  baseUrl2 = second.http
  websocketUrl2 = second.websocket
})

after(async () => {
  await app?.close()
  await app2?.close()
  if (redis?.isReady) await removeTestKeys()
  if (redis?.isOpen) await redis.close()
})

test('health is reachable and WebSocket upgrades reject untrusted origins', async () => {
  const health = await fetch(`${baseUrl}/healthz`)
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { ok: true, redis: 'ready' })
  const liveness = await fetch(`${baseUrl}/livez`)
  assert.equal(liveness.status, 200)
  await assert.rejects(openSocket(websocketUrl, 'https://attacker.example'), /HTTP 403/)
})

test('upgrade IP rate limits are shared across service instances', async () => {
  const clientIp = '203.0.113.240'
  const first = await openSocket(websocketUrl, origin, clientIp)
  first.terminate()
  await assert.rejects(openSocket(websocketUrl2, origin, clientIp), /HTTP 429/)
})

test('valid tickets provide room-scoped presence, typing, and signed change events', async (t) => {
  isMember = true
  const a = await authenticatedSocket()
  const b = await authenticatedSocket(signTicket({ group: 'group-beta', user: 'user-beta' }))
  t.after(() => { a.ws.terminate(); b.ws.terminate() })

  const ready = await a.queue.next('ready')
  assert.equal(ready.groupId, groupId)
  assert.equal(ready.userId, userId)
  assert.deepEqual((await a.queue.next('presence')).users, [userId])
  assert.deepEqual((await a.queue.next('typing')).users, [])
  assert.equal((await b.queue.next('ready')).groupId, 'group-beta')

  a.ws.send(JSON.stringify({ type: 'typing', active: true }))
  assert.deepEqual((await a.queue.next('typing')).users, [userId])

  const event = { type: 'messages.changed', groupId, actorId: userId, publishedAt: new Date().toISOString() }
  const response = await signedPublish(baseUrl, event)
  assert.equal(response.status, 202)
  assert.deepEqual(await response.json(), { accepted: true })
  const change = await a.queue.next('messages.changed')
  assert.equal(change.groupId, groupId)
  assert.equal(change.actorId, userId)
  assert.equal(Object.hasOwn(change, 'content'), false)
  await assert.rejects(b.queue.next('messages.changed', 120), /Timed out/)
})

test('two service instances share presence, typing, and committed message invalidations', async (t) => {
  isMember = true
  const a = await authenticatedSocket(signTicket({ jti: 'presence-instance-a', user: 'user-alpha' }), websocketUrl)
  t.after(() => a.ws.terminate())
  await a.queue.next('ready')
  assert.deepEqual((await a.queue.next('presence')).users, ['user-alpha'])
  assert.deepEqual((await a.queue.next('typing')).users, [])

  const b = await authenticatedSocket(signTicket({ jti: 'presence-instance-b', user: 'user-beta' }), websocketUrl2)
  t.after(() => b.ws.terminate())
  await b.queue.next('ready')
  const bothUsers = ['user-alpha', 'user-beta']
  assert.deepEqual((await a.queue.next('presence')).users, bothUsers)
  assert.deepEqual((await b.queue.next('presence')).users, bothUsers)
  assert.deepEqual((await b.queue.next('typing')).users, [])

  a.ws.send(JSON.stringify({ type: 'typing', active: true }))
  assert.deepEqual((await a.queue.next('typing')).users, ['user-alpha'])
  assert.deepEqual((await b.queue.next('typing')).users, ['user-alpha'])

  const response = await signedPublish(baseUrl2, {
    type: 'messages.changed', groupId, actorId: 'cross-instance-publisher', publishedAt: new Date().toISOString(),
  })
  assert.equal(response.status, 202)
  assert.equal((await a.queue.next('messages.changed')).actorId, 'cross-instance-publisher')
  assert.equal((await b.queue.next('messages.changed')).actorId, 'cross-instance-publisher')
})

test('publish endpoint rejects unsigned events', async () => {
  const response = await fetch(`${baseUrl}/publish`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ type: 'messages.changed', groupId, actorId: userId }),
  })
  assert.equal(response.status, 401)
})

test('publish actor rate limits are atomic and shared across service instances', async () => {
  const event = { type: 'messages.changed', groupId, actorId: 'rate-limited-actor', publishedAt: new Date().toISOString() }
  const first = await signedPublish(baseUrl, event)
  const second = await signedPublish(baseUrl2, event)
  assert.equal(first.status, 202)
  assert.equal(second.status, 429)
  assert.ok(Number(second.headers.get('retry-after')) >= 1)
  assert.deepEqual(await second.json(), { error: 'Too many requests', retryAfter: 60 })
})

test('a signed group ticket can only be used once across service instances', async (t) => {
  isMember = true
  const token = signTicket({ jti: 'single-use-ticket' })
  const first = await authenticatedSocket(token, websocketUrl)
  t.after(() => first.ws.terminate())
  assert.equal((await first.queue.next('ready')).userId, userId)

  const replay = await authenticatedSocket(token, websocketUrl2)
  t.after(() => replay.ws.terminate())
  const closed = await waitForClose(replay.ws)
  assert.equal(closed.code, 4403)
})

test('an authenticated connection survives the expiry of its one-time ticket', async (t) => {
  isMember = true
  const client = await authenticatedSocket(signTicket({ jti: 'expiring-ticket', expiresIn: 1 }))
  t.after(() => client.ws.terminate())
  await client.queue.next('ready')
  await new Promise((resolve) => setTimeout(resolve, 1_100))
  assert.equal(client.ws.readyState, WebSocket.OPEN)
})

test('an active connection is closed when group membership is revoked', async (t) => {
  isMember = true
  const client = await authenticatedSocket(signTicket({ jti: 'revocation-ticket' }))
  t.after(() => client.ws.terminate())
  await client.queue.next('ready')
  isMember = false
  const closed = await waitForClose(client.ws, 2_000)
  assert.equal(closed.code, 4403)
  isMember = true
})
