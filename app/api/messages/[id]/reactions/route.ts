import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { reactionSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const POST = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const { emoji } = await parseBody(req, reactionSchema)
  const message = await prisma.message.findUnique({
    where: { id },
    select: { id: true, groupId: true, deletedAt: true },
  })
  if (!message || message.deletedAt) return fail('Message not found', 404)
  await requireMembership(message.groupId, user.id)

  const existing = await prisma.messageReaction.findUnique({
    where: { messageId_userId_emoji: { messageId: id, userId: user.id, emoji } },
  })
  if (existing) {
    await prisma.messageReaction.delete({ where: { id: existing.id } })
    // Bump the parent so other clients' delta-sync picks up the reaction change.
    await prisma.message.update({ where: { id }, data: { updatedAt: new Date() } })
    return ok({ reacted: false })
  }
  await prisma.messageReaction.create({ data: { messageId: id, userId: user.id, emoji } })
  await prisma.message.update({ where: { id }, data: { updatedAt: new Date() } })
  return ok({ reacted: true })
})
