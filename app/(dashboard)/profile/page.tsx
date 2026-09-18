'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { GraduationCap, Clock, Users, Calendar, CheckSquare, Flame, BookOpen, Pencil } from 'lucide-react'
import { Avatar, Badge, Button, Input, Modal, Textarea } from '@/components/ui'
import { useSession } from '@/lib/store'
import { api } from '@/lib/client'

interface ProfileData {
  profile: {
    id: string; name: string; avatarUrl: string | null
    university: string | null; course: string | null; semester: string | null
    bio: string | null; subjects: string[]; interests: string[]; joinedAt: string
    stats: { studyHours: number; groups: number; sessions: number; tasksCompleted: number; streak: number }
    groups: Array<{ id: string; name: string; subject: string }>
    resources: Array<{ id: string; title: string; type: string; url: string; createdAt: string }>
  }
  isSelf: boolean
}

export default function ProfilePage() {
  const { user } = useSession()
  const [data, setData] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ name: '', bio: '', university: '', course: '', semester: '', subjects: '' })
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    api.get<ProfileData>('/api/profile')
      .then((d) => {
        setData(d)
        setForm({
          name: d.profile.name,
          bio: d.profile.bio ?? '',
          university: d.profile.university ?? '',
          course: d.profile.course ?? '',
          semester: d.profile.semester ?? '',
          subjects: d.profile.subjects.join(', '),
        })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/api/profile', {
        name: form.name, bio: form.bio, university: form.university,
        course: form.course, semester: form.semester,
        subjects: form.subjects.split(',').map((s) => s.trim()).filter(Boolean),
        interests: [],
      })
      setEditOpen(false)
      load()
    } finally {
      setSaving(false)
    }
  }

  if (loading || !data) {
    return <div className="section-container"><div className="skeleton h-64 rounded-xl" /></div>
  }

  const p = data.profile

  return (
    <div className="section-container max-w-4xl space-y-6">
      {/* Header card */}
      <div className="card p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Avatar name={p.name} src={p.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{p.name}</h1>
              {p.stats.streak > 0 && <Badge tone="warning">🔥 {p.stats.streak} day streak</Badge>}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
              {p.university && <span className="inline-flex items-center gap-1"><GraduationCap className="h-4 w-4" />{p.university}</span>}
              {p.course && <span>· {p.course}</span>}
              {p.semester && <span>· Sem {p.semester}</span>}
            </div>
            {p.bio && <p className="mt-2 max-w-lg text-sm leading-relaxed text-secondary">{p.bio}</p>}
            {p.subjects.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.subjects.map((s) => <Badge key={s} tone="muted">{s}</Badge>)}
              </div>
            )}
          </div>
          {data.isSelf && (
            <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit profile</Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          { icon: Clock, label: 'Study hours', value: p.stats.studyHours },
          { icon: Users, label: 'Groups', value: p.stats.groups },
          { icon: Calendar, label: 'Sessions', value: p.stats.sessions },
          { icon: CheckSquare, label: 'Tasks done', value: p.stats.tasksCompleted },
          { icon: Flame, label: 'Streak', value: `🔥 ${p.stats.streak}` },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <s.icon className="mx-auto h-5 w-5 text-muted" />
            <p className="mt-1.5 text-lg font-semibold">{s.value}</p>
            <p className="text-xs text-muted">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Groups */}
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Groups</h2>
          {p.groups.length === 0 ? (
            <p className="py-4 text-sm text-muted">Not in any group yet. <Link href="/discover" className="font-medium text-indigo-600 dark:text-indigo-400">Discover →</Link></p>
          ) : (
            <div className="space-y-2">
              {p.groups.map((g) => (
                <Link key={g.id} href={`/groups/${g.id}`} className="flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-[rgb(var(--sg-hover))]">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">{g.name[0]}</span>
                  <div><p className="text-sm font-medium">{g.name}</p><p className="text-xs text-muted">{g.subject}</p></div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Shared resources</h2>
          {p.resources.length === 0 ? (
            <p className="py-4 text-sm text-muted">No resources shared yet.</p>
          ) : (
            <div className="space-y-2">
              {p.resources.map((r) => (
                <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 rounded-lg border p-2.5 transition-colors hover:bg-[rgb(var(--sg-hover))]">
                  <BookOpen className="h-4 w-4 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1 truncate text-sm">{r.title}</span>
                  <span className="text-[10px] uppercase text-muted">{r.type}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)} title="Edit profile">
        <form onSubmit={save} className="space-y-4">
          <Input label="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required minLength={2} />
          <Input label="University" value={form.university} onChange={(e) => setForm((p) => ({ ...p, university: e.target.value }))} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Course" value={form.course} onChange={(e) => setForm((p) => ({ ...p, course: e.target.value }))} />
            <Input label="Semester" value={form.semester} onChange={(e) => setForm((p) => ({ ...p, semester: e.target.value }))} />
          </div>
          <Input label="Subjects (comma separated)" value={form.subjects} onChange={(e) => setForm((p) => ({ ...p, subjects: e.target.value }))} placeholder="Calculus, DSA, Physics" />
          <Textarea label="Bio" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} maxLength={500} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditOpen(false)} className="btn btn-ghost btn-sm">Cancel</button>
            <Button type="submit" isLoading={saving} disabled={saving}>Save changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
