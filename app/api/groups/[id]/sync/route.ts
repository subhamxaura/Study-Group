import { prisma } from '@/lib/prisma'
import { ok, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

const messageSelect = {
  id: true, kind: true, content: true, pinned: true, createdAt: true, updatedAt: true, deletedAt: true,
  replyTo: { select: { id: true, content: true, user: { select: { name: true } } } },
  user: { select: { id: true, name: true, avatarUrl: true } },
  reactions: { select: { emoji: true, userId: true } },
  mentions: { select: { user: { select: { id: true, name: true } } } },
  _count: { select: { replies: true, attachments: true } },
} as const

// In-memory typing state (ephemeral by design; per server instance).
const typingMap = new Map<string, Map<string, number>>() // groupId -> (userId -> expiry ms)

function getTyping(groupId: string): string[] {
  const groupMap = typingMap.get(groupId)
  if (!groupMap) return []
  const now = Date.now()
  const active: string[] = []
  for (const [userId, expiry] of groupMap) {
    if (expiry > now) active.push(userId)
    else groupMap.delete(userId)
  }
  return active
}

const PRESENCE_WINDOW_MS = 90_000

// GET /api/groups/:id/sync?since=<iso>&vsince=<iso>
export const GET = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireMembership(id, user.id)
  const { searchParams } = new URL(req.url)
  const since = searchParams.get('since')
  const vsince = searchParams.get('vsince')

  // Heartbeat — mark caller online
  const heartbeats = prisma.groupMember.updateMany({
    where: { groupId: id, userId: user.id },
    data: { lastSeenAt: new Date() },
  })

  const sinceDate = since ? new Date(since) : new Date(0)

  const [newMessages, changedMessages, onlineMembers] = await Promise.all([
    // New messages from other users after `since`
    prisma.message.findMany({
      where: {
        groupId: id,
        deletedAt: null,
        ...(since ? { createdAt: { gt: sinceDate }, userId: { not: user.id } } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 30,
      select: messageSelect,
    }),
    // Edits, reaction/pin changes and deletions on messages that arrived before `since`
    // (Prisma's @updatedAt bumps on reaction create/delete and edit — mutation rows only).
    vsince
      ? prisma.message.findMany({
          where: {
            groupId: id,
            updatedAt: { gt: new Date(vsince) },
            OR: [{ createdAt: { lte: sinceDate } }, { userId: user.id }],
          },
          orderBy: { updatedAt: 'asc' },
          take: 40,
          select: messageSelect,
        })
      : Promise.resolve([]),
    heartbeats.then(async () =>
      prisma.groupMember.findMany({
        where: { groupId: id, lastSeenAt: { gte: new Date(Date.now() - PRESENCE_WINDOW_MS) } },
        select: { userId: true },
      }).then((ms) => ms.map((m) => m.userId))
    ),
  ])

  const typing = getTyping(id)
  const me = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
    select: { lastReadMessageAt: true },
  })

  return ok({
    // Upserts: new messages plus edited/reaction-updated/pinned ones (client merges by id).
    messages: [...changedMessages, ...newMessages],
    // Deletions must be applied separately (row content no longer meaningful).
    deletedIds: changedMessages.filter((m) => m.deletedAt).map((m) => m.id),
    online: onlineMembers,
    typing: typing.filter((t) => t !== user.id),
    myLastReadAt: me?.lastReadMessageAt?.toISOString() ?? null,
    serverTime: new Date().toISOString(),
  })
})

// POST /api/groups/:id/sync — typing ping
export const POST = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireMembership(id, user.id)
  const body = (await req.json().catch(() => ({}))) as { typing?: boolean }
  if (!typingMap.has(id)) typingMap.set(id, new Map())
  const groupMap = typingMap.get(id)!
  if (body.typing === false) groupMap.delete(user.id)
  else groupMap.set(user.id, Date.now() + 4000)
  return ok({ ok: true })
})

// PATCH /api/groups/:id/sync — mark chat as read up to a timestamp (or now)
export const PATCH = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireMembership(id, user.id)
  const body = await parseBody(req, z.object({ lastReadAt: z.string().datetime().optional() }))
  const lastReadAt = body.lastReadAt ? new Date(body.lastReadAt) : new Date()
  await prisma.groupMember.update({
    where: { groupId_userId: { groupId: id, userId: user.id } },
    data: { lastReadMessageAt: lastReadAt },
  })
  return ok({ lastReadAt: lastReadAt.toISOString() })
})
