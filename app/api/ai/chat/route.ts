import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { getProvider, isAIConfigured, STUDYMATE_SYSTEM_PROMPT } from '@/lib/ai/provider'
import { aiChatSchema } from '@/lib/validation'
import { rateLimit } from '@/lib/rateLimit'

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
  if (!provider) return fail('AI provider unavailable', 503)

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

  const contextBlock = data.context?.noteContent
    ? `\n\n[Study material provided by the student]\n"""\n${data.context.noteContent.slice(0, 6000)}\n"""`
    : ''

  const completion = await provider.chat([
    { role: 'system', content: STUDYMATE_SYSTEM_PROMPT },
    ...history,
    { role: 'user', content: data.message + contextBlock },
  ])

  await prisma.$transaction([
    prisma.aIMessage.create({ data: { conversationId, role: 'user', content: data.message } }),
    prisma.aIMessage.create({ data: { conversationId, role: 'assistant', content: completion } }),
  ])

  return ok({ conversationId, reply: completion })
})
