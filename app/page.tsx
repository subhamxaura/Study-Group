'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, BookOpen, Calendar, MessageCircle, Users, Sparkles, Clock3, Layers, Trophy, Activity, FileText, Flame, UserPlus, Timer, PlayCircle } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { NeuralFloat, ScrollStack } from '@/components/ui/neural'
import { useAuthStore } from '@/lib/store'

const features = [
  { icon: Users, title: 'Find your people', description: 'Connect with classmates studying the same subject and working toward similar goals.' },
  { icon: MessageCircle, title: 'Study together', description: 'Keep questions, explanations, and ideas in one focused conversation.' },
  { icon: Calendar, title: 'Stay consistent', description: 'Plan shared sessions so revision happens when it matters most.' },
  { icon: BookOpen, title: 'Share knowledge', description: 'Build a useful group library of notes, links, files, and explanations.' },
]

const stackCards = [
  {
    id: '01',
    accent: '#D000FF',
    node: (
      <div className="p-7 sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#D000FF]/22 bg-[#D000FF]/10 px-2.5 py-1"><span className="text-[11px] font-bold tracking-[0.14em] text-[#E8D4FF]">01 — FIND YOUR PEOPLE</span></div>
        <h3 className="text-[28px] font-semibold tracking-tight text-white leading-tight">Find your people</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65 max-w-[36rem]">Connect with students studying the same subjects. Discover groups by topic, level, and active members.</p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="flex -space-x-2">
            {['#6D00FF','#9B00FF','#4C5CFF','#D000FF'].map((c,i)=>(<span key={i} className="h-8 w-8 rounded-full border border-black/40 flex items-center justify-center text-[11px] font-semibold text-white" style={{background:`radial-gradient(circle at 35% 30%, ${c}, #0a0a14)`}}>{String.fromCharCode(65+i)}</span>))}
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] border border-white/10 px-3 py-1.5 text-xs text-white/80"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.7)] animate-pulse" /> 12 active now</span>
          <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-xs text-white/60">Mathematics • Physics • CS</span>
        </div>
        <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white text-[#0A0A0F] px-4 py-2.5 text-sm font-semibold"><UserPlus className="h-4 w-4" /> Join discovery</div>
      </div>
    ),
  },
  {
    id: '02',
    accent: '#9B00FF',
    node: (
      <div className="p-7 sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#9B00FF]/22 bg-[#9B00FF]/10 px-2.5 py-1"><span className="text-[11px] font-bold tracking-[0.14em] text-[#E8D4FF]">02 — STUDY TOGETHER</span></div>
        <h3 className="text-[28px] font-semibold tracking-tight text-white leading-tight">Study together</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65 max-w-[36rem]">Turn individual study into collaborative sessions. Live timers, presence, and focus — in one place.</p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3"><div className="flex items-center gap-1.5 text-[11px] tracking-wide text-white/60"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> LIVE</div><p className="mt-1 font-mono text-sm font-semibold text-white">02:34:18</p><p className="text-xs text-white/50">Focus session</p></div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3"><p className="text-xs text-white/60">Active</p><p className="mt-1 text-sm font-semibold text-white">8 students</p><p className="text-xs text-white/50">in this session</p></div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3 flex flex-col justify-center"><div className="flex items-center gap-1 text-white"><Timer className="h-4 w-4 text-white/70" /> <span className="text-sm font-semibold">Next at 18:00</span></div><p className="text-xs text-white/50">Calculus review</p></div>
        </div>
      </div>
    ),
  },
  {
    id: '03',
    accent: '#4C5CFF',
    node: (
      <div className="p-7 sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#4C5CFF]/22 bg-[#4C5CFF]/10 px-2.5 py-1"><span className="text-[11px] font-bold tracking-[0.14em] text-[#DDE0FF]">03 — SHARE KNOWLEDGE</span></div>
        <h3 className="text-[28px] font-semibold tracking-tight text-white leading-tight">Share knowledge</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65 max-w-[36rem]">Share notes, resources, questions and explanations. Keep the best material one tap away.</p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            {icon: FileText, name:'Diff-EQ cheat sheet', meta:'PDF • 245 KB', tint:'#9B00FF'},
            {icon: PlayCircle, name:'Khan — Linear Algebra', meta:'Link • External', tint:'#4C5CFF'},
            {icon: Layers, name:'Problem set ch.5', meta:'PDF • 890 KB', tint:'#6D00FF'},
          ].map(s=>(
            <div key={s.name} className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{background: `${s.tint}18`, border:`1px solid ${s.tint}22`}}><s.icon className="h-4 w-4 text-white/80" /></div>
              <p className="mt-2 text-xs font-semibold text-white leading-tight line-clamp-2">{s.name}</p>
              <p className="text-[11px] text-white/45">{s.meta}</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: '04',
    accent: '#1800FF',
    node: (
      <div className="p-7 sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#1800FF]/24 bg-[#1800FF]/12 px-2.5 py-1"><span className="text-[11px] font-bold tracking-[0.14em] text-[#DDE0FF]">04 — BUILD CONSISTENCY</span></div>
        <h3 className="text-[28px] font-semibold tracking-tight text-white leading-tight">Build consistency</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65 max-w-[36rem]">Track goals, progress and streaks. Small wins, made visible, keep momentum alive.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3 flex items-center gap-3"><span className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center"><Flame className="h-5 w-5 text-white" /></span><div><p className="text-sm font-bold text-white">14-day streak</p><p className="text-xs text-white/55">Don&apos;t break the chain</p></div></div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3 min-w-[160px]"><p className="text-xs text-white/60 flex items-center gap-1"><Activity className="h-3.5 w-3.5" /> Weekly progress</p><div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden"><span className="block h-full w-[68%] rounded-full" style={{background:'linear-gradient(90deg,#6D00FF,#9B00FF)'}} /></div><p className="mt-1 text-xs text-white/50">68% of goal</p></div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] px-4 py-3 flex items-center gap-2 text-white"><Trophy className="h-4 w-4 text-amber-300" /> <span className="text-sm font-semibold">3 goals completed</span></div>
        </div>
      </div>
    ),
  },
  {
    id: '05',
    accent: '#EDE9FF',
    node: (
      <div className="p-7 sm:p-8">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-2.5 py-1"><span className="text-[11px] font-bold tracking-[0.14em] text-white/80">05 — GROW TOGETHER</span></div>
        <h3 className="text-[28px] font-semibold tracking-tight text-white leading-tight">Grow together</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65 max-w-[36rem]">A community that learns together, grows together. Celebrate achievements and shared progress.</p>
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3"><p className="text-xs text-white/60">Community</p><p className="mt-1 text-sm font-semibold text-white">1,248 members</p><p className="text-xs text-white/50">across 86 groups</p></div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3"><p className="text-xs text-white/60">Avg. session</p><p className="mt-1 text-sm font-semibold text-white flex items-center gap-1"><Clock3 className="h-3.5 w-3.5 text-white/60" /> 52 min</p></div>
          <div className="rounded-2xl bg-white/[0.06] border border-white/[0.08] p-3"><p className="text-xs text-white/60">Achievements</p><p className="mt-1 text-sm font-semibold text-white">+24 this week</p></div>
        </div>
      </div>
    ),
  },
]

export default function HomePage() {
  const router = useRouter()
  const { user, isLoading } = useAuthStore()
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    if (user && !isLoading) router.push('/groups')
  }, [user, isLoading, router])

  return (
    <div className="page-container relative overflow-hidden bg-[#020203]">
      {/* Premium translucent nav — stays minimal per spec */}
      <nav className="sticky top-0 z-30 backdrop-blur-xl border-b border-white/[0.06]" style={{ background: 'rgba(2,2,3,0.52)' }} aria-label="Main navigation">
        <div className="mx-auto flex h-[64px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <Link href="/" className="flex items-center gap-3 focus-visible-ring rounded-xl">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-[0_0_16px_rgba(109,0,255,0.55)]" style={{ background: 'linear-gradient(135deg,#6D00FF,#9B00FF 60%,#D000FF)' }}>SC</span>
            <span className="text-[17px] font-semibold tracking-tight text-white">SubCrack</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login"><Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/10">Sign In</Button></Link>
            <Link href="/register"><Button variant="primary" size="sm">Get Started</Button></Link>
          </div>
        </div>
      </nav>

      {/* HERO — Cinematic Neural Float as atmospheric visual layer */}
      <section className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] border border-white/[0.07] bg-[#020203] shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
          <div className="absolute inset-0">
            <NeuralFloat className="absolute inset-0" density="medium" speed={reduceMotion ? 0.06 : 0.34} />
            <div className="hero-vignette absolute inset-0" aria-hidden="true" />
            {/* Bottom haze like reference */}
            <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[44%] bg-gradient-to-t from-[#020203] via-[#020203]/78 to-transparent" />
            <div aria-hidden="true" className="absolute left-0 right-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          </div>

          <div className="relative grid min-h-[560px] sm:min-h-[600px] lg:min-h-[640px] items-center px-5 py-12 sm:px-10 lg:px-12">
            <motion.div
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mx-auto max-w-3xl text-center"
            >
              <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-[#D000FF] shadow-[0_0_10px_rgba(208,0,255,0.9)] animate-pulse" aria-hidden="true" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">Learn together</span>
              </div>

              <h1 className="mt-6 text-5xl font-semibold leading-[0.95] tracking-[-0.045em] text-white sm:text-6xl lg:text-[72px]">
                Your study group,
                <span className="block bg-gradient-to-r from-[#C8A2FF] via-[#B07AFF] to-[#D000FF] bg-clip-text text-transparent">reimagined.</span>
              </h1>
              <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-white/62 sm:text-lg">
                Find focused study groups, collaborate with classmates, share knowledge, and make learning more social — in a living digital space.
              </p>

              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register" className="w-full sm:w-auto">
                  <Button variant="primary" size="lg" className="w-full sm:w-auto px-8 py-4">
                    Find a Study Group <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login" className="w-full sm:w-auto">
                  <Button variant="secondary" size="lg" className="w-full sm:w-auto px-8 py-4">
                    Create a Group
                  </Button>
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-2 text-xs text-white/45">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Trusted by 2,000+ students</span>
                <span className="hidden sm:inline text-white/25">•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] border border-white/10 px-3 py-1.5">No credit card required</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Subtle connector haze */}
      <div aria-hidden="true" className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10"><div className="h-px mt-10 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" /></div>

      {/* Everything your group needs — feature grid */}
      <section className="relative z-10 mx-auto max-w-7xl px-5 pb-6 pt-12 sm:px-8 lg:px-10" aria-labelledby="learning-tools">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.16em] text-[#C8A2FF] uppercase">The toolkit</p>
            <h2 id="learning-tools" className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Everything your group needs to make progress.</h2>
          </div>
          <p className="text-sm text-white/55 max-w-sm">Discovery, live sessions, resources and consistency — designed as one continuous flow.</p>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div key={feature.title} initial={reduceMotion ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.25 }} transition={{ duration: 0.45, delay: reduceMotion ? 0 : index * 0.06, ease: [0.16, 1, 0.3, 1] }}>
              <Card variant="glass" hover className="group h-full p-6 sm:p-7">
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-white shadow-[0_0_18px_rgba(109,0,255,0.18)] group-hover:border-[#9B00FF]/30 group-hover:shadow-[0_0_22px_rgba(109,0,255,0.22)] transition-all">
                  <feature.icon className="h-5 w-5 text-white/90" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{feature.title}</h3>
                <p className="leading-relaxed text-white/60">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* SCROLL STACK — cinematic section */}
      <section aria-labelledby="immersive-stack" className="relative mx-auto max-w-7xl px-0 sm:px-2 lg:px-0">
        <div className="px-5 sm:px-8 lg:px-10 pt-6">
          <p className="text-xs font-semibold tracking-[0.16em] text-[#C8A2FF] uppercase">Immersive</p>
          <h2 id="immersive-stack" className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">Everything you need to study better.</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/55">Scroll — cards pin, stack, overlap and transform with depth and light. The Neural Float continues to live behind them.</p>
        </div>

        {/* Ambient neural field behind stack — subtle so cards remain dominant */}
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.38] overflow-hidden hidden sm:block" aria-hidden="true">
          <NeuralFloat density="low" speed={reduceMotion ? 0.05 : 0.2} className="h-full w-full" />
        </div>

        <ScrollStack cards={stackCards} className="mt-2" />
      </section>

      {/* Final CTA */}
      <section className="relative mx-auto max-w-7xl px-5 pb-12 sm:px-8 lg:px-10">
        <div className="relative overflow-hidden rounded-[28px] border border-white/[0.07] bg-gradient-to-br from-[#0E0B1A] via-[#120E2A] to-[#0A0A0F] p-7 sm:p-10">
          <div className="absolute inset-0 opacity-60" aria-hidden="true" style={{ background: 'radial-gradient(700px 400px at 75% 0%, rgba(155,0,255,0.18), transparent 68%), radial-gradient(560px 360px at 8% 90%, rgba(24,0,255,0.12), transparent 62%)' }} />
          <div className="absolute inset-0" aria-hidden="true"><NeuralFloat density="low" speed={reduceMotion ? 0.04 : 0.18} className="h-full w-full opacity-40" /></div>
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-white">Ready to learn together?</h3>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/60">Join a group in minutes. Bring your course, your goals, and your curiosity.</p>
            </div>
            <div className="flex gap-3 shrink-0">
              <Link href="/register"><Button variant="primary" size="lg">Find a Group</Button></Link>
              <Link href="/groups"><Button variant="secondary" size="lg">Browse groups</Button></Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="relative z-10 border-t border-white/[0.06] py-10 text-center">
        <p className="text-sm text-white/45">&copy; {new Date().getFullYear()} SubCrack Study Group. Built for better study sessions.</p>
      </footer>
    </div>
  )
}
