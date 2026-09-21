import 'server-only'
import { prisma } from '@/lib/prisma'
import { requireMembership } from '@/lib/groups'
import { AuthError } from '@/lib/auth'

export const WEAK_TOPIC_MIN_ATTEMPTS = 3
export const WEAK_TOPIC_THRESHOLD = 70

export interface WeakTopic {
  subject: string
  topic: string
  avgScore: number
  attempts: number
}

export interface StudySnapshot {
  groups: Array<{ id: string; name: string; subject: string; memberCount: number }>
  openTasks: Array<{ title: string; subject: string | null; dueDate: string | null; overdue: boolean; groupName: string | null }>
  overdueCount: number
  upcomingSessions: Array<{ title: string; startsAt: string; groupName: string | null; location: string | null; isOnline: boolean }>
  weekMinutes: number
  weekSessions: number
  streak: number
  weeklyGoalMin: number
  weakTopics: WeakTopic[]
  recentScores: Array<{ subject: string; topic: string | null; score: number }>
  notes: Array<{ id: string; title: string; groupName: string }>
}

function startOfWeekMonday(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7))
  return c
}

/**
 * Assemble the user's real study data for AI personalization. Every field is
 * read server-side from the database — the client can request *which* note or
 * action, but never supplies the data itself.
 */
export async function getStudySnapshot(userId: string): Promise<StudySnapshot> {
  const now = new Date()
  const weekStart = startOfWeekMonday(now)

  const [memberships, tasks, sessions, logs, streak, quizAttempts] = await Promise.all([
    prisma.groupMember.findMany({
      where: { userId },
      select: { group: { select: { id: true, name: true, subject: true, _count: { select: { members: true } } } } },
      take: 12,
    }),
    prisma.task.findMany({
      where: { OR: [{ assigneeId: userId }, { creatorId: userId, assigneeId: null }], status: { not: 'COMPLETED' } },
      orderBy: [{ dueDate: 'asc' }],
      take: 8,
      select: { title: true, subject: true, dueDate: true, group: { select: { name: true } } },
    }),
    prisma.studySession.findMany({
      where: {
        startsAt: { gte: now },
        OR: [{ creatorId: userId }, { group: { members: { some: { userId } } } }],
      },
      orderBy: { startsAt: 'asc' },
      take: 5,
      select: { title: true, startsAt: true, location: true, isOnline: true, group: { select: { name: true } } },
    }),
    prisma.studySessionLog.findMany({
      where: { userId, startedAt: { gte: weekStart }, endedAt: { not: null } },
      select: { durationMinutes: true },
    }),
    prisma.studyStreak.upsert({ where: { userId }, update: {}, create: { userId }, select: { current: true, weeklyGoalMin: true } }),
    prisma.quizAttempt.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { subject: true, topic: true, score: true },
    }),
  ])

  const groupIds = memberships.map((m) => m.group.id)
  const notes = groupIds.length
    ? await prisma.note.findMany({
        where: { groupId: { in: groupIds } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: { id: true, title: true, group: { select: { name: true } } },
      })
    : []

  // Weak topics: same rule as GET /api/quiz (min sample, below threshold).
  const byTopic = new Map<string, { subject: string; topic: string; scores: number[] }>()
  for (const a of quizAttempts) {
    if (!a.topic) continue
    const key = `${a.subject}|||${a.topic}`
    const entry = byTopic.get(key) ?? { subject: a.subject, topic: a.topic, scores: [] }
    entry.scores.push(a.score)
    byTopic.set(key, entry)
  }
  const weakTopics: WeakTopic[] = [...byTopic.values()]
    .filter((e) => e.scores.length >= WEAK_TOPIC_MIN_ATTEMPTS)
    .map((e) => ({
      subject: e.subject,
      topic: e.topic,
      avgScore: Math.round(e.scores.reduce((s, x) => s + x, 0) / e.scores.length),
      attempts: e.scores.length,
    }))
    .filter((t) => t.avgScore < WEAK_TOPIC_THRESHOLD)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 5)

  return {
    groups: memberships.map((m) => ({ id: m.group.id, name: m.group.name, subject: m.group.subject, memberCount: m.group._count.members })),
    openTasks: tasks.map((t) => ({
      title: t.title,
      subject: t.subject,
      dueDate: t.dueDate ? t.dueDate.toISOString() : null,
      overdue: t.dueDate ? t.dueDate < now : false,
      groupName: t.group?.name ?? null,
    })),
    overdueCount: tasks.filter((t) => t.dueDate && t.dueDate < now).length,
    upcomingSessions: sessions.map((s) => ({
      title: s.title,
      startsAt: s.startsAt.toISOString(),
      groupName: s.group?.name ?? null,
      location: s.location,
      isOnline: s.isOnline,
    })),
    weekMinutes: logs.reduce((sum, l) => sum + l.durationMinutes, 0),
    weekSessions: logs.length,
    streak: streak.current,
    weeklyGoalMin: streak.weeklyGoalMin,
    weakTopics,
    recentScores: quizAttempts.slice(0, 5).map((a) => ({ subject: a.subject, topic: a.topic, score: a.score })),
    notes: notes.map((n) => ({ id: n.id, title: n.title, groupName: n.group.name })),
  }
}

