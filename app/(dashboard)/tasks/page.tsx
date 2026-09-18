'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckSquare, Plus, Flag, MessageSquare, X, Repeat } from 'lucide-react'
import { Badge, Button, EmptyState, Input, Modal, Select, Textarea } from '@/components/ui'
import { SkeletonList } from '@/components/ui/Skeleton'
import { api } from '@/lib/client'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'
import type { TaskItem, TaskCommentItem } from '@/types'

const STATUS_LABEL: Record<TaskItem['status'], string> = {
  TODO: 'To Do', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed',
}

type View = 'today' | 'upcoming' | 'completed' | 'all'

function isToday(iso: string | null) {
  if (!iso) return false
  const d = new Date(iso), t = new Date()
  return d.toDateString() === t.toDateString()
}
function isOverdue(t: TaskItem) {
  return Boolean(t.dueDate) && t.status !== 'COMPLETED' && new Date(t.dueDate!) < new Date(new Date().setHours(0, 0, 0, 0))
}

function matchesView(t: TaskItem, view: View): boolean {
  switch (view) {
    case 'today': return isToday(t.dueDate) || isOverdue(t)
    case 'upcoming': return t.status !== 'COMPLETED' && Boolean(t.dueDate) && new Date(t.dueDate!) > new Date(new Date().setHours(23, 59, 59, 999))
    case 'completed': return t.status === 'COMPLETED'
    case 'all': return true
  }
}

