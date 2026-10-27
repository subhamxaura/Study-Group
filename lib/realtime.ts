import 'server-only'
import { createHmac } from 'node:crypto'

type GroupMessageChange = {
  type: 'messages.changed'
  groupId: string
  actorId: string
  publishedAt: string
}

export async function publishGroupMessageChange(groupId: string, actorId: string): Promise<void> {
  const endpoint = process.env.REALTIME_PUBLISH_URL
  const secret = process.env.REALTIME_PUBLISH_SECRET
  if (!endpoint || !secret || Buffer.byteLength(secret) < 32) return

  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return

  const event: GroupMessageChange = {
    type: 'messages.changed',
    groupId,
    actorId,
    publishedAt: new Date().toISOString(),
  }
  const body = JSON.stringify(event)
  const timestamp = Date.now().toString()
  const signature = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex')

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Realtime-Timestamp': timestamp,
        'X-Realtime-Signature': signature,
      },
      body,
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(500),
    })
  } catch {
    // Realtime is an optimization; the persisted REST API and sync fallback
    // remain authoritative when the optional companion service is unavailable.
  }
}
