'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Check, GraduationCap, BookOpen, Target, Sparkles, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'

const SUBJECTS = [
  'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Data Structures',
  'Algorithms', 'Databases', 'Operating Systems', 'Economics', 'Accounting', 'Psychology',
  'Statistics', 'English', 'History', 'Other',
]

const GOALS = [
  { id: 'EXAM_PREP', label: 'Exam preparation', desc: 'Structured revision with a group' },
  { id: 'DAILY_CONSISTENCY', label: 'Daily consistency', desc: 'Build a steady study habit' },
  { id: 'GROUP_STUDY', label: 'Group study', desc: 'Learn together with classmates' },
  { id: 'ASSIGNMENTS', label: 'Assignments', desc: 'Stay on top of coursework' },
  { id: 'INTERVIEW_PREP', label: 'Interview prep', desc: 'DSA and technical rounds' },
]

const CURRENT_SEMESTERS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th']

export function OnboardingWizard({ draft, onFinished }: { draft?: { university: string | null; course: string | null; semester: string | null; subjects: string[]; goals: string[] } | null; onFinished?: () => void }) {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    university: draft?.university ?? '',
    course: draft?.course ?? '',
    semester: draft?.semester ?? '',
    subjects: draft?.subjects ?? [],
    goals: draft?.goals ?? [],
  })
  const [recommended, setRecommended] = useState<Array<{ id: string; name: string; subject: string; memberCount: number }>>([])

  // Fetch group recommendations once subjects are chosen (step 3).
  useEffect(() => {
    if (step !== 3 || recommended.length) return
    const qs = form.subjects.slice(0, 5).map((s) => `subject=${encodeURIComponent(s)}`).join('&')
    api.get<{ groups: Array<{ id: string; name: string; subject: string; memberCount: number }> }>(
      `/api/groups?pageSize=6${qs ? `&${qs}` : ''}`
    ).then((d) => setRecommended(d.groups)).catch(() => setRecommended([]))
  }, [step, form.subjects, recommended.length])

  const toggle = (key: 'subjects' | 'goals', value: string) =>
    setForm((f) => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter((v) => v !== value) : [...f[key], value],
    }))

  const finish = async () => {
    setSaving(true)
    setError('')
    try {
      await api.post('/api/onboarding', form)
      onFinished?.()
      router.replace('/dashboard')
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your preferences. Please try again.')
      setSaving(false)
    }
  }

  const canNext =
    step === 0 ? Boolean(form.university.trim() && form.course.trim()) :
    step === 1 ? form.subjects.length > 0 :
    true

  const steps = [
    { title: 'Tell us about your studies', icon: GraduationCap },
    { title: 'Pick your subjects', icon: BookOpen },
    { title: 'What are your goals?', icon: Target },
    { title: 'Groups you might like', icon: Sparkles },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--sg-background))] p-4">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="mb-6 flex items-center gap-2" aria-label={`Step ${step + 1} of ${steps.length}`}>
          {steps.map((s, i) => (
            <div key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i < step ? 'bg-indigo-600' : i === step ? 'bg-indigo-400' : 'bg-[rgb(var(--sg-border))]')} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="rounded-2xl border bg-[rgb(var(--sg-card))] p-6 sm:p-8"
          >
            <div className="mb-5 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                {(() => { const Icon = steps[step].icon; return <Icon className="h-5 w-5" /> })()}
              </span>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted">Step {step + 1} of {steps.length}</p>
                <h1 className="text-lg font-semibold tracking-tight">{steps[step].title}</h1>
              </div>
            </div>

            {step === 0 && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="ob-uni" className="mb-1.5 block text-sm font-medium">University</label>
                  <input id="ob-uni" value={form.university} onChange={(e) => setForm({ ...form, university: e.target.value })}
                    placeholder="e.g. Delhi Technological University" className="input" maxLength={120} />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="ob-course" className="mb-1.5 block text-sm font-medium">Course</label>
                    <input id="ob-course" value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })}
                      placeholder="e.g. B.Tech CSE" className="input" maxLength={120} />
                  </div>
                  <div>
                    <label htmlFor="ob-sem" className="mb-1.5 block text-sm font-medium">Semester</label>
                    <select id="ob-sem" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} className="input">
                      <option value="">Select…</option>
                      {CURRENT_SEMESTERS.map((s) => <option key={s} value={s}>{s} semester</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <p className="mb-3 text-sm text-secondary">Choose at least one — we use these to recommend groups.</p>
                <div className="flex flex-wrap gap-2">
                  {SUBJECTS.map((s) => (
                    <button key={s} onClick={() => toggle('subjects', s)} type="button" aria-pressed={form.subjects.includes(s)}
                      className={cn(
                        'rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                        form.subjects.includes(s)
                          ? 'border-indigo-600 bg-indigo-600 text-white'
                          : 'border-[rgb(var(--sg-border))] text-secondary hover:border-indigo-400 hover:text-[rgb(var(--sg-foreground))]'
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-2">
                {GOALS.map((g) => (
                  <button key={g.id} onClick={() => toggle('goals', g.id)} type="button" aria-pressed={form.goals.includes(g.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition-colors',
                      form.goals.includes(g.id) ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-500/10' : 'border-[rgb(var(--sg-border))] hover:bg-[rgb(var(--sg-hover))]'
                    )}>
                    <span>
                      <span className="block text-sm font-medium">{g.label}</span>
                      <span className="block text-xs text-muted">{g.desc}</span>
                    </span>
                    {form.goals.includes(g.id) && <Check className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div>
                {recommended.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">Loading suggestions…</p>
                ) : (
                  <div className="space-y-2">
                    {recommended.map((g) => (
                      <div key={g.id} className="flex items-center justify-between rounded-xl border px-4 py-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{g.name}</p>
                          <p className="text-xs text-muted">{g.subject} · {g.memberCount} members</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => router.push(`/groups/${g.id}`)}>View</Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="mt-6 flex items-center justify-between">
              <button onClick={() => (step === 0 ? finish() : setStep(step - 1))} disabled={saving}
                className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-[rgb(var(--sg-foreground))]">
                {step === 0 ? <><SkipForward className="h-3.5 w-3.5" /> Skip setup</> : <><ArrowLeft className="h-3.5 w-3.5" /> Back</>}
              </button>
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1)} disabled={!canNext}>
                  Continue <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={finish} disabled={saving} className="min-w-32">
                  {saving ? 'Setting up…' : <>Finish <Check className="h-4 w-4" /></>}
                </Button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
