import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { noteSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const GET = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const note = await prisma.note.findUnique({
    where: { id },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  })
  if (!note) return fail('Note not found', 404)
  await requireMembership(note.groupId, user.id)
  return ok({ note })
})

// PUT — versioned edit (no fake realtime collaboration; clean version bump instead)
export const PUT = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const note = await prisma.note.findUnique({ where: { id }, select: { id: true, groupId: true, version: true } })
  if (!note) return fail('Note not found', 404)
  await requireMembership(note.groupId, user.id)

  const data = await parseBody(req, noteSchema)
  const updated = await prisma.note.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content,
      kind: data.kind,
      tags: data.tags,
      version: { increment: 1 },
    },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  })
  return ok({ note: updated })
})

export const DELETE = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const note = await prisma.note.findUnique({ where: { id }, select: { id: true, groupId: true, authorId: true } })
  if (!note) return fail('Note not found', 404)
  const m = await requireMembership(note.groupId, user.id)
  const canDelete = note.authorId === user.id || m.role === 'ADMIN' || m.role === 'OWNER'
  if (!canDelete) return fail('Not allowed', 403)
  await prisma.note.delete({ where: { id } })
  return ok({ deleted: true })
})
