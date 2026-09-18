import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { taskCommentSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

async function canAccessTask(taskId: string, userId: string) {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { id: true, groupId: true, creatorId: true, assigneeId: true },
  })
  if (!task) return { task: null, allowed: false }
  if (!task.groupId) {
    return { task, allowed: task.creatorId === userId || task.assigneeId === userId }
  }
  const member = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: task.groupId, userId } },
    select: { id: true },
  })
  return { task, allowed: Boolean(member) }
}

export const GET = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const { allowed } = await canAccessTask(id, user.id)
  if (!allowed) return fail('You do not have access to this task', 403)
  const comments = await prisma.taskComment.findMany({
    where: { taskId: id },
    orderBy: { createdAt: 'asc' },
    take: 100,
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  })
  return ok({ comments })
})

export const POST = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const { task, allowed } = await canAccessTask(id, user.id)
  if (!allowed || !task) return fail('You do not have access to this task', 403)
  const data = await parseBody(req, taskCommentSchema)
  const comment = await prisma.taskComment.create({
    data: { taskId: id, authorId: user.id, content: data.content },
    include: { author: { select: { id: true, name: true, avatarUrl: true } } },
  })

  // Notify the other participants
  const targets = [task.creatorId, task.assigneeId].filter(
    (uid): uid is string => Boolean(uid) && uid !== user.id,
  )
  if (targets.length) {
    const taskTitle =
      (await prisma.task.findUnique({ where: { id }, select: { title: true } }))?.title ?? 'a task'
    await prisma.notification.createMany({
      data: targets.map((uid) => ({
        userId: uid,
        kind: 'TASK_ASSIGNED' as const,
        title: `New comment on “${taskTitle}”`,
        body: `${user.name}: ${data.content.slice(0, 80)}`,
        link: '/tasks',
      })),
    })
  }
  return ok({ comment })
})
