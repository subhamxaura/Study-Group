import { prisma } from '@/lib/prisma'
import { ok, fail, withUser } from '@/lib/api'
import { requireMembership } from '@/lib/groups'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

// DELETE /api/resources/:id
export const DELETE = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { id: true, uploaderId: true, groupId: true },
  })
  if (!resource) return fail('Resource not found', 404)
  let canDelete = resource.uploaderId === user.id
  if (resource.groupId && !canDelete) {
    const m = await requireMembership(resource.groupId, user.id)
    canDelete = m.role === 'ADMIN' || m.role === 'OWNER'
  }
  if (!canDelete) return fail('Not allowed', 403)
  await prisma.resource.delete({ where: { id } })
  return ok({ deleted: true })
})

// PATCH /api/resources/:id?track=view|download — increments counters (must have access to the resource)
export const PATCH = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const { searchParams } = new URL(req.url)
  const track = searchParams.get('track')
  if (track !== 'view' && track !== 'download') return fail('track must be view or download', 422)
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { id: true, groupId: true },
  })
  if (!resource) return fail('Resource not found', 404)
  if (resource.groupId) {
    await requireMembership(resource.groupId, user.id)
  }
  const updated = await prisma.resource.update({
    where: { id },
    data: track === 'view' ? { views: { increment: 1 } } : { downloads: { increment: 1 } },
    select: { id: true, views: true, downloads: true },
  })
  return ok({ resource: updated })
})
