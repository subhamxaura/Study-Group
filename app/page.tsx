'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import {
  ArrowRight, Users, MessageCircle, Calendar, BookOpen, Search, BarChart3,
  Layers, Clock, Shield, Timer, CheckSquare, Sparkles,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

const howItWorks = [
  { n: '01', title: 'Find or create a group', desc: 'Browse by subject, university or semester. Join in one tap or start your own.' },
  { n: '02', title: 'Plan and study together', desc: 'Schedule sessions, split tasks, discuss difficult topics and share resources in one place.' },
  { n: '03', title: 'Track your consistency', desc: 'Focus sessions, streaks and analytics make progress visible — for you and your group.' },
]

const features = [
  { icon: Users, title: 'Study groups that stay organized', desc: 'Members, roles and activity in one place. No scattered DMs.' },
  { icon: MessageCircle, title: 'Focused discussions', desc: 'Replies, reactions, pinned answers and search — built for coursework.' },
  { icon: Calendar, title: 'Sessions & schedule', desc: 'Plan group sessions with RSVPs, reminders and countdowns.' },
  { icon: CheckSquare, title: 'Tasks & deadlines', desc: 'Assign work, set priorities and see what is due before it is late.' },
  { icon: Timer, title: 'Focus mode', desc: 'Timed solo or group focus sessions that actually log your study hours.' },
  { icon: BarChart3, title: 'Progress analytics', desc: 'Weekly hours, subjects and streaks — a lightweight picture of consistency.' },
  { icon: BookOpen, title: 'Resource library', desc: 'PDFs, notes, links and videos, bookmarked and searchable per group.' },
  { icon: Shield, title: 'Private by default', desc: 'Public or invite-only groups with owner and admin roles enforced server-side.' },
]

function DashboardPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-[rgb(var(--sg-card))] shadow-large">
      <div className="flex items-center justify-between border-b px-4 py-3 bg-[rgb(var(--sg-surface-muted))]">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="hidden items-center gap-2 rounded-md border bg-[rgb(var(--sg-card))] px-2 py-1 text-xs text-muted sm:flex">
          <Search className="h-3.5 w-3.5" /> Search groups, resources…
          <span className="ml-2 hidden rounded bg-[rgb(var(--sg-hover))] px-1.5 py-0.5 text-[10px] lg:inline">⌘K</span>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">S</div>
      </div>
      <div className="grid md:grid-cols-[220px_1fr]">
        <div className="hidden space-y-4 border-r p-3 md:block bg-[rgb(var(--sg-surface-muted))]/50">
          <div className="space-y-1">
            <div className="flex h-8 items-center gap-2 rounded-lg bg-indigo-600 px-3 text-sm font-medium text-white"><Layers className="h-4 w-4" /> Dashboard</div>
            <div className="flex h-7 items-center gap-2 rounded-md px-3 text-sm text-secondary"><Users className="h-4 w-4" /> My Groups</div>
            <div className="flex h-7 items-center gap-2 rounded-md px-3 text-sm text-secondary"><Search className="h-4 w-4" /> Discover</div>
            <div className="flex h-7 items-center gap-2 rounded-md px-3 text-sm text-secondary"><MessageCircle className="h-4 w-4" /> Messages <span className="ml-auto rounded-full bg-red-500 px-1.5 text-xs text-white">3</span></div>
          </div>
          <div className="space-y-2 border-t pt-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted">Your groups</p>
            {['Advanced Mathematics', 'Computer Science Hub', 'Physics Circle'].map((n) => (
              <div key={n} className="flex items-center gap-2 text-sm">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">{n[0]}</span>
                <span className="truncate text-sm">{n}</span>
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-muted">Good evening, Subham 👋</p>
              <h3 className="text-lg font-semibold tracking-tight">Here&apos;s what needs your attention today.</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> 2 sessions this week
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { k: 'Active Groups', v: '3', sub: '1 new message' },
              { k: 'Study Hours', v: '6.5h', sub: 'this week' },
              { k: 'Tasks Due', v: '2', sub: '1 today' },
              { k: 'Streak', v: '🔥 4', sub: 'days' },
            ].map((s) => (
              <div key={s.k} className="rounded-xl border bg-[rgb(var(--sg-card))] p-3">
                <p className="text-xs text-muted">{s.k}</p>
                <p className="mt-1 text-xl font-semibold">{s.v}</p>
                <p className="text-xs text-muted">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">Your Study Groups</p>
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-300">View all</span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  { n: 'Advanced Mathematics', meta: 'Calculus • 12 members • Next: Tomorrow 6PM', prog: '72%' },
                  { n: 'Computer Science Hub', meta: 'DSA • 8 members • Session Friday', prog: '54%' },
                ].map((g) => (
                  <div key={g.n} className="flex items-center gap-3 rounded-lg border p-2.5 bg-[rgb(var(--sg-surface-muted))]/60">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">{g.n[0]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.n}</p>
                      <p className="truncate text-xs text-muted">{g.meta}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-xs font-medium">{g.prog}</p>
                      <div className="mt-1 h-1.5 w-16 overflow-hidden rounded-full bg-[rgb(var(--sg-border))]">
                        <span className="block h-full bg-indigo-600" style={{ width: g.prog }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><Clock className="h-4 w-4 text-muted" /> Upcoming</p>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <p className="text-xs font-medium">Linear Algebra Review</p>
                  <p className="text-xs text-muted">Tomorrow • 6:00 PM • Library Room 204</p>
                </div>
                <div className="rounded-lg border p-2.5">
                  <p className="text-xs font-medium">Submit Problem Set — Ch.5</p>
                  <p className="text-xs text-muted">Due in 2 days • Advanced Mathematics</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.ok && j.data?.user) router.replace('/dashboard') })
      .catch(() => {})
  }, [router])

  return (
    <div className="min-h-screen bg-[rgb(var(--sg-background))]">
      <header className="sticky top-0 z-30 border-b bg-[rgb(var(--sg-card))]/80 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--sg-card))]/80">
        <div className="mx-auto flex h-[64px] max-w-[1160px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">S</span>
            <span className="text-[15px] font-semibold tracking-tight">Study-Group</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-secondary md:flex">
            <a href="#how" className="transition-colors hover:text-[rgb(var(--sg-foreground))]">How it works</a>
            <a href="#features" className="transition-colors hover:text-[rgb(var(--sg-foreground))]">Features</a>
            <a href="#focus" className="transition-colors hover:text-[rgb(var(--sg-foreground))]">Focus mode</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">Sign in</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Get started <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1160px] px-4 pb-8 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
          className="mx-auto max-w-3xl text-center"
        >
          <span className="inline-flex items-center gap-2 rounded-full border bg-[rgb(var(--sg-card))] px-3 py-1 text-xs font-medium shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Study smarter. Together.
          </span>
          <h1 className="mt-4 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[52px]">
            Everything your study group
            <br />
            <span className="text-indigo-600 dark:text-indigo-400">needs, in one place.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance text-base leading-relaxed text-secondary sm:text-lg">
            Find classmates, organize study sessions, share resources, discuss difficult topics, and stay on track together.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn btn-primary btn-lg w-full sm:w-auto">Find a Study Group <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/register?intent=create" className="btn btn-secondary btn-lg w-full sm:w-auto">Create a Group</Link>
          </div>
          <p className="mt-3 text-xs text-muted">Free to use • Built for students, by students</p>
        </motion.div>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-10"
        >
          <DashboardPreview />
        </motion.div>
      </section>

      <section id="how" className="mx-auto max-w-[1160px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {howItWorks.map((s) => (
            <div key={s.n}>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{s.n}</p>
              <h3 className="mt-2 text-lg font-semibold tracking-tight">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-secondary">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="border-y bg-[rgb(var(--sg-card))]">
        <div className="mx-auto max-w-[1160px] px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-semibold tracking-tight sm:text-3xl">Built for how students actually work</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-secondary">
            One workspace for the whole loop: discover → join → plan → study → share → track.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="card-hover rounded-xl border p-5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
                  <f.icon className="h-[18px] w-[18px]" />
                </span>
                <h3 className="mt-3 text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="focus" className="mx-auto max-w-[1160px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="badge-accent">Signature feature</span>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Focus mode that logs real hours</h2>
            <p className="mt-3 text-sm leading-relaxed text-secondary">
              Start a 25, 50 or 90-minute session, pick a subject, and — if you want — study alongside others.
              Completed sessions feed your streak, your weekly goal and your group&apos;s progress. No fake numbers.
            </p>
            <ul className="mt-5 space-y-2 text-sm text-secondary">
              <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> 25 / 50 / 90 minute presets, or custom</li>
              <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> Study alongside other students</li>
              <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> Sessions count toward streaks & analytics</li>
            </ul>
          </div>
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-8 border-indigo-100 dark:border-indigo-500/15">
              <div>
                <p className="text-3xl font-semibold tabular-nums">25:00</p>
                <p className="text-xs text-muted">Calculus II</p>
              </div>
            </div>
            <p className="mt-6 text-sm text-secondary">3 students focusing right now</p>
          </div>
        </div>
      </section>

      <section className="border-t bg-[rgb(var(--sg-card))]">
        <div className="mx-auto max-w-[1160px] px-4 py-16 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Your next study group is one click away.</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-secondary">Create an account, join a group, and plan your first session today.</p>
          <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/register" className="btn btn-primary btn-lg">Find a Study Group <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/login" className="btn btn-secondary btn-lg">I already have an account</Link>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-[1160px] flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600 text-xs font-bold text-white">S</span>
            <span className="font-medium text-secondary">Study-Group</span>
          </div>
          <p>Built for students. Learn together, stay consistent.</p>
        </div>
      </footer>
    </div>
  )
}
