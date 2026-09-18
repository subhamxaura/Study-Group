import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership, requireRole } from '@/lib/groups'
import { updateGroupSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const GET = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      _count: { select: { members: true, messages: true, sessions: true, resources: true, notes: true } },
      members: {
        select: {
          role: true, joinedAt: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
      sessions: {
        where: { startsAt: { gte: new Date() } },
        orderBy: { startsAt: 'asc' },
        take: 5,
        include: { _count: { select: { rsvps: { where: { status: 'GOING' } } } } },
      },
      resources: { orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, title: true, type: true, createdAt: true, uploader: { select: { name: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 5, where: { deletedAt: null },
        select: { id: true, content: true, createdAt: true, user: { select: { name: true, avatarUrl: true } } } },
    },
  })
  if (!group) return fail('Group not found', 404)

  const membership = group.members.find((m) => m.user.id === user.id)
  const isMember = Boolean(membership)
  // Private groups: only members can see content beyond the header.
  if (!group.isPublic && !isMember) {
    return ok({
      group: {
        id: group.id, name: group.name, description: group.description, subject: group.subject,
        university: group.university, isPublic: false, memberCount: group._count.members,
        tags: group.tags, avatarUrl: group.avatarUrl,
      },
      myRole: null,
      restricted: true,
    })
  }

  const detail = {
    id: group.id,
    name: group.name,
    description: group.description,
    subject: group.subject,
    university: group.university,
    semester: group.semester,
    difficulty: group.difficulty,
    avatarUrl: group.avatarUrl,
    isPublic: group.isPublic,
    tags: group.tags,
    pinnedAnnouncement: group.pinnedAnnouncement,
    createdAt: group.createdAt,
    ownerId: group.ownerId,
    memberCount: group._count.members,
    messageCount: group._count.messages,
    sessionCount: group._count.sessions,
    resourceCount: group._count.resources,
    noteCount: group._count.notes,
    members: group.members,
    upcomingSessions: group.sessions.map((s) => ({
      id: s.id, title: s.title, startsAt: s.startsAt.toISOString(),
      goingCount: s._count.rsvps,
    })),
    recentResources: group.resources.map((r) => ({
      id: r.id, title: r.title, type: r.type, createdAt: r.createdAt.toISOString(),
      uploader: r.uploader,
    })),
    recentMessages: group.messages.map((m) => ({
      id: m.id, content: m.content, createdAt: m.createdAt.toISOString(), user: m.user,
    })),
  }

  return ok({ group: detail, myRole: membership?.role ?? null, restricted: false })
})

export const PATCH = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireRole(id, user.id, 'ADMIN')
  const data = await parseBody(req, updateGroupSchema)
  const group = await prisma.group.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.university !== undefined && { university: data.university || null }),
      ...(data.semester !== undefined && { semester: data.semester || null }),
      ...(data.difficulty !== undefined && { difficulty: data.difficulty }),
      ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
      ...(data.tags !== undefined && { tags: data.tags }),
      ...(data.pinnedAnnouncement !== undefined && { pinnedAnnouncement: data.pinnedAnnouncement }),
    },
    select: { id: true, name: true },
  })
  return ok({ group })
})

export const DELETE = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  await requireRole(id, user.id, 'OWNER')
  await prisma.group.delete({ where: { id } })
  return ok({ deleted: true })
})
