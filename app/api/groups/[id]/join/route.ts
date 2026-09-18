import { prisma } from '@/lib/prisma'
import { ok, fail, withUser } from '@/lib/api'
import { requireMembership } from '@/lib/groups'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const POST = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, name: true, isPublic: true, ownerId: true, maxMembers: true,
      _count: { select: { members: true } } },
  })
  if (!group) return fail('Group not found', 404)

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: user.id } },
  })
  if (existing) return ok({ joined: true, alreadyMember: true })

  if (group.maxMembers && group._count.members >= group.maxMembers) {
    return fail('This group is full', 409)
  }

  await prisma.groupMember.create({ data: { groupId: id, userId: user.id, role: 'MEMBER' } })

  // Notify owner + admins about the new member (not for instant-public joins? — yes, keep it informative)
  const admins = await prisma.groupMember.findMany({
    where: { groupId: id, role: { in: ['OWNER', 'ADMIN'] }, userId: { not: user.id } },
    select: { userId: true },
  })
  await prisma.notification.createMany({
    data: admins.map((a) => ({
      userId: a.userId,
      kind: 'JOIN_REQUEST' as const,
      title: `${user.name} joined ${group.name}`,
      body: 'A new member joined your group.',
      link: `/groups/${id}/members`,
    })),
  })

  return ok({ joined: true })
})

export const DELETE = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const membership = await requireMembership(id, user.id)
  if (membership.role === 'OWNER') {
    return fail('Owners cannot leave their own group — transfer or delete it instead', 409)
  }
  await prisma.groupMember.delete({ where: { id: membership.id } })
  return ok({ left: true })
})
