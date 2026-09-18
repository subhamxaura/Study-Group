import 'server-only'

/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Deliberately NOT a distributed limiter: on Vercel serverless each instance
 * has its own window, which still blunts credential stuffing on /api/auth/login
 * without external infrastructure. Swap in Upstash Redis later if needed.
 */

type Window = { hits: number[] }

const windows = new Map<string, Window>()
let lastSweep = 0

function sweep(now: number) {
  // Occasional GC so the map cannot grow without bound.
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, w] of windows) {
    if (!w.hits.length || now - w.hits[w.hits.length - 1] > 15 * 60_000) windows.delete(k)
    else w.hits = w.hits.filter((t) => now - t <= 15 * 60_000)
  }
}

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; retryAfter: number } {
  const now = Date.now()
  sweep(now)
  const w = windows.get(key) ?? { hits: [] }
  w.hits = w.hits.filter((t) => now - t < windowMs)
  if (w.hits.length >= max) {
    const retryAfter = Math.ceil((windowMs - (now - w.hits[0])) / 1000)
    windows.set(key, w)
    return { ok: false, retryAfter }
  }
  w.hits.push(now)
  windows.set(key, w)
  return { ok: true, retryAfter: 0 }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return fwd?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local'
}
