import { prisma } from '@/lib/prisma'
import { ok, withUser, parseBody } from '@/lib/api'
import { focusLogSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

// GET /api/focus — recent logs, streak, weekly minutes, today minutes
// GET /api/focus?presence=1 — recently active studiers (privacy-safe: name + subject only)
export const GET = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  if (searchParams.get('presence') === '1') {
    const cutoff = new Date(Date.now() - 20 * 60000)
    const logs = await prisma.studySessionLog.findMany({
      where: { endedAt: { not: null }, startedAt: { gte: cutoff }, userId: { not: user.id } },
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: { userId: true, subject: true, user: { select: { name: true } } },
    })
    const seen = new Set<string>()
    const presence = logs.filter((l) => (seen.has(l.userId) ? false : (seen.add(l.userId), true)))
    return ok({ logs: presence })
  }
  const since = new Date(Date.now() - 30 * 864e5)
  const [logs, streak, weekLogs] = await Promise.all([
    prisma.studySessionLog.findMany({
      where: { userId: user.id, endedAt: { not: null } },
      orderBy: { startedAt: 'desc' },
      take: 20,
    }),
    prisma.studyStreak.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } }),
    prisma.studySessionLog.findMany({
      where: { userId: user.id, startedAt: { gte: new Date(Date.now() - 7 * 864e5) }, endedAt: { not: null } },
      select: { durationMinutes: true, startedAt: true },
    }),
  ])

  const weekStart = startOfDay(new Date())
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)) // Monday
  const weekMinutes = weekLogs
    .filter((l) => l.startedAt >= weekStart)
    .reduce((s, l) => s + l.durationMinutes, 0)
  const todayMinutes = weekLogs
    .filter((l) => startOfDay(l.startedAt).getTime() === startOfDay(new Date()).getTime())
    .reduce((s, l) => s + l.durationMinutes, 0)

  return ok({ logs, streak, weekMinutes, todayMinutes, weeklyGoalMin: streak.weeklyGoalMin })
})

// POST /api/focus — complete a focus session
export const POST = withUser(async (user, req) => {
  const data = await parseBody(req, focusLogSchema)
  const startedAt = data.startedAt ? new Date(data.startedAt) : new Date(Date.now() - data.durationMinutes * 60000)
  const endedAt = new Date(startedAt.getTime() + data.durationMinutes * 60000)

  const [log] = await prisma.$transaction([
    prisma.studySessionLog.create({
      data: {
        userId: user.id,
        groupId: data.groupId || null,
        kind: 'FOCUS',
        subject: data.subject || null,
        startedAt,
        endedAt,
        durationMinutes: data.durationMinutes,
        tasksCompleted: data.tasksCompleted,
      },
    }),
    // Streak update: consecutive-day tracking anchored on lastStudyDate
    prisma.studyStreak.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id },
    }),
  ])

  const streak = await prisma.studyStreak.findUniqueOrThrow({ where: { userId: user.id } })
  const today = startOfDay(new Date())
  const last = streak.lastStudyDate ? startOfDay(streak.lastStudyDate) : null

  let current = streak.current
  if (!last) current = 1
  else {
    const dayDiff = Math.round((today.getTime() - last.getTime()) / 864e5)
    if (dayDiff === 0) current = Math.max(1, streak.current) // already counted today
    else if (dayDiff === 1) current = streak.current + 1
    else current = 1
  }
  const longest = Math.max(streak.longest, current)

  await prisma.studyStreak.update({
    where: { userId: user.id },
    data: { current, longest, lastStudyDate: new Date() },
  })

  return ok({ log, streak: { current, longest } })
})
