import { prisma } from '@/lib/prisma'
import { ok, fail, withUser, parseBody } from '@/lib/api'
import { requireMembership } from '@/lib/groups'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const PARTICIPANT_STALE_MS = 60_000 // heartbeat window
const MAX_DURATION_MIN = 240

const createRoomSchema = z.object({
  subject: z.string().trim().min(1).max(120),
  goal: z.string().trim().max(300).optional().nullable(),
  durationMin: z.number().int().min(5).max(MAX_DURATION_MIN),
  groupId: z.string().cuid().optional().nullable(),
  taskId: z.string().cuid().optional().nullable(),
})

const heartbeatSchema = z.object({
  presence: z.enum(['FOCUSING', 'PAUSED', 'COMPLETED']),
})

// GET /api/focus-rooms — live + waiting rooms visible to the user:
// public rooms (no group) and rooms in the user's groups.
export const GET = withUser(async (user) => {
  const myGroups = await prisma.groupMember.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  })
  const myGroupIds = myGroups.map((m) => m.groupId)

  const now = new Date()
  const rooms = await prisma.focusRoom.findMany({
    where: {
      status: { in: ['LIVE', 'WAITING', 'PAUSED'] },
      endsAt: { gt: now }, // not yet elapsed
      OR: [{ groupId: null }, { groupId: { in: myGroupIds } }],
    },
    orderBy: { startedAt: 'desc' },
    take: 20,
    select: {
      id: true, hostId: true, subject: true, goal: true, durationMin: true,
      status: true, startedAt: true, endsAt: true, pausedAtMs: true, pausedTotalMs: true,
      groupId: true, group: { select: { id: true, name: true } },
      host: { select: { id: true, name: true, avatarUrl: true } },
      participants: {
        where: { lastSeenAt: { gte: new Date(now.getTime() - PARTICIPANT_STALE_MS) } },
        select: { userId: true, presence: true, user: { select: { id: true, name: true, avatarUrl: true } } },
      },
    },
  })

  return ok({
    rooms: rooms.map((r) => ({
      id: r.id,
      subject: r.subject,
      goal: r.goal,
      durationMin: r.durationMin,
      status: r.status,
      host: r.host,
      group: r.group,
      endsAt: r.endsAt.toISOString(),
      startedAt: r.startedAt.toISOString(),
      pausedAtMs: r.pausedAtMs === null ? null : Number(r.pausedAtMs),
      pausedTotalMs: Number(r.pausedTotalMs),
      // Active = seen within the heartbeat window, excluding the viewer for counts
      participants: r.participants.map((p) => ({
        id: p.userId, name: p.user.name, avatarUrl: p.user.avatarUrl, presence: p.presence, isMe: p.userId === user.id,
      })),
      activeCount: r.participants.length,
      isHost: r.hostId === user.id,
      isParticipant: r.participants.some((p) => p.userId === user.id),
    })),
  })
})

// POST /api/focus-rooms — create a room and become its first participant
export const POST = withUser(async (user, req) => {
  const data = await parseBody(req, createRoomSchema)

  if (data.groupId) await requireMembership(data.groupId, user.id)

  const startedAt = new Date()
  const endsAt = new Date(startedAt.getTime() + data.durationMin * 60_000)

  const room = await prisma.focusRoom.create({
    data: {
      hostId: user.id,
      subject: data.subject,
      goal: data.goal || null,
      durationMin: data.durationMin,
      groupId: data.groupId || null,
      taskId: data.taskId || null,
      status: 'LIVE',
      startedAt,
      endsAt,
      participants: { create: { userId: user.id, presence: 'FOCUSING' } },
    },
    select: { id: true },
  })

  return ok({ room: { id: room.id } })
})
