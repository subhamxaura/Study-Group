'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Users, Clock, CheckSquare, Flame, CalendarDays, ArrowRight, Plus,
  MessageCircle, BookOpen, Timer, ChevronRight, Target, Zap, CalendarPlus,
} from 'lucide-react'
import { StatCard, EmptyState, Badge } from '@/components/ui'
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton'
import { useSession } from '@/lib/store'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import type { DashboardData } from '@/types'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 18) return 'Good afternoon'
  return 'Good evening'
}

function WeekChart({ data }: { data: Array<{ day: string; minutes: number }> }) {
  const max = Math.max(...data.map((d) => d.minutes), 60)
  return (
    <div className="flex h-36 items-end gap-2" role="img" aria-label="Weekly study minutes bar chart">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-1.5">
          <span className="text-[10px] font-medium text-muted">{d.minutes > 0 ? `${Math.round(d.minutes / 6) / 10}h` : ''}</span>
          <div className="flex w-full max-w-[36px] flex-1 items-end">
            <div
              className="w-full rounded-md bg-indigo-500/80 transition-all"
              style={{ height: `${Math.max(4, (d.minutes / max) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-muted">{d.day}</span>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const { user } = useSession()
  const [data, setData] = useState<DashboardData | null>(null)
  const [week, setWeek] = useState<Array<{ day: string; minutes: number }>>([])
  const [insights, setInsights] = useState<Array<{ id: string; icon: string; text: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<DashboardData>('/api/dashboard'),
      api.get<{ daily: Array<{ day: string; minutes: number }> }>('/api/analytics'),
      api.get<{ insights: Array<{ id: string; icon: string; text: string }> }>('/api/insights'),
    ])
      .then(([d, a, i]) => { setData(d); setWeek(a.daily); setInsights(i.insights) })
      .catch(() => setError('Could not load your dashboard. Please refresh.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="section-container space-y-5">
        <Skeleton className="h-8 w-64" />
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

  return (
    <div className="section-container space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{greeting()}, {user?.name.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-secondary">Here&apos;s what needs your attention today.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/discover" className="btn btn-secondary btn-sm">Find groups</Link>
          <Link href="/groups?create=1" className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> Create group</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Active Groups" value={data.stats.activeGroups} sub={`${data.groups.length} joined`} icon={Users} />
        <StatCard label="Study Hours (week)" value={`${data.stats.studyHoursWeek}h`} sub={`${data.stats.todayMinutes}m today`} icon={Clock} />
        <StatCard label="Tasks Completed" value={data.stats.tasksCompleted} icon={CheckSquare} />
        <StatCard label="Current Streak" value={`🔥 ${data.stats.streak}`} sub="days" icon={Flame} />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { href: '/focus', label: 'Start Focus', icon: Timer, primary: true },
          { href: '/calendar', label: 'Join Session', icon: CalendarDays, primary: false },
          { href: '/tasks?create=1', label: 'Create Task', icon: Plus, primary: false },
          { href: '/calendar?create=1', label: 'Create Session', icon: CalendarPlus, primary: false },
          { href: '/resources?create=1', label: 'Add Resource', icon: BookOpen, primary: false },
        ].map(({ href, label, icon: Icon, primary }) => (
          <Link
            key={href} href={href}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors',
              primary
                ? 'border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700'
                : 'bg-[rgb(var(--sg-card))] text-secondary hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/50 dark:hover:border-indigo-500/40 dark:hover:text-indigo-300 dark:hover:bg-indigo-500/5',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid gap-5 lg:grid-cols-[1.7fr_0.9fr]">
        <div className="space-y-5">
          {/* Today's plan */}
          <div className="card p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Target className="h-4 w-4 text-muted" /> Today&apos;s study plan</h2>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-lg border bg-[rgb(var(--sg-surface-muted))]/60 p-3">
                <p className="text-xs text-muted">Focus time</p>
                <p className="text-lg font-semibold">{data.todayPlan.focusDoneToday}<span className="text-xs font-normal text-muted">m</span></p>
              </div>
              <div className="rounded-lg border bg-[rgb(var(--sg-surface-muted))]/60 p-3">
                <p className="text-xs text-muted">Tasks due today</p>
                <p className="text-lg font-semibold">{data.todayPlan.tasksDueToday}</p>
              </div>
              <div className="rounded-lg border bg-[rgb(var(--sg-surface-muted))]/60 p-3">
                <p className="text-xs text-muted">Sessions today</p>
                <p className="text-lg font-semibold">{data.todayPlan.sessionsToday}</p>
              </div>
            </div>
            <Link href="/focus" className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              <Timer className="h-3.5 w-3.5" /> Start a focus session <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          {/* My groups */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">My Study Groups</h2>
              <Link href="/groups" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">View all</Link>
            </div>
            {data.groups.length === 0 ? (
              <div className="card">
                <EmptyState
                  icon={Users} title="No groups yet"
                  description="Start by discovering a study group in your subject."
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
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">{g.name[0]}</span>
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
              <h2 className="text-base font-semibold">Tasks Due Soon</h2>
              <Link href="/tasks" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">All tasks</Link>
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
                        className="h-5 w-5 shrink-0 rounded-md border-2 border-[rgb(var(--sg-border))] transition-colors hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
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
              <h2 className="flex items-center gap-2 text-sm font-semibold"><CalendarDays className="h-4 w-4 text-muted" /> Upcoming Sessions</h2>
              <Link href="/calendar" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">Calendar</Link>
            </div>
            {data.upcoming.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted">Your schedule is clear.</p>
            ) : (
              <div className="space-y-2">
                {data.upcoming.slice(0, 4).map((s) => (
                  <div key={s.id} className="rounded-lg border p-3">
                    <p className="truncate text-sm font-medium">{s.title}</p>
                    <p className="mt-0.5 text-xs text-muted">{fmtSession(s.startsAt)}{s.location ? ` · ${s.location}` : s.isOnline ? ' · Online' : ''}</p>
                    <p className="mt-1 text-xs text-muted">{s.goingCount} going{s.group ? ` · ${s.group.name}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Weekly Study Progress</h2>
              <Link href="/analytics" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">Analytics</Link>
            </div>
            <WeekChart data={week} />
          </div>

          {/* Insights — computed from real data; hidden when there's nothing yet */}
          {insights.length > 0 && (
            <div className="card p-4">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-muted" /> Insights</h2>
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
            <h2 className="mb-3 text-sm font-semibold">Recent Activity</h2>
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
