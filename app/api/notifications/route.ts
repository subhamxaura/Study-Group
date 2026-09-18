import { z } from 'zod'
import { NotificationKind } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { ok, withUser, parseBody } from '@/lib/api'

export const dynamic = 'force-dynamic'

// GET /api/notifications?page=&pageSize=&kinds=MENTION,TASK_ASSIGNED
export const GET = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get('pageSize') ?? 15) || 15))
  const kindsParam = searchParams.get('kinds')
  const kinds = kindsParam
    ? kindsParam.split(',').filter((k): k is NotificationKind =>
        (Object.values(NotificationKind) as string[]).includes(k))
    : null

  const where = { userId: user.id, ...(kinds?.length ? { kind: { in: kinds } } : {}) }
  const [total, unreadCount, unreadInFilter, notifications] = await Promise.all([
    prisma.notification.count({ where: { userId: user.id } }),
    prisma.notification.count({ where: { userId: user.id, isRead: false } }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ])
  return ok({ notifications, unreadCount, unreadInFilter, total, page, pageSize })
})

export const PATCH = withUser(async (user, req) => {
  const schema = z.object({
    id: z.string().cuid().optional(),
    all: z.boolean().optional(),
    allInKinds: z.array(z.nativeEnum(NotificationKind)).optional(),
  })
  const { id, all, allInKinds } = await parseBody(req, schema)
  if (all || allInKinds) {
    await prisma.notification.updateMany({
      where: { userId: user.id, isRead: false, ...(allInKinds?.length ? { kind: { in: allInKinds } } : {}) },
      data: { isRead: true },
    })
    return ok({ updated: 'all' })
  }
  if (id) {
    await prisma.notification.updateMany({ where: { id, userId: user.id }, data: { isRead: true } })
  }
  return ok({ updated: id ?? null })
})
