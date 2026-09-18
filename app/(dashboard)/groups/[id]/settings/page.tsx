'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, Trash2, AlertTriangle, ShieldCheck, Users } from 'lucide-react'
import { Badge, Button, Input, Modal, Select, Textarea, ConfirmModal, EmptyState } from '@/components/ui'
import { api } from '@/lib/client'
import type { GroupDetail, MemberItem } from '@/types'

const SUBJECTS = ['General', 'Mathematics', 'Physics', 'Computer Science', 'Chemistry', 'Biology', 'Economics', 'Literature', 'History', 'Engineering']

export default function GroupSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const groupId = params.id as string

  const [group, setGroup] = useState<GroupDetail | null>(null)
  const [myRole, setMyRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState<MemberItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', subject: 'General', university: '',
    semester: '', difficulty: '', isPublic: true, pinnedAnnouncement: '',
  })

  const load = useCallback(() => {
    api.get<{ group: GroupDetail; myRole: string | null }>(`/api/groups/${groupId}`)
      .then((d) => {
        setGroup(d.group); setMyRole(d.myRole)
        setForm({
          name: d.group.name, description: d.group.description, subject: d.group.subject,
          university: d.group.university ?? '', semester: d.group.semester ?? '',
          difficulty: d.group.difficulty ?? '', isPublic: d.group.isPublic,
          pinnedAnnouncement: d.group.pinnedAnnouncement ?? '',
        })
      })
      .catch(() => setGroup(null))
      .finally(() => setLoading(false))
    api.get<{ members: MemberItem[] }>(`/api/groups/${groupId}/members`)
      .then((d) => setMembers(d.members))
      .catch(() => {})
  }, [groupId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="section-container"><div className="skeleton h-64 rounded-xl" /></div>

  if (!group || (myRole !== 'OWNER' && myRole !== 'ADMIN')) {
    return (
      <div className="section-container">
        <EmptyState
          icon={ShieldCheck} title="Admins only"
          description="Only the group owner and admins can manage settings."
          action={<Link href={`/groups/${groupId}`} className="btn btn-primary btn-sm">Back to group</Link>}
        />
      </div>
    )
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setSaved(false)
    try {
      await api.patch(`/api/groups/${groupId}`, {
        name: form.name,
        description: form.description,
        subject: form.subject,
        university: form.university,
        semester: form.semester,
        difficulty: form.difficulty || undefined,
        isPublic: form.isPublic,
        pinnedAnnouncement: form.pinnedAnnouncement,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } finally {
      setSaving(false)
    }
  }

  const deleteGroup = async () => {
    setDeleting(true)
    try {
      await api.del(`/api/groups/${groupId}`)
      router.push('/groups')
    } finally {
      setDeleting(false)
    }
  }

  const changeRole = async (userId: string, role: string) => {
    await api.patch(`/api/groups/${groupId}/members`, { userId, role }).catch(() => {})
    load()
  }

  const removeMember = async (userId: string) => {
    await api.del(`/api/groups/${groupId}/members?userId=${userId}`).catch(() => {})
    load()
  }

  return (
    <div className="section-container max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Group settings</h1>
        <p className="mt-1 text-sm text-secondary">Manage “{group.name}”.</p>
      </div>

      <form onSubmit={save} className="space-y-5">
        <div className="card space-y-4 p-5">
          <Input label="Group name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required minLength={3} />
          <Textarea label="Description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} maxLength={500} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Select label="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
            <Select label="Difficulty" value={form.difficulty} onChange={(e) => setForm((p) => ({ ...p, difficulty: e.target.value }))}>
              <option value="">Not specified</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="University" value={form.university} onChange={(e) => setForm((p) => ({ ...p, university: e.target.value }))} />
            <Input label="Semester" value={form.semester} onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))} placeholder="e.g. Fall 2026" />
          </div>
          <label className="flex items-center gap-2.5 text-sm">
            <input type="checkbox" checked={form.isPublic} onChange={(e) => setForm((p) => ({ ...p, isPublic: e.target.checked }))} className="h-4 w-4 rounded" />
            Public — anyone can find this group in Discover
          </label>
          <Textarea
            label="Pinned announcement"
            value={form.pinnedAnnouncement}
            onChange={(e) => setForm((p) => ({ ...p, pinnedAnnouncement: e.target.value }))}
            placeholder="Shown at the top of the group overview (leave empty for none)"
            maxLength={300}
          />
        </div>

        <div className="flex items-center justify-between">
          {saved ? <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Saved ✓</span> : <span />}
          <Button type="submit" isLoading={saving} disabled={saving}><Save className="h-4 w-4" /> Save changes</Button>
        </div>
      </form>

      {/* Members quick-manage */}
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold">Members & roles</h2>
        </div>
        <div className="mt-3 divide-y">
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                {m.user.name[0]}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{m.user.name}</span>
              <Badge tone={m.role === 'OWNER' ? 'accent' : 'muted'}>{m.role.toLowerCase()}</Badge>
              {myRole === 'OWNER' && m.role !== 'OWNER' && (
                <button onClick={() => changeRole(m.user.id, m.role === 'ADMIN' ? 'MEMBER' : 'ADMIN')} className="rounded px-2 py-1 text-xs font-medium text-secondary hover:bg-[rgb(var(--sg-hover))]">
                  {m.role === 'ADMIN' ? 'Demote' : 'Make admin'}
                </button>
              )}
              {m.role !== 'OWNER' && (
                <button onClick={() => removeMember(m.user.id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Danger zone (owner only) */}
      {myRole === 'OWNER' && (
        <div className="card border-red-200 p-5 dark:border-red-500/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
          </div>
          <p className="mt-1 text-sm text-secondary">
            Deleting the group permanently removes its messages, tasks, sessions, resources and notes for everyone.
          </p>
          <Button variant="danger" size="sm" onClick={() => setDeleteOpen(true)} className="mt-3">
            <Trash2 className="h-4 w-4" /> Delete group
          </Button>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={deleteGroup}
        title={`Delete “${group.name}”?`}
        message="This cannot be undone. All group content will be permanently deleted."
        confirmText="Delete group"
        variant="danger"
        isLoading={deleting}
      />
    </div>
  )
}
