import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { sessionSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// GET /api/sessions?groupId=&upcoming=1&limit=
export const GET = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId') || undefined
  const upcoming = searchParams.get('upcoming') === '1'
  const limit = Math.min(50, Math.max(5, Number(searchParams.get('limit') ?? 20) || 20))

  // Scope: group sessions require membership; personal sessions = own + sessions in my groups
  const myGroups = await prisma.groupMember.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  })
  const myGroupIds = myGroups.map((m) => m.groupId)

  const where = groupId
    ? { groupId, ...(await membershipFilter(groupId, user.id)) }
    : {
        OR: [
          { creatorId: user.id },
          { groupId: { in: myGroupIds } },
        ],
      }

  const sessions = await prisma.studySession.findMany({
    where: {
      ...where,
      ...(upcoming ? { startsAt: { gte: new Date() } } : {}),
    },
    orderBy: { startsAt: 'asc' },
    take: limit,
    include: {
      group: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, avatarUrl: true } },
      rsvps: { select: { status: true, userId: true } },
      _count: { select: { rsvps: { where: { status: 'GOING' } } } },
    },
  })

  return ok({ sessions })
})

async function membershipFilter(groupId: string, userId: string) {
  await requireMembership(groupId, userId)
  return {}
}

// POST /api/sessions
export const POST = withUser(async (user, req) => {
  const data = await parseBody(req, sessionSchema)
  if (data.groupId) await requireMembership(data.groupId, user.id)
  if (new Date(data.endsAt) <= new Date(data.startsAt)) {
    return fail('End time must be after start time', 422)
  }

  const session = await prisma.studySession.create({
    data: {
      groupId: data.groupId || null,
      title: data.title,
      description: data.description || null,
      subject: data.subject,
      kind: data.kind,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      location: data.location || null,
      isOnline: data.isOnline,
      maxParticipants: data.maxParticipants ?? null,
      creatorId: user.id,
      rsvps: { create: { userId: user.id, status: 'GOING' } },
    },
    include: {
      group: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
      _count: { select: { rsvps: { where: { status: 'GOING' } } } },
    },
  })

  // Notify group members about the new session
  if (data.groupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: data.groupId, userId: { not: user.id } },
      select: { userId: true },
    })
    if (members.length) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          kind: 'SESSION_REMINDER' as const,
          title: `New session: ${session.title}`,
          body: `${user.name} scheduled a session${session.group ? ` in ${session.group.name}` : ''}.`,
          link: data.groupId ? `/groups/${data.groupId}/calendar` : '/calendar',
        })),
      })
    }
  }

  return ok({ session })
})
