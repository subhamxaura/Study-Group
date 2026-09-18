'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Play, Pause, RotateCcw, Timer, Flame, CheckCircle2, Users, Target, ArrowRight } from 'lucide-react'
import { Badge, Button, EmptyState, Input, Select } from '@/components/ui'
import { api } from '@/lib/client'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

const PRESETS = [25, 50, 90]
const STORE_KEY = 'sg.focus.session'

interface FocusState {
  logs: Array<{ id: string; subject: string | null; durationMinutes: number; startedAt: string; tasksCompleted: number }>
  streak: { current: number; longest: number; weeklyGoalMin: number }
  weekMinutes: number
  todayMinutes: number
}

type Phase = 'idle' | 'running' | 'paused'

/** The single source of truth for the running timer: wall-clock endsAt, not a countdown variable. */
interface ActiveSession {
  durationMin: number
  subject: string
  task: string
  startedAt: number
  endsAt: number | null // null while paused
  remainingSec: number
}

function loadPersisted(): ActiveSession | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as ActiveSession
    if (!s || typeof s.durationMin !== 'number' || s.durationMin < 1) return null
    if (s.endsAt !== null && Date.now() >= s.endsAt) return { ...s, remainingSec: 0 } // elapsed while away
    if (s.endsAt === null && (!s.remainingSec || s.remainingSec <= 0)) return null
    return s
  } catch {
    return null
  }
}

