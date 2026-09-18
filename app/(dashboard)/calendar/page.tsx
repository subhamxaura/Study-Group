'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin, Video, X } from 'lucide-react'
import { Badge, Button, EmptyState, Input, Modal, Select } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { SessionDetailsModal } from '@/components/sessions/SessionDetailsModal'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import type { SessionItem, EventItem } from '@/types'

type ViewMode = 'month' | 'week' | 'day'

const KIND_TONE: Record<string, { label: string; cls: string }> = {
  STUDY_SESSION: { label: 'Session', cls: 'bg-indigo-500' },
  EXAM: { label: 'Exam', cls: 'bg-red-500' },
  ASSIGNMENT_DEADLINE: { label: 'Deadline', cls: 'bg-amber-500' },
  PERSONAL_TASK: { label: 'Personal', cls: 'bg-emerald-500' },
  GROUP_EVENT: { label: 'Group', cls: 'bg-violet-500' },
}

function startOfWeek(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  c.setDate(c.getDate() - ((c.getDay() + 6) % 7))
  return c
}

interface CalendarEntry {
  id: string
  title: string
  kind: string
  startsAt: string
  endsAt: string
  location: string | null
  isOnline: boolean
  groupName: string | null
  goingCount: number
  myRsvp: string | null
  sessionId: string | null
}

