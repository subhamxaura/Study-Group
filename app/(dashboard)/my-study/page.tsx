'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Brain, Flame, Target, TrendingUp, Timer, CheckCircle2, AlertTriangle, BarChart3, Lightbulb, Sparkles } from 'lucide-react'
import { Badge, Button, EmptyState, Skeleton } from '@/components/ui'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'

interface MyStudy {
  summary: { thisWeekMin: number; lastWeekMin: number; sessions: number; tasksCompleted: number; tasksOpen: number; overdue: number; streak: number }
  consistency: Array<{ label: string; minutes: number }>
  subjects: Array<{ subject: string; minutes: number; pct: number }>
  patterns: { mostActiveDay: string; avgSessionMin: number; topSubject: string } | null
  goal: { weeklyGoalMin: number; weekMinutes: number; pct: number }
  weakTopics: Array<{ subject: string; topic: string; avgScore: number; attempts: number }>
  nextAction: { kind: string; text: string; href: string } | null
  hasStudyData: boolean
  quizCount: number
}

interface QuizHistory {
  attempts: Array<{ id: string; subject: string; topic: string | null; difficulty: string; totalQuestions: number; correctAnswers: number; score: number; createdAt: string }>
}

function hm(min: number): string {
  return `${Math.floor(min / 60)}h ${min % 60}m`
}