export default function FocusPage() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [duration, setDuration] = useState(25)
  const [custom, setCustom] = useState('')
  const [subject, setSubject] = useState('')
  const [task, setTask] = useState('')
  const [tasksDone, setTasksDone] = useState(0)
  const [remainingSec, setRemainingSec] = useState(25 * 60)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState<null | { minutes: number; tasks: number; streak: number; endedEarly: boolean }>(null)
  const [data, setData] = useState<FocusState | null>(null)
  const [openTasks, setOpenTasks] = useState<Array<{ id: string; title: string }>>([])
  const [others, setOthers] = useState<Array<{ userId: string; subject: string | null; user: { name: string } }>>([])

  const sessionRef = useRef<ActiveSession | null>(null)
  const restoredRef = useRef(false)

  const load = useCallback(() => {
    api.get<FocusState>('/api/focus')
      .then((d) => setData(d))
      .catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  // Open tasks for "current task" context
  useEffect(() => {
    api.get<{ tasks: Array<{ id: string; title: string; status: string }> }>('/api/tasks?status=TODO&limit=20')
      .then((d) => setOpenTasks(d.tasks.map((t) => ({ id: t.id, title: t.title }))))
      .catch(() => {})
  }, [])

  const persist = () => {
    try {
      if (sessionRef.current) sessionStorage.setItem(STORE_KEY, JSON.stringify(sessionRef.current))
      else sessionStorage.removeItem(STORE_KEY)
    } catch { /* storage unavailable — timer still works in-memory */ }
  }

  const finish = useCallback(async (endedEarly: boolean) => {
    const s = sessionRef.current
    setPhase('idle')
    sessionRef.current = null
    persist()
    if (!s) return
    const elapsedMin = Math.max(1, Math.min(
      s.durationMin,
      Math.round((s.durationMin * 60 - (s.endsAt !== null ? Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)) : s.remainingSec)) / 60),
    ))
    setCompleting(true)
    try {
      const d = await api.post<{ streak: { current: number } }>('/api/focus', {
        durationMinutes: elapsedMin,
        subject: s.subject || undefined,
        tasksCompleted: tasksDone,
        startedAt: new Date(s.startedAt).toISOString(),
      })
      setCompleted({ minutes: elapsedMin, tasks: tasksDone, streak: d.streak.current, endedEarly })
      toast.success(`+${elapsedMin}m logged — streak at ${d.streak.current} day${d.streak.current === 1 ? '' : 's'} 🔥`)
      setTasksDone(0)
      setRemainingSec(duration * 60)
      load()
    } catch {
      toast.error('Could not save your focus session. Please check your connection and try again.')
      setRemainingSec(duration * 60)
    } finally {
      setCompleting(false)
    }
  }, [duration, tasksDone, load])

  // Restore a persisted session once on mount. If it elapsed while away, log it honestly.
  useEffect(() => {
    if (restoredRef.current) return
    restoredRef.current = true
    const s = loadPersisted()
    if (!s) return
    sessionRef.current = s
    setDuration(s.durationMin)
    setSubject(s.subject || '')
    setTask(s.task || '')
    setRemainingSec(s.endsAt !== null ? Math.max(0, Math.round((s.endsAt - Date.now()) / 1000)) : s.remainingSec)
    if (s.endsAt !== null && Date.now() >= s.endsAt) {
      void finish(false) // ran to completion while the tab was closed
    } else {
      setPhase(s.endsAt !== null ? 'running' : 'paused')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Accurate tick: recompute from endsAt every second — immune to interval drift and tab throttling.
  useEffect(() => {
    if (phase !== 'running') return
    const tick = () => {
      const s = sessionRef.current
      if (!s?.endsAt) return
      const rem = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000))
      setRemainingSec(rem)
      if (rem <= 0) void finish(false)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [phase, finish])

  // Keep the tab title honest while focusing
  useEffect(() => {
    if (phase === 'running') {
      const m = Math.floor(remainingSec / 60)
      const sec = remainingSec % 60
      document.title = `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')} — Focus · Study-Group`
      return () => { document.title = 'Study-Group' }
    }
    document.title = 'Study-Group'
  }, [phase, remainingSec])

  // Presence: poll recently active studiers (privacy-safe: name + subject only)
  useEffect(() => {
    if (phase === 'idle') { setOthers([]); return }
    const poll = () => {
      api.get<{ logs: Array<{ userId: string; subject: string | null; user?: { name: string } }> }>('/api/focus?presence=1')
        .then((d) => setOthers((d.logs ?? []).filter((l) => l.user).slice(0, 5).map((l) => ({ userId: l.userId, subject: l.subject, user: { name: l.user!.name } }))))
        .catch(() => {})
    }
    poll()
    const t = setInterval(poll, 30000)
    return () => clearInterval(t)
  }, [phase])

  const pick = (mins: number) => {
    if (phase !== 'idle') return
    sessionRef.current = null
    persist()
    setDuration(mins)
    setRemainingSec(mins * 60)
    setCompleted(null)
  }

  const start = () => {
    const now = Date.now()
    const s: ActiveSession = {
      durationMin: duration,
      subject,
      task,
      startedAt: now,
      endsAt: now + duration * 60 * 1000,
      remainingSec: duration * 60,
    }
    sessionRef.current = s
    persist()
    setRemainingSec(duration * 60)
    setCompleted(null)
    setPhase('running')
  }

  const pause = () => {
    const s = sessionRef.current
    if (!s?.endsAt) return
    const rem = Math.max(0, Math.round((s.endsAt - Date.now()) / 1000))
    sessionRef.current = { ...s, endsAt: null, remainingSec: rem }
    persist()
    setRemainingSec(rem)
    setPhase('paused')
  }

  const resume = () => {
    const s = sessionRef.current
    if (!s) return
    sessionRef.current = { ...s, endsAt: Date.now() + s.remainingSec * 1000 }
    persist()
    setPhase('running')
  }

  const reset = () => {
    sessionRef.current = null
    persist()
    setPhase('idle')
    setRemainingSec(duration * 60)
  }

  const mins = Math.floor(remainingSec / 60)
  const secs = remainingSec % 60
  const progress = 1 - remainingSec / (duration * 60)
  const running = phase === 'running'
  const dailyGoalMin = data ? Math.max(25, Math.round(data.streak.weeklyGoalMin / 7 / 5) * 5) : 0
  const goalPct = data && dailyGoalMin > 0 ? Math.min(100, Math.round((data.todayMinutes / dailyGoalMin) * 100)) : 0

  return (
    <div className="section-container max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Focus</h1>
        <p className="mt-1 text-sm text-secondary">Deep work sessions that log real study hours.</p>
      </div>

      {/* Completion state */}
      {completed && (
        <div className="card border-emerald-200 bg-emerald-50/60 p-6 text-center dark:border-emerald-500/20 dark:bg-emerald-500/10">
          <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          <h2 className="mt-3 text-lg font-semibold">Session complete</h2>
          <p className="mt-1 text-sm text-secondary">
            {completed.minutes} minutes focused{completed.endedEarly ? '' : ' — full session'}
          </p>
          <div className="mx-auto mt-4 grid max-w-md grid-cols-3 gap-3 text-sm">
            <div><p className="text-xl font-semibold">+{completed.minutes}m</p><p className="text-xs text-muted">Added today</p></div>
            <div><p className="text-xl font-semibold">{completed.tasks}</p><p className="text-xs text-muted">Tasks completed</p></div>
            <div><p className="text-xl font-semibold">🔥 {completed.streak}</p><p className="text-xs text-muted">Day streak maintained</p></div>
          </div>
          {data && (
            <p className="mt-3 text-xs text-muted">
              Today: {Math.floor(data.todayMinutes / 60)}h {data.todayMinutes % 60}m of your {Math.floor(dailyGoalMin / 60)}h {dailyGoalMin % 60}m goal
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => { setCompleted(null); setRemainingSec(duration * 60) }} className="btn btn-primary">Start another session</button>
            <Link href="/dashboard" className="btn btn-secondary">Return to dashboard <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      )}

      {/* Timer */}
      {!completed && (
        <div className={cn('card p-6 sm:p-8', running && 'border-indigo-200 dark:border-indigo-500/20')}>
          {/* Presets — hidden while a session is live to stay distraction-free */}
          {phase === 'idle' && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => pick(p)}
                  className={cn('rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                    duration === p ? 'border-indigo-600 bg-indigo-600 text-white' : 'text-secondary hover:bg-[rgb(var(--sg-hover))]')}
                >
                  {p} min
                </button>
              ))}
              <input
                type="number" min={5} max={240} placeholder="Custom"
                value={custom}
                onChange={(e) => { const v = Number(e.target.value); if (v >= 5 && v <= 240) { setCustom(e.target.value); pick(v) } }}
                className="input w-24 py-2 text-sm"
                aria-label="Custom minutes"
              />
            </div>
          )}

          {/* Dial */}
          <div className="mt-8 flex justify-center">
            <div
              className="relative flex h-64 w-64 items-center justify-center rounded-full"
              style={{
                background: `conic-gradient(rgb(var(--sg-accent)) ${progress * 360}deg, rgb(var(--sg-border)) 0deg)`,
              }}
              role="timer" aria-live="off" aria-label={`Focus timer, ${mins} minutes ${secs} seconds remaining`}
            >
              <div className="flex h-[232px] w-[232px] flex-col items-center justify-center rounded-full bg-[rgb(var(--sg-card))]">
                <p className="text-5xl font-semibold tabular-nums">{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}</p>
                <p className="mt-1 text-sm text-muted">{subject || 'Pick a subject'}</p>
                {task && <p className="mt-0.5 max-w-[180px] truncate text-xs text-muted">{task}</p>}
                {phase === 'paused' && <Badge tone="warning" className="mt-2">Paused</Badge>}
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-center gap-3">
            {!running ? (
              phase === 'paused' ? (
                <>
                  <Button onClick={resume} size="lg"><Play className="h-4 w-4" /> Resume</Button>
                  <Button variant="secondary" onClick={() => finish(true)} isLoading={completing} size="lg">
                    <CheckCircle2 className="h-4 w-4" /> Finish early
                  </Button>
                  <Button variant="danger" onClick={reset} size="lg" aria-label="Discard session"><RotateCcw className="h-4 w-4" /></Button>
                </>
              ) : (
                <Button onClick={start} size="lg"><Play className="h-4 w-4" /> Start focus</Button>
              )
            ) : (
              <>
                <Button variant="secondary" onClick={pause} size="lg"><Pause className="h-4 w-4" /> Pause</Button>
                <Button onClick={() => finish(true)} isLoading={completing} size="lg">
                  <CheckCircle2 className="h-4 w-4" /> Finish early
                </Button>
              </>
            )}
          </div>

          {/* Session meta — hidden while running */}
          {phase === 'idle' && (
            <div className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-2">
              <Input label="Subject (optional)" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Calculus" />
              <Select label="Current task (optional)" value={task} onChange={(e) => setTask(e.target.value)}>
                <option value="">None</option>
                {openTasks.map((t) => <option key={t.id} value={t.title}>{t.title}</option>)}
              </Select>
              <div className="sm:col-span-2">
                <Select label="Tasks completed this session" value={String(tasksDone)} onChange={(e) => setTasksDone(Number(e.target.value))}>
                  {[0, 1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} task{n === 1 ? '' : 's'}</option>)}
                </Select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Today's goal */}
      {data && !completed && (
        <div className="card p-4">
          <div className="flex items-center justify-between text-sm">
            <p className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-indigo-500" /> Today&apos;s goal</p>
            <p className="tabular-nums text-muted">
              {Math.floor(data.todayMinutes / 60)}h {data.todayMinutes % 60}m
              <span className="text-secondary"> / {Math.floor(dailyGoalMin / 60)}h {dailyGoalMin % 60}m</span>
            </p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgb(var(--sg-surface-muted))]">
            <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-500" style={{ width: `${goalPct}%` }} />
          </div>
        </div>
      )}

      {/* Study with others */}
      {(running || phase === 'paused') && (
        <div className="card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-muted" /> Study with others</p>
          {others.length === 0 ? (
            <p className="mt-2 text-sm text-muted">No one else is focusing right now — you are. That counts.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {others.map((o) => (
                <div key={o.userId} className="flex items-center gap-2 text-sm">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                  <span className="font-medium">{o.user.name}</span>
                  <span className="text-muted">· {o.subject || 'Studying'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats — hidden mid-session to keep the view minimal */}
      {data && phase === 'idle' && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4 text-center">
            <Flame className="mx-auto h-5 w-5 text-amber-500" />
            <p className="mt-1.5 text-xl font-semibold">{data.streak.current}</p>
            <p className="text-xs text-muted">Day streak</p>
          </div>
          <div className="card p-4 text-center">
            <Target className="mx-auto h-5 w-5 text-indigo-500" />
            <p className="mt-1.5 text-xl font-semibold">{data.streak.longest}</p>
            <p className="text-xs text-muted">Longest streak</p>
          </div>
          <div className="card p-4 text-center">
            <Timer className="mx-auto h-5 w-5 text-emerald-500" />
            <p className="mt-1.5 text-xl font-semibold">{Math.round(data.weekMinutes / 6) / 10}h</p>
            <p className="text-xs text-muted">This week</p>
          </div>
          <div className="card p-4 text-center">
            <p className="mt-1.5 text-xl font-semibold">{Math.round((data.weekMinutes / data.streak.weeklyGoalMin) * 100)}%</p>
            <p className="text-xs text-muted">of {Math.round(data.streak.weeklyGoalMin / 60)}h goal</p>
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {data && data.logs.length > 0 && phase === 'idle' && (
        <div>
          <h2 className="mb-3 text-base font-semibold">Recent focus sessions</h2>
          <div className="card divide-y p-0">
            {data.logs.slice(0, 6).map((l) => (
              <div key={l.id} className="flex items-center justify-between p-3.5 text-sm">
                <div>
                  <p className="font-medium">{l.subject || 'Focus session'}</p>
                  <p className="text-xs text-muted">{new Date(l.startedAt).toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  {l.tasksCompleted > 0 && <Badge tone="success">{l.tasksCompleted} tasks</Badge>}
                  <span className="font-semibold tabular-nums">{l.durationMinutes}m</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && data.logs.length === 0 && phase === 'idle' && !completed && (
        <EmptyState
          icon={Timer} title="No focus sessions yet"
          description="Start a 25-minute session — completed sessions build your streak and feed your analytics."
        />
      )}
    </div>
  )
}
