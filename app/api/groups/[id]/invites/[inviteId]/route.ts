import { prisma } from '@/lib/prisma'
import { fail, ok, withUser } from '@/lib/api'
import { requireRole } from '@/lib/groups'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string; inviteId: string }> }

export const DELETE = withUser(async (user, _req, ctx: Ctx) => {
  const { id, inviteId } = await ctx.params
  await requireRole(id, user.id, 'ADMIN')

  const result = await prisma.groupInvite.updateMany({
    where: { id: inviteId, groupId: id, status: 'PENDING' },
    data: { status: 'REVOKED' },
  })
  if (result.count !== 1) return fail('Invitation not found or already used', 409)
  return ok({ revoked: true })
})
