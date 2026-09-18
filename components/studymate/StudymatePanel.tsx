'use client'
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send, Settings2, BookOpen, ListChecks, FileText, HelpCircle } from 'lucide-react'
import { api } from '@/lib/client'
import { useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'

interface Msg { role: 'user' | 'assistant'; content: string }

const QUICK_ACTIONS = [
  { label: 'Explain a concept', prompt: 'Explain this concept in simple terms with an example: ' },
  { label: 'Quiz me', prompt: 'Create 5 quiz questions (with answers) about: ' },
  { label: 'Summarize notes', prompt: 'Summarize the following notes into tight bullet points:\n\n' },
  { label: 'Make flashcards', prompt: 'Create flashcards (Q/A pairs) from this material:\n\n' },
  { label: 'Practice questions', prompt: 'Generate practice questions of increasing difficulty about: ' },
  { label: 'Study plan', prompt: 'Create a 7-day study plan for: ' },
]

export function StudymatePanel() {
  const { studymateOpen, setStudymateOpen } = useUIStore()
  const [configured, setConfigured] = useState<boolean | null>(null)
  const [provider, setProvider] = useState('openai')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.get<{ configured: boolean; provider: string }>('/api/ai/chat')
      .then((d) => { setConfigured(d.configured); setProvider(d.provider) })
      .catch(() => setConfigured(false))
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', content: trimmed }])
    setSending(true)
    try {
      const d = await api.post<{ conversationId: string; reply: string }>('/api/ai/chat', {
        conversationId,
        message: trimmed,
      })
      setConversationId(d.conversationId)
      setMessages((m) => [...m, { role: 'assistant', content: d.reply }])
    } catch (err) {
      setMessages((m) => [...m, {
        role: 'assistant',
        content: err instanceof Error ? err.message : 'Something went wrong. Please try again.',
      }])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setStudymateOpen(!studymateOpen)}
        className="fixed bottom-20 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-[rgb(var(--sg-accent))] text-white shadow-large transition-transform hover:scale-105 active:scale-95 lg:bottom-6 lg:right-6"
        aria-label={studymateOpen ? 'Close StudyMate' : 'Open StudyMate AI assistant'}
      >
        {studymateOpen ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {studymateOpen && (
          <motion.aside
            initial={{ opacity: 0, y: 16, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="fixed bottom-36 right-4 z-40 flex h-[520px] w-[380px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl border bg-[rgb(var(--sg-card))] shadow-large lg:bottom-24 lg:right-6"
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
              <button onClick={() => setStudymateOpen(false)} className="rounded-md p-1.5 text-muted hover:bg-[rgb(var(--sg-hover))]" aria-label="Close StudyMate">
                <X className="h-4 w-4" />
              </button>
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
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                  {messages.length === 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">How can I help you study?</p>
                      <p className="text-xs text-muted">Pick a starting point or just ask.</p>
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        {QUICK_ACTIONS.map((a) => (
                          <button
                            key={a.label}
                            onClick={() => setInput(a.prompt)}
                            className="flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-left text-xs font-medium transition-colors hover:border-[rgb(var(--sg-accent))]/40 hover:bg-[rgb(var(--sg-hover))]"
                          >
                            {a.label}
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
                            : 'rounded-bl-sm border bg-[rgb(var(--sg-surface-muted))]'
                        )}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                  {sending && (
                    <div className="flex justify-start">
                      <div className="rounded-xl rounded-bl-sm border bg-[rgb(var(--sg-surface-muted))] px-3 py-2">
                        <span className="flex gap-1">
                          {[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" style={{ animationDelay: `${i * 120}ms` }} />)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <form
                  onSubmit={(e) => { e.preventDefault(); send(input) }}
                  className="flex items-center gap-2 border-t p-3"
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask StudyMate…"
                    className="input py-2"
                    aria-label="Message StudyMate"
                  />
                  <button type="submit" disabled={!input.trim() || sending} className="btn btn-primary btn-sm shrink-0" aria-label="Send">
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </>
            )}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
