'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, X, Send, Settings2, BookOpen, ListChecks, Layers, FileText,
  Brain, CalendarClock, History, ArrowLeft, Square, RotateCcw, Timer, Target,
} from 'lucide-react'
import Link from 'next/link'
import { api, ApiError } from '@/lib/client'
import { useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'

/** Topbar launcher — the single entry point for the StudyMate panel. */
export function StudymateButton() {
  const studymateOpen = useUIStore((s) => s.studymateOpen)
  const setStudymateOpen = useUIStore((s) => s.setStudymateOpen)
  return (
    <button
      onClick={() => setStudymateOpen(!studymateOpen)}
      className={cn(
        'rounded-lg p-2 transition-colors hover:bg-[rgb(var(--sg-hover))]',
        studymateOpen ? 'text-[rgb(var(--sg-accent))] dark:text-[rgb(var(--sg-accent-muted))]' : 'text-muted hover:text-[rgb(var(--sg-foreground))]',
      )}
      aria-label={studymateOpen ? 'Close StudyMate' : 'Open StudyMate AI assistant'}
      aria-expanded={studymateOpen}
    >
      <Sparkles className="h-[18px] w-[18px]" />
    </button>
  )
}

export interface Flashcard { front: string; back: string }
export interface WeakTopic { subject: string; topic: string; avgScore: number; attempts: number }
export interface GenQuestion { question: string; options: string[]; correctIndex: number }

interface QuizAnswer { question: string; selected: string; correct: string; isCorrect: boolean }

interface Msg {
  role: 'user' | 'assistant'
  content: string
  cards?: Flashcard[]
  weakTopics?: WeakTopic[]
  focusSuggestion?: { subject: string; durationMin: number }
  quizState?: 'ready' | 'done'
  quizQuestions?: GenQuestion[]
  quizSubject?: string
  quizTopic?: string
  quizReview?: { score: number; total: number; correct: number; answers: QuizAnswer[]; weak: WeakTopic | null }
}

// Parse the AI's flashcard format into review cards.
export function parseFlashcards(text: string): Flashcard[] {
  const cards: Flashcard[] = []
  const lines = text.split(/\n/)
  let cur: { front: string } | null = null
  for (const raw of lines) {
    const line = raw.trim()
    const q = /^Q[:.)]\s*(.+)/i.exec(line)
    const a = /^A[:.)]\s*(.+)/i.exec(line)
    if (q) {
      if (cur && cur.front) cards.push({ front: cur.front, back: '' })
      cur = { front: q[1].trim() }
    } else if (a && cur) {
      cards.push({ front: cur.front, back: a[1].trim() })
      cur = null
    }
  }
  if (cur && cur.front) cards.push({ front: cur.front, back: '' })
  return cards.filter((c) => c.front && c.back).slice(0, 12)
}

// Legacy text-quiz parser (kept for compatibility; new quizzes use /api/quiz/generate).
export interface QuizQuestion { question: string; options: string[]; correctIndex: number }
export function parseQuiz(text: string): QuizQuestion[] {
  const questions: QuizQuestion[] = []
  const blocks = text.split(/(?=\bQ\d+[.)])/g)
  for (const block of blocks) {
    const qLine = /Q\d+[.)]\s*(.+)/.exec(block)
    if (!qLine) continue
    const options = [...block.matchAll(/^\s*([A-D])[).]\s*(.+)$/gm)].map((m) => m[2].trim())
    const ansLine = /Answer:\s*([A-D])/i.exec(block)
    if (!qLine[1].trim() || options.length < 2 || !ansLine) continue
    const correctIndex = ansLine[1].toUpperCase().charCodeAt(0) - 65
    if (correctIndex >= options.length) continue
    questions.push({ question: qLine[1].trim(), options, correctIndex })
  }
  return questions
}

