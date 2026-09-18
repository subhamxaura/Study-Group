import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { noteSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// PUT — versioned edit. Every save snapshots the outgoing state into
// NoteVersion before applying the update, so history is complete and restorable.
// This is versioned collaboration, not realtime co-editing.
export const PUT = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const note = await prisma.note.findUnique({ where: { id }, select: { id: true, groupId: true, version: true, title: true, content: true, kind: true, tags: true } })
  if (!note) return fail('Note not found', 404)
  await requireMembership(note.groupId, user.id)

  const data = await parseBody(req, noteSchema)
  const updated = await prisma.$transaction(async (tx) => {
    await tx.noteVersion.create({
      data: {
        noteId: note.id,
        version: note.version,
        title: note.title,
        content: note.content,
        kind: note.kind,
        tags: note.tags,
        editorId: user.id,
      },
    })
    return tx.note.update({
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
  })
  return ok({ note: updated })
})

// GET ?versions=1 — version history (metadata + content) for the editor
export const GET = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const { searchParams } = new URL(req.url)
  if (searchParams.get('versions') !== '1') {
    // Default GET returns the note itself (kept for the editor open flow)
    const note = await prisma.note.findUnique({
      where: { id },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    })
    if (!note) return fail('Note not found', 404)
    await requireMembership(note.groupId, user.id)
    return ok({ note })
  }
  const note = await prisma.note.findUnique({ where: { id }, select: { groupId: true } })
  if (!note) return fail('Note not found', 404)
  await requireMembership(note.groupId, user.id)
  const versions = await prisma.noteVersion.findMany({
    where: { noteId: id },
    orderBy: { version: 'desc' },
    take: 30,
    select: {
      id: true, version: true, title: true, content: true, kind: true, tags: true, createdAt: true,
      editor: { select: { id: true, name: true } },
    },
  })
  return ok({ versions })
})

// POST — restore a version: applies its content as a NEW version (history is never rewritten)
export const POST = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const body = await req.json().catch(() => null) as { versionId?: string } | null
  if (!body?.versionId) return fail('versionId is required', 422)
  const note = await prisma.note.findUnique({ where: { id }, select: { id: true, groupId: true, version: true } })
  if (!note) return fail('Note not found', 404)
  await requireMembership(note.groupId, user.id)
  const version = await prisma.noteVersion.findUnique({ where: { id: body.versionId } })
  if (!version || version.noteId !== id) return fail('Version not found', 404)

  const restored = await prisma.$transaction(async (tx) => {
    const current = await tx.note.findUniqueOrThrow({ where: { id }, select: { title: true, content: true, kind: true, tags: true, version: true } })
    await tx.noteVersion.create({
      data: { noteId: id, version: current.version, title: current.title, content: current.content, kind: current.kind, tags: current.tags, editorId: user.id },
    })
    return tx.note.update({
      where: { id },
      data: { title: version.title, content: version.content, kind: version.kind, tags: version.tags, version: { increment: 1 } },
      include: { author: { select: { id: true, name: true, avatarUrl: true } } },
    })
  })
  return ok({ note: restored })
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
