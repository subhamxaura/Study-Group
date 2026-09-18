import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { eventSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// GET /api/events?from=iso&to=iso&groupId=
export const GET = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from') ? new Date(searchParams.get('from')!) : new Date(Date.now() - 30 * 864e5)
  const to = searchParams.get('to') ? new Date(searchParams.get('to')!) : new Date(Date.now() + 60 * 864e5)
  const groupId = searchParams.get('groupId') || undefined

  const myGroups = await prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } })
  const myGroupIds = myGroups.map((m) => m.groupId)

  const events = await prisma.calendarEvent.findMany({
    where: {
      startsAt: { gte: from, lte: to },
      ...(groupId
        ? { groupId, ...(await gate(groupId, user.id)) }
        : { OR: [{ creatorId: user.id }, { groupId: { in: myGroupIds } }] }),
    },
    orderBy: { startsAt: 'asc' },
    include: {
      group: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true } },
    },
  })
  return ok({ events })
})

async function gate(groupId: string, userId: string) {
  await requireMembership(groupId, userId)
  return {}
}

export const POST = withUser(async (user, req) => {
  const data = await parseBody(req, eventSchema)
  if (data.groupId) await requireMembership(data.groupId, user.id)
  if (new Date(data.endsAt) <= new Date(data.startsAt)) return fail('End must be after start', 422)

  const event = await prisma.calendarEvent.create({
    data: {
      groupId: data.groupId || null,
      creatorId: user.id,
      title: data.title,
      description: data.description || null,
      kind: data.kind,
      startsAt: new Date(data.startsAt),
      endsAt: new Date(data.endsAt),
      location: data.location || null,
      reminderAt: data.reminderAt ? new Date(data.reminderAt) : null,
    },
    include: { group: { select: { id: true, name: true } } },
  })
  return ok({ event })
})

export const DELETE = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id') ?? ''
  const event = await prisma.calendarEvent.findUnique({ where: { id }, select: { id: true, creatorId: true, groupId: true } })
  if (!event) return fail('Event not found', 404)
  let canDelete = event.creatorId === user.id
  if (event.groupId && !canDelete) {
    const m = await requireMembership(event.groupId, user.id)
    canDelete = m.role === 'ADMIN' || m.role === 'OWNER'
  }
  if (!canDelete) return fail('Not allowed', 403)
  await prisma.calendarEvent.delete({ where: { id } })
  return ok({ deleted: true })
})
