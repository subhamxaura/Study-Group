import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { getProvider, isAIConfigured, isAIError, STUDYMATE_SYSTEM_PROMPT } from '@/lib/ai/provider'
import { getStudySnapshot, formatSnapshotForPrompt, authorizeNote } from '@/lib/ai/context'
import { aiChatSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

// GET — configuration status for the client (no secrets)
export const GET = withUser(async () => {
  return ok({ configured: isAIConfigured(), provider: process.env.AI_PROVIDER || 'openai' })
})

const ACTION_NEEDS_TOPIC = ['explain', 'quiz', 'flashcards'] as const

export const POST = withUser(async (user, req) => {
  // Paid API per request — 20 messages / 5 min / user.
  const rl = rateLimit(`ai:${user.id}`, 20, 5 * 60_000)
  if (!rl.ok) return fail('You are sending messages too quickly. Give StudyMate a moment.', 429, { retryAfter: rl.retryAfter })
  const data = await parseBody(req, aiChatSchema)
  const action = data.action ?? 'chat'
  const topic = (data.topic ?? '').trim()

  if ((ACTION_NEEDS_TOPIC as readonly string[]).includes(action) && !topic) {
    return fail('Tell StudyMate which topic to use.', 422)
  }
  if (action === 'summarize' && !data.context?.noteId) {
    return fail('Pick one of your notes for StudyMate to summarize.', 422)
  }

  // Note authorization happens BEFORE any provider check — the endpoint's
  // behavior must not leak whether a note id exists, configured or not.
  let noteTitle = ''
  let noteContext = ''
  if (data.context?.noteId) {
    try {
      const note = await authorizeNote(data.context.noteId, user.id)
      noteTitle = note.title
      noteContext = `\n\n[Study material — note "${note.title}"]\n"""\n${note.content.slice(0, 6000)}\n"""`
    } catch (err) {
      const status = err instanceof Error && 'status' in err ? (err as { status: number }).status : 500
      if (status === 404) return fail('Note not found', 404)
      return fail('You do not have access to that note', 403)
    }
  }

  const provider = getProvider()
  if (!provider) {
    return fail('StudyMate is not configured on this deployment. Set OPENAI_API_KEY to enable it.', 503)
  }

  // Resolve or create conversation
  let conversationId = data.conversationId
  if (conversationId) {
    const conv = await prisma.aIConversation.findUnique({ where: { id: conversationId }, select: { id: true, userId: true } })
    if (!conv || conv.userId !== user.id) return fail('Conversation not found', 404)
  } else {
    const conv = await prisma.aIConversation.create({
      data: { userId: user.id, title: (topic || data.message).slice(0, 60) },
    })
    conversationId = conv.id
  }

  const history = await prisma.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { role: true, content: true },
  })

  // Server-built prompts. Real data is gathered here — the client only names
  // the action/topic/note, never supplies content.
  let prompt = data.message
  let weakTopics: Array<{ subject: string; topic: string; avgScore: number; attempts: number }> | undefined
  let focusSuggestion: { subject: string; durationMin: number } | undefined

  if (action !== 'chat') {
    const snap = await getStudySnapshot(user.id)
    const ctx = formatSnapshotForPrompt(snap)
    if (action === 'explain') {
      prompt = `Explain the topic "${topic}" in simple terms with one concrete example. Keep it focused and student-friendly.\n\n${ctx}`
    } else if (action === 'quiz') {
      prompt = `Create 5 multiple-choice quiz questions about "${topic}". Use exactly this format:\nQ1. question\nA) option\nB) option\nC) option\nD) option\nAnswer: B\n(repeat for Q1-Q5)`
    } else if (action === 'flashcards') {
      prompt = `Create 8 flashcards about "${topic}". Use exactly this format, one card per line:\nQ: question on the front\nA: answer on the back\n(repeat Q:/A: pairs)`
    } else if (action === 'summarize') {
      prompt = `Summarize the study note below into tight bullet points: key ideas first, then definitions, then anything that looks exam-worthy.`
    } else if (action === 'weak-topics') {
      weakTopics = snap.weakTopics
      prompt = `The student asked: "${data.message || 'Find my weak topics.'}"\n\n${ctx}\n\nIdentify their weakest topics from the quiz data above and give concrete revision advice for the top one. If there is no quiz history or no topic has enough attempts, say so explicitly and suggest taking a quiz first — never invent weaknesses.`
    } else if (action === 'study-plan') {
      const total = data.durationMin ?? 60
      const weakest = snap.weakTopics[0]
      const focusSubject = weakest?.subject ?? snap.openTasks.find((t) => t.subject)?.subject ?? snap.groups[0]?.subject ?? 'General'
      focusSuggestion = { subject: focusSubject, durationMin: Math.min(25, total) }
      prompt = `Create a ${total}-minute study plan using ONLY the student's real data below. Format as time blocks like "00–25 min → Topic (why this topic)". Include a 5-minute break roughly every 25 minutes. Prioritize: 1) overdue tasks, 2) weak quiz topics, 3) revision before upcoming sessions. If there is almost no data, say so and propose a balanced starter plan.\n\n${ctx}`
    }
  }

  let completion: string
  try {
    completion = await provider.chat([
      { role: 'system', content: STUDYMATE_SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: prompt + noteContext },
    ])
  } catch (err) {
    // Classified provider failures → honest statuses. Anything else → generic.
    if (isAIError(err)) {
      return fail(err.message, err.status, err.retryAfter ? { retryAfter: err.retryAfter } : undefined)
    }
    console.error('[ai/chat] unexpected provider failure', err)
    return fail('StudyMate ran into a problem. Please try again.', 500)
  }

  await prisma.$transaction([
    prisma.aIMessage.create({ data: { conversationId, role: 'user', content: data.message } }),
    prisma.aIMessage.create({ data: { conversationId, role: 'assistant', content: completion } }),
  ])

  return ok({
    conversationId,
    reply: completion,
    ...(noteTitle ? { noteTitle } : {}),
    ...(weakTopics ? { weakTopics } : {}),
    ...(focusSuggestion ? { focusSuggestion } : {}),
  })
})
