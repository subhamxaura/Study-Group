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

  // Batch aggregate per-group metrics in 3 queries instead of 3 * N queries
  const [weeklyMsgCounts, resCounts, nextGroupSessions] = await Promise.all([
    myGroupIds.length === 0 ? [] : prisma.message.groupBy({
      by: ['groupId'],
      where: { groupId: { in: myGroupIds }, createdAt: { gte: new Date(Date.now() - 7 * 864e5) } },
      _count: { _all: true },
    }),
    myGroupIds.length === 0 ? [] : prisma.resource.groupBy({
      by: ['groupId'],
      where: { groupId: { in: myGroupIds } },
      _count: { _all: true },
    }),
    myGroupIds.length === 0 ? [] : prisma.studySession.findMany({
      where: { groupId: { in: myGroupIds }, startsAt: { gte: now } },
      orderBy: { startsAt: 'asc' },
      distinct: ['groupId'],
      select: { groupId: true, startsAt: true },
    }),
  ])

  const msgMap = new Map<string, number>(weeklyMsgCounts.flatMap((c) => c.groupId ? [[c.groupId, c._count._all]] : []))
  const resMap = new Map<string, number>(resCounts.flatMap((c) => c.groupId ? [[c.groupId, c._count._all]] : []))
  const nextSessionMap = new Map<string, Date>(nextGroupSessions.flatMap((s) => s.groupId ? [[s.groupId, s.startsAt]] : []))

  const groupsWithMeta = myMemberships.map((m) => ({
    ...m.group,
    memberCount: m.group._count.members,
    myRole: m.role,
    weeklyMessages: msgMap.get(m.group.id) ?? 0,
    resourceCount: resMap.get(m.group.id) ?? 0,
    nextSessionAt: nextSessionMap.get(m.group.id)?.toISOString() ?? null,
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

  // Today's Plan timeline — every item from real data, sorted by time.
  // Tasks due today → 'task'; today's sessions → 'session'; plus one
  // recommended focus block derived from the top open task's subject.
  type PlanItem =
    | { kind: 'task'; id: string; at: string | null; title: string; subject: string | null; groupId: string | null; groupName: string | null; priority: string; overdue: boolean }
    | { kind: 'session'; id: string; at: string; title: string; subject: string | null; groupId: string | null; groupName: string | null; location: string | null; isOnline: boolean; goingCount: number }
    | { kind: 'focus'; id: string; at: string | null; title: string; subject: string | null; recommendedMinutes: number }

  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)

  const taskItems: Array<Extract<PlanItem, { kind: 'task' }>> = dueTasks
    .filter((t) => t.dueDate && new Date(t.dueDate) <= todayEnd)
    .map((t) => ({
      kind: 'task' as const, id: t.id, at: t.dueDate ? t.dueDate.toISOString() : null,
      title: t.title, subject: t.group?.name ?? null, groupId: t.group?.id ?? null, groupName: t.group?.name ?? null,
      priority: t.priority, overdue: Boolean(t.dueDate && new Date(t.dueDate) < todayStart),
    }))

  const sessionItems: Array<Extract<PlanItem, { kind: 'session' }>> = upcoming
    .filter((s) => new Date(s.startsAt) <= todayEnd)
    .map((s) => ({
      kind: 'session' as const, id: s.id, at: s.startsAt.toISOString(), title: s.title,
      subject: s.group?.name ?? null, groupId: s.group?.id ?? null, groupName: s.group?.name ?? null,
      location: s.location ?? null, isOnline: s.isOnline,
      goingCount: s._count.rsvps,
    }))

  // Recommended focus: 50 min if nothing studied yet today, else top up to a
  // light 25-min block — derived, never invented (id is synthetic but kind-labeled).
  const focusSubject = taskItems[0]?.subject ?? sessionItems[0]?.subject ?? null
  const recommendedMinutes = todayMinutes >= 50 ? 25 : 50
  const focusItem: PlanItem = {
    kind: 'focus', id: 'focus-recommendation', at: null, title: 'Focus session',
    subject: focusSubject, recommendedMinutes,
  }

  const todayTimeline: PlanItem[] = [
    ...[...taskItems].sort((a, b) => (a.at ?? '9999').localeCompare(b.at ?? '9999')),
    ...[...sessionItems].sort((a, b) => a.at.localeCompare(b.at)),
    focusItem,
  ]

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
    todayTimeline,
    upcoming,
    groups: groupsWithMeta,
    dueTasks,
    activity,
  })
})