/** Compact the snapshot into prompt context with hard size caps (cost control). */
export function formatSnapshotForPrompt(snap: StudySnapshot): string {
  const lines: string[] = ['[STUDY CONTEXT — the user\'s real data. Use it; never invent beyond it.]']
  lines.push(`Groups: ${snap.groups.length ? snap.groups.map((g) => `${g.name} (${g.subject}, ${g.memberCount} members)`).join('; ').slice(0, 600) : 'none yet'}`)
  lines.push(`This week: ${snap.weekMinutes} min across ${snap.weekSessions} sessions; streak ${snap.streak} days; weekly goal ${snap.weeklyGoalMin} min.`)
  if (snap.openTasks.length) {
    lines.push(`Open tasks: ${snap.openTasks.map((t) => `${t.title}${t.overdue ? ' (OVERDUE)' : ''}${t.groupName ? ` [${t.groupName}]` : ''}`).join('; ').slice(0, 700)}`)
  } else {
    lines.push('Open tasks: none.')
  }
  if (snap.upcomingSessions.length) {
    lines.push(`Upcoming sessions: ${snap.upcomingSessions.map((s) => `${s.title} at ${s.startsAt}${s.groupName ? ` [${s.groupName}]` : ''}`).join('; ').slice(0, 600)}`)
  } else {
    lines.push('Upcoming sessions: none booked.')
  }
  if (snap.weakTopics.length) {
    lines.push(`Weak topics (avg score, attempts): ${snap.weakTopics.map((w) => `${w.topic} (${w.subject}, ${w.avgScore}%, ${w.attempts} attempts)`).join('; ')}`)
  } else if (snap.recentScores.length) {
    lines.push(`Recent quiz scores: ${snap.recentScores.map((r) => `${r.subject}${r.topic ? `/${r.topic}` : ''} ${r.score}%`).join('; ')} (no topic has ${WEAK_TOPIC_MIN_ATTEMPTS}+ attempts below ${WEAK_TOPIC_THRESHOLD}% yet)`)
  } else {
    lines.push('Quiz history: none yet — say so explicitly instead of guessing weaknesses.')
  }
  if (snap.notes.length) {
    lines.push(`Accessible notes: ${snap.notes.map((n) => `"${n.title}" [${n.groupName}]`).join('; ').slice(0, 500)}`)
  }
  return lines.join('\n')
}

/**
 * Load a note's content for AI use — server-side with membership enforcement.
 * Throws 404 for unknown ids, 403 for non-members. Never trust client content.
 */
export async function authorizeNote(noteId: string, userId: string): Promise<{ title: string; content: string }> {
  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { groupId: true, title: true, content: true },
  })
  if (!note) throw new AuthError('Note not found', 404)
  await requireMembership(note.groupId, userId)
  return { title: note.title, content: note.content }
}
