'use client'
/**
 * Notes index — aggregates the user's notes across all their groups.
 * Individual notes are edited inside the group workspace (versioned editor);
 * this page is the cross-group library view with a readable recent list.
 */
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { FileText, Plus, Clock } from 'lucide-react'
import { Badge, EmptyState } from '@/components/ui'
import { SkeletonNoteCard } from '@/components/ui/Skeleton'
import { api } from '@/lib/client'
import type { GroupSummary } from '@/types'

interface NoteRow {
  id: string
  title: string
  content: string
  kind: string
  tags: string[]
  version: number
  updatedAt: string
  groupId: string
  author: { id: string; name: string; avatarUrl: string | null }
}

export default function NotesPage() {
  const [notes, setNotes] = useState<NoteRow[]>([])
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const load = useCallback(() => {
    api.get<{ groups: GroupSummary[] }>('/api/groups?mine=1&pageSize=24')
      .then(async (d) => {
        setGroups(d.groups)
        if (!d.groups.length) {
          setNotes([])
          return
        }
        // Parallel fetch across my groups (bounded, page-size limited each)
        const results = await Promise.allSettled(
          d.groups.map((g) => api.get<{ notes: NoteRow[] }>(`/api/notes?groupId=${g.id}`)),
        )
        const merged: NoteRow[] = []
        for (let i = 0; i < results.length; i++) {
          const r = results[i]
          if (r.status === 'fulfilled') {
            for (const n of r.value.notes) merged.push({ ...n, groupId: d.groups[i].id })
          }
        }
        merged.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        setNotes(merged)
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="section-container">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => <SkeletonNoteCard key={i} />)}
        </div>
      </div>
    )
  }

  if (failed) {
    return (
      <div className="section-container">
        <div className="card">
          <EmptyState
            icon={FileText} title="Could not load notes"
            description="Something went wrong while fetching your notes."
            action={<button onClick={load} className="btn btn-primary btn-sm">Try again</button>}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="section-container space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notes</h1>
          <p className="mt-1 text-sm text-secondary">Versioned study notes from all of your groups.</p>
        </div>
        {groups[0] && (
          <Link href={`/groups/${groups[0].id}`} className="btn btn-primary btn-sm">
            <Plus className="h-4 w-4" /> Create a note
          </Link>
        )}
      </div>

      {notes.length === 0 ? (
        <div className="card">
          {groups.length === 0 ? (
            <EmptyState
              icon={FileText} title="No notes yet"
              description="Join a study group and start building your shared library of lecture notes, exam summaries and cheat sheets."
              action={<Link href="/discover" className="btn btn-primary btn-sm">Find a study group</Link>}
            />
          ) : (
            <EmptyState
              icon={FileText} title="No notes yet"
              description="Open one of your groups and create the first note — lecture notes, exam summaries or cheat sheets."
              action={<Link href="/groups" className="btn btn-primary btn-sm">Go to my groups</Link>}
            />
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {notes.map((n) => {
            const g = groups.find((x) => x.id === n.groupId)
            return (
              <Link key={n.id} href={`/groups/${n.groupId}`} className="card-hover flex flex-col p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="muted">{n.kind.replace('_', ' ').toLowerCase()}</Badge>
                  <span className="text-[10px] font-medium text-muted">v{n.version}</span>
                </div>
                <p className="mt-2 line-clamp-1 text-sm font-semibold">{n.title}</p>
                <p className="mt-1 line-clamp-2 flex-1 text-xs leading-relaxed text-secondary">{n.content.slice(0, 120) || 'Empty note'}</p>
                <p className="mt-3 flex items-center gap-1.5 border-t pt-2.5 text-[10px] text-muted">
                  <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {g ? `${g.name} · ` : ''}{n.author.name} · {new Date(n.updatedAt).toLocaleDateString()}
                </p>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
