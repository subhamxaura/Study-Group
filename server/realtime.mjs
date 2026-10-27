import { PrismaClient } from '@prisma/client'
import { createClient } from 'redis'
import { createRealtimeServer } from './realtime-core.mjs'

if (!process.env.VERCEL && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile('.env')
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
}

const port = Number(process.env.REALTIME_PORT ?? 8787)
const host = process.env.REALTIME_HOST ?? '0.0.0.0'
const ticketSecret = process.env.REALTIME_TICKET_SECRET
const publishSecret = process.env.REALTIME_PUBLISH_SECRET
const redisUrl = process.env.REDIS_URL
const redisPrefix = process.env.REALTIME_REDIS_PREFIX ?? 'study-group:realtime:v1'
const trustProxy = process.env.REALTIME_TRUST_PROXY === 'true'
const configuredOrigins = (process.env.REALTIME_ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)
function positiveInteger(name, fallback) {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return fallback
  const value = Number(raw)
  if (!Number.isSafeInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`)
  return value
}

const rateLimits = {
  'upgrade-ip': { limit: positiveInteger('REALTIME_UPGRADE_LIMIT_PER_MINUTE', 300), windowMs: 60_000 },
  'auth-ip': { limit: positiveInteger('REALTIME_AUTH_LIMIT_PER_MINUTE', 60), windowMs: 60_000 },
  'publish-ip': { limit: positiveInteger('REALTIME_PUBLISH_LIMIT_PER_MINUTE', 6_000), windowMs: 60_000 },
  'publish-actor': { limit: positiveInteger('REALTIME_PUBLISH_ACTOR_LIMIT_PER_MINUTE', 120), windowMs: 60_000 },
  'typing-user': { limit: positiveInteger('REALTIME_TYPING_LIMIT_PER_SECOND', 6), windowMs: 1_000 },
}

if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error('REALTIME_PORT must be an integer between 1 and 65535')
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required by the realtime service')
if (!redisUrl) throw new Error('REDIS_URL is required by the realtime service')
if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
  throw new Error('REALTIME_ALLOWED_ORIGINS must be configured in production')
}

const allowedOrigins = configuredOrigins.length > 0
  ? configuredOrigins
  : ['http://localhost:3000', 'http://127.0.0.1:3000']
const prisma = new PrismaClient()
const redis = createClient({
  url: redisUrl,
  socket: {
    connectTimeout: 5_000,
    reconnectStrategy: (retries) => Math.min(250 * Math.max(1, retries), 3_000),
  },
})
let realtime
let shuttingDown = false

redis.on('error', () => {
  console.error('[realtime] Redis connection error')
})

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`[realtime] shutting down (${signal})`)
  try {
    await realtime?.close()
  } finally {
    try {
      if (redis.isOpen) await redis.close()
      else redis.destroy()
    } catch {
      redis.destroy()
    }
    await prisma.$disconnect()
  }
}

try {
  await prisma.$connect()
  await redis.connect()
  realtime = await createRealtimeServer({
    prisma,
    redis,
    redisPrefix,
    ticketSecret,
    publishSecret,
    allowedOrigins,
    trustProxy,
    rateLimits,
  })
  await new Promise((resolve, reject) => {
    const onError = (error) => reject(error)
    realtime.httpServer.once('error', onError)
    realtime.httpServer.listen(port, host, () => {
      realtime.httpServer.off('error', onError)
      resolve()
    })
  })
  console.log(`[realtime] listening on ${host}:${port}; origins=${allowedOrigins.length}; redis=ready`)
  process.once('SIGINT', () => void shutdown('SIGINT').finally(() => process.exit(0)))
  process.once('SIGTERM', () => void shutdown('SIGTERM').finally(() => process.exit(0)))
} catch {
  await realtime?.close().catch(() => {})
  try {
    if (redis.isOpen) await redis.close()
    else redis.destroy()
  } catch {
    redis.destroy()
  }
  await prisma.$disconnect().catch(() => {})
  console.error('[realtime] startup failed; check database, Redis, secrets, and origin configuration')
  process.exitCode = 1
}
