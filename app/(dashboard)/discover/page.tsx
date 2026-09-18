'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Users, MessageCircle, Calendar, Plus, Compass, Filter, X, Flame, Sparkles, Activity, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState, Badge, Button } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { Modal, Input, Textarea, Select } from '@/components/ui'
import { useSession } from '@/lib/store'
import { api } from '@/lib/client'
import { toast } from '@/components/ui/Toast'
import type { DiscoverGroup, DiscoverSectionGroup } from '@/types'

const SUBJECTS = ['General', 'Mathematics', 'Physics', 'Computer Science', 'Chemistry', 'Biology', 'Economics', 'Literature', 'History', 'Engineering']
const DIFFICULTIES = [
  { value: '', label: 'Any difficulty' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
]
const SIZES = [
  { value: '', label: 'Any size' },
  { value: 'small', label: 'Small (≤5)' },
  { value: 'medium', label: 'Medium (6–15)' },
  { value: 'large', label: 'Large (15+)' },
]

type CardGroup = DiscoverGroup | DiscoverSectionGroup

function GroupCard({ g, onJoin, joining }: {
  g: CardGroup
  onJoin: (id: string) => void
  joining: string | null
}) {
  const isMember = 'myRole' in g ? g.myRole !== null : g.joined
  return (
    <div className="card-hover flex flex-col overflow-hidden rounded-xl border">
      <div className="flex h-24 items-center justify-center border-b bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-500/10 dark:to-violet-500/10">
        {g.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={g.avatarUrl} alt="" loading="lazy" className="h-full w-full object-cover opacity-90" />
        ) : (
          <span className="text-3xl font-bold text-indigo-300 dark:text-indigo-400/60">{g.name[0]}</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-tight">{g.name}</h3>
          {!g.isPublic && <Badge tone="muted">Private</Badge>}
        </div>
        <p className="mt-0.5 text-xs text-muted">{g.subject}{g.university ? ` · ${g.university}` : ''}{g.difficulty ? ` · ${g.difficulty}` : ''}</p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-secondary">{g.description || 'No description yet.'}</p>
        {g.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {g.tags.slice(0, 3).map((t) => <span key={t} className="rounded-full bg-[rgb(var(--sg-surface-muted))] px-2 py-0.5 text-[10px] text-muted">#{t}</span>)}
          </div>
        )}
        <div className="mt-3 flex items-center gap-3 border-t pt-3 text-xs text-muted">
          <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{g.memberCount}</span>
          {'weeklyMessages' in g ? (
            <span className="inline-flex items-center gap-1"><Activity className="h-3.5 w-3.5" />{g.weeklyMessages} msg{g.weeklyMessages === 1 ? '' : 's'} this week</span>
          ) : (
            <>
              <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{g.messageCount}</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{g.sessionCount}</span>
            </>
          )}
        </div>
        <div className="mt-3">
          {isMember ? (
            <a href={`/groups/${g.id}`} className="btn btn-secondary w-full btn-sm">Open group</a>
          ) : (
            <button onClick={() => onJoin(g.id)} disabled={joining === g.id} className="btn btn-primary w-full btn-sm">
              {joining === g.id ? 'Joining…' : 'Join group'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DiscoverPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSession()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState('')
  const [difficulty, setDifficulty] = useState('')
  const [size, setSize] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [groups, setGroups] = useState<DiscoverGroup[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1')

  // Personalized sections (idle state, when no search/filter is active)
  const [sections, setSections] = useState<{
    recommended: DiscoverSectionGroup[]
    trending: DiscoverSectionGroup[]
    recentlyActive: DiscoverSectionGroup[]
    newest: DiscoverSectionGroup[]
    hasSubjects: boolean
  } | null>(null)
  const isSearching = Boolean(query.trim() || subject || difficulty || size)

  // Create group form
  const [form, setForm] = useState({ name: '', description: '', subject: 'General', university: '', isPublic: true })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '18' })
    if (query.trim()) params.set('q', query.trim())
    if (subject) params.set('subject', subject)
    if (difficulty) params.set('difficulty', difficulty)
    if (size) params.set('size', size)
    api.get<{ groups: DiscoverGroup[]; total: number; totalPages: number }>(`/api/groups?${params}`)
      .then((d) => { setGroups(d.groups); setTotal(d.total); setTotalPages(d.totalPages) })
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [query, subject, difficulty, size, page])

  // Debounced search — only fetch the grid while searching (sections handle the idle view)
  useEffect(() => {
    if (!isSearching) return
    const t = setTimeout(load, query ? 300 : 0)
    return () => clearTimeout(t)
  }, [load, query, isSearching])

  const loadSections = useCallback(() => {
    setLoading(true)
    api.get<{ recommended: DiscoverSectionGroup[]; trending: DiscoverSectionGroup[]; recentlyActive: DiscoverSectionGroup[]; newest: DiscoverSectionGroup[]; hasSubjects: boolean }>('/api/discover')
      .then(setSections)
      .catch(() => setSections(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!isSearching) loadSections()
  }, [isSearching, loadSections])

  const join = async (id: string) => {
    setJoining(id)
    try {
      await api.post(`/api/groups/${id}/join`)
      toast.success('Group joined — it now appears in My Groups.')
      if (isSearching) load()
      else loadSections()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to join the group. Please try again.')
    } finally {
      setJoining(null)
    }
  }

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true); setCreateError('')
    try {
      const d = await api.post<{ group: { id: string } }>('/api/groups', {
        name: form.name,
        description: form.description,
        subject: form.subject,
        university: form.university,
        isPublic: form.isPublic,
        tags: [],
      })
      setCreateOpen(false)
      router.push(`/groups/${d.group.id}`)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Could not create group')
    } finally {
      setCreating(false)
    }
  }

  const hasFilters = subject || difficulty || size

  return (
    <div className="section-container space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Discover groups</h1>
          <p className="mt-1 text-sm text-secondary">Find study groups by subject, university or course.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> Create group</button>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPage(1) }}
              placeholder="Search subjects, topics, universities or groups…"
              className="input pl-9"
              aria-label="Search groups"
            />
          </div>
          <button
            onClick={() => setShowFilters((s) => !s)}
            className={`btn btn-secondary btn-sm shrink-0 ${hasFilters ? 'border-indigo-300 text-indigo-600 dark:text-indigo-300' : ''}`}
            aria-expanded={showFilters}
          >
            <Filter className="h-4 w-4" /> Filters {hasFilters && <X className="h-3 w-3" />}
          </button>
        </div>
        {showFilters && (
          <div className="card grid gap-3 p-4 sm:grid-cols-3">
            <Select label="Subject" value={subject} onChange={(e) => { setSubject(e.target.value); setPage(1) }}>
              <option value="">All subjects</option>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select label="Difficulty" value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1) }}>
              {DIFFICULTIES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </Select>
            <Select label="Group size" value={size} onChange={(e) => { setSize(e.target.value); setPage(1) }}>
              {SIZES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </Select>
          </div>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
        </div>
      ) : isSearching ? (
        groups.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Compass} title="No groups found"
              description="Try different filters or search terms."
              action={<button onClick={() => { setQuery(''); setSubject(''); setDifficulty(''); setSize('') }} className="btn btn-secondary btn-sm">Clear search</button>}
            />
          </div>
        ) : (
          <section>
            <h2 className="mb-3 text-base font-semibold">{total} group{total === 1 ? '' : 's'}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {groups.map((g) => <GroupCard key={g.id} g={g} onJoin={join} joining={joining} />)}
            </div>
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-3">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm">Previous</button>
                <span className="text-sm text-muted">Page {page} of {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn btn-secondary btn-sm">Next</button>
              </div>
            )}
          </section>
        )
      ) : sections && (
        sections.recommended.length + sections.trending.length + sections.recentlyActive.length + sections.newest.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={Compass} title="No public groups yet"
              description="Be the first to create a group in your subject."
              action={<button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm">Create the first group</button>}
            />
          </div>
        ) : (
          <>
            {!sections.hasSubjects && (
              <p className="text-sm text-muted">
                Add subjects in <a href="/settings" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">Settings</a> to get personalized recommendations.
              </p>
            )}
            {([
              { key: 'trending', title: 'Trending this week', icon: Flame, items: sections.trending },
              { key: 'recommended', title: 'Recommended for you', icon: Sparkles, items: sections.recommended },
              { key: 'recentlyActive', title: 'Recently active', icon: Activity, items: sections.recentlyActive },
              { key: 'newest', title: 'New groups', icon: Clock, items: sections.newest },
            ] as const).map(({ key, title, icon: Icon, items }) =>
              items.length > 0 ? (
                <section key={key}>
                  <h2 className="mb-3 flex items-center gap-2 text-base font-semibold"><Icon className="h-4 w-4 text-muted" /> {title}</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((g) => <GroupCard key={key + g.id} g={g} onJoin={join} joining={joining} />)}
                  </div>
                </section>
              ) : null,
            )}
          </>
        )
      )}

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Create a study group" description="You'll be the owner — you can invite classmates after.">
        <form onSubmit={createGroup} className="space-y-4">
          <Input label="Group name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required minLength={3} maxLength={80} placeholder="e.g. Linear Algebra Spring '27" />
          <Select label="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}>
            {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
          <Input label="University (optional)" value={form.university} onChange={(e) => setForm((p) => ({ ...p, university: e.target.value }))} placeholder="Your university" />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="What will this group focus on?" maxLength={500} />
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} className="h-4 w-4 rounded" />
            Public — anyone can find and join this group
          </label>
          {createError && <p className="text-sm text-red-600 dark:text-red-400" role="alert">{createError}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <Button type="submit" isLoading={creating} disabled={creating || form.name.trim().length < 3}>Create group</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
