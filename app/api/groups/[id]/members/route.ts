import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership, requireRole } from '@/lib/groups'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const GET = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireMembership(id, user.id)
  const members = await prisma.groupMember.findMany({
    where: { groupId: id },
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
    select: {
      id: true, role: true, joinedAt: true,
      user: { select: { id: true, name: true, avatarUrl: true, university: true } },
    },
  })
  return ok({ members })
})

const patchSchema = z.object({ userId: z.string().cuid(), role: z.enum(['ADMIN', 'MEMBER']) })

export const PATCH = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireRole(id, user.id, 'OWNER')
  const { userId, role } = await parseBody(req, patchSchema)
  const target = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId } },
  })
  if (!target) return fail('Member not found', 404)
  if (target.role === 'OWNER') return fail("Cannot change the owner's role", 409)
  const updated = await prisma.groupMember.update({
    where: { id: target.id },
    data: { role },
    select: { id: true, role: true },
  })
  return ok({ member: updated })
})

export const DELETE = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireRole(id, user.id, 'ADMIN')
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') ?? ''
  if (!z.string().cuid().safeParse(userId).success) return fail('Invalid userId', 422)
  const target = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId } },
  })
  if (!target) return fail('Member not found', 404)
  if (target.role === 'OWNER') return fail('The owner cannot be removed', 409)
  if (target.role === 'ADMIN' && user.id !== userId) {
    // Only owner can remove an admin
    await requireRole(id, user.id, 'OWNER')
  }
  await prisma.groupMember.delete({ where: { id: target.id } })
  return ok({ removed: true })
})
