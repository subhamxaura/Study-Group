import { createHash } from 'node:crypto'

const RATE_LIMIT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then redis.call('PEXPIRE', KEYS[1], ARGV[1]) end
local ttl = redis.call('PTTL', KEYS[1])
local limit = tonumber(ARGV[2])
if count > limit then return {0, count, ttl} end
return {1, count, ttl}
`

const READ_LEASES_SCRIPT = `
local removed = redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
local members = redis.call('ZRANGE', KEYS[1], 0, -1)
if #members == 0 then redis.call('DEL', KEYS[1]) end
return {removed, members}
`

function digest(value) {
  return createHash('sha256').update(String(value)).digest('hex')
}

function checkedPrefix(value) {
  const prefix = String(value ?? 'study-group:realtime:v1').replace(/:+$/, '')
  if (!/^[a-zA-Z0-9:_-]{1,128}$/.test(prefix)) {
    throw new Error('Realtime Redis prefix must contain only letters, numbers, colon, underscore, or hyphen')
  }
  return prefix
}

function readLeaseReply(reply) {
  if (!Array.isArray(reply) || reply.length !== 2 || !Array.isArray(reply[1])) {
    throw new Error('Unexpected Redis lease response')
  }
  const users = new Set()
  for (const raw of reply[1]) {
    if (typeof raw !== 'string') continue
    try {
      const value = JSON.parse(raw)
      if (Array.isArray(value) && typeof value[1] === 'string' && value[1].length > 0) users.add(value[1])
    } catch {
      // Ignore malformed/stale members; they are removed by their lease score.
    }
  }
  return { removed: Number(reply[0]) || 0, users: [...users].sort() }
}

export function createRealtimeRedisStore({ redis, keyPrefix, now = Date.now }) {
  if (!redis) throw new Error('A connected Redis client is required by the realtime service')
  const prefix = checkedPrefix(keyPrefix)
  const eventsChannel = `${prefix}:events`
  const leaseKey = (kind, groupId) => `${prefix}:${kind}:${digest(groupId)}`

  async function writeLease(kind, groupId, member, expiresAt, leaseMs) {
    const key = leaseKey(kind, groupId)
    await redis.multi()
      .zAdd(key, { score: expiresAt, value: member })
      .pExpire(key, leaseMs * 2)
      .exec()
  }

  async function removeLease(kind, groupId, member) {
    return Number(await redis.zRem(leaseKey(kind, groupId), member)) > 0
  }

  async function readLeases(kind, groupId) {
    const reply = await redis.eval(READ_LEASES_SCRIPT, {
      keys: [leaseKey(kind, groupId)],
      arguments: [String(now())],
    })
    return readLeaseReply(reply)
  }

  return {
    eventsChannel,
    async claimTicket(jti, ttlMs) {
      if (!Number.isInteger(ttlMs) || ttlMs < 1 || ttlMs > 300_000) return false
      const reply = await redis.sendCommand([
        'SET', `${prefix}:ticket:${digest(jti)}`, '1', 'PX', String(ttlMs), 'NX',
      ])
      return reply === 'OK'
    },
    async consumeRateLimit(scope, subject, { limit, windowMs }) {
      if (!/^[a-zA-Z0-9_-]{1,48}$/.test(scope) || !Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowMs) || windowMs < 1) {
        throw new Error('Invalid realtime rate-limit configuration')
      }
      const key = `${prefix}:rate:${scope}:${digest(subject)}`
      const reply = await redis.eval(RATE_LIMIT_SCRIPT, {
        keys: [key],
        arguments: [String(windowMs), String(limit)],
      })
      if (!Array.isArray(reply) || reply.length !== 3) throw new Error('Unexpected Redis rate-limit response')
      const ttl = Number(reply[2])
      return {
        allowed: Number(reply[0]) === 1,
        count: Number(reply[1]),
        retryAfterMs: Math.max(1, Number.isFinite(ttl) && ttl >= 0 ? ttl : windowMs),
      }
    },
    async addPresence(groupId, connectionId, userId, expiresAt, leaseMs) {
      const member = JSON.stringify([connectionId, userId])
      await writeLease('presence', groupId, member, expiresAt, leaseMs)
      return member
    },
    removePresence(groupId, member) {
      return removeLease('presence', groupId, member)
    },
    async readPresence(groupId) {
      return readLeases('presence', groupId)
    },
    async addTyping(groupId, connectionId, userId, expiresAt, leaseMs) {
      const member = JSON.stringify([connectionId, userId])
      await writeLease('typing', groupId, member, expiresAt, leaseMs)
      return member
    },
    removeTyping(groupId, member) {
      return removeLease('typing', groupId, member)
    },
    async readTyping(groupId) {
      return readLeases('typing', groupId)
    },
    publish(event) {
      return redis.publish(eventsChannel, JSON.stringify(event))
    },
  }
}
