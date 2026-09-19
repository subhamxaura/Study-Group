'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Users, Clock, CheckSquare, Flame, CalendarDays, ArrowRight, Plus,
  MessageCircle, BookOpen, Timer, ChevronRight, Target, Zap, CalendarPlus,
  CalendarCheck, TrendingUp, TrendingDown,
} from 'lucide-react'
import { EmptyState, Badge } from '@/components/ui'
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

/** Circular weekly-goal ring — the dashboard's visual anchor. */
function GoalRing({ pct, goalMin, weekMin }: { pct: number; goalMin: number; weekMin: number }) {
  const R = 52
  const C = 2 * Math.PI * R
  const filled = Math.min(100, Math.max(0, pct))
  return (
    <div
      className="relative h-32 w-32 shrink-0"
      role="img"
      aria-label={goalMin > 0
        ? `Weekly goal ${pct}% complete — ${fmtHours(weekMin)} of ${fmtHours(goalMin)} studied`
        : `Studied ${fmtHours(weekMin)} this week`}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" strokeWidth="9" className="stroke-[rgb(var(--sg-surface-muted))]" />
        <circle
          cx="60" cy="60" r={R} fill="none" strokeWidth="9" strokeLinecap="round"
          className="stroke-[rgb(var(--sg-accent))] transition-[stroke-dashoffset] duration-700 ease-out"
          strokeDasharray={C}
          strokeDashoffset={C - (C * filled) / 100}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {goalMin > 0 ? (
          <>
            <span className="text-2xl font-semibold tabular-nums">{pct}%</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">of goal</span>
          </>
        ) : (
          <>
            <span className="text-xl font-semibold tabular-nums">{fmtHours(weekMin)}</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">this week</span>
          </>
        )}
      </div>
    </div>
  )
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
                className={cn(
                  'w-full rounded-md transition-all',
                  d.minutes > 0 ? 'bg-[rgb(var(--sg-accent))]/80' : 'bg-[rgb(var(--sg-surface-muted))]'
                )}
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
        // Dashboard shows at most ONE insight — depth lives on /my-study.
        setInsights(i.insights.slice(0, 1))
      })
      .catch(() => setError('Could not load your dashboard. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="section-container space-y-5">
        <Skeleton className="h-8 w-64" />
        <div className="skeleton h-44 rounded-2xl" />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}
        </div>
        <div className="grid gap-5 lg:grid-cols-[1.7fr_0.9fr]">
          <SkeletonList rows={3} />
          <div className="skeleton h-64 rounded-xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="section-container">
        <EmptyState
          icon={Clock} title="Something went wrong" description={error || 'No data available.'}
          action={<button onClick={load} className="btn btn-primary btn-sm">Try again</button>}
        />
      </div>
    )
  }

  const fmtSession = (iso: string) => {
    const d = new Date(iso)
    const today = new Date().toDateString() === d.toDateString()
    return `${today ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
  }

  const s = study?.summary
  const goal = study?.goal
  const weekMin = goal?.weekMinutes ?? 0
  const goalMin = goal?.weeklyGoalMin ?? 0
  const goalPct = goal?.pct ?? 0
  const remainingMin = goalMin > 0 ? Math.max(0, goalMin - weekMin) : 0
  const lastWeekMin = s?.lastWeekMin ?? 0
  const trend =
    lastWeekMin > 0 && weekMin !== lastWeekMin
      ? { dir: weekMin > lastWeekMin ? 'up' : 'down', min: Math.abs(weekMin - lastWeekMin) }
      : null
  const streak = s?.streak ?? 0

  return (
    <div className="section-container space-y-6">
      {/* Welcome header — quiet, no duplicated actions (topbar owns Create group) */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">
          {greeting()}, {user?.name.split(' ')[0]}
        </h1>
        <p className="mt-1 text-sm text-secondary">
          {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} ·{' '}
          {streak > 0
            ? `Day ${streak} of your streak — keep it going.`
            : 'Your next focused session is ready when you are.'}
        </p>
      </div>

      {/* Weekly progress hero — the visual anchor */}
      <section className="card relative overflow-hidden p-5 sm:p-6" aria-label="Weekly study progress">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center">
          <GoalRing pct={goalPct} goalMin={goalMin} weekMin={weekMin} />

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">This week</p>
            <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">
              {fmtHours(weekMin)} {goalMin > 0 && <span className="text-base font-normal text-muted">/ {fmtHours(goalMin)}</span>}
            </p>
            <p className="mt-1 text-sm text-secondary">
              {goalMin > 0
                ? remainingMin > 0
                  ? `${remainingMin} minutes remaining to reach your weekly goal`
                  : 'Weekly goal reached — every minute now is a bonus.'
                : weekMin > 0
                  ? 'Set a weekly goal in Settings to track your progress.'
                  : 'No study time recorded yet this week.'}
            </p>

            {/* Context chips — real data, honest zero states */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                  streak > 0
                    ? 'border-[rgb(var(--sg-warning))]/30 bg-[rgb(var(--sg-warning))]/10 text-[rgb(var(--sg-warning))]'
                    : 'border-[rgb(var(--sg-border))] text-muted'
                )}
              >
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                {streak > 0 ? `${streak}-day streak` : 'No streak yet — start one today'}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--sg-border))] px-2.5 py-1 text-xs font-medium text-secondary">
                <CheckSquare className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                {s?.tasksCompleted ?? 0} task{(s?.tasksCompleted ?? 0) === 1 ? '' : 's'} completed
              </span>
              {study?.patterns && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--sg-border))] px-2.5 py-1 text-xs font-medium text-secondary">
                  <CalendarCheck className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  Best day: {study.patterns.mostActiveDay}
                </span>
              )}
            </div>
          </div>

          {/* Primary action + smart next action — one strong CTA each */}
          <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
            <Link href="/focus" className="btn btn-primary btn-lg w-full sm:w-auto">
              <Timer className="h-4 w-4" /> Start focus
            </Link>
            {study?.nextAction && (
              <Link
                href={study.nextAction.href}
                data-testid="next-action"
                className="group flex items-center gap-2 rounded-lg px-1 py-1.5 text-xs text-secondary transition-colors hover:text-[rgb(var(--sg-foreground))]"
              >
                <Zap className="h-3.5 w-3.5 shrink-0 text-[rgb(var(--sg-accent))] dark:text-[rgb(var(--sg-accent-muted))]" aria-hidden="true" />
                <span className="min-w-0 flex-1">{study.nextAction.text}</span>
                <span className="inline-flex shrink-0 items-center gap-0.5 font-semibold text-[rgb(var(--sg-accent))] dark:text-[rgb(var(--sg-accent-muted))]">
                  Do it <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Compact stats — distinct facets, each with real context */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <p className="truncate text-xs font-medium text-secondary">Active groups</p>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{data.stats.activeGroups}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {data.groups.length === 0 ? 'Find one in Discover' : data.groups[0].subject}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <p className="truncate text-xs font-medium text-secondary">Focus sessions</p>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{s?.sessions ?? 0}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {study?.patterns ? `avg ${study.patterns.avgSessionMin} min` : 'this week'}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <p className="truncate text-xs font-medium text-secondary">Tasks completed</p>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{s?.tasksCompleted ?? data.stats.tasksCompleted}</p>
          <p className="mt-0.5 truncate text-xs text-muted">
            {(s?.tasksOpen ?? 0) === 0
              ? 'All clear'
              : `${s?.tasksOpen} open${(s?.overdue ?? 0) > 0 ? ` · ${s?.overdue} overdue` : ''}`}
          </p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
            <p className="truncate text-xs font-medium text-secondary">Unread messages</p>
          </div>
          <p className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
            {data.groups.reduce((sum, g) => sum + (g.unreadCount ?? 0), 0)}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted">across your groups</p>
        </div>
      </div>

      {/* Quick actions — secondary; Start focus lives in the hero */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { href: '/calendar', label: 'Join session', icon: CalendarDays },
          { href: '/tasks?create=1', label: 'Create task', icon: Plus },
          { href: '/calendar?create=1', label: 'Create session', icon: CalendarPlus },
          { href: '/resources?create=1', label: 'Add resource', icon: BookOpen },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href} href={href}
            className="flex items-center justify-center gap-2 rounded-xl border bg-[rgb(var(--sg-card))] px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:border-[rgb(var(--sg-accent))]/40 hover:bg-[rgb(var(--sg-accent-soft))]/50 hover:text-[rgb(var(--sg-accent))] dark:hover:text-[rgb(var(--sg-accent-muted))]"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </div>

      {/* LIVE NOW — real focus rooms, joined from the dashboard */}
      <FocusRooms />

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[1.7fr_0.9fr]">
        <div className="space-y-5">
          {/* Today's plan — timeline from real data (tasks, sessions, recommended focus) */}
          <div className="card p-4">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-muted" /> Today&apos;s study plan</h2>
              <span className="text-xs text-muted">{fmtHours(data.todayPlan.focusDoneToday)} focused today</span>
            </div>
            {(data.todayTimeline?.length ?? 0) === 0 ? (
              <div className="mt-3">
                <p className="text-sm text-secondary">Your schedule is clear today.</p>
                <Link href="/focus" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline dark:text-[rgb(var(--sg-accent-muted))]">
                  <Timer className="h-3.5 w-3.5" /> Start a focus session anyway <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            ) : (
              <ol className="mt-3 space-y-0">
                {data.todayTimeline!.map((item, idx) => {
                  const time = item.kind === 'focus'
                    ? `${item.recommendedMinutes}m`
                    : item.at
                      ? new Date(item.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
                      : 'Anytime'
                  return (
                    <li key={`${item.kind}-${item.id}`} className="relative flex gap-3 pb-4 last:pb-0">
                      {/* Timeline spine */}
                      {idx < data.todayTimeline!.length - 1 && (
                        <span aria-hidden="true" className="absolute left-[27px] top-8 h-[calc(100%-16px)] w-px bg-[rgb(var(--sg-border))]" />
                      )}
                      <span className="w-12 shrink-0 pt-0.5 text-right text-[11px] font-medium tabular-nums text-muted">
                        {time}
                      </span>
                      <span
                        aria-hidden="true"
                        className={cn(
                          'mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-[rgb(var(--sg-card))]',
                          item.kind === 'task'
                            ? item.overdue ? 'bg-[rgb(var(--sg-danger))]' : 'bg-[rgb(var(--sg-warning))]'
                            : item.kind === 'session'
                              ? 'bg-[rgb(var(--sg-accent))]'
                              : 'bg-[rgb(var(--sg-success))]',
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <p className="text-sm font-medium">{item.title}</p>
                          {item.kind === 'task' && item.overdue && <Badge tone="danger">Overdue</Badge>}
                          {item.kind === 'task' && !item.overdue && item.priority === 'HIGH' && <Badge tone="warning">High</Badge>}
                          {item.kind === 'focus' && <Badge tone="success">Recommended</Badge>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted">
                          {item.kind === 'task' && `Task${item.groupName ? ` · ${item.groupName}` : ' · Personal'}`}
                          {item.kind === 'session' && `Study session${item.groupName ? ` · ${item.groupName}` : ''}${item.isOnline ? ' · Online' : item.location ? ` · ${item.location}` : ''}`}
                          {item.kind === 'focus' && `Focus${item.subject ? ` · ${item.subject}` : ''}`}
                        </p>
                        {item.kind === 'session' && (
                          <p className="mt-0.5 text-xs text-muted">{item.goingCount} going</p>
                        )}
                      </div>
                      {item.kind === 'task' && item.groupId && (
                        <Link href={`/groups/${item.groupId}`} className="self-center text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline dark:text-[rgb(var(--sg-accent-muted))]">Open</Link>
                      )}
                      {item.kind === 'session' && (
                        <Link href="/calendar" className="self-center text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline dark:text-[rgb(var(--sg-accent-muted))]">View</Link>
                      )}
                      {item.kind === 'focus' && (
                        <Link href="/focus" className="self-center text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline dark:text-[rgb(var(--sg-accent-muted))]">Start</Link>
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
          </div>

          {/* My groups */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">My study groups</h2>
              <Link href="/groups" className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline dark:text-[rgb(var(--sg-accent-muted))]">View all</Link>
            </div>
            {data.groups.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={Users} title="No groups yet"
                  description="Study with people working toward similar goals — find a group in your subject."
                  action={<Link href="/discover" className="btn btn-primary btn-sm">Discover groups</Link>}
                />
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.groups.map((g) => (
                  <Link
                    key={g.id} href={`/groups/${g.id}`}
                    className="card-hover flex flex-col p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--sg-accent))] text-sm font-bold text-white">{g.name[0]}</span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{g.name}</p>
                        <p className="truncate text-xs text-muted">{g.subject} · {g.memberCount} members</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{g.weeklyMessages ?? 0} msgs/7d</span>
                      {g.nextSessionAt && (
                        <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{fmtSession(g.nextSessionAt)}</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Tasks due soon */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Tasks due soon</h2>
              <Link href="/tasks" className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline dark:text-[rgb(var(--sg-accent-muted))]">All tasks</Link>
            </div>
            {data.dueTasks.length === 0 ? (
              <div className="card p-6 text-center text-sm text-muted">Nothing due — nice work.</div>
            ) : (
              <div className="card divide-y p-0">
                {data.dueTasks.map((t) => {
                  const overdue = t.dueDate && new Date(t.dueDate) < new Date()
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-3.5">
                      <button
                        onClick={async () => {
                          await api.patch(`/api/tasks/${t.id}`, { status: 'COMPLETED', progress: 100 }).catch(() => {})
                          load()
                        }}
                        className="h-5 w-5 shrink-0 rounded-md border-2 border-[rgb(var(--sg-border))] transition-colors hover:border-[rgb(var(--sg-success))] hover:bg-[rgb(var(--sg-success))]/10"
                        aria-label={`Mark “${t.title}” complete`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted">
                          {t.group ? t.group.name : 'Personal'}
                          {t.dueDate ? ` · due ${new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ''}
                        </p>
                      </div>
                      {overdue
                        ? <Badge tone="danger">Overdue</Badge>
                        : t.priority === 'HIGH' ? <Badge tone="warning">High</Badge> : null}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-muted" /> Upcoming sessions</h2>
              <Link href="/calendar" className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline dark:text-[rgb(var(--sg-accent-muted))]">Calendar</Link>
            </div>
            {data.upcoming.length === 0 ? (
              <div className="py-2 text-center">
                <p className="text-sm font-medium">Your schedule is clear.</p>
                <p className="mt-1 text-xs text-muted">Plan a session or discover a group session.</p>
                <Link href="/calendar?create=1" className="btn btn-secondary btn-sm mt-3">Create a session</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {data.upcoming.slice(0, 4).map((sess) => (
                  <div key={sess.id} className="rounded-lg border p-3">
                    <p className="truncate text-sm font-medium">{sess.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{fmtSession(sess.startsAt)}{sess.location ? ` · ${sess.location}` : sess.isOnline ? ' · Online' : ''}</p>
                    <p className="mt-1 text-xs text-muted">{sess.goingCount} going{sess.group ? ` · ${sess.group.name}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Weekly rhythm</h2>
              <Link href="/analytics" className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline dark:text-[rgb(var(--sg-accent-muted))]">Analytics</Link>
            </div>
            {study && study.consistency.some((d) => d.minutes > 0) ? (
              <>
                <WeekChart data={study.consistency} />
                {trend && (
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-secondary">
                    {trend.dir === 'up'
                      ? <TrendingUp className="h-3.5 w-3.5 text-[rgb(var(--sg-success))]" aria-hidden="true" />
                      : <TrendingDown className="h-3.5 w-3.5 text-[rgb(var(--sg-danger))]" aria-hidden="true" />}
                    {trend.dir === 'up' ? `${trend.min}m more` : `${trend.min}m less`} than last week
                  </p>
                )}
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted">
                Your study rhythm will appear here after your first focus session.
              </p>
            )}
          </div>

          {/* Insights — computed from real data; hidden when there's nothing yet */}
          {insights.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-muted" /> Insight</h2>
              <ul className="space-y-2">
                {insights.map((i) => (
                  <li key={i.id} className="flex items-start gap-2 text-sm text-secondary">
                    <span aria-hidden="true">{i.icon}</span>
                    <span>{i.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="card p-4">
            <h2 className="mb-3 text-sm font-semibold">Recent activity</h2>
            {data.activity.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Activity from your groups will show up here.</p>
            ) : (
              <div className="space-y-3">
                {data.activity.map((a) => (
                  <div key={`${a.kind}-${a.id}`} className="flex gap-2.5 text-sm">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--sg-surface-muted))] text-muted">
                      {a.kind === 'message' ? <MessageCircle className="h-3 w-3" /> : <BookOpen className="h-3 w-3" />}
                    </span>
                    <p className="min-w-0 flex-1 text-secondary">
                      <span className="font-medium text-[rgb(var(--sg-foreground))]">{a.actor}</span>{' '}
                      {a.kind === 'resource' ? a.text : `wrote: “${a.text.slice(0, 50)}${a.text.length > 50 ? '…' : ''}”`}
                      <span className="ml-1 text-xs text-muted">· {a.groupName}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
