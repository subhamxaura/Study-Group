import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { getProvider, isAIConfigured, STUDYMATE_SYSTEM_PROMPT } from '@/lib/ai/provider'
import { aiChatSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'
import { requireMembership } from '@/lib/groups'

export const dynamic = 'force-dynamic'

// GET — configuration status for the client (no secrets)
export const GET = withUser(async () => {
  return ok({ configured: isAIConfigured(), provider: process.env.AI_PROVIDER || 'openai' })
})

export const POST = withUser(async (user, req) => {
  if (!isAIConfigured()) {
    return fail('StudyMate is not configured on this deployment. Set OPENAI_API_KEY to enable it.', 503)
  }
  // Paid API per request — 20 messages / 5 min / user.
  const rl = rateLimit(`ai:${user.id}`, 20, 5 * 60_000)
  if (!rl.ok) return fail('You are sending messages too quickly. Give StudyMate a moment.', 429, { retryAfter: rl.retryAfter })
  const data = await parseBody(req, aiChatSchema)
  const provider = getProvider()
  if (!provider) {
    // Even with AI unconfigured, a requested note must be authorized first —
    // the endpoint's behavior must not leak whether a note id exists.
    if (data.context?.noteId) {
      const note = await prisma.note.findUnique({ where: { id: data.context.noteId }, select: { groupId: true } })
      if (!note) return fail('Note not found', 404)
      await requireMembership(note.groupId, user.id)
    }
    return fail('StudyMate is not configured on this deployment. Set OPENAI_API_KEY to enable it.', 503)
  }

  // Resolve or create conversation
  let conversationId = data.conversationId
  if (conversationId) {
    const conv = await prisma.aIConversation.findUnique({ where: { id: conversationId }, select: { id: true, userId: true } })
    if (!conv || conv.userId !== user.id) return fail('Conversation not found', 404)
  } else {
    const conv = await prisma.aIConversation.create({
      data: { userId: user.id, title: data.message.slice(0, 60) },
    })
    conversationId = conv.id
  }

  const history = await prisma.aIMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 20,
    select: { role: true, content: true },
  })

  // Study context: when a noteId is given, the SERVER loads and authorizes the
  // note — client-sent noteContent is never trusted (a student could otherwise
  // make StudyMate read a private note they can access only by guessing ids).
  let noteContext = ''
  if (data.context?.noteId) {
    const note = await prisma.note.findUnique({
      where: { id: data.context.noteId },
      select: { id: true, groupId: true, title: true, content: true },
    })
    if (!note) return fail('Note not found', 404)
    await requireMembership(note.groupId, user.id)
    noteContext = `\n\n[Study material — note "${note.title}"]\n"""\n${note.content.slice(0, 6000)}\n"""`
  }

  const completion = await provider.chat([
    { role: 'system', content: STUDYMATE_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: data.message + noteContext },
  ])

  await prisma.$transaction([
    prisma.aIMessage.create({ data: { conversationId, role: 'user', content: data.message } }),
    prisma.aIMessage.create({ data: { conversationId, role: 'assistant', content: completion } }),
  ])

  return ok({ conversationId, reply: completion })
})
