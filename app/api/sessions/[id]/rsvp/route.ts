import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { rsvpSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const POST = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const { status } = await parseBody(req, rsvpSchema)

  const session = await prisma.studySession.findUnique({
    where: { id },
    select: { id: true, groupId: true, maxParticipants: true, title: true,
      _count: { select: { rsvps: { where: { status: 'GOING' } } } } },
  })
  if (!session) return fail('Session not found', 404)
  if (session.groupId) await requireMembership(session.groupId, user.id)

  if (status === 'GOING' && session.maxParticipants) {
    const going = await prisma.sessionRSVP.count({
      where: { sessionId: id, status: 'GOING', userId: { not: user.id } },
    })
    if (going >= session.maxParticipants) return fail('This session is full', 409)
  }

  await prisma.sessionRSVP.upsert({
    where: { sessionId_userId: { sessionId: id, userId: user.id } },
    update: { status },
    create: { sessionId: id, userId: user.id, status },
  })
  return ok({ status })
})
