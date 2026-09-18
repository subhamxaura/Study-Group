'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle, Users } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { SkeletonList } from '@/components/ui/Skeleton'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { api } from '@/lib/client'
import type { GroupSummary } from '@/types'
import { cn } from '@/lib/utils'

export default function MessagesPage() {
  const [groups, setGroups] = useState<GroupSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [onlineCount, setOnlineCount] = useState(0)

  useEffect(() => {
    api.get<{ groups: GroupSummary[] }>('/api/groups?mine=1&pageSize=24')
      .then((d) => {
        setGroups(d.groups)
        if (d.groups.length) setActiveId((cur) => cur ?? d.groups[0].id)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="section-container"><SkeletonList rows={4} /></div>
  }

  if (groups.length === 0) {
    return (
      <div className="section-container">
        <div className="card">
          <EmptyState
            icon={MessageCircle} title="No conversations yet"
            description="Join a study group to start discussing with classmates."
            action={<Link href="/discover" className="btn btn-primary btn-sm">Discover groups</Link>}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Group list */}
        <aside className="lg:space-y-1">
          <p className="hidden px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted lg:block">Group chats</p>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {groups.map((g) => (
              <button
                key={g.id}
                onClick={() => setActiveId(g.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-colors lg:w-full',
                  activeId === g.id ? 'bg-indigo-50 font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300' : 'text-secondary hover:bg-[rgb(var(--sg-hover))]'
                )}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">{g.name[0]}</span>
                <span className="min-w-0">
                  <span className="block truncate">{g.name}</span>
                  <span className="block text-[10px] text-muted">{g.memberCount} members{activeId === g.id && onlineCount > 0 ? ` · ${onlineCount} online` : ''}</span>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Active chat */}
        <div>
          {activeId ? (
            <ChatWindow groupId={activeId} onOnlineChange={setOnlineCount} />
          ) : (
            <div className="card flex h-64 items-center justify-center text-sm text-muted">Select a group to open its chat.</div>
          )}
        </div>
      </div>
    </div>
  )
}
