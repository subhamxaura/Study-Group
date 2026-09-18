import { prisma } from '@/lib/prisma'
import { ok, withUser } from '@/lib/api'

export const dynamic = 'force-dynamic'

// GET /api/search?q=... — grouped results across entity types
export const GET = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) return ok({ groups: [], people: [], resources: [], messages: [], tasks: [], sessions: [], notes: [] })
  const like = { contains: q, mode: 'insensitive' as const }

  const myGroups = await prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } })
  const myGroupIds = myGroups.map((m) => m.groupId)

  const [groups, people, resources, messages, tasks, sessions, notes] = await Promise.all([
    prisma.group.findMany({
      where: { isPublic: true, OR: [{ name: like }, { subject: like }, { tags: { has: q.toLowerCase() } }] },
      take: 5,
      select: { id: true, name: true, subject: true, _count: { select: { members: true } } },
    }),
    // People: privacy-aware — private profiles never surface in search
    prisma.user.findMany({
      where: {
        profilePrivacy: { not: 'PRIVATE' },
        OR: [{ name: like }, { university: like }],
      },
      take: 5,
      select: { id: true, name: true, avatarUrl: true, university: true },
    }),
    // Resources: only from groups I belong to (personal resources have no groupId)
    prisma.resource.findMany({
      where: {
        groupId: { in: myGroupIds },
        OR: [{ title: like }, { description: like }],
      },
      take: 5,
      select: { id: true, title: true, type: true, groupId: true, group: { select: { name: true } } },
    }),
    prisma.message.findMany({
      where: { groupId: { in: myGroupIds }, deletedAt: null, content: like },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: { id: true, content: true, createdAt: true, groupId: true, group: { select: { name: true } }, user: { select: { name: true } } },
    }),
    prisma.task.findMany({
      where: {
        OR: [{ assigneeId: user.id }, { creatorId: user.id }, { groupId: { in: myGroupIds } }],
        title: like,
      },
      take: 5,
      select: { id: true, title: true, status: true, groupId: true, group: { select: { name: true } } },
    }),
    prisma.studySession.findMany({
      where: { OR: [{ creatorId: user.id }, { groupId: { in: myGroupIds } }], title: like },
      take: 5,
      orderBy: { startsAt: 'asc' },
      select: { id: true, title: true, startsAt: true, groupId: true, group: { select: { name: true } } },
    }),
    // Notes: only from groups I belong to (permission-aware)
    prisma.note.findMany({
      where: { groupId: { in: myGroupIds }, OR: [{ title: like }, { content: like }] },
      take: 5,
      orderBy: { updatedAt: 'desc' },
      select: { id: true, title: true, updatedAt: true, groupId: true, group: { select: { name: true } } },
    }),
  ])

  return ok({ groups, people, resources, messages, tasks, sessions, notes })
})