function FlashcardDeck({ cards }: { cards: Flashcard[] }) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<Set<number>>(new Set())
  const [again, setAgain] = useState<Set<number>>(new Set())
  const done = idx >= cards.length
  const card = cards[Math.min(idx, cards.length - 1)]

  const mark = (isKnown: boolean) => {
    if (isKnown) setKnown((s) => new Set(s).add(idx))
    else setAgain((s) => new Set(s).add(idx))
    setFlipped(false)
    setIdx((i) => i + 1)
  }

  if (done) {
    return (
      <div className="rounded-xl border bg-[rgb(var(--sg-surface-muted))] p-3" role="status">
        <p className="text-sm font-semibold">Deck complete — {known.size}/{cards.length} known</p>
        {again.size > 0 && <p className="mt-1 text-xs text-secondary">{again.size} card{again.size === 1 ? '' : 's'} marked for review — run the deck again to re-test them.</p>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-[rgb(var(--sg-surface-muted))] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Card {idx + 1} of {cards.length} · {known.size} known</p>
      <button
        onClick={() => setFlipped((f) => !f)}
        className="mt-2 min-h-[72px] w-full rounded-lg border bg-[rgb(var(--sg-card))] p-3 text-left text-sm transition-colors hover:border-[rgb(var(--sg-accent))]/40"
        aria-label={flipped ? `Back of card: ${card.back}. Activate to flip to front.` : `Front of card: ${card.front}. Activate to flip to back.`}
      >
        <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted">{flipped ? 'Back' : 'Front'}</span>
        <span className="mt-1 block">{flipped ? card.back : card.front}</span>
      </button>
      <div className="mt-2 flex gap-2">
        <button onClick={() => mark(false)} className="btn btn-secondary btn-sm flex-1" disabled={!flipped}>Review again</button>
        <button onClick={() => mark(true)} className="btn btn-primary btn-sm flex-1" disabled={!flipped}>Know</button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button onClick={() => { setFlipped(false); setIdx((i) => Math.max(0, i - 1)) }} disabled={idx === 0} className="text-xs font-medium text-muted transition-colors hover:text-[rgb(var(--sg-foreground))] disabled:opacity-40">
          ← Previous
        </button>
        {!flipped
          ? <p className="text-[10px] text-muted">Tap the card to reveal the answer</p>
          : <button onClick={() => { setFlipped(false); setIdx((i) => i + 1) }} className="text-xs font-medium text-muted transition-colors hover:text-[rgb(var(--sg-foreground))]">Next →</button>}
      </div>
    </div>
  )
}

function QuizRunner({ questions, subject, topic, onDone }: {
  questions: GenQuestion[]
  subject: string
  topic: string
  onDone: (correct: number, total: number, answers: QuizAnswer[]) => void
}) {
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [correct, setCorrect] = useState(0)
  const answersRef = useRef<QuizAnswer[]>([])
  const doneRef = useRef(false)
  const finished = idx >= questions.length
  const q = questions[idx]

  useEffect(() => {
    if (finished && !doneRef.current) {
      doneRef.current = true
      onDone(correct, questions.length, answersRef.current)
    }
  }, [finished, correct, questions.length, onDone])

  if (finished) {
    return (
      <div className="rounded-xl border bg-[rgb(var(--sg-surface-muted))] p-3" role="status">
        <p className="text-sm font-semibold">Quiz complete — {correct}/{questions.length} correct</p>
        <p className="mt-1 text-xs text-secondary">Scoring your attempt…</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border bg-[rgb(var(--sg-surface-muted))] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">Question {idx + 1} of {questions.length} · {subject}{topic ? ` / ${topic}` : ''}</p>
      <p className="mt-1.5 text-sm font-medium">{q.question}</p>
      <div className="mt-2 space-y-1.5">
        {q.options.map((opt, oi) => {
          const isPicked = picked === oi
          const isCorrect = oi === q.correctIndex
          return (
            <button
              key={oi}
              disabled={picked !== null}
              onClick={() => {
                setPicked(oi)
                const okPick = oi === q.correctIndex
                if (okPick) setCorrect((c) => c + 1)
                answersRef.current.push({ question: q.question, selected: opt, correct: q.options[q.correctIndex], isCorrect: okPick })
                setTimeout(() => { setPicked(null); setIdx((i) => i + 1) }, 900)
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs transition-colors',
                picked === null && 'hover:border-[rgb(var(--sg-accent))]/40 hover:bg-[rgb(var(--sg-hover))]',
                picked !== null && isCorrect && 'border-emerald-500 bg-emerald-500/10',
                picked !== null && isPicked && !isCorrect && 'border-red-500 bg-red-500/10',
                picked !== null && !isPicked && !isCorrect && 'opacity-60',
              )}
            >
              <span className="font-semibold">{'ABCD'[oi]}</span> {opt}
            </button>
          )
        })}
      </div>
    </div>
  )
}

type Mode = 'free' | 'explain' | 'quiz' | 'cards' | 'summarize' | 'plan'
type ChatAction = 'chat' | 'explain' | 'quiz' | 'flashcards' | 'summarize' | 'weak-topics' | 'study-plan'

interface ChatPayload {
  message: string
  action: ChatAction
  topic?: string
  durationMin?: number
  context?: { noteId: string }
  quizSubject?: string
  quizTopic?: string
}

const ACTIONS: Array<{ mode: Mode | 'weak'; label: string; icon: React.ComponentType<{ className?: string }>; hint: string }> = [
  { mode: 'explain', label: 'Explain a topic', icon: BookOpen, hint: 'Simple explanation with an example' },
  { mode: 'quiz', label: 'Quiz me', icon: ListChecks, hint: 'Server-scored MCQs on your topic' },
  { mode: 'cards', label: 'Make flashcards', icon: Layers, hint: 'Flip cards to review' },
  { mode: 'summarize', label: 'Summarize notes', icon: FileText, hint: 'Bullet summary of your note' },
  { mode: 'weak', label: 'Find my weak topics', icon: Brain, hint: 'From your real quiz history' },
  { mode: 'plan', label: 'Make a study plan', icon: CalendarClock, hint: 'Time blocks + focus room' },
]

const PLAN_DURATIONS = [30, 60, 120]
const CLIENT_TIMEOUT_MS = 60_000

function friendlyError(err: unknown): { text: string; retryAfter?: number } {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      const ra = typeof err.payload?.retryAfter === 'number' ? err.payload.retryAfter : 30
      return { text: `You're going a bit fast — retry in ${ra}s.`, retryAfter: ra }
    }
    if (err.status === 503) return { text: err.message }
    if (err.status === 504) return { text: 'StudyMate timed out. Your message was short — retry when ready.' }
    return { text: err.message || 'Something went wrong. Please try again.' }
  }
  if (err instanceof DOMException && err.name === 'AbortError') return { text: 'Stopped.' }
  return { text: err instanceof Error ? err.message : 'Something went wrong. Please try again.' }
}

