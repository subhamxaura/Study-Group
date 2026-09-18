import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { profileSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// GET /api/profile?userId=... — privacy-aware profile fields only
export const GET = withUser(async (viewer, req) => {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId') || viewer.id
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, avatarUrl: true, university: true, course: true,
      semester: true, bio: true, subjects: true, interests: true, createdAt: true,
      profilePrivacy: true,
      streak: { select: { current: true, longest: true } },
      memberships: { select: { group: { select: { id: true, name: true, subject: true } } } },
      focusLogs: { select: { durationMinutes: true } },
      tasksAssigned: { where: { status: 'COMPLETED' }, select: { id: true } },
      sessionsCreated: { select: { id: true } },
      resources: { select: { id: true, title: true, type: true, url: true, createdAt: true } },
    },
  })
  if (!user) return fail('User not found', 404)

  const isSelf = userId === viewer.id

  // Privacy gate: PRIVATE -> self only; GROUPS -> self or co-members
  let allowed = isSelf
  if (!allowed && user.profilePrivacy === 'GROUPS') {
    const shared = await prisma.groupMember.findFirst({
      where: { userId: viewer.id, group: { members: { some: { userId } } } },
      select: { id: true },
    })
    allowed = Boolean(shared)
  } else if (!allowed && user.profilePrivacy === 'PUBLIC') {
    allowed = true
  }
  if (!allowed) return fail('This profile is private', 403)

  // Shared-groups view strips stats/resources for non-self on GROUPS privacy
  const showFull = isSelf || user.profilePrivacy === 'PUBLIC'
  const studyMinutes = user.focusLogs.reduce((sum, l) => sum + l.durationMinutes, 0)

  return ok({
    profile: {
      id: user.id, name: user.name, avatarUrl: user.avatarUrl, university: user.university,
      course: user.course, semester: user.semester, bio: user.bio, subjects: user.subjects,
      interests: user.interests, joinedAt: user.createdAt,
      privacy: user.profilePrivacy,
      stats: showFull
        ? {
            studyHours: Math.round(studyMinutes / 6) / 10,
            groups: user.memberships.length,
            sessions: user.sessionsCreated.length,
            tasksCompleted: user.tasksAssigned.length,
            streak: user.streak?.current ?? 0,
          }
        : null,
      groups: showFull ? user.memberships.map((m) => m.group) : [],
      resources: showFull ? user.resources : [],
    },
    isSelf,
  })
})

const putSchema = profileSchema.extend({
  privacy: z.enum(['PUBLIC', 'GROUPS', 'PRIVATE']).optional(),
})

export const PUT = withUser(async (user, req) => {
  const data = await parseBody(req, putSchema)
  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: data.name,
      bio: data.bio || null,
      university: data.university || null,
      course: data.course || null,
      semester: data.semester || null,
      subjects: data.subjects ?? [],
      interests: data.interests ?? [],
      ...(data.privacy ? { profilePrivacy: data.privacy } : {}),
    },
  })
  return ok({ user: { id: updated.id, name: updated.name } })
})
