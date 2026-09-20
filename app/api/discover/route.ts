import { prisma } from '@/lib/prisma'
import { ok, withUser } from '@/lib/api'

export const dynamic = 'force-dynamic'

// GET /api/discover — personalized sections for the Discover page
export const GET = withUser(async (user) => {
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { subjects: true, course: true, semester: true, university: true },
  })
  const myGroups = await prisma.groupMember.findMany({ where: { userId: user.id }, select: { groupId: true } })
  const myGroupIds = myGroups.map((m) => m.groupId)
  const since7d = new Date(Date.now() - 7 * 864e5)

  const baseSelect = {
    id: true, name: true, description: true, subject: true, university: true,
    semester: true, difficulty: true, avatarUrl: true, isPublic: true, tags: true,
    _count: { select: { members: true } },
  } as const

  const visibility = { isPublic: true, id: { notIn: myGroupIds } }

  // Candidate groups matching my subjects (fallback: everything public)
  const subjectFilter = me?.subjects.length
    ? { OR: me.subjects.map((s) => ({ subject: { equals: s, mode: 'insensitive' as const } })) }
    : {}

  const [candidates, trendingRaw, activeRaw, newestRaw, counts] = await Promise.all([
    prisma.group.findMany({
      where: { ...visibility, ...subjectFilter },
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: baseSelect,
    }),
    // Trending: most messages in the last 7 days among public groups
    prisma.message.groupBy({
      by: ['groupId'],
      where: { createdAt: { gte: since7d }, group: { isPublic: true } },
      _count: { groupId: true },
      orderBy: { _count: { groupId: 'desc' } },
      take: 6,
    }),
    // Recently active: latest message recency among public groups
    prisma.group.findMany({
      where: { ...visibility, messages: { some: { createdAt: { gte: since7d } } } },
      take: 6,
      orderBy: { updatedAt: 'desc' },
      select: baseSelect,
    }),
    prisma.group.findMany({
      where: visibility,
      take: 6,
      orderBy: { createdAt: 'desc' },
      select: baseSelect,
    }),
    prisma.message.groupBy({
      by: ['groupId'],
      where: { createdAt: { gte: since7d } },
      _count: { groupId: true },
    }),
  ])

  const messageCountByGroup = new Map(counts.map((c) => [c.groupId, c._count.groupId]))

  // Fill trending candidates — exclude groups I'm already in, same as every
  // other section (my own groups are not join recommendations).
  const trendingIds = trendingRaw.map((t) => t.groupId).filter((id) => !myGroupIds.includes(id))
  const trendingGroups = trendingIds.length
    ? await prisma.group.findMany({
        where: { id: { in: trendingIds }, isPublic: true },
        select: baseSelect,
      })
    : []

  const decorate = (g: (typeof newestRaw)[number], weeklyMessages?: number) => ({
    id: g.id, name: g.name, description: g.description, subject: g.subject,
    university: g.university, semester: g.semester, difficulty: g.difficulty,
    avatarUrl: g.avatarUrl, isPublic: g.isPublic, tags: g.tags,
    memberCount: g._count.members,
    joined: myGroupIds.includes(g.id),
    weeklyMessages: weeklyMessages ?? messageCountByGroup.get(g.id) ?? 0,
  })

  const byId = new Map(trendingGroups.map((g) => [g.id, g]))
  const trending = trendingRaw
    .map((t) => byId.get(t.groupId))
    .filter(Boolean)
    .map((g) => decorate(g!, trendingRaw.find((t) => t.groupId === g!.id)?._count.groupId))

  const recommended = candidates.map((g) => decorate(g))
  const recentlyActive = activeRaw.map((g) => decorate(g))
  const newest = newestRaw.map((g) => decorate(g))

  return ok({ recommended, trending, recentlyActive, newest, hasSubjects: Boolean(me?.subjects.length) })
})
