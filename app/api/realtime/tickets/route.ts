import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { fail, ok, parseBody, withUser } from '@/lib/api'
import { requireMembership } from '@/lib/groups'

export const dynamic = 'force-dynamic'

const ticketSchema = z.object({ groupId: z.string().cuid() })
const ISSUER = 'study-group-realtime'
const AUDIENCE = 'study-group-ws'
const TICKET_TTL_SECONDS = 60

export const POST = withUser(async (user, req) => {
  const { groupId } = await parseBody(req, ticketSchema)
  await requireMembership(groupId, user.id)

  const secret = process.env.REALTIME_TICKET_SECRET
  const configuredUrl = process.env.REALTIME_PUBLIC_URL
  if (!secret || Buffer.byteLength(secret) < 32 || !configuredUrl) {
    return fail('Realtime collaboration is not configured', 503)
  }

  let websocketUrl: URL
  try {
    websocketUrl = new URL(configuredUrl)
  } catch {
    return fail('Realtime collaboration is misconfigured', 503)
  }
  if (!['ws:', 'wss:'].includes(websocketUrl.protocol) || websocketUrl.pathname !== '/ws' || websocketUrl.username || websocketUrl.password || websocketUrl.search || websocketUrl.hash) {
    return fail('Realtime collaboration is misconfigured', 503)
  }

  const ticket = jwt.sign(
    { groupId, purpose: 'group' },
    secret,
    {
      algorithm: 'HS256',
      subject: user.id,
      issuer: ISSUER,
      audience: AUDIENCE,
      expiresIn: TICKET_TTL_SECONDS,
      jwtid: randomUUID(),
    },
  )

  return ok({
    ticket,
    websocketUrl: websocketUrl.toString(),
    expiresAt: new Date(Date.now() + TICKET_TTL_SECONDS * 1000).toISOString(),
  })
})
