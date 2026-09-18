import { prisma } from '@/lib/prisma'
import { ok, fail, withUser } from '@/lib/api'
import { requireRole } from '@/lib/groups'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const POST = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const message = await prisma.message.findUnique({
    where: { id },
    select: { id: true, groupId: true, pinned: true, deletedAt: true },
  })
  if (!message || message.deletedAt) return fail('Message not found', 404)
  await requireRole(message.groupId, user.id, 'ADMIN')
  const updated = await prisma.message.update({
    where: { id },
    data: { pinned: !message.pinned },
    select: { id: true, pinned: true },
  })
  return ok({ message: updated })
})
