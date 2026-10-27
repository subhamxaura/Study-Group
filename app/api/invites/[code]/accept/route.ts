import { prisma } from '@/lib/prisma'
import { fail, ok, withUser } from '@/lib/api'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ code: string }> }
const validCode = (code: string) => /^[A-Za-z0-9_-]{43}$/.test(code)

class InviteUnavailableError extends Error {}
class GroupFullError extends Error {}

export const POST = withUser(async (user, _req, ctx: Ctx) => {
  const { code } = await ctx.params
  if (!validCode(code)) return fail('Invitation not found or expired', 404)

  const invite = await prisma.groupInvite.findUnique({
    where: { code },
    select: { id: true, groupId: true, status: true, expiresAt: true },
  })
  if (!invite || invite.status !== 'PENDING' || (invite.expiresAt && invite.expiresAt <= new Date())) {
    return fail('Invitation not found or expired', 404)
  }

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: invite.groupId, userId: user.id } },
    select: { id: true },
  })
  if (existing) return ok({ joined: true, alreadyMember: true, groupId: invite.groupId })

  try {
    const groupId = await prisma.$transaction(async (tx) => {
      const claimed = await tx.groupInvite.updateMany({
        where: {
          id: invite.id,
          status: 'PENDING',
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        data: { status: 'ACCEPTED' },
      })
      if (claimed.count !== 1) throw new InviteUnavailableError()

      const group = await tx.group.findUnique({
        where: { id: invite.groupId },
        select: { id: true, maxMembers: true, _count: { select: { members: true } } },
      })
      if (!group) throw new InviteUnavailableError()
      if (group.maxMembers !== null && group._count.members >= group.maxMembers) throw new GroupFullError()

      await tx.groupMember.create({ data: { groupId: group.id, userId: user.id, role: 'MEMBER' } })
      return group.id
    })

    return ok({ joined: true, groupId })
  } catch (error) {
    if (error instanceof InviteUnavailableError) return fail('Invitation has already been used or expired', 409)
    if (error instanceof GroupFullError) return fail('This group is full', 409)
    throw error
  }
})