export default function CalendarPage() {
  const [view, setView] = useState<ViewMode>('month')
  const [cursor, setCursor] = useState(new Date())
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<CalendarEntry | null>(null)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const searchParams = useSearchParams()
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', kind: 'PERSONAL_TASK', startsAt: '', endsAt: '', location: '' })

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<{ sessions: SessionItem[] }>('/api/sessions?limit=100'),
      api.get<{ events: EventItem[] }>(`/api/events?from=${new Date(Date.now() - 60 * 864e5).toISOString()}&to=${new Date(Date.now() + 90 * 864e5).toISOString()}`),
    ])
      .then(([s, e]) => { setSessions(s.sessions); setEvents(e.events) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])
  // Deep link: /calendar?create=1 opens the new-event composer
  useEffect(() => {
    if (searchParams.get('create') === '1') setCreateOpen(true)
  }, [searchParams])

  const entries: CalendarEntry[] = useMemo(() => [
    ...sessions.map((s) => ({
      id: s.id, title: s.title, kind: 'STUDY_SESSION', startsAt: s.startsAt, endsAt: s.endsAt,
      location: s.location, isOnline: s.isOnline, groupName: s.group?.name ?? null,
      goingCount: s.goingCount, myRsvp: s.myRsvp, sessionId: s.id,
    })),
    ...events.map((e) => ({
      id: e.id, title: e.title, kind: e.kind, startsAt: e.startsAt, endsAt: e.endsAt,
      location: e.location, isOnline: false, groupName: e.group?.name ?? null,
      goingCount: 0, myRsvp: null, sessionId: null,
    })),
  ], [sessions, events])

  const rangeDays: Date[] = useMemo(() => {
    if (view === 'day') return [cursor]
    if (view === 'week') {
      const start = startOfWeek(cursor)
      return Array.from({ length: 7 }, (_, i) => { const d = new Date(start); d.setDate(d.getDate() + i); return d })
    }
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const gridStart = startOfWeek(first)
    return Array.from({ length: 42 }, (_, i) => { const d = new Date(gridStart); d.setDate(d.getDate() + i); return d })
  }, [view, cursor])

  const entriesForDay = (day: Date) =>
    entries.filter((e) => new Date(e.startsAt).toDateString() === day.toDateString())
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())

  const shift = (dir: 1 | -1) => {
    const c = new Date(cursor)
    if (view === 'month') c.setMonth(c.getMonth() + dir)
    else if (view === 'week') c.setDate(c.getDate() + 7 * dir)
    else c.setDate(c.getDate() + dir)
    setCursor(c)
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/events', {
        title: form.title, kind: form.kind,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt || form.startsAt).toISOString(),
        location: form.location,
      })
      setCreateOpen(false)
      setForm({ title: '', kind: 'PERSONAL_TASK', startsAt: '', endsAt: '', location: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const openEntry = (e: CalendarEntry) => {
    if (e.sessionId) setSelectedSession(e.sessionId)
    else setSelected(e)
  }

  const monthLabel = cursor.toLocaleDateString(undefined, view === 'day'
    ? { weekday: 'long', month: 'long', day: 'numeric' }
    : { month: 'long', year: 'numeric' })

  return (
    <div className="section-container space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-secondary">Sessions, deadlines and personal events.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> New event</button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <button onClick={() => shift(-1)} className="rounded-md p-2 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Previous"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => setCursor(new Date())} className="rounded-md px-2.5 py-1.5 text-sm font-medium hover:bg-[rgb(var(--sg-hover))]">Today</button>
          <button onClick={() => shift(1)} className="rounded-md p-2 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Next"><ChevronRight className="h-4 w-4" /></button>
          <span className="ml-2 text-base font-semibold">{monthLabel}</span>
        </div>
        <div className="flex rounded-lg border p-0.5">
          {(['month', 'week', 'day'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn('rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors',
                view === v ? 'bg-indigo-600 text-white' : 'text-secondary hover:bg-[rgb(var(--sg-hover))])')}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="skeleton h-[480px] rounded-xl" />
      ) : view === 'month' ? (
        <div className="card overflow-hidden p-0">
          <div className="grid grid-cols-7 border-b bg-[rgb(var(--sg-surface-muted))]/50 text-center text-[10px] font-semibold uppercase tracking-wider text-muted">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7">
            {rangeDays.map((day, i) => {
              const inMonth = day.getMonth() === cursor.getMonth()
              const isToday = day.toDateString() === new Date().toDateString()
              const dayEntries = entriesForDay(day)
              return (
                <div key={i} className={cn('min-h-[92px] border-b border-r p-1.5', !inMonth && 'bg-[rgb(var(--sg-surface-muted))]/30 opacity-50')}>
                  <div className="flex items-center justify-between">
                    <span className={cn('inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday ? 'bg-indigo-600 text-white' : 'text-secondary')}>
                      {day.getDate()}
                    </span>
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEntries.slice(0, 2).map((e) => (
                      <button
                        key={e.id}
                        onClick={() => openEntry(e)}
                        className="flex w-full items-center gap-1 truncate rounded-md border px-1.5 py-1 text-left text-[10px] font-medium transition-colors hover:bg-[rgb(var(--sg-hover))]"
                      >
                        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', KIND_TONE[e.kind]?.cls ?? 'bg-indigo-500')} />
                        <span className="truncate">{e.title}</span>
                      </button>
                    ))}
                    {dayEntries.length > 2 && (
                      <p className="px-1 text-[10px] text-muted">+{dayEntries.length - 2} more</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={cn('grid gap-3', view === 'week' ? 'sm:grid-cols-7' : '')}>
          {rangeDays.map((day) => {
            const dayEntries = entriesForDay(day)
            const isToday = day.toDateString() === new Date().toDateString()
            return (
              <div key={day.toISOString()} className="card p-3">
                <p className={cn('text-sm font-semibold', isToday && 'text-indigo-600 dark:text-indigo-400')}>
                  {day.toLocaleDateString(undefined, view === 'week' ? { weekday: 'short', day: 'numeric' } : { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <div className="mt-2 space-y-2">
                  {dayEntries.length === 0 && <p className="text-xs text-muted">Nothing scheduled.</p>}
                  {dayEntries.map((e) => (
                    <button key={e.id} onClick={() => openEntry(e)} className="block w-full rounded-lg border p-2.5 text-left transition-colors hover:bg-[rgb(var(--sg-hover))]">
                      <span className="flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', KIND_TONE[e.kind]?.cls ?? 'bg-indigo-500')} />
                        <span className="truncate text-sm font-medium">{e.title}</span>
                      </span>
                      <span className="mt-1 block text-xs text-muted">
                        {new Date(e.startsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                        {e.groupName ? ` · ${e.groupName}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Session details (rich modal with participants, countdown, attendance) */}
      <SessionDetailsModal
        sessionId={selectedSession}
        onClose={() => setSelectedSession(null)}
        onChanged={load}
      />

      {/* Detail modal for personal events */}
      <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title={selected?.title}>
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge>{KIND_TONE[selected.kind]?.label ?? 'Event'}</Badge>
              {selected.groupName && <Badge tone="muted">{selected.groupName}</Badge>}
            </div>
            <div className="space-y-2 text-sm text-secondary">
              <p className="flex items-center gap-2"><Clock className="h-4 w-4 text-muted" />
                {new Date(selected.startsAt).toLocaleString()} → {new Date(selected.endsAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </p>
              {(selected.location || selected.isOnline) && (
                <p className="flex items-center gap-2">
                  {selected.isOnline ? <Video className="h-4 w-4 text-muted" /> : <MapPin className="h-4 w-4 text-muted" />}
                  {selected.isOnline ? 'Online session' : selected.location}
                </p>
              )}
            {selected.kind === 'STUDY_SESSION' && <p>{selected.goingCount} going</p>}
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New event">
        <form onSubmit={create} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <Select label="Type" value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
            <option value="PERSONAL_TASK">Personal task</option>
            <option value="ASSIGNMENT_DEADLINE">Assignment deadline</option>
            <option value="EXAM">Exam</option>
            <option value="STUDY_SESSION">Study session</option>
          </Select>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Starts" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} required />
            <Input label="Ends" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))} required />
          </div>
          <Input label="Location (optional)" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <Button type="submit" isLoading={saving} disabled={saving || !form.title.trim() || !form.startsAt}>Create event</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
