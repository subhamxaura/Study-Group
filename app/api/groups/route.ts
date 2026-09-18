import { prisma } from '@/lib/prisma'
import { ok, withUser, parseBody } from '@/lib/api'
import { createGroupSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// GET /api/groups?q=&subject=&university=&semester=&difficulty=&size=&activity=&visibility=&page=&pageSize=&mine=1
export const GET = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const subject = searchParams.get('subject')
  const university = searchParams.get('university')
  const semester = searchParams.get('semester')
  const difficulty = searchParams.get('difficulty')
  const size = searchParams.get('size')        // e.g. "small" | "medium" | "large"
  const activity = searchParams.get('activity') // "7d" | "30d"
  const visibility = searchParams.get('visibility') // "public" | "private"
  const mine = searchParams.get('mine') === '1'
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(48, Math.max(6, Number(searchParams.get('pageSize') ?? 24) || 24))

  const where = mine
    ? { members: { some: { userId: user.id } } }
    : {
        isPublic: true,
        ...(subject ? { subject: { equals: subject, mode: 'insensitive' as const } } : {}),
        ...(university ? { university: { equals: university, mode: 'insensitive' as const } } : {}),
        ...(semester ? { semester } : {}),
        ...(difficulty ? { difficulty } : {}),
        ...(visibility === 'private' ? { isPublic: false } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { description: { contains: q, mode: 'insensitive' as const } },
                { subject: { contains: q, mode: 'insensitive' as const } },
                { tags: { has: q.toLowerCase() } },
              ],
            }
          : {}),
      }

  if (activity) {
    const since = new Date(Date.now() - Number(activity) * 24 * 60 * 60 * 1000)
    Object.assign(where, { messages: { some: { createdAt: { gte: since } } } })
  }

  const [total, groups] = await Promise.all([
    prisma.group.count({ where }),
    prisma.group.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true, name: true, description: true, subject: true, university: true,
        semester: true, difficulty: true, avatarUrl: true, isPublic: true, tags: true,
        createdAt: true,
        _count: { select: { members: true, messages: true, sessions: true, resources: true } },
        members: { where: { userId: user.id }, select: { role: true } },
      },
    }),
  ])

  const mapped = groups.map((g) => {
    const count = g._count.members
    let sizeBand = 'any'
    if (size === 'small') sizeBand = count <= 5 ? 'match' : 'no'
    if (size === 'medium') sizeBand = count > 5 && count <= 15 ? 'match' : 'no'
    if (size === 'large') sizeBand = count > 15 ? 'match' : 'no'
    return {
      id: g.id, name: g.name, description: g.description, subject: g.subject,
      university: g.university, semester: g.semester, difficulty: g.difficulty,
      avatarUrl: g.avatarUrl, isPublic: g.isPublic, tags: g.tags, createdAt: g.createdAt,
      memberCount: count,
      messageCount: g._count.messages,
      sessionCount: g._count.sessions,
      resourceCount: g._count.resources,
      myRole: g.members[0]?.role ?? null,
      _sizeMatch: size ? sizeBand !== 'no' : true,
    }
  })

  const filtered = size ? mapped.filter((g) => g._sizeMatch) : mapped
  return ok({ groups: filtered, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) })
})

// POST /api/groups — create group (creator becomes OWNER)
export const POST = withUser(async (user, req) => {
  const data = await parseBody(req, createGroupSchema)
  const group = await prisma.group.create({
    data: {
      name: data.name,
      description: data.description,
      subject: data.subject,
      university: data.university || null,
      course: data.course || null,
      semester: data.semester || null,
      difficulty: data.difficulty,
      isPublic: data.isPublic,
      tags: data.tags,
      ownerId: user.id,
      members: { create: { userId: user.id, role: 'OWNER' } },
    },
    select: { id: true, name: true },
  })
  return ok({ group })
})
