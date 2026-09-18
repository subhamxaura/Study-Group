import { prisma } from '@/lib/prisma'
import { ok, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { matchMentions } from '@/lib/mentions'
import { messageSchema } from '@/lib/validation'

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

// GET /api/groups/:id/messages?limit=30&before=<iso>
export const GET = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireMembership(id, user.id)
  const { searchParams } = new URL(req.url)
  const limit = Math.min(60, Math.max(10, Number(searchParams.get('limit') ?? 30) || 30))
  const before = searchParams.get('before')
  const search = searchParams.get('q')?.trim()

  const messages = await prisma.message.findMany({
    where: {
      groupId: id,
      deletedAt: null,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      ...(search
        ? { content: { contains: search, mode: 'insensitive' as const } }
        : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: messageSelect,
  })

  return ok({
    messages: messages.reverse(),
    hasMore: messages.length === limit,
    oldestCursor: messages[0]?.createdAt.toISOString() ?? null,
  })
})

// POST /api/groups/:id/messages
export const POST = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireMembership(id, user.id)
  const data = await parseBody(req, messageSchema)

  // Mentions are validated server-side against actual group members.
  const memberList = await prisma.groupMember.findMany({
    where: { groupId: id },
    select: { user: { select: { id: true, name: true } } },
  })
  const mentioned = matchMentions(
    data.content,
    memberList.map((m) => m.user),
  ).filter((m) => m.id !== user.id)

  const message = await prisma.message.create({
    data: {
      groupId: id,
      userId: user.id,
      content: data.content,
      kind: 'TEXT',
      ...(data.replyToId ? { replyToId: data.replyToId } : {}),
      ...(mentioned.length
        ? { mentions: { create: mentioned.map((m) => ({ userId: m.id })) } }
        : {}),
    },
    select: messageSelect,
  })

  if (mentioned.length) {
    const group = await prisma.group.findUnique({ where: { id }, select: { name: true } })
    await prisma.notification.createMany({
      data: mentioned.map((m) => ({
        userId: m.id,
        kind: 'MENTION' as const,
        title: `${user.name} mentioned you in ${group?.name ?? 'a group'}`,
        body: data.content.slice(0, 100),
        link: `/groups/${id}/chat`,
      })),
    })
  }

  return ok({ message })
})
