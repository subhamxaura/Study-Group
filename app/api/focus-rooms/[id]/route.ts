import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

type Ctx = { params: { id: string } }

const PARTICIPANT_STALE_MS = 60_000

const heartbeatSchema = z.object({
  presence: z.enum(['FOCUSING', 'PAUSED', 'COMPLETED']),
  // When transitioning FOCUSING -> PAUSED the client sends its pause start
  // (ms since epoch, from the same clock it used to compute elapsed). The
  // server stores pausedAtMs; resume computes the paused duration server-side.
  action: z.enum(['heartbeat', 'pause', 'resume', 'leave']).default('heartbeat'),
})

/**
 * Room state is server-authoritative. Remaining time is derived from
 * endsAt and pausedAccumulatedMs so every client (and a refresh) computes
 * the same clock. `serverNow` lets clients correct for local clock drift.
 */
export const GET = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const room = await prisma.focusRoom.findUnique({
    where: { id },
    select: {
      id: true, hostId: true, subject: true, goal: true, durationMin: true,
      status: true, startedAt: true, endsAt: true, pausedAtMs: true, pausedTotalMs: true,
      taskId: true, groupId: true, group: { select: { id: true, name: true } },
      host: { select: { id: true, name: true, avatarUrl: true } },
      participants: {
        where: { lastSeenAt: { gte: new Date(Date.now() - PARTICIPANT_STALE_MS) } },
        select: { userId: true, presence: true, joinedAt: true, user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  })
  if (!room) return fail('Focus room not found', 404)

  // Visibility: group rooms require membership; public rooms are open to any user.
  if (room.groupId) await requireMembership(room.groupId, user.id)

  // Auto-complete elapsed rooms lazily (server-side, idempotent).
  const elapsed = room.endsAt.getTime() <= Date.now() && room.status === 'LIVE'
  if (elapsed) await completeRoom(room.id)

  return ok({
    room: {
      id: room.id,
      subject: room.subject,
      goal: room.goal,
      durationMin: room.durationMin,
      status: room.status,
      host: room.host,
      group: room.group,
      taskId: room.taskId,
      startedAt: room.startedAt.toISOString(),
      endsAt: room.endsAt.toISOString(),
      // BigInt epoch-ms fields → Number (< 2^53, safe) so JSON serialization works.
      pausedAtMs: room.pausedAtMs === null ? null : Number(room.pausedAtMs),
      pausedTotalMs: Number(room.pausedTotalMs),
      serverNow: Date.now(),
      participants: room.participants.map((p) => ({
        id: p.userId, name: p.user.name, avatarUrl: p.user.avatarUrl,
        presence: p.presence, isMe: p.userId === user.id,
        joinedAt: p.joinedAt.toISOString(),
      })),
      isHost: room.hostId === user.id,
      isParticipant: room.participants.some((p) => p.userId === user.id),
    },
  })
})

// PATCH /api/focus-rooms/:id — heartbeat (refresh presence + lastSeenAt),
// pause, resume, or leave. Only the host may pause/resume the shared clock.
export const PATCH = withUser(async (user, req, ctx: Ctx) => {
  const { id } = ctx.params
  const body = await parseBody(req, heartbeatSchema)

  const room = await prisma.focusRoom.findUnique({
    where: { id },
    select: { id: true, hostId: true, groupId: true, status: true, pausedAtMs: true, pausedTotalMs: true, endsAt: true },
  })
  if (!room) return fail('Focus room not found', 404)
  if (room.groupId) await requireMembership(room.groupId, user.id)

  const isHost = room.hostId === user.id
  const now = Date.now()

  if (body.action === 'leave') {
    await prisma.focusRoomParticipant.updateMany({
      where: { roomId: id, userId: user.id },
      data: { presence: 'COMPLETED', lastSeenAt: new Date(0) }, // drop from active presence
    })
    return ok({ left: true })
  }

  // Heartbeat refresh (any participant, any presence value)
  await prisma.focusRoomParticipant.upsert({
    where: { roomId_userId: { roomId: id, userId: user.id } },
    create: { roomId: id, userId: user.id, presence: body.presence },
    update: { presence: body.presence, lastSeenAt: new Date() },
  })

  if (body.action === 'pause') {
    if (!isHost) return fail('Only the room host can pause the session', 403)
    if (room.status !== 'LIVE') return fail('Room is not running', 409)
    await prisma.focusRoom.update({ where: { id }, data: { status: 'PAUSED', pausedAtMs: now } })
    return ok({ status: 'PAUSED' })
  }

  if (body.action === 'resume') {
    if (!isHost) return fail('Only the room host can resume the session', 403)
    if (room.status !== 'PAUSED' || room.pausedAtMs === null) return fail('Room is not paused', 409)
    // pausedAtMs/pausedTotalMs are BigInt (epoch ms exceeds Int4). Convert to
    // Number for arithmetic — safe: values are < 2^53.
    const pausedAt = Number(room.pausedAtMs)
    const pausedTotalMs = Number(room.pausedTotalMs) + (now - pausedAt)
    // Extend endsAt by the paused duration so the full duration is still studied.
    await prisma.focusRoom.update({
      where: { id },
      data: { status: 'LIVE', pausedAtMs: null, pausedTotalMs, endsAt: new Date(room.endsAt.getTime() + (now - pausedAt)) },
    })
    return ok({ status: 'LIVE', pausedTotalMs })
  }

  return ok({ presence: body.presence })
})

// POST /api/focus-rooms/:id — complete the session and persist study logs.
// Any participant completes their own log; the host can end the room itself.
export const POST = withUser(async (user, _req, ctx: Ctx) => {
  const { id } = ctx.params
  const room = await prisma.focusRoom.findUnique({
    where: { id },
    select: {
      id: true, hostId: true, groupId: true, subject: true, goal: true, taskId: true,
      durationMin: true, status: true, startedAt: true, endsAt: true, pausedTotalMs: true, pausedAtMs: true,
      participants: { select: { userId: true, presence: true } },
    },
  })
  if (!room) return fail('Focus room not found', 404)
  if (room.groupId) await requireMembership(room.groupId, user.id)

  const isParticipant = room.participants.some((p) => p.userId === user.id)
  if (!isParticipant && room.hostId !== user.id) {
    return fail('You are not part of this focus room', 403)
  }

  const result = await completeRoom(room.id, user.id)
  return ok(result)
})

/**
 * Completes a room: marks it COMPLETED, writes a StudySessionLog for the
 * requesting user (studied minutes = duration − paused time, min 1), and
 * bumps their streak via the same logic as solo focus. Idempotent per user:
 * a second completion for the same room+user does not double-log.
 */
async function completeRoom(roomId: string, forUserId?: string) {
  const room = await prisma.focusRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true, hostId: true, subject: true, goal: true, durationMin: true,
      status: true, startedAt: true, endsAt: true, pausedTotalMs: true, pausedAtMs: true, taskId: true,
    },
  })
  if (!room) throw new Error('room missing')

  const studiedMs = Math.max(
    60_000,
    Math.min(
      room.durationMin * 60_000,
      ((Number(room.pausedAtMs ?? Date.now())) > room.endsAt.getTime() ? room.endsAt.getTime() : Math.min(Date.now(), room.endsAt.getTime()))
        - room.startedAt.getTime() - Number(room.pausedTotalMs),
    ),
  )
  const minutes = Math.max(1, Math.round(studiedMs / 60_000))

  if (room.status !== 'COMPLETED' && room.status !== 'CANCELLED') {
    await prisma.focusRoom.update({ where: { id: roomId }, data: { status: 'COMPLETED' } })
  }

  if (!forUserId) return { completed: true, minutes }

  // Idempotency: skip if this user already logged this room (taskId encodes roomId)
  const existing = await prisma.studySessionLog.findFirst({
    where: { userId: forUserId, startedAt: room.startedAt, kind: 'FOCUS' },
    select: { id: true },
  })

  let logId: string | null = existing?.id ?? null
  if (!logId) {
    const log = await prisma.studySessionLog.create({
      data: {
        userId: forUserId,
        kind: 'FOCUS',
        subject: room.subject,
        startedAt: room.startedAt,
        endedAt: new Date(),
        durationMinutes: minutes,
        tasksCompleted: 0,
      },
      select: { id: true },
    })
    logId = log.id

    // Streak bump — same rule as solo focus completion
    const streak = await prisma.studyStreak.upsert({
      where: { userId: forUserId },
      update: {},
      create: { userId: forUserId },
    })
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const last = streak.lastStudyDate ? new Date(streak.lastStudyDate) : null
    last?.setHours(0, 0, 0, 0)
    let current = streak.current
    if (!last) current = 1
    else {
      const dayDiff = Math.round((today.getTime() - last.getTime()) / 864e5)
      if (dayDiff === 0) current = Math.max(1, streak.current)
      else if (dayDiff === 1) current = streak.current + 1
      else current = 1
    }
    await prisma.studyStreak.update({
      where: { userId: forUserId },
      data: { current, longest: Math.max(streak.longest, current), lastStudyDate: new Date() },
    })
  }

  return {
    completed: true,
    minutes,
    subject: room.subject,
    goal: room.goal,
    taskId: room.taskId,
    logId,
  }
}