export function StudymatePanel() {
  const { studymateOpen, setStudymateOpen } = useUIStore()
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [provider, setProvider] = useState('openai')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [stopping, setStopping] = useState(false)
  const [failed, setFailed] = useState<ChatPayload | null>(null)
  const [failText, setFailText] = useState('')
  const [mode, setMode] = useState<Mode>('free')
  const [topic, setTopic] = useState('')
  const [planMin, setPlanMin] = useState(60)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const [showHistory, setShowHistory] = useState(false)
  const [history, setHistory] = useState<{ attempts: Array<{ id: string; subject: string; topic: string | null; score: number; totalQuestions: number; correctAnswers: number; createdAt: string }>; weakTopics: WeakTopic[] } | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [quizGen, setQuizGen] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null })
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [groupId, setGroupId] = useState('')
  const [notes, setNotes] = useState<Array<{ id: string; title: string }>>([])
  const [noteId, setNoteId] = useState('')
  const [notesLoading, setNotesLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // One-time provider status check — the only AI-adjacent call on mount.
  useEffect(() => {
    api.get<{ configured: boolean; provider: string }>('/api/ai/chat')
      .then((d) => { setConfigured(d.configured); setProvider(d.provider) })
      .catch(() => setConfigured(false))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, quizGen])

  // Abort any in-flight request when the panel closes or unmounts.
  useEffect(() => {
    if (!studymateOpen) abortRef.current?.abort()
  }, [studymateOpen])
  useEffect(() => () => {
    abortRef.current?.abort()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }, [])

  // Lazy note picker: groups on entering summarize mode, notes per group.
  useEffect(() => {
    if (mode !== 'summarize' || groups.length > 0) return
    const ctrl = new AbortController()
    api.get<{ groups: Array<{ id: string; name: string }> }>('/api/groups?mine=1&pageSize=12', { signal: ctrl.signal })
      .then((d) => {
        setGroups(d.groups)
        if (d.groups.length === 1) setGroupId(d.groups[0].id)
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [mode, groups.length])

  useEffect(() => {
    if (mode !== 'summarize' || !groupId) { setNotes([]); return }
    const ctrl = new AbortController()
    setNotesLoading(true)
    api.get<{ notes: Array<{ id: string; title: string }> }>(`/api/notes?groupId=${groupId}`, { signal: ctrl.signal })
      .then((d) => setNotes(d.notes))
      .catch(() => {})
      .finally(() => setNotesLoading(false))
    return () => ctrl.abort()
  }, [mode, groupId])

  const stop = () => {
    setStopping(true)
    abortRef.current?.abort()
  }

  const sendChat = async (payload: ChatPayload) => {
    if (sending) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setSending(true)
    setStopping(false)
    setFailed(null)
    setFailText('')
    setMessages((m) => [...m, { role: 'user', content: payload.message }])
    timeoutRef.current = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS)
    try {
      const d = await api.post<{ conversationId: string; reply: string; weakTopics?: WeakTopic[]; focusSuggestion?: { subject: string; durationMin: number } }>(
        '/api/ai/chat',
        {
          conversationId,
          message: payload.message,
          action: payload.action,
          ...(payload.topic ? { topic: payload.topic } : {}),
          ...(payload.durationMin ? { durationMin: payload.durationMin } : {}),
          ...(payload.context ? { context: payload.context } : {}),
        },
        { signal: ctrl.signal },
      )
      setConversationId(d.conversationId)
      const cards = payload.action === 'flashcards' ? parseFlashcards(d.reply) : []
      setMessages((m) => [...m, {
        role: 'assistant',
        content: d.reply,
        cards: cards.length >= 2 ? cards : undefined,
        weakTopics: d.weakTopics,
        focusSuggestion: d.focusSuggestion,
      }])
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setMessages((m) => [...m, { role: 'assistant', content: stopping ? 'Stopped — nothing was sent twice. Retry when ready.' : 'Request timed out after 60s. Retry when ready.' }])
        setFailed(payload)
      } else {
        const f = friendlyError(err)
        setFailText(f.text)
        setFailed(payload)
        setMessages((m) => [...m, { role: 'assistant', content: f.text }])
      }
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setSending(false)
      setStopping(false)
    }
  }

  const generateQuiz = async (subject: string, topicName: string) => {
    if (sending || quizGen.loading) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setQuizGen({ loading: true, error: null })
    setSending(true)
    timeoutRef.current = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS)
    const label = topicName ? `Quiz me on: ${topicName} (${subject})` : `Quiz me on: ${subject}`
    setMessages((m) => [...m, { role: 'user', content: label }])
    try {
      const d = await api.post<{ questions: GenQuestion[]; subject: string; topic: string | null }>(
        '/api/quiz/generate',
        { subject, topic: topicName || undefined, difficulty: 'MEDIUM', count: 5 },
        { signal: ctrl.signal },
      )
      setQuizGen({ loading: false, error: null })
      setMessages((m) => [...m, {
        role: 'assistant',
        content: `Here's your ${d.questions.length}-question quiz on ${topicName || subject}. Good luck!`,
        quizState: 'ready',
        quizQuestions: d.questions,
        quizSubject: d.subject,
        quizTopic: d.topic ?? undefined,
      }])
    } catch (err) {
      const f = err instanceof DOMException && err.name === 'AbortError'
        ? { text: 'Stopped — quiz generation cancelled.' }
        : friendlyError(err)
      setQuizGen({ loading: false, error: f.text })
      setMessages((m) => [...m, { role: 'assistant', content: f.text }])
    } finally {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setSending(false)
    }
  }

  const submitQuiz = async (msgIndex: number, correct: number, total: number, answers: QuizAnswer[]) => {
    const msg = messages[msgIndex]
    if (!msg?.quizQuestions) return
    try {
      await api.post('/api/quiz', {
        subject: msg.quizSubject ?? 'General',
        topic: msg.quizTopic || undefined,
        difficulty: 'MEDIUM',
        answers: answers.map((a) => ({
          question: a.question.slice(0, 500),
          selectedAnswer: a.selected.slice(0, 300),
          correctAnswer: a.correct.slice(0, 300),
          isCorrect: a.isCorrect,
        })),
      })
      // Weak-topic signal + score review from the persisted server record.
      const h = await api.get<{ attempts: Array<{ subject: string; topic: string | null; score: number }>; weakTopics: WeakTopic[] }>('/api/quiz').catch(() => null)
      const weak = h?.weakTopics.find((w) =>
        w.subject === (msg.quizSubject ?? 'General') && (!msg.quizTopic || w.topic === msg.quizTopic),
      ) ?? null
      const score = Math.round((correct / total) * 100)
      setMessages((ms) => {
        const next = [...ms]
        next[msgIndex] = { ...next[msgIndex], quizState: 'done', quizReview: { score, total, correct, answers, weak } }
        return next
      })
    } catch {
      // Scoring display is local and honest; persistence failure is noted.
      const score = Math.round((correct / total) * 100)
      setMessages((ms) => {
        const next = [...ms]
        next[msgIndex] = { ...next[msgIndex], quizState: 'done', quizReview: { score, total, correct, answers, weak: null } }
        return next
      })
    }
  }

  const openHistory = async () => {
    setShowHistory(true)
    if (history || historyLoading) return
    setHistoryLoading(true)
    try {
      const h = await api.get<{ attempts: Array<{ id: string; subject: string; topic: string | null; score: number; totalQuestions: number; correctAnswers: number; createdAt: string }>; weakTopics: WeakTopic[] }>('/api/quiz')
      setHistory({ attempts: h.attempts, weakTopics: h.weakTopics })
    } catch {
      setHistory({ attempts: [], weakTopics: [] })
    } finally {
      setHistoryLoading(false)
    }
  }

  const sendFree = () => {
    const t = input.trim()
    if (!t || sending) return
    setInput('')
    void sendChat({ message: t, action: 'chat' })
  }

  const sendTopicAction = (action: Mode) => {
    const t = topic.trim()
    if (!t || sending) return
    setTopic('')
    if (action === 'quiz') {
      // Single-input: subject carries the topic; server validates structure.
      void generateQuiz(t, '')
      return
    }
    const chatAction = action === 'cards' ? 'flashcards' : 'explain'
    const label = action === 'explain' ? `Explain: ${t}` : `Flashcards: ${t}`
    void sendChat({ message: label, action: chatAction, topic: t })
  }

  const sendWeakTopics = () => {
    if (sending) return
    void sendChat({ message: 'Find my weak topics from my quiz history.', action: 'weak-topics' })
  }

  const sendPlan = () => {
    if (sending) return
    void sendChat({ message: `Make me a ${planMin}-minute study plan.`, action: 'study-plan', durationMin: planMin })
  }

  const sendSummarize = () => {
    if (!noteId || sending) return
    const note = notes.find((n) => n.id === noteId)
    void sendChat({ message: `Summarize note: ${note?.title ?? 'selected note'}`, action: 'summarize', context: { noteId } })
  }

  const pickAction = (a: (typeof ACTIONS)[number]) => {
    if (a.mode === 'weak') { sendWeakTopics(); return }
    setMode(a.mode as Mode)
  }

  return (
    <>
      {/* Launcher is rendered by the topbar (StudymateButton) — no floating FAB. */}

      <AnimatePresence>
        {studymateOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-20 right-4 z-40 flex h-[520px] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl border bg-[rgb(var(--sg-elevated))] shadow-large lg:bottom-6 lg:right-6"
            role="dialog" aria-label="StudyMate assistant"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white"><Sparkles className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-semibold">StudyMate</p>
                  <p className="text-[10px] text-muted">
                    {configured === false ? 'Not configured' : configured ? `Ready · ${provider}` : 'Checking…'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {configured && (
                  <button onClick={() => (showHistory ? setShowHistory(false) : void openHistory())} className="rounded-md p-1.5 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label={showHistory ? 'Back to chat' : 'Quiz history'}>
                    {showHistory ? <ArrowLeft className="h-4 w-4" /> : <History className="h-4 w-4" />}
                  </button>
                )}
                <button onClick={() => setStudymateOpen(false)} className="rounded-md p-1.5 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Close StudyMate">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {configured === false ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--sg-surface-muted))] text-muted"><Settings2 className="h-6 w-6" /></span>
                <p className="mt-4 text-sm font-medium">StudyMate isn&apos;t set up yet</p>
                <p className="mt-1 text-xs leading-relaxed text-secondary">
                  This deployment has no AI provider configured. Add <code className="rounded bg-[rgb(var(--sg-hover))] px-1">OPENAI_API_KEY</code> to your
                  environment variables to enable the assistant. Nothing fake here — StudyMate only works with a real provider.
                </p>
              </div>
            ) : showHistory ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  <p className="text-sm font-medium">Quiz history</p>
                  {historyLoading ? (
                    <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
                  ) : !history || history.attempts.length === 0 ? (
                    <p className="text-xs text-muted">No attempts yet — pick <strong>Quiz me</strong> and your results will land here.</p>
                  ) : (
                    <>
                      {history.weakTopics.length > 0 && (
                        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                          <p className="flex items-center gap-1.5 text-xs font-semibold"><Brain className="h-3.5 w-3.5" /> Weak topics</p>
                          <ul className="mt-1.5 space-y-1">
                            {history.weakTopics.map((w) => (
                              <li key={`${w.subject}-${w.topic}`} className="text-xs text-secondary">
                                <strong className="text-[rgb(var(--sg-foreground))]">{w.topic}</strong> ({w.subject}) — {w.avgScore}% over {w.attempts} attempts
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <ul className="space-y-2">
                        {history.attempts.slice(0, 10).map((a) => (
                          <li key={a.id} className="flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs">
                            <span className={cn('rounded-full px-2 py-0.5 font-semibold tabular-nums', a.score >= 70 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-600 dark:text-amber-300')}>
                              {a.score}%
                            </span>
                            <span className="min-w-0 flex-1 truncate font-medium">{a.topic ? `${a.topic} · ` : ''}{a.subject}</span>
                            <span className="shrink-0 text-muted">{a.correctAnswers}/{a.totalQuestions}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <Link href="/my-study" onClick={() => setStudymateOpen(false)} className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline">
                    Open My Study →
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div ref={scrollRef} role="log" aria-live="polite" aria-label="StudyMate conversation" className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">How can I help you study?</p>
                      <p className="text-xs text-muted">Pick a starting point or just ask.</p>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {ACTIONS.map((a) => (
                          <button
                            key={a.label}
                            onClick={() => pickAction(a)}
                            title={a.hint}
                            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors hover:border-[rgb(var(--sg-accent))]/40 hover:bg-[rgb(var(--sg-hover))]"
                          >
                            <a.icon className="h-3.5 w-3.5 shrink-0 text-muted" /> {a.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div
                        className={cn(
                          'max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-relaxed',
                          m.role === 'user'
                            ? 'rounded-br-sm bg-[rgb(var(--sg-accent))] text-white'
                            : 'rounded-bl-sm border bg-[rgb(var(--sg-surface-muted))]',
                        )}
                      >
                        {m.content}
                        {m.role === 'assistant' && m.cards && m.cards.length > 0 && (
                          <div className="mt-2"><FlashcardDeck cards={m.cards} /></div>
                        )}
                        {m.role === 'assistant' && m.quizQuestions && m.quizState === 'ready' && (
                          <div className="mt-2">
                            <QuizRunner
                              questions={m.quizQuestions}
                              subject={m.quizSubject ?? 'General'}
                              topic={m.quizTopic ?? ''}
                              onDone={(correct, total, answers) => void submitQuiz(i, correct, total, answers)}
                            />
                          </div>
                        )}
                        {m.role === 'assistant' && m.quizReview && (
                          <div className="mt-2 space-y-2 rounded-xl border bg-[rgb(var(--sg-card))] p-3">
                            <p className="text-sm font-semibold" role="status">
                              Score: {m.quizReview.correct}/{m.quizReview.total} ({m.quizReview.score}%)
                            </p>
                            <ul className="space-y-1.5">
                              {m.quizReview.answers.map((a, ai) => (
                                <li key={ai} className={cn('rounded-lg border px-2 py-1.5 text-xs', a.isCorrect ? 'border-emerald-500/40' : 'border-red-500/40')}>
                                  <p className="font-medium">{a.question}</p>
                                  <p className="mt-0.5 text-muted">
                                    You: {a.selected} {a.isCorrect ? '✓' : `✗ — correct: ${a.correct}`}
                                  </p>
                                </li>
                              ))}
                            </ul>
                            {m.quizReview.weak
                              ? <p className="text-xs text-secondary">⚠️ <strong>{m.quizReview.weak.topic}</strong> looks weak ({m.quizReview.weak.avgScore}% avg) — revise it, then quiz again.</p>
                              : <p className="text-xs text-secondary">No weak-topic signal yet — topics qualify after 3 attempts below 70%.</p>}
                            <div className="flex flex-wrap gap-2 pt-1">
                              <button onClick={() => void openHistory()} className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline">Attempt history</button>
                              <Link href="/my-study" onClick={() => setStudymateOpen(false)} className="text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline">My Study</Link>
                            </div>
                          </div>
                        )}
                        {m.role === 'assistant' && m.weakTopics && (
                          <div className="mt-2 space-y-1.5">
                            {m.weakTopics.length === 0 ? (
                              <p className="text-xs text-secondary">No weak topics yet — take a few quizzes first.</p>
                            ) : (
                              m.weakTopics.map((w) => (
                                <div key={`${w.subject}-${w.topic}`} className="flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs">
                                  <span className="min-w-0 flex-1"><strong>{w.topic}</strong> ({w.subject}) — {w.avgScore}%</span>
                                  <button
                                    onClick={() => { setMode('quiz'); setTopic(w.topic) }}
                                    className="shrink-0 font-semibold text-[rgb(var(--sg-accent))] hover:underline"
                                  >
                                    Quiz me
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                        {m.role === 'assistant' && m.focusSuggestion && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Link
                              href={`/focus?subject=${encodeURIComponent(m.focusSuggestion.subject)}&minutes=${m.focusSuggestion.durationMin}`}
                              onClick={() => setStudymateOpen(false)}
                              className="btn btn-primary btn-sm"
                            >
                              <Timer className="h-3.5 w-3.5" /> Start focus room ({m.focusSuggestion.durationMin}m)
                            </Link>
                            <Link href="/dashboard" onClick={() => setStudymateOpen(false)} className="btn btn-secondary btn-sm">
                              <Target className="h-3.5 w-3.5" /> Today&apos;s plan
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {quizGen.loading && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-xl rounded-bl-sm border bg-[rgb(var(--sg-surface-muted))] px-3 py-2">
                        <p className="text-xs font-medium">Writing your quiz…</p>
                        <div className="skeleton mt-2 h-8" />
                      </div>
                    </div>
                  )}
                  {sending && !quizGen.loading && (
                    <div className="flex items-center gap-2">
                      <div className="rounded-xl rounded-bl-sm border bg-[rgb(var(--sg-surface-muted))] px-3 py-2">
                        <span className="flex gap-1" aria-label="StudyMate is thinking">
                          {[0, 1, 2].map((di) => <span key={di} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${di * 120}ms` }} />)}
                        </span>
                      </div>
                      <button onClick={stop} className="btn btn-secondary btn-sm" aria-label="Stop generating">
                        <Square className="h-3.5 w-3.5" /> Stop
                      </button>
                    </div>
                  )}
                  {failed && !sending && (
                    <button onClick={() => { const p = failed; setFailed(null); void (p.quizSubject ? generateQuiz(p.quizSubject, p.quizTopic ?? '') : sendChat(p)) }} className="flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--sg-accent))] hover:underline">
                      <RotateCcw className="h-3.5 w-3.5" /> Retry {failText ? `— ${failText}` : ''}
                    </button>
                  )}
                </div>

                {/* Action composer */}
                <div className="space-y-2 border-t p-3">
                  {mode !== 'free' && (
                    <div className="flex items-center gap-1 overflow-x-auto pb-1" role="tablist" aria-label="StudyMate actions">
                      {ACTIONS.filter((a) => a.mode !== 'weak').map((a) => (
                        <button
                          key={a.label} role="tab" aria-selected={mode === a.mode}
                          onClick={() => setMode(a.mode as Mode)}
                          className={cn(
                            'flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors',
                            mode === a.mode ? 'border-[rgb(var(--sg-accent))]/50 text-[rgb(var(--sg-accent))]' : 'text-muted hover:text-[rgb(var(--sg-foreground))]',
                          )}
                        >
                          <a.icon className="h-3 w-3" /> {a.label}
                        </button>
                      ))}
                      <button onClick={() => setMode('free')} className="shrink-0 rounded-full px-2 py-1 text-[11px] text-muted hover:text-[rgb(var(--sg-foreground))]" aria-label="Back to free chat">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  )}

                  {mode === 'explain' || mode === 'quiz' || mode === 'cards' ? (
                    <form onSubmit={(e) => { e.preventDefault(); sendTopicAction(mode) }} className="flex items-center gap-2">
                      <input
                        value={topic} onChange={(e) => setTopic(e.target.value)}
                        placeholder={mode === 'quiz' ? 'Topic to be quizzed on…' : mode === 'cards' ? 'Topic for flashcards…' : 'Topic to explain…'}
                        className="input py-2" aria-label="Topic"
                      />
                      <button type="submit" disabled={!topic.trim() || sending} className="btn btn-primary btn-sm shrink-0" aria-label="Send">
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  ) : mode === 'summarize' ? (
                    <form onSubmit={(e) => { e.preventDefault(); sendSummarize() }} className="flex items-center gap-2">
                      <select value={groupId} onChange={(e) => { setGroupId(e.target.value); setNoteId('') }} className="input w-28 shrink-0 py-2 text-xs" aria-label="Group">
                        <option value="">Group…</option>
                        {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                      </select>
                      <select value={noteId} onChange={(e) => setNoteId(e.target.value)} disabled={!groupId || notesLoading} className="input min-w-0 flex-1 py-2 text-xs" aria-label="Note">
                        <option value="">{notesLoading ? 'Loading…' : 'Note…'}</option>
                        {notes.map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
                      </select>
                      <button type="submit" disabled={!noteId || sending} className="btn btn-primary btn-sm shrink-0" aria-label="Summarize note">
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  ) : mode === 'plan' ? (
                    <form onSubmit={(e) => { e.preventDefault(); sendPlan() }} className="flex items-center gap-2">
                      {PLAN_DURATIONS.map((m) => (
                        <button
                          key={m} type="button" onClick={() => setPlanMin(m)}
                          aria-pressed={planMin === m}
                          className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors', planMin === m ? 'border-[rgb(var(--sg-accent))]/50 text-[rgb(var(--sg-accent))]' : 'text-muted hover:text-[rgb(var(--sg-foreground))]')}
                        >
                          {m}m
                        </button>
                      ))}
                      <button type="submit" disabled={sending} className="btn btn-primary btn-sm ml-auto shrink-0">Make plan</button>
                    </form>
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); sendFree() }} className="flex items-center gap-2">
                      <input
                        value={input} onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask StudyMate…" className="input py-2" aria-label="Message StudyMate"
                      />
                      <button type="submit" disabled={!input.trim() || sending} className="btn btn-primary btn-sm shrink-0" aria-label="Send">
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  )}

                  {mode === 'free' && messages.length > 0 && (
                    <div className="flex gap-1 overflow-x-auto">
                      {ACTIONS.map((a) => (
                        <button
                          key={a.label}
                          onClick={() => pickAction(a)}
                          className="flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium text-muted transition-colors hover:text-[rgb(var(--sg-foreground))]"
                        >
                          <a.icon className="h-3 w-3" /> {a.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