export default function TasksPage() {
  const [scope, setScope] = useState<'mine' | 'group'>('mine')
  const [view, setView] = useState<View>('today')
  const [groupId, setGroupId] = useState('ALL')
  const [priority, setPriority] = useState('ALL')
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const searchParams = useSearchParams()
  const [myGroups, setMyGroups] = useState<Array<{ id: string; name: string }>>([])
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'MEDIUM', groupId: '', isRecurring: false })
  const [saving, setSaving] = useState(false)
  const [detail, setDetail] = useState<TaskItem | null>(null)
  const [comments, setComments] = useState<TaskCommentItem[] | null>(null)
  const [commentBody, setCommentBody] = useState('')
  const [postingComment, setPostingComment] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ scope, pageSize: '60' })
    if (scope === 'group' && groupId !== 'ALL') params.set('groupId', groupId)
    if (priority !== 'ALL') params.set('priority', priority)
    if (view === 'completed') params.set('status', 'COMPLETED')
    if (view === 'today') params.set('status', 'ALL')
    api.get<{ tasks: TaskItem[] }>(`/api/tasks?${params}`)
      .then((d) => setTasks(d.tasks.filter((t) => matchesView(t, view))))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [scope, view, groupId, priority])

  useEffect(() => { load() }, [load])
  // Deep link: /tasks?create=1 opens the composer
  useEffect(() => {
    if (searchParams.get('create') === '1') setCreateOpen(true)
  }, [searchParams])
  useEffect(() => {
    api.get<{ groups: Array<{ id: string; name: string }> }>('/api/groups?mine=1&pageSize=24')
      .then((d) => setMyGroups(d.groups))
      .catch(() => {})
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/tasks', {
        title: form.title,
        description: form.description,
        priority: form.priority,
        groupId: form.groupId || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        isRecurring: form.isRecurring,
        recurrenceRule: form.isRecurring ? 'DAILY' : null,
      })
      setCreateOpen(false)
      setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM', groupId: '', isRecurring: false })
      load()
    } finally {
      setSaving(false)
    }
  }

  const update = async (id: string, patch: Record<string, unknown>) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? ({ ...t, ...patch } as TaskItem) : t)))
    try {
      await api.patch(`/api/tasks/${id}`, patch)
      if (patch.status === 'COMPLETED') toast.success('Task completed.')
    } catch {
      toast.error('Could not update the task. Reverted to its previous state.')
      load()
    }
    // Recurring daily task: completing it spawns the next day's instance
    const t = tasks.find((x) => x.id === id)
    if (t?.isRecurring && patch.status === 'COMPLETED' && t.groupId) {
      api.post('/api/tasks', {
        title: t.title,
        description: t.description,
        priority: t.priority,
        groupId: t.groupId,
        dueDate: new Date(Date.now() + 864e5).toISOString(),
        isRecurring: true,
        recurrenceRule: 'DAILY',
      }).catch(() => {})
    }
  }

  const openDetail = async (t: TaskItem) => {
    setDetail(t)
    setComments(null)
    setCommentBody('')
    api.get<{ comments: TaskCommentItem[] }>(`/api/tasks/${t.id}/comments`)
      .then((d) => setComments(d.comments))
      .catch(() => setComments([]))
  }

  const postComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!detail || !commentBody.trim()) return
    setPostingComment(true)
    try {
      const d = await api.post<{ comment: TaskCommentItem }>(`/api/tasks/${detail.id}/comments`, { content: commentBody.trim() })
      setComments((c) => [...(c ?? []), d.comment])
      setCommentBody('')
    } catch { /* shown via disabled state */ } finally {
      setPostingComment(false)
    }
  }

  const shown = tasks.filter((t) => matchesView(t, view))

  return (
    <div className="section-container space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="mt-1 text-sm text-secondary">Personal and group tasks, all in one board.</p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> New task</button>
      </div>

      {/* Scope + views + filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border p-0.5">
          {(['mine', 'group'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                scope === s ? 'bg-indigo-600 text-white' : 'text-secondary hover:bg-[rgb(var(--sg-hover))]'
              )}
            >
              {s === 'mine' ? 'My Tasks' : 'Group Tasks'}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border p-0.5">
          {([['today', 'Today'], ['upcoming', 'Upcoming'], ['completed', 'Completed'], ['all', 'All']] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                view === v ? 'bg-[rgb(var(--sg-surface-muted))] text-primary' : 'text-muted hover:text-secondary'
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {scope === 'group' && (
          <select value={groupId} onChange={(e) => setGroupId(e.target.value)} className="input w-auto py-2 text-sm" aria-label="Filter by group">
            <option value="ALL">All groups</option>
            {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        )}
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="input w-auto py-2 text-sm" aria-label="Filter by priority">
          <option value="ALL">All priorities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {loading ? (
        <SkeletonList rows={6} />
      ) : shown.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CheckSquare} title={view === 'today' ? 'Nothing due today' : view === 'completed' ? 'No completed tasks yet' : 'No tasks here'}
            description={view === 'today' ? 'Your today and overdue lists are clear — enjoy the breathing room.' : scope === 'mine' ? 'Create a personal task or pick one up from a group.' : 'No group tasks match the filters.'}
            action={view !== 'completed' ? <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm">Create a task</button> : undefined}
          />
        </div>
      ) : (
        <div className="card divide-y p-0">
          {shown.map((t) => {
            const overdue = isOverdue(t)
            return (
              <div key={t.id} className="flex items-center gap-3 p-4">
                <button
                  onClick={() => update(t.id, { status: t.status === 'COMPLETED' ? 'TODO' : 'COMPLETED', progress: t.status === 'COMPLETED' ? 0 : 100 })}
                  className={cn(
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                    t.status === 'COMPLETED' ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-[rgb(var(--sg-border))] hover:border-emerald-500'
                  )}
                  aria-label={t.status === 'COMPLETED' ? `Reopen “${t.title}”` : `Complete “${t.title}”`}
                >
                  {t.status === 'COMPLETED' && <span className="text-[10px]">✓</span>}
                </button>
                <button onClick={() => openDetail(t)} className="min-w-0 flex-1 text-left" aria-label={`Open details for ${t.title}`}>
                  <p className={cn('truncate text-sm font-medium', t.status === 'COMPLETED' && 'text-muted line-through')}>
                    {t.isRecurring && <Repeat className="mr-1 inline h-3.5 w-3.5 text-muted" aria-label="recurring" />}
                    {t.title}
                  </p>
                  <p className="text-xs text-muted">
                    {t.group ? `${t.group.name} · ` : 'Personal'}
                    {t.dueDate ? `due ${new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : 'no due date'}
                    {t.assignee ? ` · ${t.assignee.name}` : ''}
                  </p>
                </button>
                {overdue && <Badge tone="danger">Overdue</Badge>}
                <Badge tone={t.priority === 'HIGH' ? 'danger' : t.priority === 'MEDIUM' ? 'warning' : 'muted'} aria-label={`${t.priority.toLowerCase()} priority`}>
                  <Flag className="h-3 w-3" />
                </Badge>
                <Badge tone={t.status === 'COMPLETED' ? 'success' : 'muted'} className="hidden sm:inline-flex">{STATUS_LABEL[t.status]}</Badge>
                <button
                  onClick={() => openDetail(t)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-[rgb(var(--sg-hover))] hover:text-secondary"
                  aria-label={`Comments and activity for ${t.title}`}
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Details + comments modal */}
      <Modal isOpen={detail !== null} onClose={() => setDetail(null)} title={detail?.title ?? ''}>
        {detail && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone={detail.priority === 'HIGH' ? 'danger' : detail.priority === 'MEDIUM' ? 'warning' : 'muted'}>{detail.priority.toLowerCase()} priority</Badge>
              <Badge tone={detail.status === 'COMPLETED' ? 'success' : 'muted'}>{STATUS_LABEL[detail.status]}</Badge>
              {detail.dueDate && <Badge tone="muted">due {new Date(detail.dueDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</Badge>}
              {detail.group && <Badge tone="muted">{detail.group.name}</Badge>}
            </div>
            {detail.description && <p className="text-sm leading-relaxed text-secondary">{detail.description}</p>}
            <div className="flex items-center gap-2 text-xs text-muted">
              <span>Created by {detail.creator?.name ?? 'Unknown'}</span>
              {detail.assignee && <span>· assigned to {detail.assignee.name}</span>}
            </div>
            {detail.status !== 'COMPLETED' && (
              <div className="flex gap-2">
                {detail.status === 'TODO' && (
                  <Button size="sm" variant="secondary" onClick={() => { update(detail.id, { status: 'IN_PROGRESS' }); setDetail({ ...detail, status: 'IN_PROGRESS' }) }}>Start</Button>
                )}
                <Button size="sm" onClick={() => { update(detail.id, { status: 'COMPLETED', progress: 100 }); setDetail({ ...detail, status: 'COMPLETED' }) }}>Mark completed</Button>
              </div>
            )}

            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-semibold">Activity</h3>
              {comments === null ? (
                <p className="text-sm text-muted">Loading…</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-muted">No comments yet.</p>
              ) : (
                <ul className="mb-4 max-h-52 space-y-3 overflow-y-auto pr-1">
                  {comments.map((c) => (
                    <li key={c.id} className="flex gap-2.5">
                      {c.author.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.author.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300">{c.author.name[0]}</span>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs"><span className="font-medium">{c.author.name}</span> <span className="text-muted">{new Date(c.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span></p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-secondary">{c.body}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <form onSubmit={postComment} className="flex gap-2">
                <input
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Write a comment…"
                  className="input text-sm"
                  aria-label="Write a comment"
                />
                <Button size="sm" type="submit" isLoading={postingComment} disabled={!commentBody.trim() || postingComment}>Send</Button>
              </form>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New task">
        <form onSubmit={create} className="space-y-4">
          <Input label="Task" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required minLength={2} />
          <Textarea label="Description (optional)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Due date" type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
            <Select label="Priority" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
              <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
            </Select>
          </div>
          <Select label="Group (optional)" value={form.groupId} onChange={(e) => setForm((p) => ({ ...p, groupId: e.target.value }))}>
            <option value="">Personal task</option>
            {myGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </Select>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm((p) => ({ ...p, isRecurring: e.target.checked }))} className="h-4 w-4 rounded" />
            <span className="inline-flex items-center gap-1.5"><Repeat className="h-3.5 w-3.5" /> Recurs daily until completed again</span>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <Button type="submit" isLoading={saving} disabled={saving || form.title.trim().length < 2}>Create task</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