export default function MyStudyPage() {
  const [data, setData] = useState<MyStudy | null>(null)
  const [quiz, setQuiz] = useState<QuizHistory | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    Promise.all([
      api.get<MyStudy>('/api/my-study'),
      api.get<QuizHistory>('/api/quiz').catch(() => null),
    ])
      .then(([d, q]) => { setData(d); setQuiz(q) })
      .catch(() => setError(true))
  }, [])

  if (error) {
    return (
      <div className="section-container max-w-4xl">
        <EmptyState icon={AlertTriangle} title="Could not load your study intelligence" description="Check your connection and refresh the page." />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="section-container max-w-4xl space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-40" />
      </div>
    )
  }

  const s = data.summary
  const maxCons = Math.max(...data.consistency.map((c) => c.minutes), 1)
  const deltaPct = s.lastWeekMin > 0 ? Math.round(((s.thisWeekMin - s.lastWeekMin) / s.lastWeekMin) * 100) : null

  return (
    <div className="section-container max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My Study</h1>
        <p className="mt-1 text-sm text-secondary">What your real study activity says — no estimates, no filler.</p>
      </div>

      {/* Smart next action */}
      {data.nextAction && (
        <div className="card border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-500/20 dark:bg-indigo-500/10" data-testid="next-action">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
              {data.nextAction.text}
            </p>
            <Link href={data.nextAction.href}><Button size="sm">Do it now</Button></Link>
          </div>
        </div>
      )}

      {/* This week summary */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-secondary">This week</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="card p-4 text-center">
            <Timer className="mx-auto h-5 w-5 text-indigo-500" />
            <p className="mt-1.5 text-xl font-semibold">{hm(s.thisWeekMin)}</p>
            <p className="text-xs text-muted">Study time</p>
            {deltaPct !== null && (
              <p className={cn('mt-0.5 text-[10px] font-medium', deltaPct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                {deltaPct >= 0 ? '▲' : '▼'} {Math.abs(deltaPct)}% vs last week
              </p>
            )}
          </div>
          <div className="card p-4 text-center">
            <BarChart3 className="mx-auto h-5 w-5 text-emerald-500" />
            <p className="mt-1.5 text-xl font-semibold">{s.sessions}</p>
            <p className="text-xs text-muted">Focus sessions</p>
          </div>
          <div className="card p-4 text-center">
            <CheckCircle2 className="mx-auto h-5 w-5 text-indigo-500" />
            <p className="mt-1.5 text-xl font-semibold">{s.tasksCompleted}</p>
            <p className="text-xs text-muted">Tasks completed</p>
          </div>
          <div className="card p-4 text-center">
            <Flame className="mx-auto h-5 w-5 text-amber-500" />
            <p className="mt-1.5 text-xl font-semibold">{s.streak}</p>
            <p className="text-xs text-muted">Day streak</p>
            {s.overdue > 0 && <p className="mt-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">{s.overdue} overdue</p>}
          </div>
        </div>
      </div>

      {/* Consistency */}
      <div className="card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><TrendingUp className="h-4 w-4 text-indigo-500" /> Study consistency</p>
        {s.sessions === 0 && s.thisWeekMin === 0 ? (
          <p className="mt-2 text-sm text-muted">Keep studying to unlock your patterns.</p>
        ) : (
          <div className="mt-3 flex items-end gap-2" role="img" aria-label={`Minutes studied per day this week: ${data.consistency.map((c) => `${c.label} ${c.minutes}`).join(', ')}`}>
            {data.consistency.map((c) => (
              <div key={c.label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-24 w-full items-end rounded bg-[rgb(var(--sg-surface-muted))]">
                  <div
                    className="w-full rounded bg-indigo-500/80 transition-[height] duration-500"
                    style={{ height: `${Math.max(4, Math.round((c.minutes / maxCons) * 100))}%` }}
                    title={`${c.label}: ${c.minutes}m`}
                  />
                </div>
                <span className="text-[10px] text-muted">{c.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly goal */}
      {data.goal.weeklyGoalMin > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between text-sm">
            <p className="flex items-center gap-2 font-semibold"><Target className="h-4 w-4 text-indigo-500" /> Weekly goal</p>
            <p className="tabular-nums text-muted">{hm(data.goal.weekMinutes)} / {hm(data.goal.weeklyGoalMin)}</p>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[rgb(var(--sg-surface-muted))]">
            <div className="h-full rounded-full bg-indigo-600 transition-[width] duration-500" style={{ width: `${data.goal.pct}%` }} />
          </div>
          {data.goal.pct < 100 && (
            <Link href="/focus" className="mt-3 inline-block"><Button size="sm"><Sparkles className="h-4 w-4" /> Start focus</Button></Link>
          )}
        </div>
      )}

      {/* Subjects */}
      {data.subjects.length > 0 && (
        <div className="card p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-emerald-500" /> Subject breakdown</p>
          <div className="mt-3 space-y-2.5">
            {data.subjects.map((sub) => (
              <div key={sub.subject}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">{sub.subject}</span>
                  <span className="tabular-nums text-muted">{sub.pct}% · {hm(sub.minutes)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgb(var(--sg-surface-muted))]">
                  <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${sub.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      <div className="card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Brain className="h-4 w-4 text-violet-500" /> Your pattern</p>
        {data.patterns ? (
          <div className="mt-3 grid grid-cols-3 gap-3 text-center">
            <div><p className="text-sm font-semibold">{data.patterns.mostActiveDay}</p><p className="text-xs text-muted">Most active day</p></div>
            <div><p className="text-sm font-semibold">{data.patterns.avgSessionMin}m</p><p className="text-xs text-muted">Avg session</p></div>
            <div><p className="truncate text-sm font-semibold">{data.patterns.topSubject}</p><p className="text-xs text-muted">Most studied</p></div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted">Keep studying to unlock your patterns.</p>
        )}
      </div>

      {/* Quiz performance */}
      <div className="card p-4">
        <p className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="h-4 w-4 text-indigo-500" /> Quiz performance</p>
        {quiz && quiz.attempts.length > 0 ? (
          <>
            {data.weakTopics.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-secondary">Weak topics (min. 3 attempts)</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.weakTopics.map((w) => (
                    <Badge key={`${w.subject}-${w.topic}`} tone="warning">{w.topic} · {w.avgScore}%</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 divide-y">
              {quiz.attempts.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.subject}{a.topic ? ` — ${a.topic}` : ''}</p>
                    <p className="text-xs text-muted">{new Date(a.createdAt).toLocaleDateString()} · {a.difficulty.toLowerCase()}</p>
                  </div>
                  <span className={cn('font-semibold tabular-nums', a.score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : a.score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400')}>
                    {a.correctAnswers}/{a.totalQuestions}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-muted">
            No quizzes yet — open StudyMate and pick <strong>Quiz me</strong> to practice a subject.
          </p>
        )}
      </div>

      {data.quizCount === 0 && !data.hasStudyData && (
        <EmptyState icon={Brain} title="Not enough study data yet" description="Complete a focus session or a quiz and this page starts filling in with real feedback." />
      )}
    </div>
  )
}
