import { prisma } from '@/lib/prisma'
import { fail, ok, withRoute } from '@/lib/api'

export const dynamic = 'force-dynamic'

type Ctx = { params: Promise<{ code: string }> }
const validCode = (code: string) => /^[A-Za-z0-9_-]{43}$/.test(code)

export const GET = (req: Request, ctx: Ctx) => withRoute(async () => {
  const { code } = await ctx.params
  if (!validCode(code)) return fail('Invitation not found or expired', 404)

  const invite = await prisma.groupInvite.findUnique({
    where: { code },
    select: {
      status: true,
      expiresAt: true,
      group: { select: { id: true, name: true, subject: true, avatarUrl: true, _count: { select: { members: true } } } },
    },
  })
  if (!invite || invite.status !== 'PENDING' || (invite.expiresAt && invite.expiresAt <= new Date())) {
    return fail('Invitation not found or expired', 404)
  }

  return ok({ group: { ...invite.group, memberCount: invite.group._count.members } })
})(req)
