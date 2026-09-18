import { prisma } from '@/lib/prisma'
import { ok, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { noteSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// GET /api/notes?groupId=&q=
export const GET = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId') || ''
  if (!groupId) return ok({ notes: [] })
  await requireMembership(groupId, user.id)
  const q = searchParams.get('q')?.trim()

  const notes = await prisma.note.findMany({
    where: {
      groupId,
      ...(q ? { OR: [
        { title: { contains: q, mode: 'insensitive' as const } },
        { content: { contains: q, mode: 'insensitive' as const } },
      ] } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  })
  return ok({ notes })
})

// POST /api/notes
export const POST = withUser(async (user, req) => {
  const data = await parseBody(req, noteSchema)
  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId') || ''
  if (!groupId) return ok({ error: 'groupId required' }, { status: 422 })
  await requireMembership(groupId, user.id)

  const note = await prisma.note.create({
    data: {
      groupId,
      authorId: user.id,
      title: data.title,
      content: data.content,
      kind: data.kind,
      tags: data.tags,
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  })
  return ok({ note })
})
