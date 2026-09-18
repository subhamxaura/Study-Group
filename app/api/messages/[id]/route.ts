import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership, requireRole } from '@/lib/groups'
import { editMessageSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const PATCH = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const data = await parseBody(req, editMessageSchema)
  const message = await prisma.message.findUnique({
    where: { id },
    select: { id: true, userId: true, groupId: true, deletedAt: true },
  })
  if (!message || message.deletedAt) return fail('Message not found', 404)
  await requireMembership(message.groupId, user.id)
  if (message.userId !== user.id) return fail('You can only edit your own messages', 403)

  const updated = await prisma.message.update({
    where: { id },
    data: { content: data.content },
    select: { id: true, content: true, updatedAt: true },
  })
  return ok({ message: updated })
})

export const DELETE = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const message = await prisma.message.findUnique({
    where: { id },
    select: { id: true, userId: true, groupId: true, deletedAt: true },
  })
  if (!message || message.deletedAt) return fail('Message not found', 404)
  const membership = await requireRole(message.groupId, user.id, 'MEMBER')
  const isAuthor = message.userId === user.id
  const isModerator = membership.role === 'ADMIN' || membership.role === 'OWNER'
  if (!isAuthor && !isModerator) return fail('Not allowed to delete this message', 403)

  await prisma.message.update({
    where: { id },
    data: { deletedAt: new Date(), content: '[deleted]' },
  })
  return ok({ deleted: true })
})
