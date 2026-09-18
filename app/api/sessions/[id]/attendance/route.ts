import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireRole } from '@/lib/groups'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// GET /api/sessions/:id/attendance — detail view with participants
export const GET = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const session = await prisma.studySession.findUnique({
    where: { id },
    include: {
      group: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, avatarUrl: true } },
      rsvps: {
        select: { status: true, attended: true, userId: true, user: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  })
  if (!session) return fail('Session not found', 404)
  if (session.groupId) {
    const member = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: session.groupId, userId: user.id } },
      select: { id: true },
    })
    if (!member) return fail('You do not have access to this session', 403)
  } else if (session.creatorId !== user.id) {
    return fail('You do not have access to this session', 403)
  }

  const canManage = session.creatorId === user.id
  return ok({
    session: {
      ...session,
      goingCount: session.rsvps.filter((r) => r.status === 'GOING').length,
      maybeCount: session.rsvps.filter((r) => r.status === 'MAYBE').length,
      isHost: canManage,
      isLive: new Date() >= session.startsAt && new Date() <= session.endsAt,
      isPast: new Date() > session.endsAt,
    },
  })
})

// POST /api/sessions/:id/attendance — host marks participation
export const POST = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const { userId, attended } = await parseBody(
    req,
    z.object({ userId: z.string().cuid(), attended: z.boolean() }),
  )
  const session = await prisma.studySession.findUnique({
    where: { id },
    select: { id: true, groupId: true, creatorId: true, startsAt: true, title: true },
  })
  if (!session) return fail('Session not found', 404)

  // Host, or group admin/owner
  if (session.creatorId !== user.id) {
    if (session.groupId) await requireRole(session.groupId, user.id, 'ADMIN')
    else return fail('Only the host can mark attendance', 403)
  }
  if (new Date() < session.startsAt) {
    return fail('Attendance can be marked once the session has started', 409)
  }

  const rsvp = await prisma.sessionRSVP.findUnique({
    where: { sessionId_userId: { sessionId: id, userId } },
  })
  if (!rsvp) return fail('That student has not RSVPed to this session', 404)

  const updated = await prisma.sessionRSVP.update({
    where: { id: rsvp.id },
    data: { attended },
    select: { id: true, attended: true, userId: true },
  })
  return ok({ attendance: updated })
})
