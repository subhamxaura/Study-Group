'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckSquare, CalendarDays, MessageCircle, Timer,
  Target, Zap, ArrowRight, ChevronRight, Clock,
} from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton'
import { FocusRooms } from '@/components/focus/FocusRooms'
import { useSession } from '@/lib/store'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/types'

interface MyStudy {
  summary: { thisWeekMin: number; lastWeekMin: number; sessions: number; tasksCompleted: number; tasksOpen: number; overdue: number; streak: number }
  consistency: Array<{ label: string; minutes: number }>
  patterns: { mostActiveDay: string; avgSessionMin: number; topSubject: string } | null
  goal: { weeklyGoalMin: number; weekMinutes: number; pct: number }
  nextAction: { kind: string; text: string; href: string } | null
  hasStudyData: boolean
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function fmtHours(min: number) {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function fmtDay(iso: string) {
  return new Date(iso).getDate().toString()
}

function fmtMon(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short' })
}

function fmtRange(startIso: string, endIso: string) {
  const s = new Date(startIso)
  const e = new Date(endIso)
  const f = (d: Date) => d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }).replace(' ', '')
  return `${f(s)} – ${f(e)}`
}

function fmtDue(iso: string | null) {
  if (!iso) return 'Anytime'
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short' })
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.max(1, Math.round(ms / 60000))
  if (min < 60) return `${min} min ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h} hr ago`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Quad particles — 12 drifting dots, disabled under reduced-motion. Visual only. */
function QuadParticles() {
  const dots = useMemo(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return []
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      size: (2 + Math.random() * 2.5).toFixed(1),
      left: `${(4 + Math.random() * 92).toFixed(1)}%`,
      duration: `${(9 + Math.random() * 9).toFixed(1)}s`,
      delay: `${(-Math.random() * 12).toFixed(1)}s`,
    }))
  }, [])
  return (
    <div className="quad-particles" aria-hidden="true">
      {dots.map((d) => (
        <i key={d.id} style={{ width: `${d.size}px`, height: `${d.size}px`, left: d.left, animationDuration: d.duration, animationDelay: d.delay }} />
      ))}
    </div>
  )
}

