'use client'
import { useState, useEffect, useCallback } from 'react'
import { Calendar, MapPin, Video, Users, Radio, CheckCircle2 } from 'lucide-react'
import { Modal, Badge, Button } from '@/components/ui'
import { api } from '@/lib/client'
import { useSession } from '@/lib/store'
import { cn } from '@/lib/utils'
import type { RSVPStatus } from '@/types'

interface RsvpEntry {
  status: string
  attended: boolean
  userId: string
  user: { id: string; name: string; avatarUrl: string | null }
}

interface SessionDetail {
  id: string
  title: string
  subject: string
  kind: string
  description: string | null
  startsAt: string
  endsAt: string
  location: string | null
  isOnline: boolean
  maxParticipants: number | null
  creator: { id: string; name: string; avatarUrl: string | null }
  group: { id: string; name: string } | null
  rsvps: RsvpEntry[]
  goingCount: number
  maybeCount: number
  isHost: boolean
  isLive: boolean
  isPast: boolean
}

const KIND_LABEL: Record<string, string> = {
  GROUP: 'Group study', EXAM_PREP: 'Exam prep', PROBLEM_SOLVING: 'Problem solving',
  REVISION: 'Revision', DISCUSSION: 'Discussion', FOCUS: 'Focus',
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

function countdownFor(startsAt: string, now: number): string | null {
  const diff = new Date(startsAt).getTime() - now
  if (diff <= 0) return null
  const h = Math.floor(diff / 3600e3)
  const m = Math.floor((diff % 3600e3) / 60e3)
  const s = Math.floor((diff % 60e3) / 1e3)
  if (h >= 48) return `Starts ${new Date(startsAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`
  if (h > 0) return `Starts in ${h}h ${m}m`
  return `Starts in ${m}m ${s}s`
}

export function SessionDetailsModal({ sessionId, onClose, onChanged }: {
  sessionId: string | null
  onClose: () => void
  onChanged?: () => void
}) {
  const { user } = useSession()
  const [session, setSession] = useState<SessionDetail | null>(null)
  const [error, setError] = useState('')
  const [rsvpBusy, setRsvpBusy] = useState(false)
  const isLiveOrSoon = Boolean(session && !session.isPast && session.isLive)
  const now = useNow(Boolean(sessionId))

  const load = useCallback(() => {
    if (!sessionId) return
    setError('')
    api.get<{ session: SessionDetail }>(`/api/sessions/${sessionId}/attendance`)
      .then((d) => setSession(d.session))
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load the session.'))
  }, [sessionId])

  useEffect(() => {
    if (sessionId) load()
    else setSession(null)
  }, [sessionId, load])

  const rsvp = async (status: RSVPStatus) => {
    if (!session || !user) return
    setRsvpBusy(true)
    const alreadyMine = session.rsvps.find((r) => r.userId === user.id)
    // Optimistic: swap my own entry
    setSession((s) => {
      if (!s) return s
      const rest = s.rsvps.filter((r) => r.userId !== user.id)
      const mine: RsvpEntry = {
        status,
        attended: false,
        userId: user.id,
        user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl ?? null },
      }
      const goingDelta =
        (status === 'GOING' ? 1 : 0) - (alreadyMine?.status === 'GOING' ? 1 : 0)
      const maybeDelta =
        (status === 'MAYBE' ? 1 : 0) - (alreadyMine?.status === 'MAYBE' ? 1 : 0)
      return {
        ...s,
        rsvps: [...rest, mine],
        goingCount: Math.max(0, s.goingCount + goingDelta),
        maybeCount: Math.max(0, s.maybeCount + maybeDelta),
      }
    })
    try {
      await api.post(`/api/sessions/${session.id}/rsvp`, { status })
      load()
      onChanged?.()
    } finally {
      setRsvpBusy(false)
    }
  }

  const markAttendance = async (userId: string, attended: boolean) => {
    if (!session) return
    setSession((s) => s && {
      ...s,
      rsvps: s.rsvps.map((r) => (r.userId === userId ? { ...r, attended } : r)),
    })
    await api.post(`/api/sessions/${session.id}/attendance`, { userId, attended }).catch(load)
  }

  const myEntry = session && user ? session.rsvps.find((r) => r.userId === user.id) : undefined
  const countdown = session && !session.isLive && !session.isPast ? countdownFor(session.startsAt, now) : null
  const going = session?.rsvps.filter((r) => r.status === 'GOING') ?? []
  const maybe = session?.rsvps.filter((r) => r.status === 'MAYBE') ?? []
  const declinedCount = session?.rsvps.filter((r) => r.status === 'NOT_GOING').length ?? 0

  return (
    <Modal
      isOpen={sessionId !== null}
      onClose={onClose}
      title={session?.title ?? 'Session details'}
      description={session ? `${KIND_LABEL[session.kind] ?? session.kind} · ${session.subject}` : undefined}
    >
      {error && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{error}</p>}
      {!session && !error && <p className="text-sm text-muted">Loading…</p>}
      {session && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {session.isLive && <Badge tone="success"><Radio className="mr-1 inline h-3 w-3" /> Session is live</Badge>}
            {countdown && <Badge tone="warning">⏱ {countdown}</Badge>}
            {session.isPast && <Badge tone="muted">Ended</Badge>}
            {session.maxParticipants && <Badge tone="muted">max {session.maxParticipants}</Badge>}
          </div>

          <div className="space-y-1.5 text-sm text-secondary">
            <p className="flex items-center gap-2"><Calendar className="h-4 w-4 shrink-0 text-muted" /> {new Date(session.startsAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} – {new Date(session.endsAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</p>
            <p className="flex items-center gap-2">
              {session.isOnline ? <Video className="h-4 w-4 shrink-0 text-muted" /> : <MapPin className="h-4 w-4 shrink-0 text-muted" />}
              {session.isOnline ? 'Online' : session.location || 'No location set'}
            </p>
            <p className="flex items-center gap-2"><Users className="h-4 w-4 shrink-0 text-muted" /> Hosted by {session.creator.name}</p>
            {session.description && <p className="pt-1 leading-relaxed">{session.description}</p>}
          </div>

          {/* RSVP */}
          {!session.isPast && (
            <div className="border-t pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                {session.goingCount} going · {session.maybeCount} maybe
              </p>
              <div className="flex gap-2">
                {(['GOING', 'MAYBE', 'NOT_GOING'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => rsvp(st)}
                    disabled={rsvpBusy}
                    aria-pressed={myEntry?.status === st}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                      myEntry?.status === st
                        ? 'bg-indigo-600 text-white'
                        : 'border text-secondary hover:bg-[rgb(var(--sg-hover))]'
                    )}
                  >
                    {st === 'GOING' ? 'Join' : st === 'MAYBE' ? 'Maybe' : 'Decline'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Participants */}
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold">Participants</h3>
            {going.length + maybe.length === 0 ? (
              <p className="text-sm text-muted">No one has RSVPed yet.</p>
            ) : (
              <ul className="space-y-2">
                {going.map((r) => (
                  <li key={r.userId} className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-sm">
                      {r.user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.user.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{r.user.name[0]}</span>
                      )}
                      <span className="truncate">{r.user.name}{r.userId === session.creator.id && <span className="ml-1 text-xs text-muted">(host)</span>}</span>
                    </span>
                    {session.isHost && !session.isPast && (
                      <button
                        onClick={() => markAttendance(r.userId, !r.attended)}
                        className={cn(
                          'flex h-7 shrink-0 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors',
                          r.attended ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted hover:text-secondary',
                        )}
                        aria-label={`Mark ${r.user.name} as ${r.attended ? 'not attended' : 'attended'}`}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> {r.attended ? 'Attended' : 'Mark attended'}
                      </button>
                    )}
                    {!session.isHost && r.attended && <Badge tone="success">attended</Badge>}
                  </li>
                ))}
                {maybe.map((r) => (
                  <li key={r.userId} className="flex items-center gap-2 text-sm text-muted">
                    {r.user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.user.avatarUrl} alt="" className="h-6 w-6 rounded-full object-cover opacity-70" />
                    ) : (
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--sg-surface-muted))] text-[10px]">{r.user.name[0]}</span>
                    )}
                    <span className="truncate">{r.user.name} · maybe</span>
                  </li>
                ))}
              </ul>
            )}
            {declinedCount > 0 && <p className="mt-2 text-xs text-muted">{declinedCount} declined</p>}
          </div>

          {isLiveOrSoon && (
            <div className="rounded-lg border bg-[rgb(var(--sg-surface-muted))] p-3">
              <p className="text-sm font-medium">Session is live — start a focus timer and log the time together.</p>
              <Button size="sm" variant="secondary" className="mt-2" onClick={() => window.open('/focus', '_self')}>Start focus session</Button>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
