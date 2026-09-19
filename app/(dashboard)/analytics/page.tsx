'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { BarChart3, Clock, CheckSquare, Timer, Flame, Users, Lightbulb } from 'lucide-react'
import { StatCard, EmptyState } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'

interface AnalyticsData {
  range: '7' | '30' | 'semester'
  bucket: 'day' | 'week'
  daily: Array<{ label: string; minutes: number }>
  subjects: Array<{ subject: string; hours: number }>
  tasks: { total: number; completed: number }
  focusSessions: number
  totalMinutes: number
  weekMinutes: number
  streak: { current: number; longest: number; weeklyGoalMin: number }
  groups: number
}

interface Insight {
  id: string
  icon: string
  text: string
}

const RANGES = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: 'semester', label: 'Semester' },
] as const

const rangeHours = (d: AnalyticsData) => Math.round((d.totalMinutes / 60) * 10) / 10

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [insights, setInsights] = useState<Insight[] | null>(null)
  const [range, setRange] = useState<'7' | '30' | 'semester'>('7')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback((r: '7' | '30' | 'semester') => {
    setLoading(true)
    Promise.all([
      api.get<AnalyticsData>(`/api/analytics?range=${r}`),
      api.get<{ insights: Insight[] }>('/api/insights'),
    ])
      .then(([d, i]) => { setData(d); setInsights(i.insights) })
      .catch(() => setError('Could not load analytics.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load(range) }, [range, load])

  if (loading && !data) {
    return (
      <div className="section-container space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-24 rounded-xl" />)}</div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="section-container">
        <EmptyState icon={BarChart3} title="Analytics unavailable" description={error || 'Please refresh.'} />
      </div>
    )
  }

  const max = Math.max(...data.daily.map((d) => d.minutes), 60)
  const maxSubject = Math.max(...data.subjects.map((s) => s.hours), 1)
  const completionRate = data.tasks.total ? Math.round((data.tasks.completed / data.tasks.total) * 100) : 0
  const bucketLabel = data.bucket === 'week' ? 'Week' : 'Day'
  const showLabels = data.daily.length <= 14

  return (
    <div className="section-container max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Study Analytics</h1>
          <p className="mt-1 text-sm text-secondary">Your real study activity — logged from focus sessions and tasks.</p>
        </div>
        <div className="flex rounded-lg border bg-[rgb(var(--sg-card))] p-0.5" role="tablist" aria-label="Analytics range">
          {RANGES.map((r) => (
            <button
              key={r.value}
              role="tab"
              aria-selected={range === r.value}
              onClick={() => setRange(r.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                range === r.value
                  ? 'bg-[rgb(var(--sg-accent))] text-white'
                  : 'text-secondary hover:bg-[rgb(var(--sg-surface-muted))]',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Insights strip — every statement computed from real rows */}
      {insights && insights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.slice(0, 4).map((i) => (
            <div key={i.id} className="card flex items-start gap-3 p-4">
              <span aria-hidden className="text-lg leading-none">{i.icon}</span>
              <p className="text-sm leading-relaxed text-secondary">{i.text}</p>
            </div>
          ))}
        </div>
      )}
      {insights && insights.length === 0 && (
        <div className="card flex items-center gap-3 p-4">
          <Lightbulb className="h-5 w-5 shrink-0 text-muted" aria-hidden />
          <p className="text-sm text-secondary">Keep studying to unlock insights.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label={`Study Hours (${range === '7' ? 'week' : range === '30' ? '30d' : 'semester'})`} value={`${rangeHours(data)}h`} icon={Clock} />
        <StatCard label="Focus Sessions" value={data.focusSessions} sub={range === '7' ? 'this week' : range === '30' ? 'in 30 days' : 'this semester'} icon={Timer} />
        <StatCard label="Tasks Completed" value={`${data.tasks.completed}/${data.tasks.total}`} sub={`${completionRate}%`} icon={CheckSquare} />
        <StatCard label="Current Streak" value={`🔥 ${data.streak.current}`} sub={`best: ${data.streak.longest}`} icon={Flame} />
      </div>

      {/* Activity chart */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{range === '7' ? 'This week' : range === '30' ? 'Last 30 days' : 'This semester'}</h2>
          <span className="text-xs text-muted">{rangeHours(data)}h total · weekly goal {Math.round(data.streak.weeklyGoalMin / 60)}h</span>
        </div>
        <div className={cn('flex items-end gap-1.5', data.daily.length > 14 && 'gap-[3px]')} role="img" aria-label={`Study minutes per ${data.bucket}, ${range === '7' ? 'this week' : range === '30' ? 'last 30 days' : 'this semester'}`}>
          {data.daily.map((d, i) => (
            <div key={`${d.label}-${i}`} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              {d.minutes > 0 && showLabels && (
                <span className="text-[10px] font-medium text-muted">{Math.round((d.minutes / 60) * 10) / 10}h</span>
              )}
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn('w-full rounded-md transition-all', d.minutes > 0 ? 'bg-indigo-500/80' : 'bg-[rgb(var(--sg-border))]')}
                  style={{ height: `${Math.max(3, (d.minutes / max) * 100)}%` }}
                  title={`${d.label}: ${Math.round((d.minutes / 60) * 10) / 10}h`}
                />
              </div>
              {showLabels && <span className="text-[10px] text-muted">{d.label}</span>}
            </div>
          ))}
        </div>
        {!showLabels && <p className="mt-2 text-right text-[10px] text-muted">{bucketLabel} buckets — hover a bar for detail</p>}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Subjects */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Subjects studied</h2>
          {data.subjects.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No subject data yet. Add a subject when you complete focus sessions. <Link href="/focus" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Start one →</Link>
            </p>
          ) : (
            <div className="space-y-3">
              {data.subjects.map((s) => (
                <div key={s.subject}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium">{s.subject}</span>
                    <span className="text-muted">{s.hours}h</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[rgb(var(--sg-surface-muted))]">
                    <div className="h-full rounded-full bg-indigo-500/80" style={{ width: `${(s.hours / maxSubject) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consistency */}
        <div className="card p-5">
          <h2 className="mb-4 text-sm font-semibold">Consistency</h2>
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-secondary">Current streak</span>
              <span className="font-semibold">🔥 {data.streak.current} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">Longest streak</span>
              <span className="font-semibold">{data.streak.longest} days</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">Weekly goal</span>
              <span className="font-semibold">
                {data.streak.weeklyGoalMin > 0
                  ? `${Math.min(100, Math.round((data.weekMinutes / data.streak.weeklyGoalMin) * 100))}% of ${Math.round(data.streak.weeklyGoalMin / 60)}h`
                  : 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">Task completion</span>
              <span className="font-semibold">{completionRate}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-secondary">Groups</span>
              <span className="inline-flex items-center gap-1.5 font-semibold"><Users className="h-4 w-4 text-muted" />{data.groups}</span>
            </div>
          </div>
          <div className="mt-5 border-t pt-4">
            <Link href="/focus" className="text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
              Log more hours with a focus session →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