/** Quad streak count-up — animates to the real streak, instant under reduced-motion. */
function StreakCount({ target }: { target: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVal(target)
      return
    }
    let raf = 0
    const t0 = performance.now()
    const dur = 1400
    const step = (ts: number) => {
      const p = Math.min((ts - t0) / dur, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return <span>{val}</span>
}

function initialsOf(n: string) {
  return n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
}

const DOT = ['quad-dot-b', 'quad-dot-v', 'quad-dot-a', 'quad-dot-g']
const AV = ['quad-avatar-sa', 'quad-avatar-ap', 'quad-avatar-jk', 'quad-avatar-mr', 'quad-avatar-lt']
function toneOf(n: string) {
  let h = 0
  for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return AV[h % AV.length]
}

function WeekChart({ data }: { data: Array<{ label: string; minutes: number }> }) {
  const max = Math.max(...data.map((d) => d.minutes), 60)
  const best = [...data].sort((a, b) => b.minutes - a.minutes)[0]
  return (
    <div>
      <div className="flex h-28 items-end gap-2" role="img" aria-label={`Study minutes per day this week; best day ${best?.minutes ? best.label : 'none yet'}`}>
        {data.map((d) => (
          <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="text-[10px] font-medium tabular-nums text-muted">{d.minutes > 0 ? `${d.minutes}m` : ''}</span>
            <div className="flex w-full max-w-[32px] flex-1 items-end">
              <div
                className={cn('w-full rounded-md transition-all', d.minutes > 0 ? 'bg-[rgb(var(--sg-accent))]/80' : 'bg-[rgb(var(--sg-surface-muted))]')}
                style={{ height: `${d.minutes > 0 ? Math.max(6, (d.minutes / max) * 100) : 4}%` }}
              />
            </div>
            <span className="text-[10px] text-muted">{d.label}</span>
          </div>
        ))}
      </div>
      {best && best.minutes > 0 && (
        <p className="mt-2 text-center text-xs text-muted">Most productive: <span className="font-medium text-secondary">{best.label}</span></p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [study, setStudy] = useState<MyStudy | null>(null)
  const [insights, setInsights] = useState<Array<{ id: string; icon: string; text: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [barsLoaded, setBarsLoaded] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get<DashboardData>('/api/dashboard'),
      api.get<MyStudy>('/api/my-study'),
      api.get<{ insights: Array<{ id: string; icon: string; text: string }> }>('/api/insights'),
    ])
      .then(([d, m, i]) => {
        setData(d)
        setStudy(m)
        setInsights(i.insights.slice(0, 1))
      })
      .catch(() => setError('Could not load your dashboard. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Quad progress bars animate in shortly after data arrives (visual only).
  useEffect(() => {
    if (!data) return
    const t = setTimeout(() => setBarsLoaded(true), 100)
    return () => clearTimeout(t)
  }, [data])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-7">
        <Skeleton className="h-8 w-64" />
        <div className="skeleton h-44 rounded-2xl" />
        <div className="quad-stats">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="quad-columns">
          <SkeletonList rows={3} />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-7">
        <EmptyState
          icon={Clock} title="Something went wrong" description={error || 'No data available.'}
          action={<button onClick={load} className="btn btn-primary btn-sm">Try again</button>}
        />
      </div>
    )
  }

  const s = study?.summary
  const goal = study?.goal
  const weekMin = goal?.weekMinutes ?? 0
  const goalMin = goal?.weeklyGoalMin ?? 0
  const goalPct = goal?.pct ?? 0
  const lastWeekMin = s?.lastWeekMin ?? 0
  const weekHrs = weekMin / 60
  const diffHrs = (weekMin - lastWeekMin) / 60
  const streak = s?.streak ?? 0
  const tasksOpen = s?.tasksOpen ?? data.dueTasks.length
  const tasksDone = s?.tasksCompleted ?? data.stats.tasksCompleted
  const sessionsWeek = s?.sessions ?? 0
  const firstName = user?.name.split(' ')[0] ?? 'there'

  const headline = streak > 0
    ? `${streak}-day streak going.`
    : weekMin > 0
      ? `You've studied ${fmtHours(weekMin)} this week.`
      : 'Plan your first session.'
  const heroSub = data.groups.length === 0
    ? 'Join a group to get sessions, tasks and resources in one place.'
    : `${sessionsWeek} session${sessionsWeek === 1 ? '' : 's'} this week, ${tasksOpen} task${tasksOpen === 1 ? '' : 's'} open${data.upcoming[0]?.group ? ` — ${data.upcoming[0].group.name} is next up.` : '.'}`
  const onlineLine = data.upcoming.length > 0
    ? (<><strong style={{ color: 'var(--sg-foreground)', fontWeight: 600 }}>{data.upcoming.length} upcoming session{data.upcoming.length === 1 ? '' : 's'}</strong><span> — {data.upcoming[0].group ? `${data.upcoming[0].group.name} · ` : ''}{new Date(data.upcoming[0].startsAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}</span></>)
    : (<><strong style={{ color: 'var(--sg-foreground)', fontWeight: 600 }}>{data.stats.activeGroups} active group{data.stats.activeGroups === 1 ? '' : 's'}</strong><span> — plan a session to get started</span></>)

  const maxMsgs = Math.max(...data.groups.map((g) => g.weeklyMessages ?? 0), 1)
  const resourceActivity = data.activity.filter((a) => a.kind === 'resource').slice(0, 4)
  const messageActivity = data.activity.filter((a) => a.kind === 'message').slice(0, 3)

  const toggleTask = async (id: string, title: string) => {
    await api.patch(`/api/tasks/${id}`, { status: 'COMPLETED', progress: 100 }).catch(() => {})
    load()
  }

  return (
    <div className="mx-auto max-w-7xl px-5 pb-10 pt-2 sm:px-7">
      {/* Quad hero — real weekly summary, no hardcoded content */}
      <section className="quad-hero quad-panel quad-anim-in quad-d4" aria-label="Weekly summary">
        <QuadParticles />
        <h1>{greeting()}, {firstName}. <em>{headline}</em></h1>
        <p>{heroSub}</p>
        <div className="quad-online-line"><span className="quad-green-dot" aria-hidden="true" /><span>{onlineLine}</span></div>
        <div className="quad-stats">
          <div className="quad-stat quad-anim-in quad-d1">
            <div className="quad-stat-top">
              <span className="quad-stat-label">Hours studied this week</span>
              <span className={cn('quad-stat-delta', diffHrs >= 0 ? 'quad-delta-up' : 'quad-delta-b')}>
                {diffHrs >= 0 ? `+${diffHrs.toFixed(1)}` : diffHrs.toFixed(1)}
              </span>
            </div>
            <div className="quad-stat-value">{weekHrs.toFixed(1)} <small>hrs</small></div>
            <div className="quad-stat-sub">
              {sessionsWeek} session{sessionsWeek === 1 ? '' : 's'} attended · {tasksDone} task{tasksDone === 1 ? '' : 's'} done
            </div>
          </div>
          <div className="quad-stat quad-anim-in quad-d2">
            <div className="quad-stat-top">
              <span className="quad-stat-label">Active groups</span>
              <span className="quad-stat-delta quad-delta-v">{data.stats.activeGroups} total</span>
            </div>
            <div className="quad-stat-value">{data.stats.activeGroups} <small>group{data.stats.activeGroups === 1 ? '' : 's'}</small></div>
            <div className="quad-stat-sub">
              {data.groups[0] ? `${data.groups[0].name} · ${data.groups[0].memberCount} members` : 'Discover groups to join'}
            </div>
          </div>
          <div className="quad-stat quad-anim-in quad-d3">
            <div className="quad-stat-top">
              <span className="quad-stat-label">Study streak</span>
              <span className="quad-stat-delta quad-delta-b">Goal {goalPct}%</span>
            </div>
            <div className="quad-stat-value"><StreakCount target={streak} /> <small>days</small></div>
            <div className="quad-stat-sub">
              {goalMin > 0 ? `${fmtHours(weekMin)} of ${fmtHours(goalMin)} weekly goal` : 'Set a weekly goal in Settings'}
            </div>
          </div>
        </div>
        {/* Weekly goal bar + primary actions — real data, Quad bar styling */}
        <div className="mt-[18px] flex flex-col gap-3">
          {goalMin > 0 && (
            <div>
              <div className="quad-bar" role="progressbar" aria-valuenow={goalPct} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly goal progress">
                <i style={{ ['--w' as string]: `${Math.min(100, goalPct)}%`, width: barsLoaded ? `${Math.min(100, goalPct)}%` : 0 }} />
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/focus" className="btn btn-primary btn-sm">
              <Timer className="h-4 w-4" /> Start focus
            </Link>
            {study?.nextAction && (
              <Link
                href={study.nextAction.href}
                data-testid="next-action"
                className="group inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-secondary transition-colors hover:text-[rgb(var(--sg-foreground))]"
              >
                <Zap className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--sg-accent))]" aria-hidden="true" />
                <span>{study.nextAction.text}</span>
                <span className="inline-flex items-center gap-0.5 font-semibold text-[rgb(var(--sg-accent))]">
                  Do it <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="quad-columns">
        <div>
          {/* Quad upcoming sessions — real bookings */}
          <section className="quad-panel quad-anim-in quad-d4" id="sessions" aria-label="Upcoming sessions">
            <div className="quad-panel-head"><h2>Upcoming sessions</h2><Link href="/calendar">View calendar</Link></div>
            <p className="quad-panel-desc">
              {data.upcoming.length === 0 ? 'Nothing booked yet.' : `Next ${Math.min(3, data.upcoming.length)} booking${Math.min(3, data.upcoming.length) === 1 ? '' : 's'}.`}
            </p>
            {data.upcoming.length === 0 ? (
              <div className="py-2">
                <p className="text-sm text-secondary">Your schedule is clear.</p>
                <Link href="/calendar?create=1" className="btn btn-secondary btn-sm mt-3">Create a session</Link>
              </div>
            ) : (
              data.upcoming.slice(0, 3).map((sess, i) => (
                <article className="quad-session" key={sess.id} tabIndex={0}>
                  <div className="quad-date-block"><b>{fmtDay(sess.startsAt)}</b><span>{fmtMon(sess.startsAt)}</span></div>
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-semibold tracking-[-0.01em]">{sess.title}</h3>
                    <p className="mt-[3px] text-[12.8px] text-secondary">
                      {sess.group ? sess.group.name : 'Personal'} · {sess.subject}
                    </p>
                    <div className="quad-meta">
                      <span>{fmtRange(sess.startsAt, sess.endsAt)}</span>
                      <span>{sess.location ? sess.location : sess.isOnline ? 'Online' : 'Location TBA'}</span>
                    </div>
                    <div className="quad-session-foot">
                      <div className="quad-stack">
                        <span className={cn('grid h-6 w-6 place-items-center rounded-full border-2 text-[10px] font-semibold text-white dark:border-[#12121E]', toneOf(sess.group?.name ?? sess.title))} aria-hidden="true">
                          {(sess.group?.name ?? sess.title)[0]}
                        </span>
                      </div>
                      <span className={cn('quad-tag', i === 0 ? 'quad-tag-confirm' : i === 1 ? 'quad-tag-soon' : 'quad-tag-violet')}>
                        {sess.goingCount} going
                      </span>
                      <Link href="/calendar" className={cn('quad-join', i === 1 ? '' : 'quad-join-ghost')}>Details</Link>
                    </div>
                  </div>
                </article>
              ))
            )}
          </section>

          {/* Quad group activity — real message share per group (honest label, no fake syllabus) */}
          <section className="quad-panel quad-anim-in quad-d4" style={{ marginTop: 18 }} aria-label="Group activity">
            <div className="quad-panel-head"><h2>Group activity</h2><Link href="/groups">All groups</Link></div>
            <p className="quad-panel-desc">Share of this week&apos;s messages per group.</p>
            {data.groups.length === 0 ? (
              <EmptyState
                icon={MessageCircle} title="No groups yet"
                description="Study with people working toward similar goals — find a group in your subject."
                action={<Link href="/discover" className="btn btn-primary btn-sm">Discover groups</Link>}
              />
            ) : (
              <div className="quad-progress-list">
                {data.groups.slice(0, 4).map((g, i) => {
                  const pct = Math.round(((g.weeklyMessages ?? 0) / maxMsgs) * 100)
                  const barTone = i % 4 === 1 ? 'quad-bar-v' : i % 4 === 2 ? 'quad-bar-a' : i % 4 === 3 ? 'quad-bar-g' : ''
                  return (
                    <div className={cn('quad-prow', barsLoaded && 'loaded')} style={{ ['--w' as string]: `${pct}%` }} key={g.id}>
                      <div className="quad-prow-top">
                        <span className={cn('quad-dot', DOT[i % DOT.length])} aria-hidden="true" />
                        <strong className="truncate">{g.name}</strong>
                        <span className="pct">{g.weeklyMessages ?? 0} msgs</span>
                      </div>
                      <div className={cn('quad-bar', barTone)}><i style={{ width: barsLoaded ? `${pct}%` : 0 }} /></div>
                      <div className="quad-prow-sub">{g.memberCount} members · {g.subject}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Today's plan — kept as compact Quad panel (real timeline) */}
          <section className="quad-panel quad-anim-in quad-d4" style={{ marginTop: 18 }} aria-label="Today's study plan">
            <div className="quad-panel-head"><h2>Today&apos;s plan</h2><Link href="/tasks">All tasks</Link></div>
            <p className="quad-panel-desc">
              {fmtHours(data.todayPlan.focusDoneToday)} focused today · {data.todayPlan.sessionsToday} session{data.todayPlan.sessionsToday === 1 ? '' : 's'} · {data.todayPlan.tasksDueToday} due
            </p>
            {(data.todayTimeline?.length ?? 0) === 0 ? (
              <div>
                <p className="text-sm text-secondary">Your schedule is clear today.</p>
                <Link href="/focus" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline">
                  <Timer className="h-3.5 w-3.5" /> Start a focus session anyway <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <ol className="mt-1 space-y-1">
                {data.todayTimeline!.slice(0, 5).map((item) => (
                  <li key={`${item.kind}-${item.id}`} className="flex items-center gap-3 py-1.5">
                    <span className={cn('quad-dot', item.kind === 'task' ? (item.overdue ? 'quad-dot-a' : 'quad-dot-v') : item.kind === 'session' ? 'quad-dot-b' : 'quad-dot-g')} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium">{item.title}</p>
                      <p className="text-xs text-muted">
                        {item.kind === 'task' && `Task${item.groupName ? ` · ${item.groupName}` : ' · Personal'}`}
                        {item.kind === 'session' && `Session${item.groupName ? ` · ${item.groupName}` : ''} · ${item.goingCount} going`}
                        {item.kind === 'focus' && `Focus · ${item.recommendedMinutes}m recommended`}
                      </p>
                    </div>
                    {item.kind === 'task' && item.groupId && <Link href={`/groups/${item.groupId}`} className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline">Open</Link>}
                    {item.kind === 'session' && <Link href="/calendar" className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline">View</Link>}
                    {item.kind === 'focus' && <Link href="/focus" className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline">Start</Link>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="quad-right-col">
          {/* Quad tasks — real due tasks with server toggle */}
          <section className="quad-panel quad-anim-in quad-d4" id="tasks" aria-label="Tasks">
            <div className="quad-panel-head"><h2>Tasks for this week</h2><Link href="/tasks">See all {data.dueTasks.length}</Link></div>
            <p className="quad-panel-desc">Tick them off — it syncs for the whole group.</p>
            {data.dueTasks.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Nothing due — nice work.</p>
            ) : (
              <div>
                {data.dueTasks.slice(0, 4).map((t) => {
                  const done = t.status === 'COMPLETED'
                  return (
                    <div
                      key={t.id}
                      className={cn('quad-task', done && 'done')}
                      tabIndex={0} role="checkbox" aria-checked={done}
                      aria-label={`${t.title} — ${done ? 'completed' : 'mark complete'}`}
                      onClick={() => { if (!done) toggleTask(t.id, t.title) }}
                      onKeyDown={(e) => { if ((e.key === ' ' || e.key === 'Enter') && !done) { e.preventDefault(); toggleTask(t.id, t.title) } }}
                    >
                      <button className="quad-check" aria-hidden="true" tabIndex={-1}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="#081026" strokeWidth="3.5"><path d="M4 12.5l5 5L20 6.5" /></svg>
                      </button>
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate text-[13px] font-medium">{t.title}</strong>
                        <span className="text-xs text-muted">{t.group ? t.group.name : 'Personal'}{t.dueDate ? ` · due ${fmtDue(t.dueDate)}` : ''}</span>
                      </div>
                      <span className="ml-auto flex-none rounded-full border border-[rgb(var(--sg-border))] bg-white/[0.02] px-2 py-0.5 text-[11px] text-muted">
                        {done ? 'Done' : fmtDue(t.dueDate)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Quad studying now — real live focus rooms */}
          <section className="quad-panel quad-anim-in quad-d4" aria-label="Members studying now">
            <div className="quad-panel-head"><h2>Studying now</h2><Link href="/focus">All rooms</Link></div>
            <p className="quad-panel-desc">Live focus rooms — join one.</p>
            <FocusRooms />
          </section>

          {/* Quad recent messages — real activity */}
          <section className="quad-panel quad-anim-in quad-d4" aria-label="Recent messages">
            <div className="quad-panel-head"><h2>Recent messages</h2><Link href="/messages">Open chat</Link></div>
            <p className="quad-panel-desc">Latest from your groups.</p>
            {messageActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Messages from your groups will show up here.</p>
            ) : (
              <div>
                {messageActivity.map((a) => (
                  <div className="quad-msg" key={`${a.kind}-${a.id}`}>
                    <span className={cn('grid h-[30px] w-[30px] flex-none place-items-center rounded-full border border-white/20 text-[11px] font-semibold text-white', toneOf(a.actor))} aria-hidden="true">
                      {initialsOf(a.actor)}
                    </span>
                    <div className="min-w-0">
                      <strong className="text-[12.8px]">{a.actor}<time className="ml-[7px] text-[11px] font-normal text-muted">{timeAgo(a.at)}</time></strong>
                      <p className="mt-0.5 text-[12.6px] text-secondary">“{a.text.slice(0, 90)}{a.text.length > 90 ? '…' : ''}” <b className="font-medium text-[rgb(var(--sg-foreground))]">· {a.groupName}</b></p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Quad shared resources — real resource activity */}
          <section className="quad-panel quad-anim-in quad-d4" id="resources" aria-label="Shared resources">
            <div className="quad-panel-head"><h2>Shared resources</h2><Link href="/resources">Browse</Link></div>
            <p className="quad-panel-desc">Recently shared across your groups.</p>
            {resourceActivity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Resources shared in your groups will appear here.</p>
            ) : (
              <div>
                {resourceActivity.map((a, i) => (
                  <div className="quad-res" key={`${a.kind}-${a.id}`}>
                    <span className={cn('quad-file-ic', i % 4 === 0 ? 'quad-file-code' : i % 4 === 1 ? 'quad-file-pdf' : i % 4 === 2 ? 'quad-file-note' : 'quad-file-sheet')} aria-hidden="true">
                      {i % 4 === 0 ? 'FX' : i % 4 === 1 ? 'PDF' : i % 4 === 2 ? 'MD' : 'DOC'}
                    </span>
                    <div className="min-w-0">
                      <strong className="block truncate text-[13px] font-medium">{a.text.slice(0, 60)}</strong>
                      <span className="text-[11.8px] text-muted">{a.actor} · {a.groupName} · {timeAgo(a.at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Weekly rhythm + insight — real analytics, Quad panel chrome */}
          <section className="quad-panel quad-anim-in quad-d4" aria-label="Weekly rhythm">
            <div className="quad-panel-head"><h2>Weekly rhythm</h2><Link href="/analytics">Analytics</Link></div>
            {study && study.consistency.some((d) => d.minutes > 0) ? (
              <WeekChart data={study.consistency} />
            ) : (
              <p className="py-6 text-center text-sm text-muted">Your study rhythm will appear here after your first focus session.</p>
            )}
          </section>

          {insights.length > 0 && (
            <section className="quad-panel quad-anim-in quad-d4" aria-label="Insight">
              <div className="quad-panel-head"><h2>Insight</h2><Link href="/my-study">My study</Link></div>
              <ul className="space-y-2">
                {insights.map((ins) => (
                  <li key={ins.id} className="flex items-start gap-2 text-sm text-secondary">
                    <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                    <span>{ins.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Kept affordances that have no Quad equivalent yet */}
          <section className="quad-panel quad-anim-in quad-d4" aria-label="Today">
            <div className="quad-panel-head"><h2><span className="inline-flex items-center gap-2"><Target className="h-4 w-4 text-muted" /> Today</span></h2><Link href="/calendar">Calendar</Link></div>
            <p className="quad-panel-desc">{fmtHours(data.todayPlan.focusDoneToday)} focused · {data.todayPlan.tasksDueToday} due · {data.todayPlan.sessionsToday} sessions</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/calendar?create=1" className="btn btn-secondary btn-sm"><CalendarDays className="h-4 w-4" /> New session</Link>
              <Link href="/tasks?create=1" className="btn btn-secondary btn-sm"><CheckSquare className="h-4 w-4" /> New task</Link>
            </div>
          </section>
        </div>
      </div>
      <p className="quad-foot-note">
        {data.todayPlan.sessionsToday} session{data.todayPlan.sessionsToday === 1 ? '' : 's'} today · {data.todayPlan.tasksDueToday} task{data.todayPlan.tasksDueToday === 1 ? '' : 's'} due · {fmtHours(data.todayPlan.focusDoneToday)} focused.
      </p>
    </div>
  )
}
