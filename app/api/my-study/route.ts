import { prisma } from '@/lib/prisma'
import { ok, withUser } from '@/lib/api'

export const dynamic = 'force-dynamic'

function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

// GET /api/my-study — Personal Study Intelligence. Every number is derived
// from the signed-in user's own rows; sections are omitted (not faked) when
// there is insufficient data.
export const GET = withUser(async (user) => {
  const now = new Date()
  const weekStart = startOfDay(now)
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)) // Monday
  const prevWeekStart = new Date(weekStart.getTime() - 7 * 864e5)

  const [logs28, tasksAll, streak, quizAttempts, openTaskSample] = await Promise.all([
    prisma.studySessionLog.findMany({
      where: { userId: user.id, endedAt: { not: null }, startedAt: { gte: new Date(weekStart.getTime() - 21 * 864e5) } },
      select: { durationMinutes: true, startedAt: true, subject: true },
    }),
    prisma.task.findMany({
      where: { OR: [{ assigneeId: user.id }, { creatorId: user.id, assigneeId: null }] },
      select: { status: true, dueDate: true },
    }),
    prisma.studyStreak.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } }),
    prisma.quizAttempt.findMany({
      where: { userId: user.id, createdAt: { gte: prevWeekStart } },
      select: { subject: true, topic: true, score: true, createdAt: true },
    }),
    prisma.task.findFirst({
      where: { OR: [{ assigneeId: user.id }, { creatorId: user.id, assigneeId: null }], status: { not: 'COMPLETED' } },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, title: true, dueDate: true },
    }),
  ])

  const thisWeek = logs28.filter((l) => l.startedAt >= weekStart)
  const lastWeek = logs28.filter((l) => l.startedAt >= prevWeekStart && l.startedAt < weekStart)
  const thisMin = thisWeek.reduce((s, l) => s + l.durationMinutes, 0)
  const lastMin = lastWeek.reduce((s, l) => s + l.durationMinutes, 0)
  const hasStudyData = logs28.length > 0

  // --- Consistency: minutes per weekday this week (Mon..Sun) ---
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const consistency = dayNames.map((label, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    const next = new Date(d.getTime() + 864e5)
    const minutes = thisWeek
      .filter((l) => l.startedAt >= d && l.startedAt < next)
      .reduce((s, l) => s + l.durationMinutes, 0)
    return { label, minutes }
  })

  // --- Subject breakdown this week ---
  const bySubject = new Map<string, number>()
  for (const l of thisWeek) {
    const key = l.subject || 'Other'
    bySubject.set(key, (bySubject.get(key) || 0) + l.durationMinutes)
  }
  const subjectTotal = thisMin || 1
  const subjects = [...bySubject.entries()]
    .map(([subject, minutes]) => ({ subject, minutes, pct: Math.round((minutes / subjectTotal) * 100) }))
    .sort((a, b) => b.minutes - a.minutes)
    .slice(0, 6)

  // --- Patterns (only when there is enough data to say something) ---
  let patterns: { mostActiveDay: string; avgSessionMin: number; topSubject: string } | null = null
  if (thisWeek.length >= 3 && thisMin > 0) {
    const dayMinutes = consistency
    const bestDay = [...dayMinutes].sort((a, b) => b.minutes - a.minutes)[0]
    if (bestDay && bestDay.minutes > 0) {
      patterns = {
        mostActiveDay: bestDay.label,
        avgSessionMin: Math.round(thisMin / thisWeek.length),
        topSubject: subjects[0]?.subject ?? '—',
      }
    }
  }

  // --- Weekly goal ---
  const goalMin = streak.weeklyGoalMin
  const goalPct = goalMin > 0 ? Math.min(100, Math.round((thisMin / goalMin) * 100)) : 0

  // --- Quiz weak topics (client can also fetch /api/quiz; embedded for one round-trip) ---
  const topicAgg = new Map<string, { sum: number; n: number }>()
  for (const a of quizAttempts) {
    if (!a.topic) continue
    const k = `${a.subject}::${a.topic}`
    const cur = topicAgg.get(k) ?? { sum: 0, n: 0 }
    cur.sum += a.score
    cur.n += 1
    topicAgg.set(k, cur)
  }
  const weakTopics = [...topicAgg.entries()]
    .filter(([, v]) => v.n >= 3)
    .map(([k, v]) => ({ subject: k.split('::')[0], topic: k.split('::')[1], avgScore: Math.round(v.sum / v.n), attempts: v.n }))
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 4)

  // --- Smart next action: priority-ordered, from real data only ---
  const overdue = tasksAll.filter((t) => t.status !== 'COMPLETED' && t.dueDate && t.dueDate < now).length
  const dueTomorrow = tasksAll.filter(
    (t) => t.status !== 'COMPLETED' && t.dueDate && t.dueDate >= now && t.dueDate < new Date(startOfDay(now).getTime() + 2 * 864e5),
  ).length
  let nextAction: { kind: 'FOCUS' | 'TASK' | 'QUIZ' | 'REST'; text: string; href: string } | null = null
  if (overdue > 0) {
    nextAction = openTaskSample
      ? { kind: 'TASK', text: `${overdue} overdue task${overdue === 1 ? '' : 's'} — start with "${openTaskSample.title.slice(0, 60)}".`, href: '/tasks?filter=overdue' }
      : { kind: 'TASK', text: `You have ${overdue} overdue task${overdue === 1 ? '' : 's'}.`, href: '/tasks?filter=overdue' }
  } else if (goalMin > 0 && thisMin < goalMin) {
    nextAction = { kind: 'FOCUS', text: `${goalMin - thisMin} minutes left on your weekly goal — one session gets you closer.`, href: '/focus' }
  } else if (dueTomorrow > 0) {
    nextAction = { kind: 'TASK', text: `${dueTomorrow} task${dueTomorrow === 1 ? '' : 's'} due tomorrow.`, href: '/tasks' }
  } else if (weakTopics.length > 0) {
    nextAction = { kind: 'QUIZ', text: `Your weakest topic is ${weakTopics[0].topic} (${weakTopics[0].avgScore}%). Practice it.`, href: '/my-study' }
  } else if (!hasStudyData) {
    nextAction = { kind: 'FOCUS', text: 'Start your first focus session — 25 minutes is a great beginning.', href: '/focus' }
  }

  // --- Summary ---
  const tasksCompleted = tasksAll.filter((t) => t.status === 'COMPLETED').length

  return ok({
    summary: {
      thisWeekMin: thisMin,
      lastWeekMin: lastMin,
      sessions: thisWeek.length,
      tasksCompleted,
      tasksOpen: tasksAll.filter((t) => t.status !== 'COMPLETED').length,
      overdue,
      streak: streak.current,
    },
    consistency,
    subjects,
    patterns,
    goal: { weeklyGoalMin: goalMin, weekMinutes: thisMin, pct: goalPct },
    weakTopics,
    nextAction,
    hasStudyData,
    quizCount: quizAttempts.length,
  })
})
