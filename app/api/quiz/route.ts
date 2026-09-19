import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { z } from 'zod'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

const answerSchema = z.object({
  question: z.string().trim().min(1).max(500),
  selectedAnswer: z.string().trim().min(1).max(300),
  correctAnswer: z.string().trim().min(1).max(300),
  isCorrect: z.boolean(),
})

const attemptSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  topic: z.string().trim().max(120).optional().nullable(),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD']).default('MEDIUM'),
  answers: z.array(answerSchema).min(1).max(20),
})

// Topics with fewer attempts than this are never classified as weak.
const WEAK_TOPIC_MIN_ATTEMPTS = 3
const WEAK_TOPIC_THRESHOLD = 70

// POST /api/quiz — persist a completed quiz attempt. The score is recomputed
// server-side from the per-question records; the client never dictates it.
export const POST = withUser(async (user, req) => {
  // Quiz submissions are cheap but unbounded spam would pollute analytics — modest limit.
  const rl = rateLimit(`quiz:${user.id}`, 30, 5 * 60_000)
  if (!rl.ok) return fail('Too many quiz submissions. Take a short break.', 429, { retryAfter: rl.retryAfter })

  const data = await parseBody(req, attemptSchema)
  const totalQuestions = data.answers.length
  const correctAnswers = data.answers.filter((a) => a.isCorrect).length
  const score = Math.round((correctAnswers / totalQuestions) * 100)

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId: user.id,
      subject: data.subject,
      topic: data.topic || null,
      difficulty: data.difficulty,
      totalQuestions,
      correctAnswers,
      score,
      answersJson: JSON.stringify(data.answers),
    },
    select: { id: true, score: true },
  })

  return ok({ attempt })
})

// GET /api/quiz — the signed-in user's own history + weak topics (private data).
export const GET = withUser(async (user) => {
  const attempts = await prisma.quizAttempt.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    select: {
      id: true, subject: true, topic: true, difficulty: true,
      totalQuestions: true, correctAnswers: true, score: true, createdAt: true,
    },
  })

  // Weak topics: aggregate by subject+topic, require the minimum sample size.
  const agg = await prisma.quizAttempt.groupBy({
    by: ['subject', 'topic'],
    where: { userId: user.id, topic: { not: null } },
    _avg: { score: true },
    _count: { _all: true },
    having: { topic: { not: null } },
  })
  const weakTopics = agg
    .filter((g) => (g._count._all ?? 0) >= WEAK_TOPIC_MIN_ATTEMPTS && (g._avg.score ?? 100) < WEAK_TOPIC_THRESHOLD)
    .sort((a, b) => (a._avg.score ?? 0) - (b._avg.score ?? 0))
    .slice(0, 5)
    .map((g) => ({ subject: g.subject, topic: g.topic as string, avgScore: Math.round(g._avg.score ?? 0), attempts: g._count._all ?? 0 }))

  return ok({ attempts, weakTopics, weakTopicMinAttempts: WEAK_TOPIC_MIN_ATTEMPTS })
})
