import { prisma } from '@/lib/prisma'
import { ok, withUser } from '@/lib/api'

export const dynamic = 'force-dynamic'

// GET /api/dashboard — one aggregate endpoint so the dashboard renders in a single round-trip
export const GET = withUser(async (user) => {
  const now = new Date()
  const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
  const weekStart = new Date(now)
  weekStart.setHours(0, 0, 0, 0)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))

  const myMemberships = await prisma.groupMember.findMany({
    where: { userId: user.id },
    select: { groupId: true, role: true, group: { select: { id: true, name: true, subject: true, avatarUrl: true, description: true, _count: { select: { members: true } } } } },
  })
  const myGroupIds = myMemberships.map((m) => m.groupId)

  const [upcoming, dueTasks, focusLogs, unread, activityMessages, activityResources, streak] = await Promise.all([
    prisma.studySession.findMany({
      where: { OR: [{ creatorId: user.id }, { groupId: { in: myGroupIds } }], startsAt: { gte: now } },
      orderBy: { startsAt: 'asc' },
      take: 5,
      include: {
        group: { select: { id: true, name: true } },
        _count: { select: { rsvps: { where: { status: 'GOING' } } } },
        rsvps: { where: { userId: user.id }, select: { status: true } },
      },
    }),
    prisma.task.findMany({
      where: {
        OR: [{ assigneeId: user.id }, { creatorId: user.id, assigneeId: null }],
        status: { not: 'COMPLETED' },
      },
      orderBy: { dueDate: 'asc' },
      take: 6,
      include: { group: { select: { id: true, name: true } } },
    }),
    prisma.studySessionLog.findMany({
      where: { userId: user.id, startedAt: { gte: weekStart }, endedAt: { not: null } },
      select: { durationMinutes: true, subject: true, startedAt: true },
    }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    prisma.message.findMany({
      where: { groupId: { in: myGroupIds }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { id: true, content: true, createdAt: true, groupId: true, group: { select: { name: true } }, user: { select: { id: true, name: true, avatarUrl: true } } },
    }),
    prisma.resource.findMany({
      where: { groupId: { in: myGroupIds } },
      orderBy: { createdAt: 'desc' },
      take: 4,
      select: { id: true, title: true, createdAt: true, groupId: true, group: { select: { name: true } }, uploader: { select: { name: true } } },
    }),
    prisma.studyStreak.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } }),
  ])

  const weekMinutes = focusLogs.reduce((s, l) => s + l.durationMinutes, 0)
  const todayMinutes = focusLogs
    .filter((l) => { const d = new Date(l.startedAt); const t = new Date(); return d.toDateString() === t.toDateString() })
    .reduce((s, l) => s + l.durationMinutes, 0)

  // Per-group recent activity counts for cards
  const groupsWithMeta = await Promise.all(myMemberships.map(async (m) => {
    const [msgCount, resCount, nextSession] = await Promise.all([
      prisma.message.count({ where: { groupId: m.group.id, createdAt: { gte: new Date(Date.now() - 7 * 864e5) } } }),
      prisma.resource.count({ where: { groupId: m.group.id } }),
      prisma.studySession.findFirst({
        where: { groupId: m.group.id, startsAt: { gte: now } },
        orderBy: { startsAt: 'asc' },
        select: { startsAt: true },
      }),
    ])
    return {
      ...m.group,
      memberCount: m.group._count.members,
      myRole: m.role,
      weeklyMessages: msgCount,
      resourceCount: resCount,
      nextSessionAt: nextSession?.startsAt ?? null,
    }
  }))

  const activity = [
    ...activityMessages.map((m) => ({
      kind: 'message' as const, id: m.id,
      actor: m.user.name, text: m.content.slice(0, 80),
      groupName: m.group.name, groupId: m.groupId, at: m.createdAt,
    })),
    ...activityResources.map((r) => ({
      kind: 'resource' as const, id: r.id,
      actor: r.uploader.name, text: `shared “${r.title}”`,
      groupName: r.group?.name ?? 'Your groups', groupId: r.groupId, at: r.createdAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 8)

  return ok({
    stats: {
      activeGroups: myGroupIds.length,
      studyHoursWeek: Math.round((weekMinutes / 60) * 10) / 10,
      tasksCompleted: await prisma.task.count({
        where: { OR: [{ assigneeId: user.id }, { creatorId: user.id, assigneeId: null }], status: 'COMPLETED' },
      }),
      streak: streak.current,
      unreadNotifications: unread,
      todayMinutes,
    },
    todayPlan: {
      focusDoneToday: todayMinutes,
      tasksDueToday: dueTasks.filter((t) => t.dueDate && new Date(t.dueDate) <= todayEnd).length,
      sessionsToday: upcoming.filter((s) => new Date(s.startsAt) <= todayEnd).length,
    },
    upcoming,
    groups: groupsWithMeta,
    dueTasks,
    activity,
  })
})
