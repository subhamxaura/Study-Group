'use client'
/**
 * Focus Rooms — shared focus sessions with server-authoritative state.
 *
 * The room timer is never trusted from the client: remaining time is derived
 * from the server-provided endsAt + serverNow (drift-corrected), pause state
 * lives server-side, and a refresh just re-fetches the room. One 1s interval
 * updates the display only — state changes go through the API.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Plus, Pause, Play, LogOut, CheckCircle2, Radio } from 'lucide-react'
import Link from 'next/link'
import { Badge, Button, Input, Modal, Select, Textarea, Avatar, AvatarGroup } from '@/components/ui'
import { api } from '@/lib/client'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

interface RoomParticipant { id: string; name: string; avatarUrl: string | null; presence: string; isMe: boolean }
export interface FocusRoomSummary {
  id: string
  subject: string
  goal: string | null
  durationMin: number
  status: string
  host: { id: string; name: string; avatarUrl: string | null }
  group: { id: string; name: string } | null
  endsAt: string
  startedAt: string
  pausedAtMs: number | null
  pausedTotalMs: number
  serverNow?: number
  participants: RoomParticipant[]
  activeCount: number
  isHost: boolean
  isParticipant: boolean
}
export interface RoomCompletion {
  minutes: number
  subject: string
  goal: string | null
  taskId?: string | null
}

const HEARTBEAT_MS = 25_000
const PRESETS = [25, 50, 90]

function fmt(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function FocusRooms({ onRoomCompleted }: { onRoomCompleted?: (c: RoomCompletion) => void }) {
  const router = useRouter()
  const [rooms, setRooms] = useState<FocusRoomSummary[] | null>(null)
  const [activeRoom, setActiveRoom] = useState<FocusRoomSummary | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ subject: '', goal: '', durationMin: 50, groupId: '' })
  const [myGroups, setMyGroups] = useState<Array<{ id: string; name: string }>>([])
  const [busy, setBusy] = useState(false)
  // Server-drift correction: serverNow - Date.now() at fetch time.
  const driftRef = useRef(0)
  const completedRef = useRef(false)

  const loadRooms = useCallback(() => {
    api.get<{ rooms: FocusRoomSummary[] }>('/api/focus-rooms')
      .then((d) => setRooms(d.rooms))
      .catch(() => setRooms([]))
  }, [])

  useEffect(() => { loadRooms() }, [loadRooms])

  useEffect(() => {
    api.get<{ groups: Array<{ id: string; name: string }> }>('/api/groups?mine=1&pageSize=24')
      .then((d) => setMyGroups(d.groups))
      .catch(() => {})
  }, [])

  const openRoom = useCallback((id: string) => {
    api.get<{ room: FocusRoomSummary }>(`/api/focus-rooms/${id}`)
      .then((d) => {
        driftRef.current = (d.room.serverNow ?? Date.now()) - Date.now()
        setActiveRoom(d.room)
      })
      .catch(() => toast.error('Could not open that focus room.'))
  }, [])

  // Live rooms list refresh (30s, visibility-aware)
  useEffect(() => {
    if (activeRoom) return
    const t = setInterval(() => { if (document.visibilityState === 'visible') loadRooms() }, 30_000)
    return () => clearInterval(t)
  }, [activeRoom, loadRooms])

  // Room polling + heartbeat while inside a room
  useEffect(() => {
    if (!activeRoom) return
    let stopped = false

    const tick = async () => {
      try {
        const d = await api.get<{ room: FocusRoomSummary }>(`/api/focus-rooms/${activeRoom.id}`)
        if (stopped) return
        driftRef.current = (d.room.serverNow ?? Date.now()) - Date.now()
        setActiveRoom(d.room)
        const me = d.room.participants.find((p) => p.isMe)
        if (me && me.presence !== 'COMPLETED') {
          api.patch(`/api/focus-rooms/${d.room.id}`, { action: 'heartbeat', presence: d.room.status === 'PAUSED' ? 'PAUSED' : 'FOCUSING' }).catch(() => {})
        }
        // Server says the room finished and I haven't recorded completion yet
        if (d.room.status === 'COMPLETED' && !completedRef.current) {
          completedRef.current = true
          const c = await api.post<RoomCompletion & { completed: boolean }>(`/api/focus-rooms/${d.room.id}`)
          onRoomCompleted?.({ minutes: c.minutes, subject: c.subject, goal: c.goal, taskId: c.taskId })
        }
      } catch { /* transient — next tick retries */ }
    }
    tick()
    const t = setInterval(() => { if (document.visibilityState === 'visible') tick() }, HEARTBEAT_MS)
    return () => { stopped = true; clearInterval(t) }
  }, [activeRoom?.id, onRoomCompleted]) // eslint-disable-line react-hooks/exhaustive-deps

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.subject.trim() || creating) return
    setCreating(true)
    try {
      const d = await api.post<{ room: { id: string } }>('/api/focus-rooms', {
        subject: form.subject.trim(),
        goal: form.goal.trim() || null,
        durationMin: form.durationMin,
        groupId: form.groupId || null,
      })
      setCreateOpen(false)
      setForm({ subject: '', goal: '', durationMin: 50, groupId: '' })
      completedRef.current = false
      openRoom(d.room.id)
      loadRooms()
    } catch {
      toast.error('Could not create the focus room. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const hostAction = async (action: 'pause' | 'resume') => {
    if (!activeRoom || busy) return
    setBusy(true)
    try {
      await api.patch(`/api/focus-rooms/${activeRoom.id}`, { action, presence: action === 'pause' ? 'PAUSED' : 'FOCUSING' })
      const d = await api.get<{ room: FocusRoomSummary }>(`/api/focus-rooms/${activeRoom.id}`)
      driftRef.current = (d.room.serverNow ?? Date.now()) - Date.now()
      setActiveRoom(d.room)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  const leaveRoom = async () => {
    if (!activeRoom) return
    try {
      await api.patch(`/api/focus-rooms/${activeRoom.id}`, { action: 'leave', presence: 'COMPLETED' })
    } catch { /* leaving anyway */ }
    setActiveRoom(null)
    completedRef.current = false
    loadRooms()
  }

  const finishMine = async () => {
    if (!activeRoom || busy) return
    setBusy(true)
    try {
      const c = await api.post<RoomCompletion & { completed: boolean }>(`/api/focus-rooms/${activeRoom.id}`)
      completedRef.current = true
      onRoomCompleted?.({ minutes: c.minutes, subject: c.subject, goal: c.goal, taskId: c.taskId })
      setActiveRoom(null)
      loadRooms()
    } catch {
      toast.error('Could not complete the session. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  // ---------- Room runner view ----------
  if (activeRoom) {
    const r = activeRoom
    const isPaused = r.status === 'PAUSED'
    const isCompleted = r.status === 'COMPLETED' || r.status === 'CANCELLED'
    const anchor = r.pausedAtMs ?? (Date.now() + driftRef.current)
    const remaining = Math.max(0, new Date(r.endsAt).getTime() - anchor)
    const totalMs = r.durationMin * 60_000
    const elapsedMs = Math.max(0, totalMs - remaining)
    const pct = Math.min(100, Math.round((elapsedMs / totalMs) * 100))
    const focusing = r.participants.filter((p) => p.presence === 'FOCUSING' || p.presence === 'PAUSED')

    return (
      <div className={cn('card p-6 sm:p-8', isPaused && 'border-amber-300 dark:border-amber-500/30')} data-testid="focus-room-runner">
        <div className="flex items-center justify-between">
          <Badge tone={isPaused ? 'warning' : isCompleted ? 'muted' : 'success'}>{isPaused ? 'Paused' : isCompleted ? 'Ended' : 'Live room'}</Badge>
          <p className="flex items-center gap-1.5 text-xs text-muted">
            <Users className="h-3.5 w-3.5" /> {focusing.length} focusing
          </p>
        </div>

        <div className="mt-6 flex justify-center">
          <div
            className="relative flex h-64 w-64 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(rgb(var(--sg-accent)) ${pct * 3.6}deg, rgb(var(--sg-border)) 0deg)` }}
            role="timer"
            aria-label={`Focus room timer, ${fmt(remaining)} remaining, room ${isPaused ? 'paused' : 'running'}`}
          >
            <div className="flex h-[232px] w-[232px] flex-col items-center justify-center rounded-full bg-[rgb(var(--sg-card))]">
              <p className="text-5xl font-semibold tabular-nums">{fmt(remaining)}</p>
              <p className="mt-1 text-sm font-medium">{r.subject}</p>
              {r.goal && <p className="mt-0.5 max-w-[200px] truncate text-xs text-muted">{r.goal}</p>}
            </div>
          </div>
        </div>

        {/* Participants — real presence from the server */}
        <div className="mx-auto mt-6 flex max-w-md flex-wrap items-center justify-center gap-2" aria-label={`${focusing.length} people focusing`}>
          {focusing.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs">
              <span className={cn('h-1.5 w-1.5 rounded-full', p.presence === 'PAUSED' ? 'bg-amber-500' : 'bg-emerald-500')} />
              {p.name}{p.isMe ? ' (you)' : ''}
            </span>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {r.isHost && !isCompleted && (isPaused
            ? <Button onClick={() => hostAction('resume')} disabled={busy} size="lg"><Play className="h-4 w-4" /> Resume room</Button>
            : <Button variant="secondary" onClick={() => hostAction('pause')} disabled={busy} size="lg"><Pause className="h-4 w-4" /> Pause room</Button>
          )}
          {!isCompleted && (
            <Button onClick={finishMine} isLoading={busy} size="lg"><CheckCircle2 className="h-4 w-4" /> Complete my session</Button>
          )}
          <Button variant="ghost" onClick={leaveRoom} size="lg"><LogOut className="h-4 w-4" /> Leave room</Button>
        </div>
        {!r.isHost && !isCompleted && (
          <p className="mt-3 text-center text-xs text-muted">Only the host can pause the shared timer — your studied time is always counted individually.</p>
        )}
      </div>
    )
  }

  // ---------- Rooms discovery + create ----------
  return (
    <div className="card p-4" data-testid="focus-rooms-strip">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold"><Radio className="h-4 w-4 text-indigo-500" /> Live focus rooms</p>
        <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create room</Button>
      </div>

      {rooms === null ? (
        <div className="mt-3 space-y-2">{[0, 1].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
      ) : rooms.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--sg-accent-soft))] text-[rgb(var(--sg-accent))] dark:text-[rgb(var(--sg-accent-muted))]">
            <Radio className="h-6 w-6" />
          </span>
          <p className="mt-3 text-sm font-medium">No live focus rooms right now</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-secondary">
            Start one and study alongside others — a shared timer makes it easier to stay in the chair.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create focus room</Button>
            <Link href="/discover" className="btn btn-secondary btn-sm">Discover groups</Link>
          </div>
        </div>
      ) : (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {rooms.slice(0, 4).map((room) => (
            <div key={room.id} className="rounded-lg border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{room.subject}</p>
                  <p className="truncate text-xs text-muted">
                    {room.goal || 'Focus session'}{room.group ? ` · ${room.group.name}` : ''}
                  </p>
                </div>
                <Badge tone={room.status === 'PAUSED' ? 'warning' : 'success'}>{room.activeCount} studying</Badge>
              </div>
              <div className="mt-2.5 flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-2">
                  <AvatarGroup
                    people={room.participants.slice(0, 4).map((p) => ({ name: p.name, src: p.avatarUrl }))}
                    max={4}
                  />
                  <span className="truncate text-xs text-muted">{room.durationMin} min · {room.activeCount} studying</span>
                </div>
                <Button size="sm" variant={room.isParticipant ? 'secondary' : 'primary'} onClick={() => openRoom(room.id)}>
                  {room.isParticipant ? 'Rejoin' : 'Join room'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create a focus room">
        <form onSubmit={createRoom} className="space-y-4">
          <Input
            label="Subject" required value={form.subject}
            onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
            placeholder="e.g. Data Structures" maxLength={120}
          />
          <Textarea
            label="Goal (optional)" value={form.goal}
            onChange={(e) => setForm((p) => ({ ...p, goal: e.target.value }))}
            placeholder="e.g. Complete linked list exercises" maxLength={300}
          />
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p} type="button" onClick={() => setForm((f) => ({ ...f, durationMin: p }))}
                className={cn('rounded-lg border py-2 text-sm font-medium transition-colors',
                  form.durationMin === p ? 'border-indigo-600 bg-indigo-600 text-white' : 'text-secondary hover:bg-[rgb(var(--sg-hover))]')}
              >
                {p} min
              </button>
            ))}
          </div>
          <Select label="Group (optional)" value={form.groupId} onChange={(e) => setForm((p) => ({ ...p, groupId: e.target.value }))}>
            <option value="">Public — anyone can join</option>
            {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name} — members only</option>)}
          </Select>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <Button type="submit" isLoading={creating} disabled={!form.subject.trim()}>Create room</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
