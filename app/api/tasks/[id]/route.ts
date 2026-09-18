import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { updateTaskSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

export const PATCH = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const task = await prisma.task.findUnique({
    where: { id },
    select: { id: true, groupId: true, creatorId: true, assigneeId: true, title: true },
  })
  if (!task) return fail('Task not found', 404)

  let canEdit = task.creatorId === user.id || task.assigneeId === user.id
  if (task.groupId && !canEdit) {
    const m = await requireMembership(task.groupId, user.id)
    canEdit = m.role === 'ADMIN' || m.role === 'OWNER'
  }
  if (!canEdit) return fail('You cannot edit this task', 403)

  const data = await parseBody(req, updateTaskSchema)
  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.progress !== undefined && { progress: data.progress }),
      ...(data.priority !== undefined && { priority: data.priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(data.assigneeId !== undefined && { assigneeId: data.assigneeId || null }),
      ...(data.isRecurring !== undefined && { isRecurring: data.isRecurring }),
    },
    include: {
      group: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
  })
  return ok({ task: updated })
})

export const DELETE = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const task = await prisma.task.findUnique({
    where: { id },
    select: { id: true, groupId: true, creatorId: true },
  })
  if (!task) return fail('Task not found', 404)
  let canDelete = task.creatorId === user.id
  if (task.groupId && !canDelete) {
    const m = await requireMembership(task.groupId, user.id)
    canDelete = m.role === 'ADMIN' || m.role === 'OWNER'
  }
  if (!canDelete) return fail('You cannot delete this task', 403)
  await prisma.task.delete({ where: { id } })
  return ok({ deleted: true })
})
