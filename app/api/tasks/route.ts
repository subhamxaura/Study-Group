import { prisma } from '@/lib/prisma'
import { ok, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { taskSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

// GET /api/tasks?scope=mine|group&groupId=&status=&priority=&page=
export const GET = withUser(async (user, req) => {
  const { searchParams } = new URL(req.url)
  const scope = searchParams.get('scope') === 'group' ? 'group' : 'mine'
  const groupId = searchParams.get('groupId') || undefined
  const status = searchParams.get('status') || undefined
  const priority = searchParams.get('priority') || undefined
  const due = searchParams.get('due') || undefined // today | upcoming | overdue
  const page = Math.max(1, Number(searchParams.get('page') ?? 1) || 1)
  const pageSize = Math.min(50, Math.max(10, Number(searchParams.get('pageSize') ?? 30) || 30))

  const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999)
  const dueFilter =
    due === 'today'
      ? { dueDate: { lte: endToday } }
      : due === 'upcoming'
        ? { dueDate: { gt: endToday } }
        : due === 'overdue'
          ? { dueDate: { lt: startToday }, status: { not: 'COMPLETED' as const } }
          : {}

  const statusF = status && status !== 'ALL' ? { status: status as 'TODO' | 'IN_PROGRESS' | 'COMPLETED' } : {}
  const priorityF = priority && priority !== 'ALL' ? { priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' } : {}

  const where = scope === 'group' && groupId
    ? { groupId, ...statusF, ...priorityF, ...dueFilter }
    : {
        OR: [
          { assigneeId: user.id },
          { creatorId: user.id, assigneeId: null },
        ],
        ...statusF,
        ...priorityF,
        ...dueFilter,
      }

  const [total, tasks] = await Promise.all([
    prisma.task.count({ where }),
    prisma.task.findMany({
      where,
      orderBy: [{ status: 'asc' }, { dueDate: 'asc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        group: { select: { id: true, name: true, subject: true } },
        assignee: { select: { id: true, name: true, avatarUrl: true } },
        creator: { select: { id: true, name: true } },
      },
    }),
  ])
  return ok({ tasks, total, page, pageSize })
})

// POST /api/tasks
export const POST = withUser(async (user, req) => {
  const data = await parseBody(req, taskSchema)
  if (data.groupId) await requireMembership(data.groupId, user.id)

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description || null,
      subject: data.subject || null,
      groupId: data.groupId || null,
      assigneeId: data.assigneeId || null,
      creatorId: user.id,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      priority: data.priority,
      isRecurring: data.isRecurring,
      recurrenceRule: data.recurrenceRule ?? null,
    },
    include: {
      group: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true, avatarUrl: true } },
    },
  })

  if (task.assigneeId && task.assigneeId !== user.id) {
    await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        kind: 'TASK_ASSIGNED',
        title: `New task: ${task.title}`,
        body: `${user.name} assigned you a task${task.group ? ` in ${task.group.name}` : ''}.`,
        link: '/tasks',
      },
    })
  }
  return ok({ task })
})
