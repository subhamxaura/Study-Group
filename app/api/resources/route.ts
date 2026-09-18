import { prisma } from '@/lib/prisma'
import { ok, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { resourceSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// GET /api/resources?groupId=&q=&type=&sort=&page=&saved=1
export const GET = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  const groupId = searchParams.get('groupId') || undefined
  const q = searchParams.get('q')?.trim()
  const type = searchParams.get('type')
  const sort = searchParams.get('sort') || 'recent'
  const saved = searchParams.get('saved') === '1'
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(48, Math.max(6, Number(searchParams.get('pageSize') ?? 24) || 24))

  const where = saved
    ? { bookmarks: { some: { userId: user.id } } }
    : {
        ...(groupId ? { groupId } : {}),
        ...(type && type !== 'ALL' ? { type: type as 'PDF' | 'NOTE' | 'LINK' | 'VIDEO' | 'IMAGE' | 'DOCUMENT' } : {}),
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { description: { contains: q, mode: 'insensitive' as const } },
                { tags: { has: q.toLowerCase() } },
              ],
            }
          : {}),
      }

  const orderBy =
    sort === 'popular' ? { downloads: 'desc' as const }
    : sort === 'views' ? { views: 'desc' as const }
    : { createdAt: 'desc' as const }

  const [total, resources] = await Promise.all([
    prisma.resource.count({ where }),
    prisma.resource.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        uploader: { select: { id: true, name: true, avatarUrl: true } },
        group: { select: { id: true, name: true } },
        _count: { select: { bookmarks: true } },
        bookmarks: { where: { userId: user.id }, select: { id: true } },
      },
    }),
  ])
  return ok({
    resources: resources.map((r) => ({
      id: r.id, title: r.title, description: r.description, type: r.type, url: r.url,
      tags: r.tags, views: r.views, downloads: r.downloads, createdAt: r.createdAt,
      isFile: r.isFile, sizeBytes: r.sizeBytes, mimeType: r.mimeType,
      uploader: r.uploader, group: r.group,
      isBookmarked: r.bookmarks.length > 0, bookmarkCount: r._count.bookmarks,
    })),
    total, page, pageSize,
  })
})

// POST /api/resources
export const POST = withUser(async (user, req) => {
  const data = await parseBody(req, resourceSchema)
  if (data.groupId) await requireMembership(data.groupId, user.id)

  const resource = await prisma.resource.create({
    data: {
      groupId: data.groupId || null,
      uploaderId: user.id,
      title: data.title,
      description: data.description || null,
      type: data.type,
      url: data.url,
      tags: data.tags,
    },
    include: { uploader: { select: { id: true, name: true } }, group: { select: { id: true, name: true } } },
  })

  if (data.groupId) {
    const members = await prisma.groupMember.findMany({
      where: { groupId: data.groupId, userId: { not: user.id } },
      select: { userId: true },
    })
    if (members.length) {
      await prisma.notification.createMany({
        data: members.map((m) => ({
          userId: m.userId,
          kind: 'RESOURCE_SHARED' as const,
          title: `New resource: ${resource.title}`,
          body: `${user.name} shared a resource${resource.group ? ` in ${resource.group.name}` : ''}.`,
          link: data.groupId ? `/groups/${data.groupId}/resources` : '/resources',
        })),
      })
    }
  }
  return ok({ resource })
})
