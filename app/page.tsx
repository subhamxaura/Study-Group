'use client'
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Users, MessageCircle, Calendar, BookOpen, Check, Search, Sparkles, BarChart3, Layers, GraduationCap, Clock, Shield, Zap } from 'lucide-react'
import { Button } from '@/components/ui'
import { useAuthStore } from '@/lib/store'

const howItWorks = [
  { n: '01', title: 'Find or create a group', desc: 'Browse by subject, university or semester. Join in one tap or start your own.' },
  { n: '02', title: 'Collaborate daily', desc: 'Discuss, share notes and schedule sessions — all inside one workspace.' },
  { n: '03', title: 'Track progress', desc: 'Tasks, resources and activity make momentum visible for the whole group.' },
]

const features = [
  { icon: Users, title: 'Study groups that stay organized', desc: 'Keep members, roles and activity in one place. No scattered DMs.' },
  { icon: MessageCircle, title: 'Focused discussions', desc: 'Threads for questions, explanations and decisions — searchable and pinned.' },
  { icon: BookOpen, title: 'Resource library', desc: 'PDFs, notes, links and videos with filters, search and upload.' },
  { icon: Calendar, title: 'Sessions & schedule', desc: 'Plan sessions, set reminders and see what’s next at a glance.' },
  { icon: BarChart3, title: 'Progress you can feel', desc: 'Tasks, streaks and completion keep consistency without micromanagement.' },
  { icon: Shield, title: 'Private by default', desc: 'You control who joins. Invite links and roles keep groups safe.' },
]

