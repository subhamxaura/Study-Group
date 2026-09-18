import { prisma } from '@/lib/prisma'
import { ok, withUser } from '@/lib/api'

export const dynamic = 'force-dynamic'

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

const RANGES = ['7', '30', 'semester'] as const
type Range = (typeof RANGES)[number]

// GET /api/analytics?range=7|30|semester — aggregates for the Analytics screen.
// Buckets: 7 → current week (Mon..Sun), 30 → last 30 days daily,
// semester → last ~13 weeks (91 days) grouped weekly.
export const GET = withUser(async (user, req) => {
  const rangeParam = new URL(req.url).searchParams.get('range') ?? '7'
  const range: Range = (RANGES as readonly string[]).includes(rangeParam)
    ? (rangeParam as Range)
    : '7'

  const now = new Date()
  const weekStart = startOfDay(new Date(now))
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)) // Monday

  let rangeStart: Date
  if (range === '7') rangeStart = weekStart
  else if (range === '30') rangeStart = new Date(startOfDay(now).getTime() - 29 * 864e5)
  else rangeStart = new Date(startOfDay(now).getTime() - 90 * 864e5)

  const [focusLogs, tasks, streak, groupCount] = await Promise.all([
    prisma.studySessionLog.findMany({
      where: { userId: user.id, endedAt: { not: null }, startedAt: { gte: rangeStart } },
      select: { durationMinutes: true, startedAt: true, subject: true },
    }),
    prisma.task.findMany({
      where: {
        OR: [{ assigneeId: user.id }, { creatorId: user.id, assigneeId: null }],
        createdAt: { gte: rangeStart },
      },
      select: { status: true },
    }),
    prisma.studyStreak.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } }),
    prisma.groupMember.count({ where: { userId: user.id } }),
  ])

  // Bucketed daily/weekly minutes
  const daily: Array<{ label: string; minutes: number }> = []
  if (range === '7') {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart)
      d.setDate(d.getDate() + i)
      const next = new Date(d.getTime() + 864e5)
      const minutes = focusLogs
        .filter((l) => l.startedAt >= d && l.startedAt < next)
        .reduce((s, l) => s + l.durationMinutes, 0)
      daily.push({ label: dayNames[i], minutes })
    }
  } else if (range === '30') {
    for (let i = 0; i < 30; i++) {
      const d = new Date(rangeStart.getTime() + i * 864e5)
      const next = new Date(d.getTime() + 864e5)
      const minutes = focusLogs
        .filter((l) => l.startedAt >= d && l.startedAt < next)
        .reduce((s, l) => s + l.durationMinutes, 0)
      daily.push({
        label: d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' }),
        minutes,
      })
    }
  } else {
    for (let w = 0; w < 13; w++) {
      const d = new Date(rangeStart.getTime() + w * 7 * 864e5)
      const next = new Date(d.getTime() + 7 * 864e5)
      const minutes = focusLogs
        .filter((l) => l.startedAt >= d && l.startedAt < next)
        .reduce((s, l) => s + l.durationMinutes, 0)
      daily.push({ label: w === 12 ? 'Now' : `W${w + 1}`, minutes })
    }
  }

  // Per-subject totals within the range
  const bySubject = new Map<string, number>()
  for (const l of focusLogs) {
    const key = l.subject || 'Other'
    bySubject.set(key, (bySubject.get(key) || 0) + l.durationMinutes)
  }
  const subjects = [...bySubject.entries()]
    .map(([subject, minutes]) => ({ subject, hours: Math.round((minutes / 60) * 10) / 10 }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, 6)

  const completed = tasks.filter((t) => t.status === 'COMPLETED').length
  const totalMinutes = daily.reduce((s, d) => s + d.minutes, 0)

  // Current-week minutes for the weekly goal (independent of the selected range)
  const weekMinutes = focusLogs
    .filter((l) => l.startedAt >= weekStart)
    .reduce((s, l) => s + l.durationMinutes, 0)

  return ok({
    range,
    bucket: range === 'semester' ? 'week' : 'day',
    daily,
    subjects,
    tasks: { total: tasks.length, completed },
    focusSessions: focusLogs.length,
    totalMinutes,
    weekMinutes,
    streak: { current: streak.current, longest: streak.longest, weeklyGoalMin: streak.weeklyGoalMin },
    groups: groupCount,
  })
})
