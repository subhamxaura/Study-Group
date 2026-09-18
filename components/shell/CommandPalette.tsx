'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, Users, User, BookOpen, MessageCircle, CheckSquare, Calendar, CornerDownLeft } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { useUIStore } from '@/lib/store'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'

interface SearchResults {
  groups: Array<{ id: string; name: string; subject: string; _count?: { members: number } }>
  people: Array<{ id: string; name: string; university: string | null }>
  resources: Array<{ id: string; title: string; type: string; group: { name: string } | null }>
  messages: Array<{ id: string; content: string; groupId: string; group: { name: string } }>
  tasks: Array<{ id: string; title: string; status: string; groupId: string | null }>
  sessions: Array<{ id: string; title: string; startsAt: string; group: { name: string } | null }>
}

const EMPTY: SearchResults = { groups: [], people: [], resources: [], messages: [], tasks: [], sessions: [] }

export function CommandPalette() {
  const router = useRouter()
  const { commandOpen, setCommandOpen } = useUIStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults>(EMPTY)
  const [searching, setSearching] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (commandOpen) {
      setQuery(''); setResults(EMPTY); setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [commandOpen])

  // Debounced search — one request per 250ms pause, not per keystroke
  useEffect(() => {
    if (!commandOpen) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) { setResults(EMPTY); setSearching(false); return }
    setSearching(true)
    debounceRef.current = setTimeout(() => {
      api.get<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`)
        .then((d) => setResults({ ...EMPTY, ...d }))
        .catch(() => setResults(EMPTY))
        .finally(() => setSearching(false))
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, commandOpen])

  const flatItems = useCallback(() => {
    const items: Array<{ id: string; label: string; hint?: string; href: string; category: string }> = []
    results.groups.forEach((g) => items.push({ id: `g-${g.id}`, label: g.name, hint: g.subject, href: `/groups/${g.id}`, category: 'Groups' }))
    results.people.forEach((p) => items.push({ id: `p-${p.id}`, label: p.name, hint: p.university ?? undefined, href: `/profile/${p.id}`, category: 'People' }))
    results.resources.forEach((r) => items.push({ id: `r-${r.id}`, label: r.title, hint: r.group?.name, href: r.group ? `/groups/${r.group.name}/resources` : '/resources', category: 'Resources' }))
    results.messages.forEach((m) => items.push({ id: `m-${m.id}`, label: m.content.slice(0, 60), hint: m.group.name, href: `/groups/${m.groupId}/chat`, category: 'Messages' }))
    results.tasks.forEach((t) => items.push({ id: `t-${t.id}`, label: t.title, hint: t.status.toLowerCase(), href: '/tasks', category: 'Tasks' }))
    results.sessions.forEach((s) => items.push({ id: `s-${s.id}`, label: s.title, hint: new Date(s.startsAt).toLocaleDateString(), href: '/calendar', category: 'Sessions' }))
    return items
  }, [results])

  const items = flatItems()

  const go = useCallback((href: string) => {
    setCommandOpen(false)
    router.push(href)
  }, [router, setCommandOpen])

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex((i) => Math.min(i + 1, items.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIndex((i) => Math.max(i - 1, 0)) }
    if (e.key === 'Enter' && items[activeIndex]) { e.preventDefault(); go(items[activeIndex].href) }
  }

  const categoryIcon: Record<string, React.ReactNode> = {
    Groups: <Users className="h-4 w-4" />, People: <User className="h-4 w-4" />,
    Resources: <BookOpen className="h-4 w-4" />, Messages: <MessageCircle className="h-4 w-4" />,
    Tasks: <CheckSquare className="h-4 w-4" />, Sessions: <Calendar className="h-4 w-4" />,
  }

  let lastCategory = ''

  return (
    <Modal isOpen={commandOpen} onClose={() => setCommandOpen(false)} showCloseButton={false} size="lg" className="overflow-visible">
      <div onKeyDown={onKeyDown}>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups, people, resources, messages, tasks…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            aria-label="Search"
            role="combobox"
            aria-expanded={items.length > 0}
            aria-controls="command-list"
          />
          <kbd className="rounded bg-[rgb(var(--sg-hover))] px-1.5 py-0.5 text-[10px] text-muted">ESC</kbd>
        </div>
        <div id="command-list" role="listbox" className="max-h-[380px] overflow-y-auto p-2">
          {query.trim().length < 2 && (
            <p className="px-3 py-8 text-center text-sm text-muted">
              Type at least 2 characters to search across your workspace.
            </p>
          )}
          {query.trim().length >= 2 && items.length === 0 && !searching && (
            <p className="px-3 py-8 text-center text-sm text-muted">No results for “{query.trim()}”.</p>
          )}
          {searching && items.length === 0 && (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((i) => <div key={i} className="skeleton h-10 w-full" />)}
            </div>
          )}
          {items.map((item, idx) => {
            const showCategory = item.category !== lastCategory
            lastCategory = item.category
            return (
              <div key={item.id}>
                {showCategory && (
                  <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted">{item.category}</p>
                )}
                <button
                  role="option" aria-selected={idx === activeIndex}
                  onClick={() => go(item.href)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    idx === activeIndex ? 'bg-[rgb(var(--sg-accent-soft))] text-[rgb(var(--sg-foreground))]' : 'hover:bg-[rgb(var(--sg-hover))]'
                  )}
                >
                  <span className="text-muted">{categoryIcon[item.category]}</span>
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.hint && <span className="shrink-0 text-xs text-muted">{item.hint}</span>}
                  {idx === activeIndex && <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted" />}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
