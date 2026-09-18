import { prisma } from '@/lib/prisma'
import { ok, withUser } from '@/lib/api'

export const dynamic = 'force-dynamic'

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

// GET /api/insights — every statement is computed from real rows; when data is
// insufficient, the endpoint returns empty and the UI shows the unlock message.
export const GET = withUser(async (user) => {
  const now = new Date()
  const weekStart = startOfDay(new Date(now))
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7))
  const lastWeekStart = new Date(weekStart)
  lastWeekStart.setDate(lastWeekStart.getDate() - 7)
  const tomorrowEnd = startOfDay(new Date(now))
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 2)

  const [thisWeek, lastWeek, todayTasks, streak, focusCount, subjectTotals] = await Promise.all([
    prisma.studySessionLog.findMany({
      where: { userId: user.id, startedAt: { gte: weekStart }, endedAt: { not: null } },
      select: { durationMinutes: true, startedAt: true, subject: true },
    }),
    prisma.studySessionLog.findMany({
      where: { userId: user.id, startedAt: { gte: lastWeekStart, lt: weekStart }, endedAt: { not: null } },
      select: { durationMinutes: true },
    }),
    prisma.task.findMany({
      where: {
        OR: [{ assigneeId: user.id }, { creatorId: user.id, assigneeId: null }],
        status: { not: 'COMPLETED' },
        dueDate: { gte: startOfDay(new Date(now)), lte: tomorrowEnd },
      },
      select: { id: true },
    }),
    prisma.studyStreak.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } }),
    prisma.studySessionLog.count({
      where: { userId: user.id, startedAt: { gte: weekStart }, endedAt: { not: null } },
    }),
    prisma.studySessionLog.groupBy({
      by: ['subject'],
      where: { userId: user.id, startedAt: { gte: lastWeekStart }, endedAt: { not: null }, subject: { not: null } },
      _sum: { durationMinutes: true },
    }),
  ])

  const thisMin = thisWeek.reduce((s, l) => s + l.durationMinutes, 0)
  const lastMin = lastWeek.reduce((s, l) => s + l.durationMinutes, 0)
  const insights: Array<{ id: string; icon: string; text: string }> = []

  if (lastMin > 0 && thisMin !== lastMin) {
    const pct = Math.round(((thisMin - lastMin) / lastMin) * 100)
    insights.push({
      id: 'delta',
      icon: pct > 0 ? '📈' : '📉',
      text: pct > 0
        ? `You studied ${pct}% more than last week.`
        : `You studied ${Math.abs(pct)}% less than last week.`,
    })
  }

  if (thisWeek.length >= 2) {
    const byDay = new Map<string, number>()
    for (const l of thisWeek) {
      const day = l.startedAt.toLocaleDateString('en-US', { weekday: 'long' })
      byDay.set(day, (byDay.get(day) ?? 0) + l.durationMinutes)
    }
    const best = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0]
    if (best && best[1] > 0) {
      insights.push({ id: 'bestday', icon: '📅', text: `Your most active study day is ${best[0]}.` })
    }
  }

  if (subjectTotals.length >= 2) {
    const top = [...subjectTotals].sort((a, b) => (b._sum.durationMinutes ?? 0) - (a._sum.durationMinutes ?? 0))[0]
    insights.push({
      id: 'topsubject',
      icon: '🎯',
      text: `Most of your recent study time went to ${top.subject}.`,
    })
  }

  if (todayTasks.length > 0) {
    insights.push({
      id: 'due',
      icon: '⏰',
      text: `You have ${todayTasks.length} task${todayTasks.length === 1 ? '' : 's'} due by tomorrow.`,
    })
  }

  if (streak.current > 0) {
    insights.push({ id: 'streak', icon: '🔥', text: `Your current streak is ${streak.current} day${streak.current === 1 ? '' : 's'}.` })
  } else if (focusCount === 0 && thisMin === 0 && lastMin === 0) {
    return ok({ insights: [] })
  }

  return ok({ insights })
})
