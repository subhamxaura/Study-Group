'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Users, Plus, Compass, CalendarDays, MessageCircle, ChevronRight } from 'lucide-react'
import { EmptyState, Badge } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'
import { api } from '@/lib/client'
import type { GroupSummary } from '@/types'

function MyGroupsInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(searchParams.get('create') === '1')

  const load = useCallback(() => {
    setLoading(true)
    api.get<{ groups: GroupSummary[] }>('/api/groups?mine=1&pageSize=48')
      .then((d) => setGroups(d.groups))
      .catch(() => setGroups([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  // Open create modal when arriving with ?create=1
  useEffect(() => {
    if (searchParams.get('create') === '1') setCreateOpen(true)
  }, [searchParams])

  return (
    <div className="section-container space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Groups</h1>
          <p className="mt-1 text-sm text-secondary">Groups you own or joined, with their latest activity.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/discover" className="btn btn-secondary btn-sm"><Compass className="h-4 w-4" /> Discover</Link>
          <button onClick={() => setCreateOpen(true)} className="btn btn-primary btn-sm"><Plus className="h-4 w-4" /> Create group</button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-36 rounded-xl" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={Users} title="No groups yet"
            description="Join a study group or create your own to start collaborating."
            action={
              <div className="flex gap-2">
                <Link href="/discover" className="btn btn-primary btn-sm">Find a study group</Link>
                <button onClick={() => setCreateOpen(true)} className="btn btn-secondary btn-sm">Create one</button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((g) => (
            <Link key={g.id} href={`/groups/${g.id}`} className="card-hover flex flex-col p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-base font-bold text-white">{g.name[0]}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{g.name}</p>
                    {g.myRole === 'OWNER' && <Badge>Owner</Badge>}
                    {g.myRole === 'ADMIN' && <Badge tone="muted">Admin</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">{g.subject} · {g.memberCount} members</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-secondary">{g.description}</p>
              <div className="mt-3 flex items-center gap-4 border-t pt-3 text-xs text-muted">
                <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{g.weeklyMessages ?? 0} msgs this week</span>
                {g.nextSessionAt && (
                  <span className="inline-flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(g.nextSessionAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

export default function MyGroupsPage() {
  return (
    <Suspense fallback={<div className="section-container"><div className="skeleton h-64 rounded-xl" /></div>}>
      <MyGroupsInner />
    </Suspense>
  )
}
