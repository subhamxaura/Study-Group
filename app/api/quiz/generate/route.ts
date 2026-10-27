import { ok, fail, withUser, parseBody } from '@/lib/api'
import { getProvider, isAIConfigured, isAIError, chatJson } from '@/lib/ai/provider'
import { quizGenerateSchema, mcqListSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// POST /api/quiz/generate — AI-authored MCQs, structurally validated
// server-side. Returns the question set WITH the answer key so the client can
// run the interactive quiz; scoring still happens in POST /api/quiz, which
// recomputes the score from the submitted per-question records.
export const POST = withUser(async (user, req) => {
  // Generation is the expensive call — 10 sets / 5 min / user.
  const rl = rateLimit(`quizgen:${user.id}`, 10, 5 * 60_000)
  if (!rl.ok) return fail('You are generating quizzes too quickly. Give StudyMate a moment.', 429, { retryAfter: rl.retryAfter })
  const data = await parseBody(req, quizGenerateSchema)

  if (!isAIConfigured()) {
    return fail('StudyMate is not configured on this deployment. Set OPENAI_API_KEY or GEMINI_API_KEY to enable it.', 503)
  }
  const provider = getProvider()
  if (!provider) {
    return fail('StudyMate is not configured on this deployment. Set OPENAI_API_KEY or GEMINI_API_KEY to enable it.', 503)
  }

  const scope = data.topic ? `"${data.topic}" (${data.subject})` : `"${data.subject}"`
  const level = data.difficulty === 'EASY' ? 'basic recall' : data.difficulty === 'HARD' ? 'exam-level application' : 'understanding and application'
  let questions
  try {
    questions = await chatJson(
      provider,
      [
        {
          role: 'user',
          content: `Write ${data.count} multiple-choice questions about ${scope} at ${level} difficulty. Return a JSON array where each item is {"question": "...", "options": ["...", "...", "...", "..."], "correctIndex": 0-3}. Exactly 4 options per question, exactly one correct.`,
        },
      ],
      (raw) => mcqListSchema.parse(raw),
    )
  } catch (err) {
    if (isAIError(err)) {
      return fail(err.message, err.status, err.retryAfter ? { retryAfter: err.retryAfter } : undefined)
    }
    console.error('[quiz/generate] unexpected provider failure', err)
    return fail('StudyMate ran into a problem. Please try again.', 500)
  }

  return ok({ questions, subject: data.subject, topic: data.topic || null, difficulty: data.difficulty })
})
