'use client'
import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  CheckSquare, CalendarDays, MessageCircle, Timer,
  Target, Zap, ArrowRight, ChevronRight, Clock, Sparkles, BookOpen, Users,
} from 'lucide-react'
import { EmptyState, toast } from '@/components/ui'
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton'
import { FocusRooms } from '@/components/focus/FocusRooms'
import { useSession, useUIStore } from '@/lib/store'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import type { DashboardData, TaskStatus } from '@/types'

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

/** Streak count-up animation */
function StreakCount({ target }: { target: number }) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
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

const AV = ['bg-emerald-600', 'bg-teal-600', 'bg-forest-600', 'bg-green-700', 'bg-emerald-800']
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
      <div className="flex h-28 items-end gap-2 pt-2 px-1" role="img" aria-label={`Study minutes per day this week; best day ${best?.minutes ? best.label : 'none yet'}`}>
        {data.map((d) => {
          const isHighest = best && best.minutes > 0 && d.label === best.label
          return (
            <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium tabular-nums text-muted">{d.minutes > 0 ? `${d.minutes}m` : ''}</span>
              <div className="flex w-full max-w-[32px] flex-1 items-end">
                <div
                  className={cn(
                    'w-full rounded-md transition-[height,background-color] duration-500',
                    isHighest ? 'bg-[rgb(var(--sg-accent))] shadow-sm' : d.minutes > 0 ? 'bg-[rgb(var(--sg-accent))]/60' : 'bg-[rgb(var(--sg-surface-muted))]',
                  )}
                  style={{ height: `${d.minutes > 0 ? Math.max(8, (d.minutes / max) * 100) : 4}%` }}
                />
              </div>
              <span className={cn('text-[10px]', isHighest ? 'font-bold text-[rgb(var(--sg-accent))]' : 'text-muted')}>{d.label}</span>
            </div>
          )
        })}
      </div>
      {best && best.minutes > 0 && (
        <p className="mt-3 text-center text-xs text-muted">Most productive day: <span className="font-semibold text-secondary">{best.label} ({best.minutes}m)</span></p>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useSession()
  const setStudymateOpen = useUIStore((s) => s.setStudymateOpen)
  const [data, setData] = useState<DashboardData | null>(null)
  const [study, setStudy] = useState<MyStudy | null>(null)
  const [insights, setInsights] = useState<Array<{ id: string; icon: string; text: string }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [barsLoaded, setBarsLoaded] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)

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

  useEffect(() => {
    if (!data) return
    const t = setTimeout(() => setBarsLoaded(true), 100)
    return () => clearTimeout(t)
  }, [data])

  // Optimistic task completion with instant rollback on failure
  const toggleTask = async (id: string, currentStatus: TaskStatus) => {
    if (updatingTaskId) return
    setUpdatingTaskId(id)
    const nextStatus: TaskStatus = currentStatus === 'COMPLETED' ? 'TODO' : 'COMPLETED'
    
    // Instant optimistic update
    setData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        dueTasks: prev.dueTasks.map((t) => (t.id === id ? { ...t, status: nextStatus } : t)),
      }
    })

    try {
      await api.patch(`/api/tasks/${id}`, { status: nextStatus, progress: nextStatus === 'COMPLETED' ? 100 : 0 })
      toast.success(nextStatus === 'COMPLETED' ? 'Task marked complete! 🌱' : 'Task reopened.')
    } catch {
      // Revert on error
      setData((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          dueTasks: prev.dueTasks.map((t) => (t.id === id ? { ...t, status: currentStatus } : t)),
        }
      })
      toast.error('Could not update task. Please check your connection.')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-7">
        <Skeleton className="h-10 w-72 rounded-xl" />
        <div className="skeleton h-48 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-28 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
          <SkeletonList rows={4} />
          <div className="skeleton h-80 rounded-2xl" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-7">
        <EmptyState
          icon={Clock} title="Could not load workspace" description={error || 'No data available.'}
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
  const sessionsWeek = s?.sessions ?? 0
  const firstName = user?.name.split(' ')[0] ?? 'there'

  const resourceActivity = data.activity.filter((a) => a.kind === 'resource').slice(0, 3)
  const messageActivity = data.activity.filter((a) => a.kind === 'message').slice(0, 3)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 pb-16 pt-3 sm:px-7">
      
      {/* Botanical Sanctuary Hero Banner (Reference Design Matched) */}
      <section className="relative overflow-hidden rounded-[16px] border border-[#CBE5D6] bg-[#E3F3E9] p-6 sm:p-8 shadow-sm dark:border-[rgb(var(--sg-border))] dark:bg-gradient-to-r dark:from-[rgb(var(--sg-surface))] dark:via-[rgb(var(--sg-hover))] dark:to-[rgb(var(--sg-surface))]">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#FDE6C4] bg-[#FDE6C4] px-3 py-1 text-xs font-semibold text-[#9A5B13] dark:border-[rgb(var(--sg-accent))]/30 dark:bg-[rgb(var(--sg-accent-soft))] dark:text-[rgb(var(--sg-accent))]">
              <span>🌱</span>
              <span><StreakCount target={streak} />-Day Study Growth Streak</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight text-[#0F1F17] dark:text-[rgb(var(--sg-foreground))]">
              {greeting()}, {firstName}. <span className="font-normal text-[#14633A] dark:text-[rgb(var(--sg-accent))]">Cultivate your knowledge.</span>
            </h1>
            <p className="max-w-xl text-xs sm:text-sm text-[#2C4035] dark:text-secondary">
              {data.groups.length === 0
                ? 'Join a study circle to share lecture notes, join focus rooms, and track deadlines together.'
                : `You have ${sessionsWeek} session${sessionsWeek === 1 ? '' : 's'} scheduled this week and ${tasksOpen} task${tasksOpen === 1 ? '' : 's'} blooming.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/focus" className="btn btn-primary text-xs font-bold rounded-full px-5 py-2.5 shadow-md flex items-center gap-2">
              <Timer className="h-4 w-4" />
              <span>Enter Focus Room</span>
            </Link>
            <button
              onClick={() => setStudymateOpen(true)}
              className="btn btn-secondary text-xs font-semibold rounded-full px-4 py-2.5 flex items-center gap-2"
            >
              <Sparkles className="h-4 w-4 text-[#157343] dark:text-[rgb(var(--sg-accent))]" />
              <span>Ask StudyMate</span>
            </button>
            <Link href="/calendar?create=1" className="text-xs font-semibold text-[#14422A] hover:underline px-3 py-2 hidden sm:inline-flex dark:text-[rgb(var(--sg-accent))]">
              New Session
            </Link>
          </div>
        </div>

        {/* Subtle decorative leaf watermark on the right */}
        <div className="pointer-events-none absolute -bottom-10 -right-8 text-[#D0E9DA] opacity-80 dark:text-[rgb(var(--sg-accent))] dark:opacity-[0.08]" aria-hidden="true">
          <svg className="h-64 w-64 fill-current" viewBox="0 0 24 24">
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34L5.71 22l1-2.3A4.49 4.49 0 008 20C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
          </svg>
        </div>
      </section>

      {/* 3 Organic Metric Pills */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4" aria-label="Key study metrics">
        <div className="rounded-[16px] border border-[#E4ECE7] bg-white p-5 shadow-[0_4px_12px_rgba(15,31,23,0.04)] transition hover:shadow-md dark:border-[rgb(var(--sg-border))] dark:bg-[rgb(var(--sg-card))]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#5A6B62] dark:text-muted">Weekly focus time</span>
            <span className="rounded-full bg-[#D8F0E2] text-[#157343] px-2 py-0.5 text-xs font-semibold dark:bg-emerald-500/10 dark:text-emerald-400">
              {diffHrs >= 0 ? `+${diffHrs.toFixed(1)}h` : `${diffHrs.toFixed(1)}h`} vs last wk
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold tracking-tight text-[#0F1F17] dark:text-[rgb(var(--sg-foreground))]">{weekHrs.toFixed(1)}</span>
            <span className="text-sm font-medium text-[#5A6B62] dark:text-muted">hours</span>
          </div>
          {goalMin > 0 && (
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-[#EAEFEC] overflow-hidden dark:bg-[rgb(var(--sg-surface-muted))]">
                <div
                  className="h-full w-full origin-left rounded-full bg-[#157343] transition-transform duration-1000 dark:bg-[rgb(var(--sg-accent))]"
                  style={{ transform: `scaleX(${barsLoaded ? Math.min(1, goalPct / 100) : 0})` }}
                />
              </div>
              <p className="mt-1.5 text-[11px] text-[#5A6B62] dark:text-muted">{goalPct}% of {fmtHours(goalMin)} weekly goal reached</p>
            </div>
          )}
        </div>

        <div className="rounded-[16px] border border-[#E4ECE7] bg-white p-5 shadow-[0_4px_12px_rgba(15,31,23,0.04)] transition hover:shadow-md dark:border-[rgb(var(--sg-border))] dark:bg-[rgb(var(--sg-card))]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#5A6B62] dark:text-muted">Active study circles</span>
            <Users className="h-4 w-4 text-[#157343] dark:text-[rgb(var(--sg-accent))]" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold tracking-tight text-[#0F1F17] dark:text-[rgb(var(--sg-foreground))]">{data.stats.activeGroups}</span>
            <span className="text-sm font-medium text-[#5A6B62] dark:text-muted">circles</span>
          </div>
          <p className="mt-3 text-xs text-[#2C4035] dark:text-secondary truncate">
            {data.groups[0] ? `${data.groups[0].name} (${data.groups[0].memberCount} members)` : 'Browse groups to join circles'}
          </p>
        </div>

        <div className="rounded-[16px] border border-[#E4ECE7] bg-white p-5 shadow-[0_4px_12px_rgba(15,31,23,0.04)] transition hover:shadow-md dark:border-[rgb(var(--sg-border))] dark:bg-[rgb(var(--sg-card))]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-[#5A6B62] dark:text-muted">Study growth streak</span>
            <span className="text-base">🌱</span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold tracking-tight text-[#0F1F17] dark:text-[rgb(var(--sg-foreground))]">
              <StreakCount target={streak} />
            </span>
            <span className="text-sm font-medium text-[#5A6B62] dark:text-muted">days consistent</span>
          </div>
          <p className="mt-3 text-xs text-[#2C4035] dark:text-secondary">
            {streak > 0 ? 'Consistency is blooming. Keep the momentum going!' : 'Complete one focus block today to start your streak.'}
          </p>
        </div>
      </section>

      {/* Core 2-Column Action & Collaboration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-8 items-start">
        
        {/* Left Column: Active Study Circles & Today's Schedule */}
        <div className="space-y-8">
          
          {/* Section: Your Study Circles (Styled like Wix Botanical Showcase Cards) */}
          <section aria-label="Study Circles">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight text-[rgb(var(--sg-foreground))]">Your Study Circles</h2>
                <p className="text-xs text-muted">Spaces where coursework and discussions flourish</p>
              </div>
              <Link href="/groups" className="text-xs font-semibold text-[rgb(var(--sg-accent))] hover:underline">
                View all ({data.groups.length}) →
              </Link>
            </div>

            {data.groups.length === 0 ? (
              <div className="rounded-[16px] border border-[#E4ECE7] bg-white p-6 shadow-[0_4px_12px_rgba(15,31,23,0.04)] dark:border-[rgb(var(--sg-border))] dark:bg-[rgb(var(--sg-card))]">
                <EmptyState
                  icon={BookOpen}
                  title="No study circles yet"
                  description="Find groups tailored to your degree, subject or semester."
                  action={<Link href="/discover" className="btn btn-primary btn-sm rounded-full">Discover circles</Link>}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {data.groups.slice(0, 4).map((g) => (
                  <Link
                    key={g.id}
                    href={`/groups/${g.id}`}
                    className="group flex flex-col justify-between rounded-2xl border border-[rgb(var(--sg-border))] bg-[rgb(var(--sg-card))] p-5 shadow-sm transition hover:border-[rgb(var(--sg-accent))]/60 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="rounded-full bg-[rgb(var(--sg-accent-soft))] px-2.5 py-0.5 text-[10px] font-bold text-[rgb(var(--sg-accent))] uppercase tracking-wider">
                          {g.subject || 'GENERAL'}
                        </span>
                        <span className="text-[11px] font-medium text-muted">
                          {g.memberCount} member{g.memberCount === 1 ? '' : 's'}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-[rgb(var(--sg-foreground))] group-hover:text-[rgb(var(--sg-accent))] transition">
                        {g.name}
                      </h3>
                      {g.description && (
                        <p className="mt-1 text-xs text-secondary line-clamp-2">{g.description}</p>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-[rgb(var(--sg-border))]/60 flex items-center justify-between">
                      <span className="text-[11px] text-muted">
                        {g.weeklyMessages ? `${g.weeklyMessages} messages this wk` : 'Quiet this week'}
                      </span>
                      <span className="text-xs font-bold text-[rgb(var(--sg-accent))] group-hover:translate-x-0.5 transition-transform">
                        Open →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* Section: Upcoming Sessions & Today's Schedule */}
          <section className="rounded-[16px] border border-[#E4ECE7] bg-white p-6 shadow-[0_4px_12px_rgba(15,31,23,0.04)] dark:border-[rgb(var(--sg-border))] dark:bg-[rgb(var(--sg-card))]" aria-label="Upcoming schedule">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[rgb(var(--sg-foreground))]">Upcoming Study Sessions</h2>
                <p className="text-xs text-muted">Calendar blocks & collaborative study groups</p>
              </div>
              <Link href="/calendar" className="text-xs font-semibold text-[rgb(var(--sg-accent))] hover:underline">
                Full calendar →
              </Link>
            </div>

            {data.upcoming.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-xs text-muted">No sessions booked yet for this week.</p>
                <Link href="/calendar?create=1" className="btn btn-secondary btn-sm rounded-full mt-3">
                  Schedule a session
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {data.upcoming.slice(0, 3).map((sess) => (
                  <div
                    key={sess.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[rgb(var(--sg-border))]/80 bg-[rgb(var(--sg-hover))]/40 p-4 transition hover:border-[rgb(var(--sg-accent))]/40"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="flex h-12 w-12 flex-col items-center justify-center rounded-xl bg-[rgb(var(--sg-card))] border border-[rgb(var(--sg-border))] text-[rgb(var(--sg-accent))] font-bold shadow-sm">
                        <span className="text-[10px] uppercase font-semibold leading-none">{fmtMon(sess.startsAt)}</span>
                        <span className="text-base font-extrabold leading-tight">{fmtDay(sess.startsAt)}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-[rgb(var(--sg-foreground))]">{sess.title}</h4>
                        <p className="text-xs text-muted">
                          {sess.group ? sess.group.name : 'Personal'} · {fmtRange(sess.startsAt, sess.endsAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 border border-emerald-500/20">
                        {sess.goingCount} attending
                      </span>
                      <Link href="/calendar" className="btn btn-secondary btn-sm rounded-lg text-xs">
                        Details
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Section: Priority Tasks (with Optimistic Rollback Checkbox) */}
          <section className="rounded-[16px] border border-[#E4ECE7] bg-white p-6 shadow-[0_4px_12px_rgba(15,31,23,0.04)] dark:border-[rgb(var(--sg-border))] dark:bg-[rgb(var(--sg-card))]" aria-label="Priority tasks">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-display text-base font-semibold tracking-tight text-[rgb(var(--sg-foreground))]">Priority Tasks</h2>
                <p className="text-xs text-muted">Tick off assignments & coursework goals</p>
              </div>
              <Link href="/tasks" className="text-xs font-semibold text-[rgb(var(--sg-accent))] hover:underline">
                View all ({data.dueTasks.length}) →
              </Link>
            </div>

            {data.dueTasks.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">No pending tasks due — clear desk!</p>
            ) : (
              <div className="space-y-2">
                {data.dueTasks.slice(0, 5).map((t) => {
                  const done = t.status === 'COMPLETED'
                  return (
                    <div
                      key={t.id}
                      className={cn(
                        'flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors',
                        done
                          ? 'border-[rgb(var(--sg-border))]/40 bg-[rgb(var(--sg-surface-muted))]/30 opacity-60'
                          : 'border-[rgb(var(--sg-border))] bg-[rgb(var(--sg-card))] hover:border-[rgb(var(--sg-accent))]/40',
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          type="button"
                          onClick={() => toggleTask(t.id, t.status)}
                          className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition',
                            done
                              ? 'bg-[rgb(var(--sg-accent))] border-[rgb(var(--sg-accent))] text-white'
                              : 'border-[rgb(var(--sg-border))] hover:border-[rgb(var(--sg-accent))]',
                          )}
                          aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                        >
                          {done && <CheckSquare className="h-3.5 w-3.5" />}
                        </button>
                        <div className="min-w-0">
                          <p className={cn('text-xs font-semibold truncate', done && 'line-through text-muted')}>
                            {t.title}
                          </p>
                          <p className="text-[11px] text-muted">
                            {t.group ? t.group.name : 'Personal'} · due {fmtDue(t.dueDate)}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-full bg-[rgb(var(--sg-surface-muted))] px-2.5 py-0.5 text-[10px] font-semibold text-secondary shrink-0">
                        {done ? 'Completed' : fmtDue(t.dueDate)}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </section>

        </div>

        {/* Right Column: Focus Greenhouse, StudyMate AI & Weekly Rhythm */}
        <div className="space-y-6">
          
          {/* Focus Greenhouse Live Rooms */}
          <section className="rounded-[16px] border border-[#E4ECE7] bg-white p-6 shadow-[0_4px_12px_rgba(15,31,23,0.04)] dark:border-[rgb(var(--sg-border))] dark:bg-[rgb(var(--sg-card))]" aria-label="Focus rooms">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🌿</span>
                <h3 className="font-display text-sm font-semibold tracking-tight text-[rgb(var(--sg-foreground))]">Focus Greenhouse</h3>
              </div>
              <Link href="/focus" className="text-xs font-semibold text-[rgb(var(--sg-accent))] hover:underline">
                All rooms →
              </Link>
            </div>
            <p className="text-xs text-muted mb-4">Quiet collaborative rooms with Pomodoro timers.</p>
            <FocusRooms />
          </section>

          {/* StudyMate Botanical AI Quick Card */}
          <section className="rounded-2xl border border-[rgb(var(--sg-accent))]/30 bg-gradient-to-br from-[rgb(var(--sg-accent-soft))]/40 to-[rgb(var(--sg-card))] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[rgb(var(--sg-accent))]" />
                <h3 className="font-display text-sm font-semibold text-[rgb(var(--sg-foreground))]">StudyMate AI Tutor</h3>
              </div>
              <span className="rounded-full bg-[rgb(var(--sg-accent))]/15 px-2 py-0.5 text-[10px] font-bold text-[rgb(var(--sg-accent))]">
                Grounded
              </span>
            </div>
            <p className="text-xs text-secondary mb-4 leading-relaxed">
              Ask questions on your uploaded lecture notes, generate 3-question active recall quizzes, or summarize complex topics.
            </p>
            <button
              onClick={() => setStudymateOpen(true)}
              className="w-full btn btn-primary text-xs font-bold rounded-xl py-2.5 flex items-center justify-center gap-2"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Launch StudyMate Chat</span>
            </button>
          </section>

          {/* Weekly Study Rhythm */}
          <section className="rounded-[16px] border border-[#E4ECE7] bg-white p-6 shadow-[0_4px_12px_rgba(15,31,23,0.04)] dark:border-[rgb(var(--sg-border))] dark:bg-[rgb(var(--sg-card))]" aria-label="Weekly rhythm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-semibold text-[rgb(var(--sg-foreground))]">Study Rhythm</h3>
              <Link href="/analytics" className="text-xs font-semibold text-[rgb(var(--sg-accent))] hover:underline">
                Analytics →
              </Link>
            </div>
            {study && study.consistency.some((d) => d.minutes > 0) ? (
              <WeekChart data={study.consistency} />
            ) : (
              <p className="py-6 text-center text-xs text-muted">Your study rhythm will appear after your first focus session.</p>
            )}
          </section>

          {/* Recent Messages & Resources */}
          <section className="rounded-[16px] border border-[#E4ECE7] bg-white p-6 shadow-[0_4px_12px_rgba(15,31,23,0.04)] dark:border-[rgb(var(--sg-border))] dark:bg-[rgb(var(--sg-card))]" aria-label="Recent circle activity">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-semibold text-[rgb(var(--sg-foreground))]">Recent Circle Activity</h3>
              <Link href="/messages" className="text-xs font-semibold text-[rgb(var(--sg-accent))] hover:underline">
                Messages →
              </Link>
            </div>
            {messageActivity.length === 0 && resourceActivity.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted">Activity from your circles will show up here.</p>
            ) : (
              <div className="space-y-3">
                {messageActivity.map((a) => (
                  <div key={`${a.kind}-${a.id}`} className="flex items-start gap-3">
                    <span className={cn('grid h-7 w-7 flex-none place-items-center rounded-full text-[10px] font-bold text-white', toneOf(a.actor))} aria-hidden="true">
                      {initialsOf(a.actor)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[rgb(var(--sg-foreground))]">{a.actor}</span>
                        <time className="text-[10px] text-muted">{timeAgo(a.at)}</time>
                      </div>
                      <p className="text-xs text-secondary truncate mt-0.5">“{a.text}”</p>
                      <span className="text-[10px] font-medium text-[rgb(var(--sg-accent))]">{a.groupName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

      </div>

    </div>
  )
}