function DashboardPreview() {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-white shadow-large dark:bg-[rgb(var(--sg-card))] dark:border-[rgb(var(--sg-border))]">
      {/* window header */}
      <div className="flex items-center justify-between border-b px-4 py-3 bg-[rgb(var(--sg-surface-muted))] dark:bg-transparent">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-[rgb(var(--sg-muted))]">
          <span className="hidden md:inline-flex items-center gap-1.5 rounded-md border bg-white px-2 py-1 dark:bg-[rgb(var(--sg-card))]"><Search className="h-3.5 w-3.5" />Search groups, resources… <span className="ml-2 hidden lg:inline rounded bg-[rgb(var(--sg-hover))] px-1.5 py-0.5 text-[10px]">⌘K</span></span>
        </div>
        <div className="h-7 w-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-medium">S</div>
      </div>
      <div className="grid md:grid-cols-[220px_1fr] gap-0">
        <div className="hidden md:block border-r p-3 space-y-4 bg-[rgb(var(--sg-surface-muted))]/50 dark:bg-transparent">
          <div className="space-y-1">
            <div className="h-8 rounded-lg bg-indigo-600 text-white flex items-center gap-2 px-3 text-sm font-medium"><Layers className="h-4 w-4" /> Dashboard</div>
            <div className="h-7 rounded-md px-3 flex items-center gap-2 text-sm text-[rgb(var(--sg-secondary))]"><Users className="h-4 w-4" /> My Groups</div>
            <div className="h-7 rounded-md px-3 flex items-center gap-2 text-sm text-[rgb(var(--sg-secondary))]"><Search className="h-4 w-4" /> Discover</div>
            <div className="h-7 rounded-md px-3 flex items-center gap-2 text-sm text-[rgb(var(--sg-secondary))]"><MessageCircle className="h-4 w-4" /> Messages <span className="ml-auto text-xs bg-red-500 text-white rounded-full px-1.5">3</span></div>
          </div>
          <div className="pt-3 border-t space-y-2">
            <p className="text-[11px] font-semibold tracking-widest text-[rgb(var(--sg-muted))] uppercase">Your groups</p>
            {['Advanced Mathematics','Computer Science Hub','Physics Circle'].map(n=>(
              <div key={n} className="flex items-center gap-2 text-sm">
                <span className="h-7 w-7 rounded-md bg-indigo-50 dark:bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-semibold">{n[0]}</span>
                <span className="truncate text-sm">{n}</span><span className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </div>
            ))}
          </div>
        </div>
        <div className="p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[rgb(var(--sg-muted))]">Good evening, Subham 👋</p>
              <h3 className="text-lg font-semibold tracking-tight">Here’s what your study space looks like today.</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"/> 3 groups active</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[{k:'Active Groups',v:'5', sub:'2 sessions today'},{k:'Study Hours',v:'24.5h', sub:'+3.2h this week'},{k:'Tasks',v:'12/18', sub:'67% completed'},{k:'Upcoming',v:'3', sub:'Next in 2 hours'}].map(s=>(
              <div key={s.k} className="rounded-xl border bg-[rgb(var(--sg-card))] p-3">
                <p className="text-xs text-[rgb(var(--sg-muted))]">{s.k}</p>
                <p className="mt-1 text-xl font-semibold">{s.v}</p>
                <p className="text-xs text-[rgb(var(--sg-muted))]">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="grid lg:grid-cols-[1.4fr_0.9fr] gap-4">
            <div className="rounded-xl border p-3">
              <div className="flex items-center justify-between"><p className="text-sm font-semibold">Your Study Groups</p><span className="text-xs text-indigo-600 dark:text-indigo-300 font-medium">View all</span></div>
              <div className="mt-3 space-y-2">
                {[
                  {n:'Advanced Mathematics', meta:'Calculus • 12 members • Next: Tomorrow 6PM', prog:'72%'},
                  {n:'Computer Science Hub', meta:'DSA • 8 members • Live now', prog:'54%'},
                ].map(g=>(
                  <div key={g.n} className="flex items-center gap-3 rounded-lg border p-2.5 bg-[rgb(var(--sg-surface-muted))]/60 dark:bg-transparent">
                    <span className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">{g.n[0]}</span>
                    <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{g.n}</p><p className="text-xs text-[rgb(var(--sg-muted))] truncate">{g.meta}</p></div>
                    <div className="hidden sm:block text-right"><p className="text-xs font-medium">{g.prog}</p><div className="mt-1 h-1.5 w-16 rounded-full bg-[rgb(var(--sg-border))] overflow-hidden"><span className="block h-full bg-indigo-600" style={{width:g.prog}}/></div></div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-sm font-semibold flex items-center gap-1.5"><Clock className="h-4 w-4 text-[rgb(var(--sg-muted))]" /> Upcoming</p>
              <div className="mt-3 space-y-2">
                <div className="rounded-lg border bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 p-2.5"><p className="text-xs font-medium">Linear Algebra Review</p><p className="text-xs text-[rgb(var(--sg-muted))]">Tomorrow • 6:00 PM • Library Room 204</p></div>
                <div className="rounded-lg border p-2.5"><p className="text-xs font-medium">Submit Problem Set — Ch.5</p><p className="text-xs text-[rgb(var(--sg-muted))]">Due in 2 days • Advanced Mathematics</p></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function HomePage(){
  const router = useRouter()
  const { user, isLoading } = useAuthStore()
  const reduceMotion = useReducedMotion()
  useEffect(()=>{ if(user && !isLoading) router.push('/groups') }, [user,isLoading,router])

  return (
    <div className="min-h-screen bg-[rgb(var(--sg-background))]">
      {/* Nav */}
      <header className="sticky top-0 z-30 backdrop-blur supports-[backdrop-filter]:bg-[rgb(var(--sg-card))]/80 border-b">
        <div className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 h-[64px] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">S</span>
            <span className="text-[15px] font-semibold tracking-tight">Study-Group</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-[rgb(var(--sg-secondary))]">
            <a href="#how" className="hover:text-[rgb(var(--sg-foreground))]">How it works</a>
            <a href="#features" className="hover:text-[rgb(var(--sg-foreground))]">Features</a>
            <a href="#resources" className="hover:text-[rgb(var(--sg-foreground))]">Resources</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex btn btn-ghost btn-sm">Sign in</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Get started <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-8">
        <motion.div initial={reduceMotion?false:{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{duration:0.45}} className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border bg-[rgb(var(--sg-card))] px-3 py-1 text-xs font-medium shadow-sm"><Sparkles className="h-3.5 w-3.5 text-indigo-600" /> Study smarter. Together.</span>
          <h1 className="mt-4 text-4xl sm:text-5xl lg:text-[52px] font-semibold tracking-tight leading-[1.05] text-balance">
            Your study group,<br /><span className="text-indigo-600 dark:text-indigo-400">all in one place.</span>
          </h1>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-[rgb(var(--sg-secondary))] max-w-2xl mx-auto text-balance">
            Find groups by subject, create your own, share resources, discuss topics and track progress — one organized workspace for focused learning.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/register" className="w-full sm:w-auto btn btn-primary btn-lg">Find a Study Group <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/login" className="w-full sm:w-auto btn btn-secondary btn-lg">Create a Group</Link>
          </div>
          <p className="mt-3 text-xs text-[rgb(var(--sg-muted))]">Free to start • No credit card required • Trusted by 2,000+ students</p>
        </motion.div>

        <motion.div initial={reduceMotion?false:{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{duration:0.5, delay:0.08}} className="mt-10">
          <DashboardPreview />
          <p className="mt-3 text-center text-xs text-[rgb(var(--sg-muted))]">Interactive preview — no signup required to explore</p>
        </motion.div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase">How it works</p>
          <h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">From discovery to daily momentum.</h2>
        </div>
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          {howItWorks.map(s=>(
            <div key={s.n} className="rounded-xl border bg-[rgb(var(--sg-card))] p-6">
              <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-indigo-600 text-white text-xs font-bold px-2">{s.n}</span>
              <h3 className="mt-3 text-base font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-[rgb(var(--sg-secondary))]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl"><p className="text-xs font-semibold tracking-widest text-indigo-600 uppercase">Product</p><h2 className="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Everything your group needs — without the clutter.</h2></div>
          <p className="max-w-sm text-sm text-[rgb(var(--sg-secondary))]">Keep study social, but structured. Every feature is designed for focus, not noise.</p>
        </div>
        <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map(f=>(
            <div key={f.title} className="rounded-xl border bg-[rgb(var(--sg-card))] p-6 hover:shadow-medium transition-shadow">
              <span className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-300"><f.icon className="h-5 w-5" /></span>
              <h3 className="mt-4 text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--sg-secondary))]">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Collaboration */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center rounded-2xl border bg-[rgb(var(--sg-card))] p-6 sm:p-8">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 text-xs font-medium"><MessageCircle className="h-3.5 w-3.5" /> Discussion</span>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Focused collaboration, not endless chats.</h3>
            <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--sg-secondary))]">Ask questions, explain concepts, pin answers and search everything later. Mentions, attachments and replies keep context intact.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {['Pinned answers for quick revision','Replies keep threads tidy','Search across all discussions'].map(t=>(
                <li key={t} className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center"><Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /></span>{t}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-[rgb(var(--sg-surface-muted))] p-4 space-y-3 dark:bg-[rgb(var(--sg-background))]">
            {[
              {n:'Alex Morgan', t:'2m ago', m:'Has anyone solved problem 4? Separation of variables isn’t clicking.'},
              {n:'Jordan Lee', t:'1m ago', m:'Yep — move all y terms left, x terms right, then integrate. I’ll pin the steps.'},
              {n:'Taylor', t:'now', m:'I shared my handwritten notes in Resources — see “ODE cheat sheet”.', pin:true},
            ].map(row=>(
              <div key={row.n} className="rounded-lg border bg-[rgb(var(--sg-card))] p-3 flex gap-3">
                <span className="h-8 w-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-bold shrink-0">{row.n[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-sm font-medium">{row.n}</span><span className="text-xs text-[rgb(var(--sg-muted))]">{row.t}</span>{row.pin && <span className="ml-auto text-[10px] font-semibold tracking-widest uppercase bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/20 rounded-full px-1.5 py-0.5">Pinned</span>}</div>
                  <p className="mt-1 text-sm leading-relaxed text-[rgb(var(--sg-secondary))]">{row.m}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section id="resources" className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-2 gap-8 items-center">
          <div className="order-2 lg:order-1 rounded-xl border bg-[rgb(var(--sg-card))] p-4">
            <div className="flex items-center justify-between"><p className="text-sm font-semibold">Resources</p><span className="text-xs rounded-full border px-2 py-1">Filter: All</span></div>
            <div className="mt-3 grid sm:grid-cols-2 gap-3">
              {[
                {title:'Differential Equations Cheat Sheet', type:'PDF • 245 KB', by:'Alex • 2d ago'},
                {title:'Khan Academy — Linear Algebra', type:'Link', by:'Taylor • yesterday'},
                {title:'Problem Set Ch.5 Solutions', type:'PDF • 890 KB', by:'Jordan • 3d ago'},
                {title:'Thermodynamics Practice Set', type:'PDF • 450 KB', by:'Casey • 5d ago'},
              ].map(r=>(
                <div key={r.title} className="rounded-lg border p-3">
                  <p className="text-sm font-medium line-clamp-2 leading-tight">{r.title}</p>
                  <p className="mt-1 text-xs text-[rgb(var(--sg-muted))]">{r.type} • {r.by}</p>
                  <span className="mt-2 inline-flex text-xs border rounded-md px-1.5 py-0.5">Open</span>
                </div>
              ))}
            </div>
          </div>
          <div className="order-1 lg:order-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-700 dark:text-indigo-300 px-2.5 py-1 text-xs font-medium"><BookOpen className="h-3.5 w-3.5" /> Resources</span>
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Share once, benefit all semester.</h3>
            <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--sg-secondary))]">Upload notes, link videos or drop PDFs. Filter by subject, search instantly and keep the most useful material pinned for everyone.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {['PDFs, links, docs and videos','Search + filters by subject and author','Upload with role-based access'].map(t=>(
                <li key={t} className="flex items-center gap-2"><span className="h-5 w-5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center"><Check className="h-3.5 w-3.5 text-emerald-600" /></span>{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Progress */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-2xl border bg-indigo-600 text-white p-6 sm:p-8 overflow-hidden relative">
          <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/10" />
          <div className="relative grid lg:grid-cols-2 gap-6 items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 px-2.5 py-1 text-xs font-medium"><Zap className="h-3.5 w-3.5" /> Productivity</span>
              <h3 className="mt-3 text-2xl font-semibold tracking-tight">Build consistency without busywork.</h3>
              <p className="mt-2 text-sm leading-relaxed text-indigo-100">Track tasks, upcoming sessions and streaks. The dashboard makes progress obvious — motivation follows.</p>
              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <span className="inline-flex items-center gap-2 rounded-lg bg-white text-indigo-700 px-3 py-2 font-medium"><GraduationCap className="h-4 w-4" /> 14-day streak</span>
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/15 border border-white/20 px-3 py-2">68% weekly goal</span>
              </div>
            </div>
            <div className="rounded-xl bg-white text-zinc-900 p-4 shadow-large">
              <p className="text-sm font-semibold">Tasks • Today</p>
              <div className="mt-3 space-y-2">
                {[
                  {t:'Review eigenvalues', s:'Mathematics', d:'Due tomorrow', done:true},
                  {t:'Finish problem set Ch.5', s:'Mathematics', d:'Due in 2 days', done:false},
                  {t:'Prepare thermo quiz notes', s:'Physics', d:'Due Friday', done:false},
                ].map(item=>(
                  <div key={item.t} className="flex items-center gap-3 rounded-lg border p-2.5">
                    <span className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 ${item.done?'bg-indigo-600 border-indigo-600 text-white':'bg-white'}`}>{item.done&&<Check className="h-3.5 w-3.5" />}</span>
                    <div className="min-w-0"><p className="text-sm font-medium truncate">{item.t}</p><p className="text-xs text-zinc-500">{item.s} • {item.d}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl border bg-[rgb(var(--sg-card))] p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div><h3 className="text-lg font-semibold">Built for students, not enterprises.</h3><p className="mt-1 text-sm text-[rgb(var(--sg-secondary))] max-w-xl">Free to start, private by default and fast on every device. No ads, no distractions — just focused study.</p></div>
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold">★</span>
              <div><p className="text-sm font-semibold">4.9/5 student rating</p><p className="text-xs text-[rgb(var(--sg-muted))]">Based on core group features</p></div>
            </div>
          </div>
          <div className="mt-6 grid sm:grid-cols-3 gap-4">
            {[
              {q:'Finally a study tool that doesn’t feel like homework.', a:'Aarav • BSc Mathematics'},
              {q:'Our group actually meets now. The schedule + tasks keep us honest.', a:'Mira • Computer Science'},
              {q:'Sharing resources is instant. No more hunting through chats.', a:'Ethan • Physics'},
            ].map(card=>(
              <div key={card.q} className="rounded-xl border bg-[rgb(var(--sg-surface-muted))] p-4 dark:bg-transparent">
                <p className="text-sm leading-relaxed">“{card.q}”</p>
                <p className="mt-3 text-xs font-medium text-[rgb(var(--sg-muted))]">{card.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 pb-12">
        <div className="rounded-2xl border bg-[rgb(var(--sg-card))] p-6 sm:p-8 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div><h3 className="text-xl font-semibold tracking-tight">Ready to learn together?</h3><p className="mt-1 text-sm text-[rgb(var(--sg-secondary))]">Join a group in minutes. Bring your course, your goals and your curiosity.</p></div>
          <div className="flex gap-3 shrink-0 w-full lg:w-auto">
            <Link href="/register" className="flex-1 lg:flex-none btn btn-primary">Find a Group</Link>
            <Link href="/groups" className="flex-1 lg:flex-none btn btn-secondary">Browse groups</Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto max-w-[1160px] px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[rgb(var(--sg-muted))]">
          <span className="flex items-center gap-2"><span className="h-6 w-6 rounded-md bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">S</span> Study-Group © {new Date().getFullYear()}</span>
          <span>Privacy • Terms • Contact • Status</span>
        </div>
      </footer>
    </div>
  )
}
