'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { EmptyState } from '@/components/ui'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { api } from '@/lib/client'
import type { GroupSummary } from '@/types'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/Skeleton'

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
    return (
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Matches the final split layout: conversation rail + chat pane */}
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="hidden space-y-2 lg:block" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-lg px-3 py-2.5">
                <Skeleton className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
          <div className="card flex h-[480px] flex-col gap-3 p-4" aria-hidden="true">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-12 w-2/3 rounded-xl" />
            <Skeleton className="h-12 w-1/2 rounded-xl" />
            <Skeleton className="mt-auto h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>
    )
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
      {/* Page header — quiet; the conversation is the focus */}
      <div className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Messages</h1>
        <p className="mt-0.5 text-sm text-secondary">Group discussions, all in one place.</p>
      </div>

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
                  activeId === g.id
                    ? 'bg-[rgb(var(--sg-accent-soft))] font-medium text-[rgb(var(--sg-accent))] dark:text-[rgb(var(--sg-accent-muted))]'
                    : 'text-secondary hover:bg-[rgb(var(--sg-hover))]'
                )}
                aria-current={activeId === g.id ? 'true' : undefined}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[rgb(var(--sg-accent))] text-xs font-bold text-white">{g.name[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{g.name}</span>
                  <span className="block text-[10px] text-muted">{g.memberCount} members{activeId === g.id && onlineCount > 0 ? ` · ${onlineCount} online` : ''}</span>
                </span>
                {!!g.unreadCount && (
                  <span
                    className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--sg-accent))] px-1 text-[10px] font-bold text-white"
                    aria-label={`${g.unreadCount} unread messages`}
                  >
                    {g.unreadCount > 9 ? '9+' : g.unreadCount}
                  </span>
                )}
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
