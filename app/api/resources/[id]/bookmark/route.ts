import { prisma } from '@/lib/prisma'
import { ok, fail, withUser } from '@/lib/api'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const POST = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const resource = await prisma.resource.findUnique({ where: { id }, select: { id: true } })
  if (!resource) return fail('Resource not found', 404)

  const existing = await prisma.resourceBookmark.findUnique({
    where: { resourceId_userId: { resourceId: id, userId: user.id } },
  })
  if (existing) {
    await prisma.resourceBookmark.delete({ where: { id: existing.id } })
    return ok({ bookmarked: false })
  }
  await prisma.resourceBookmark.create({ data: { resourceId: id, userId: user.id } })
  return ok({ bookmarked: true })
})
