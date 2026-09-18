'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Users, Calendar, BookOpen, MessageCircle, Pin, Activity, Settings,
  CheckSquare, FileText, Plus, UserPlus, ShieldCheck, Crown,
} from 'lucide-react'
import { Avatar, AvatarGroup, Badge, Button, EmptyState, Tabs } from '@/components/ui'
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton'
import { Modal, Input, Textarea, Select, ConfirmModal } from '@/components/ui'
import { useSession } from '@/lib/store'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import { SessionDetailsModal } from '@/components/sessions/SessionDetailsModal'
import type { GroupDetail, TaskItem, ResourceItem, NoteItem, MemberItem, SessionItem } from '@/types'

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'discussion', label: 'Discussion' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'resources', label: 'Resources' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'notes', label: 'Notes' },
  { key: 'members', label: 'Members' },
]

export default function GroupWorkspace() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string
  const { user } = useSession()

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [restricted, setRestricted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [onlineCount, setOnlineCount] = useState(0)
  const [joinError, setJoinError] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    api.get<{ group: GroupDetail; myRole: string | null; restricted: boolean }>(`/api/groups/${groupId}`)
      .then((d) => { setGroup(d.group); setMyRole(d.myRole); setRestricted(d.restricted) })
      .catch(() => setGroup(null))
      .finally(() => setLoading(false))
  }, [groupId])

  useEffect(() => { load() }, [load])

  const isMember = myRole !== null
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN'

  const join = async () => {
    setJoinError('')
    try {
      await api.post(`/api/groups/${groupId}/join`)
      load()
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : 'Could not join')
    }
  }

  if (loading) {
    return (
      <div className="section-container space-y-4">
        <div className="skeleton h-28 rounded-xl" />
        <div className="skeleton h-10 w-full max-w-xl" />
        <SkeletonList rows={3} />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="section-container">
        <EmptyState icon={Users} title="Group not found" description="It may have been deleted, or the link is wrong." action={<Link href="/discover" className="btn btn-primary btn-sm">Browse groups</Link>} />
      </div>
    )
  }

  if (restricted) {
    return (
      <div className="section-container max-w-xl">
        <div className="card p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300"><ShieldCheck className="h-6 w-6" /></span>
          <h1 className="mt-4 text-lg font-semibold">{group.name}</h1>
          <p className="mt-1 text-sm text-secondary">{group.description}</p>
          <p className="mt-4 text-sm text-muted">This is a private group. Join to see discussions, resources and sessions.</p>
          <button onClick={join} className="btn btn-primary mt-4">Request to join</button>
          {joinError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{joinError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Group header */}
      <div className="card p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-lg font-bold text-white">
            {group.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={group.avatarUrl} alt="" className="h-full w-full rounded-xl object-cover" />
            ) : group.name[0]}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">{group.name}</h1>
              {!group.isPublic && <Badge tone="muted">Private</Badge>}
              {myRole === 'OWNER' && <Badge><Crown className="h-3 w-3" /> Owner</Badge>}
              {myRole === 'ADMIN' && <Badge tone="muted">Admin</Badge>}
            </div>
            <p className="mt-1 text-sm text-secondary">{group.description}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{group.memberCount} members</span>
              {onlineCount > 0 && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{onlineCount} online</span>}
              <span>· {group.subject}</span>
              {group.university && <span>· {group.university}</span>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {isMember ? (
              <>
                <Link href={`/groups/${groupId}/chat`} className="btn btn-primary btn-sm"><MessageCircle className="h-4 w-4" /> Open discussion</Link>
                {(myRole === 'OWNER' || myRole === 'ADMIN') && (
                  <Link href={`/groups/${groupId}/settings`} className="btn btn-secondary btn-sm"><Settings className="h-4 w-4" /> Manage</Link>
                )}
              </>
            ) : (
              <button onClick={join} className="btn btn-primary btn-sm">Join group</button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-5">
        <Tabs items={TABS} active={tab} onChange={setTab} />
      </div>

      {/* Tab content */}
      <div className="mt-5">
        {tab === 'overview' && <GroupOverview groupId={groupId} group={group} canManage={canManage} onOpenTab={setTab} />}
        {tab === 'discussion' && group && <GroupDiscussion groupId={groupId} isMember={isMember} members={group.members} onOnline={setOnlineCount} />}
        {tab === 'tasks' && <GroupTasks groupId={groupId} isMember={isMember} members={group.members} />}
        {tab === 'resources' && <GroupResources groupId={groupId} isMember={isMember} />}
        {tab === 'calendar' && <GroupCalendar groupId={groupId} isMember={isMember} />}
        {tab === 'notes' && <GroupNotes groupId={groupId} isMember={isMember} />}
        {tab === 'members' && <GroupMembers groupId={groupId} members={group.members} myRole={myRole} reload={load} />}
      </div>
    </div>
  )
}

// ---------------- Overview ----------------

function GroupOverview({ groupId, group, canManage, onOpenTab }: {
  groupId: string; group: GroupDetail; canManage: boolean; onOpenTab: (t: string) => void
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_0.9fr]">
      <div className="space-y-4">
        {group.pinnedAnnouncement ? (
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white"><Pin className="h-4 w-4" /></span>
            <div>
              <p className="text-sm font-semibold">Pinned announcement</p>
              <p className="mt-1 text-sm text-secondary">{group.pinnedAnnouncement}</p>
            </div>
          </div>
        ) : canManage && (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted">
            No announcement pinned. Pin one from <Link href={`/groups/${groupId}/settings`} className="font-medium text-indigo-600 dark:text-indigo-400">group settings</Link>.
          </p>
        )}

        <div className="card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-muted" /> Recent discussion</h3>
          <div className="mt-3 space-y-2.5">
            {group.recentMessages.length === 0 ? (
              <p className="text-sm text-muted">No messages yet — start the conversation.</p>
            ) : (
              group.recentMessages.map((m) => (
                <div key={m.id} className="flex gap-2.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {m.user.name[0]}
                  </span>
                  <p className="min-w-0 flex-1 text-sm text-secondary">
                    <span className="font-medium text-[rgb(var(--sg-foreground))]">{m.user.name}</span>{' '}
                    {m.content.slice(0, 90)}{m.content.length > 90 ? '…' : ''}
                    <span className="ml-1 text-xs text-muted">· {new Date(m.createdAt).toLocaleDateString()}</span>
                  </p>
                </div>
              ))
            )}
          </div>
          <button onClick={() => onOpenTab('discussion')} className="mt-3 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">Open discussion →</button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><Calendar className="h-4 w-4 text-muted" /> Next sessions</h3>
          <div className="mt-3 space-y-2">
            {group.upcomingSessions.length === 0 ? (
              <p className="text-sm text-muted">No upcoming sessions.</p>
            ) : (
              group.upcomingSessions.map((s) => (
                <div key={s.id} className="rounded-lg border p-2.5">
                  <p className="truncate text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted">{new Date(s.startsAt).toLocaleString()} · {s.goingCount} going</p>
                </div>
              ))
            )}
          </div>
          <button onClick={() => onOpenTab('calendar')} className="mt-3 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">View calendar →</button>
        </div>

        <div className="card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><BookOpen className="h-4 w-4 text-muted" /> Recent resources</h3>
          <div className="mt-3 space-y-2">
            {group.recentResources.length === 0 ? (
              <p className="text-sm text-muted">No resources shared yet.</p>
            ) : (
              group.recentResources.map((r) => (
                <div key={r.id} className="rounded-lg border p-2.5">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted">{r.type.toLowerCase()} · shared by {r.uploader.name}</p>
                </div>
              ))
            )}
          </div>
          <button onClick={() => onOpenTab('resources')} className="mt-3 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">Browse resources →</button>
        </div>
      </div>
    </div>
  )
}

// ---------------- Discussion (inline chat tab) ----------------

import { ChatWindow } from '@/components/chat/ChatWindow'

function GroupDiscussion({ groupId, isMember, members, onOnline }: { groupId: string; isMember: boolean; members: GroupDetail['members']; onOnline: (n: number) => void }) {
  if (!isMember) return <EmptyState icon={MessageCircle} title="Members only" description="Join the group to see the discussion." />
  const chatMembers = members.map((m) => m.user)
  return <ChatWindow groupId={groupId} members={chatMembers.map((u) => ({ user: u }))} onOnlineChange={onOnline} />
}

// ---------------- Tasks ----------------

function GroupTasks({ groupId, isMember, members }: { groupId: string; isMember: boolean; members: GroupDetail['members'] }) {
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', priority: 'MEDIUM', assigneeId: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get<{ tasks: TaskItem[] }>(`/api/tasks?scope=group&groupId=${groupId}&pageSize=50`)
      .then((d) => setTasks(d.tasks))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId])

  useEffect(() => { if (isMember) load() }, [isMember, load])

  if (!isMember) return <EmptyState icon={CheckSquare} title="Members only" description="Join the group to see its tasks." />

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/tasks', {
        title: form.title,
        description: form.description,
        groupId,
        priority: form.priority,
        assigneeId: form.assigneeId || null,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
      })
      setCreateOpen(false)
      setForm({ title: '', description: '', dueDate: '', priority: 'MEDIUM', assigneeId: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const setStatus = async (id: string, status: string) => {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: status as TaskItem['status'], progress: status === 'COMPLETED' ? 100 : t.progress } : t)))
    await api.patch(`/api/tasks/${id}`, { status, ...(status === 'COMPLETED' ? { progress: 100 } : {}) }).catch(load)
  }

  const columns: Array<{ key: TaskItem['status']; label: string }> = [
    { key: 'TODO', label: 'To Do' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'COMPLETED', label: 'Completed' },
  ]

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> New task</button>
      </div>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-48 rounded-xl" />)}</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {columns.map((col) => (
            <div key={col.key} className="rounded-xl border bg-[rgb(var(--sg-surface-muted))]/40 p-3">
              <p className="mb-2.5 px-1 text-xs font-semibold uppercase tracking-wider text-muted">
                {col.label} <span className="ml-1 rounded-full bg-[rgb(var(--sg-card))] px-1.5">{tasks.filter((t) => t.status === col.key).length}</span>
              </p>
              <div className="space-y-2">
                {tasks.filter((t) => t.status === col.key).map((t) => {
                  const overdue = t.dueDate && t.status !== 'COMPLETED' && new Date(t.dueDate) < new Date()
                  return (
                    <div key={t.id} className="card p-3">
                      <p className="text-sm font-medium">{t.title}</p>
                      {t.dueDate && (
                        <p className={cn('mt-1 text-xs', overdue ? 'font-medium text-red-600 dark:text-red-400' : 'text-muted')}>
                          Due {new Date(t.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          {overdue ? ' · overdue' : ''}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <Badge tone={t.priority === 'HIGH' ? 'danger' : t.priority === 'MEDIUM' ? 'warning' : 'muted'}>
                          {t.priority.toLowerCase()}
                        </Badge>
                        {t.assignee && <Avatar name={t.assignee.name} src={t.assignee.avatarUrl} size="xs" />}
                      </div>
                      {col.key !== 'COMPLETED' && (
                        <button onClick={() => setStatus(t.id, col.key === 'TODO' ? 'IN_PROGRESS' : 'COMPLETED')} className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                          {col.key === 'TODO' ? 'Start →' : 'Mark complete ✓'}
                        </button>
                      )}
                      {col.key === 'COMPLETED' && (
                        <button onClick={() => setStatus(t.id, 'TODO')} className="mt-2 text-xs font-medium text-muted hover:underline">Reopen</button>
                      )}
                    </div>
                  )
                })}
                {tasks.filter((t) => t.status === col.key).length === 0 && (
                  <p className="px-1 py-4 text-center text-xs text-muted">Nothing here.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

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
          <Select label="Assignee" value={form.assigneeId} onChange={(e) => setForm((p) => ({ ...p, assigneeId: e.target.value }))}>
            <option value="">Unassigned</option>
            {members.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <Button type="submit" isLoading={saving} disabled={saving || form.title.trim().length < 2}>Create task</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ---------------- Resources ----------------

function GroupResources({ groupId, isMember }: { groupId: string; isMember: boolean }) {
  const [resources, setResources] = useState<ResourceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', type: 'LINK', url: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get<{ resources: ResourceItem[] }>(`/api/resources?groupId=${groupId}&pageSize=48`)
      .then((d) => setResources(d.resources))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId])

  useEffect(() => { if (isMember) load() }, [isMember, load])

  if (!isMember) return <EmptyState icon={BookOpen} title="Members only" description="Join the group to see its resources." />

  const share = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/resources', { ...form, groupId, tags: [] })
      setCreateOpen(false)
      setForm({ title: '', description: '', type: 'LINK', url: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> Share resource</button>
      </div>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-xl" />)}</div>
      ) : resources.length === 0 ? (
        <div className="card">
          <EmptyState icon={BookOpen} title="No resources yet" description="Be the first to share something with the group." action={<button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm">Share a resource</button>} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {resources.map((r) => (
            <div key={r.id} className="card flex items-center gap-3 p-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--sg-surface-muted))] text-xs font-bold uppercase text-muted">{r.type.slice(0, 3)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="truncate text-xs text-muted">{r.uploader.name} · {r.views} views · {r.downloads} downloads</p>
              </div>
              <a href={r.url} target="_blank" rel="noopener noreferrer" onClick={() => api.patch(`/api/resources/${r.id}?track=view`).catch(() => {})} className="btn btn-ghost btn-sm">Open</a>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Share a resource">
        <form onSubmit={share} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <Select label="Type" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
            {['LINK', 'PDF', 'NOTE', 'VIDEO', 'IMAGE', 'DOCUMENT'].map((t) => <option key={t} value={t}>{t}</option>)}
          </Select>
          <Input label="URL" type="url" value={form.url} onChange={(e) => setForm((p) => ({ ...p, url: e.target.value }))} required placeholder="https://…" />
          <Textarea label="Description (optional)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <Button type="submit" isLoading={saving} disabled={saving || !form.title.trim() || !form.url.trim()}>Share</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ---------------- Calendar (group events + sessions) ----------------

function GroupCalendar({ groupId, isMember }: { groupId: string; isMember: boolean }) {
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', subject: 'General', startsAt: '', endsAt: '', location: '', isOnline: false, kind: 'GROUP' })
  const [saving, setSaving] = useState(false)
  const [rsvpBusy, setRsvpBusy] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    api.get<{ sessions: SessionItem[] }>(`/api/sessions?groupId=${groupId}&limit=50`)
      .then((d) => setSessions(d.sessions))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId])

  useEffect(() => { if (isMember) load() }, [isMember, load])

  if (!isMember) return <EmptyState icon={Calendar} title="Members only" description="Join the group to see its sessions." />

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post('/api/sessions', {
        groupId, title: form.title, subject: form.subject, kind: form.kind,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt || form.startsAt).toISOString(),
        location: form.location, isOnline: form.isOnline,
      })
      setCreateOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  const rsvp = async (id: string, status: string) => {
    setRsvpBusy(id)
    try {
      await api.post(`/api/sessions/${id}/rsvp`, { status })
      load()
    } finally {
      setRsvpBusy(null)
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> Schedule session</button>
      </div>
      {loading ? (
        <SkeletonList rows={4} />
      ) : sessions.length === 0 ? (
        <div className="card">
          <EmptyState icon={Calendar} title="No sessions scheduled" description="Plan the next study session for this group." action={<button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm">Schedule one</button>} />
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((s) => {
            const startsIn = new Date(s.startsAt).getTime() - Date.now()
            const countdown = startsIn > 0 && startsIn < 48 * 3600e3
              ? `Starts in ${startsIn > 3600e3 ? `${Math.round(startsIn / 3600e3)}h` : `${Math.max(1, Math.round(startsIn / 60000))}m`}`
              : null
            return (
              <div key={s.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <button onClick={() => setDetailId(s.id)} className="min-w-0 flex-1 text-left" aria-label={`Open details for ${s.title}`}>
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{s.title}</p>
                    {countdown && <Badge tone="warning">{countdown}</Badge>}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(s.startsAt).toLocaleString()} · {s.isOnline ? 'Online' : s.location || 'No location'} · {s.goingCount} going
                    {s.maxParticipants ? ` / ${s.maxParticipants}` : ''}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-1.5">
                  {(['GOING', 'MAYBE', 'NOT_GOING'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => rsvp(s.id, st)}
                      disabled={rsvpBusy === s.id}
                      className={cn(
                        'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                        s.myRsvp === st
                          ? 'bg-indigo-600 text-white'
                          : 'border text-secondary hover:bg-[rgb(var(--sg-hover))]'
                      )}
                    >
                      {st === 'GOING' ? 'Going' : st === 'MAYBE' ? 'Maybe' : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <SessionDetailsModal
        sessionId={detailId}
        onClose={() => setDetailId(null)}
        onChanged={load}
      />

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Schedule a study session">
        <form onSubmit={create} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required minLength={3} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Starts" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((p) => ({ ...p, startsAt: e.target.value }))} required />
            <Input label="Ends" type="datetime-local" value={form.endsAt} onChange={(e) => setForm((p) => ({ ...p, endsAt: e.target.value }))} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Location (optional)" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} placeholder="Library Room 204" />
            <Select label="Type" value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
              <option value="GROUP">Group study</option>
              <option value="EXAM_PREP">Exam prep</option>
              <option value="PROBLEM_SOLVING">Problem solving</option>
              <option value="REVISION">Revision</option>
              <option value="DISCUSSION">Discussion</option>
            </Select>
          </div>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={form.isOnline} onChange={(e) => setForm((p) => ({ ...p, isOnline: e.target.checked }))} className="h-4 w-4 rounded" />
            This session is online
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <Button type="submit" isLoading={saving} disabled={saving || !form.title.trim() || !form.startsAt}>Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ---------------- Notes ----------------

function GroupNotes({ groupId, isMember }: { groupId: string; isMember: boolean }) {
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', kind: 'LECTURE', tags: '' })
  const [saving, setSaving] = useState(false)
  const [noteSaveState, setNoteSaveState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [versionsOpen, setVersionsOpen] = useState(false)
  const [noteVersions, setNoteVersions] = useState<Array<{ id: string; version: number; title: string; content: string; kind: string; tags: string[]; createdAt: string; editor: { id: string; name: string } }> | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef('')

  const load = useCallback(() => {
    setLoading(true)
    api.get<{ notes: NoteItem[] }>(`/api/notes?groupId=${groupId}`)
      .then((d) => setNotes(d.notes))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [groupId])

  useEffect(() => { if (isMember) load() }, [isMember, load])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.post(`/api/notes?groupId=${groupId}`, {
        title: form.title, content: form.content, kind: form.kind,
        tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      })
      setCreateOpen(false)
      setForm({ title: '', content: '', kind: 'LECTURE', tags: '' })
      load()
    } finally {
      setSaving(false)
    }
  }

  const loadVersions = useCallback(async (noteId: string) => {
    setNoteVersions(null)
    try {
      const d = await api.get<{ versions: Array<{ id: string; version: number; title: string; content: string; kind: string; tags: string[]; createdAt: string; editor: { id: string; name: string } }> }>(`/api/notes/${noteId}?versions=1`)
      setNoteVersions(d.versions)
    } catch {
      setNoteVersions([])
    }
  }, [])

  const saveEdit = async () => {
    if (!activeNote) return
    setSaving(true)
    try {
      const d = await api.put<{ note: NoteItem }>(`/api/notes/${activeNote.id}`, {
        title: activeNote.title, content: activeNote.content, kind: activeNote.kind, tags: activeNote.tags,
      })
      lastSavedRef.current = `${d.note.title}\u0000${d.note.content}`
      setActiveNote(d.note)
      setNoteSaveState('saved')
      load()
    } finally {
      setSaving(false)
    }
  }

  // Debounced autosave: 1.5s after the last keystroke, only when content
  // actually changed. Creates a version server-side (same PUT path).
  useEffect(() => {
    if (!activeNote || !versionsOpen) {
      // editor closed elsewhere — nothing to autosave
    }
    if (!activeNote) return
    const snapshot = `${activeNote.title}\u0000${activeNote.content}`
    if (snapshot === lastSavedRef.current) return
    setNoteSaveState('idle')
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(async () => {
      setNoteSaveState('saving')
      try {
        const d = await api.put<{ note: NoteItem }>(`/api/notes/${activeNote.id}`, {
          title: activeNote.title, content: activeNote.content, kind: activeNote.kind, tags: activeNote.tags,
        })
        lastSavedRef.current = `${d.note.title}\u0000${d.note.content}`
        setActiveNote(d.note)
        setNoteSaveState('saved')
        load()
        if (versionsOpen) loadVersions(d.note.id)
      } catch {
        setNoteSaveState('idle')
      }
    }, 1500)
    return () => { if (autosaveTimer.current) clearTimeout(autosaveTimer.current) }
  }, [activeNote, versionsOpen, load, loadVersions])

  // Restore applies an old version as a NEW version — history is never rewritten.
  const restoreVersion = async (versionId: string) => {
    if (!activeNote) return
    try {
      const d = await api.post<{ note: NoteItem }>(`/api/notes/${activeNote.id}`, { versionId })
      lastSavedRef.current = `${d.note.title}\u0000${d.note.content}`
      setActiveNote(d.note)
      setNoteSaveState('saved')
      load()
      loadVersions(d.note.id)
    } catch {
      /* restore failures are surfaced by the API envelope */
    }
  }

  // Hooks above run unconditionally; the members-only gate renders after.
  if (!isMember) return <EmptyState icon={FileText} title="Members only" description="Join the group to see its notes." />

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> New note</button>
      </div>
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-28 rounded-xl" />)}</div>
      ) : notes.length === 0 ? (
        <div className="card">
          <EmptyState icon={FileText} title="No notes yet" description="Create lecture notes, exam summaries or cheat sheets." action={<button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm">Create a note</button>} />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => (
            <button key={n.id} onClick={() => setActiveNote(n)} className="card-hover p-4 text-left">
              <div className="flex items-center justify-between">
                <Badge tone="muted">{n.kind.replace('_', ' ').toLowerCase()}</Badge>
                <span className="text-[10px] text-muted">v{n.version}</span>
              </div>
              <p className="mt-2 line-clamp-1 text-sm font-semibold">{n.title}</p>
              <p className="mt-1 line-clamp-2 text-xs text-secondary">{n.content.slice(0, 120) || 'Empty note'}</p>
              <p className="mt-2 text-[10px] text-muted">{n.author.name} · updated {new Date(n.updatedAt).toLocaleDateString()}</p>
            </button>
          ))}
        </div>
      )}

      {/* Editor */}
      <Modal isOpen={Boolean(activeNote)} onClose={() => setActiveNote(null)} title={activeNote?.title ?? ''} size="full">
        {activeNote && (
          <div className="space-y-4">
            <Input value={activeNote.title} onChange={(e) => setActiveNote({ ...activeNote, title: e.target.value })} aria-label="Note title" />
            <Textarea
              value={activeNote.content}
              onChange={(e) => setActiveNote({ ...activeNote, content: e.target.value })}
              className="min-h-[280px] font-mono text-sm"
              aria-label="Note content"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted" aria-live="polite">
                {noteSaveState === 'saving' ? 'Saving…' : noteSaveState === 'saved' ? `Saved · version ${activeNote.version}` : `Version ${activeNote.version} · autosaves`}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setVersionsOpen((v) => !v)} className="btn btn-ghost btn-sm" aria-expanded={versionsOpen}>
                  History
                </button>
                <Button onClick={saveEdit} isLoading={saving} size="sm">Save version</Button>
              </div>
            </div>
            {versionsOpen && (
              <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-lg border p-2" role="list" aria-label="Version history">
                {noteVersions === null ? (
                  <p className="p-2 text-xs text-muted">Loading history…</p>
                ) : noteVersions.length === 0 ? (
                  <p className="p-2 text-xs text-muted">No earlier versions yet — history appears after the first edit.</p>
                ) : (
                  noteVersions.map((v) => (
                    <div key={v.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[rgb(var(--sg-hover))]" role="listitem">
                      <span className="font-semibold">v{v.version}</span>
                      <span className="min-w-0 flex-1 truncate text-muted">{v.title} · {v.editor.name} · {new Date(v.createdAt).toLocaleString()}</span>
                      <button
                        onClick={() => restoreVersion(v.id)}
                        className="shrink-0 font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                        aria-label={`Restore version ${v.version}`}
                      >
                        Restore
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="New note">
        <form onSubmit={create} className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
          <Select label="Type" value={form.kind} onChange={(e) => setForm((p) => ({ ...p, kind: e.target.value }))}>
            <option value="LECTURE">Lecture notes</option>
            <option value="EXAM">Exam notes</option>
            <option value="CHEAT_SHEET">Cheat sheet</option>
            <option value="PROBLEM_SOLUTION">Problem solution</option>
            <option value="REVISION">Revision</option>
          </Select>
          <Textarea label="Content" value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} className="min-h-[200px] font-mono" />
          <Input label="Tags (comma separated)" value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} placeholder="week-1, calculus" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <Button type="submit" isLoading={saving} disabled={saving || form.title.trim().length < 2}>Create note</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

// ---------------- Members ----------------

function GroupMembers({ groupId, members, myRole, reload }: {
  groupId: string; members: GroupDetail['members']; myRole: string | null; reload: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const isOwner = myRole === 'OWNER'
  const canManage = myRole === 'OWNER' || myRole === 'ADMIN'

  const changeRole = async (userId: string, role: string) => {
    setBusy(userId)
    try {
      await api.patch(`/api/groups/${groupId}/members`, { userId, role })
      reload()
    } finally {
      setBusy(null)
    }
  }

  const removeMember = async (userId: string) => {
    setBusy(userId)
    try {
      await api.del(`/api/groups/${groupId}/members?userId=${userId}`)
      reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="card divide-y p-0">
      {members.map((m) => (
        <div key={m.user.id} className="flex items-center gap-3 p-4">
          <Avatar name={m.user.name} src={m.user.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{m.user.name}</p>
            <p className="text-xs text-muted">Joined {new Date(m.joinedAt).toLocaleDateString()}</p>
          </div>
          {m.role === 'OWNER' ? (
            <Badge><Crown className="h-3 w-3" /> Owner</Badge>
          ) : m.role === 'ADMIN' ? (
            <Badge tone="muted">Admin</Badge>
          ) : (
            <Badge tone="muted">Member</Badge>
          )}
          {canManage && m.role !== 'OWNER' && (
            <div className="flex items-center gap-1.5">
              {isOwner && (
                <button
                  onClick={() => changeRole(m.user.id, m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')}
                  disabled={busy === m.user.id}
                  className="rounded-md px-2 py-1 text-xs font-medium text-secondary hover:bg-[rgb(var(--sg-hover))]"
                >
                  {m.role === 'ADMIN' ? 'Demote' : 'Make admin'}
                </button>
              )}
              <button
                onClick={() => removeMember(m.user.id)}
                disabled={busy === m.user.id}
                className="rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
