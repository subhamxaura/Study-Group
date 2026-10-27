import { randomBytes } from 'node:crypto'
import { prisma } from '@/lib/prisma'
import { fail, ok, withUser } from '@/lib/api'
import { requireRole } from '@/lib/groups'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ id: string }> }

export const POST = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = await ctx.params
  await requireRole(id, user.id, 'ADMIN')

  const group = await prisma.group.findUnique({
    where: { id },
    select: { id: true, isPublic: true },
  })
  if (!group) return fail('Group not found', 404)
  if (group.isPublic) return fail('Invites are only needed for private groups', 409)

  const code = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const invite = await prisma.groupInvite.create({
    data: { groupId: group.id, inviterId: user.id, code, expiresAt },
    select: { id: true },
  })

  return ok({ inviteId: invite.id, expiresAt: expiresAt.toISOString(), invitePath: `/invite/${code}` })
})
