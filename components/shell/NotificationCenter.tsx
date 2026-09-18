'use client'
import { useCallback, useEffect, useRef, useState, ReactNode } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Check, CheckCheck, MessageCircle, Calendar, BookOpen, UserPlus, ExternalLink, AtSign, ClipboardList } from 'lucide-react'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import type { NotificationItem } from '@/types'

const kindIcon: Record<string, ReactNode> = {
  MESSAGE: <MessageCircle className="h-4 w-4" />,
  MENTION: <AtSign className="h-4 w-4" />,
  GROUP_INVITE: <UserPlus className="h-4 w-4" />,
  JOIN_REQUEST: <UserPlus className="h-4 w-4" />,
  SESSION_REMINDER: <Calendar className="h-4 w-4" />,
  TASK_DEADLINE: <Check className="h-4 w-4" />,
  RESOURCE_SHARED: <BookOpen className="h-4 w-4" />,
  TASK_ASSIGNED: <ClipboardList className="h-4 w-4" />,
}

type Category = 'ALL' | 'MESSAGES' | 'TASKS' | 'GROUPS' | 'SESSIONS' | 'RESOURCES'

const CATEGORIES: Array<{ id: Category; label: string; kinds?: string[] }> = [
  { id: 'ALL', label: 'All' },
  { id: 'MESSAGES', label: 'Messages', kinds: ['MESSAGE', 'MENTION'] },
  { id: 'TASKS', label: 'Tasks', kinds: ['TASK_ASSIGNED', 'TASK_DEADLINE'] },
  { id: 'GROUPS', label: 'Groups', kinds: ['GROUP_INVITE', 'JOIN_REQUEST'] },
  { id: 'SESSIONS', label: 'Sessions', kinds: ['SESSION_REMINDER'] },
  { id: 'RESOURCES', label: 'Resources', kinds: ['RESOURCE_SHARED'] },
]

interface Props {
  trigger: ReactNode
  onCountChange?: (n: number) => void
}

export function NotificationCenter({ trigger, onCountChange }: Props) {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState<Category>('ALL')
  const [items, setItems] = useState<NotificationItem[]>([])
  const [unread, setUnread] = useState(0)
  const [unreadInFilter, setUnreadInFilter] = useState(0)
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const activeKinds = CATEGORIES.find((c) => c.id === category)?.kinds

  const load = useCallback(() => {
    setLoading(true)
    const qs = new URLSearchParams({ pageSize: '12' })
    if (activeKinds) qs.set('kinds', activeKinds.join(','))
    api.get<{ notifications: NotificationItem[]; unreadCount: number; unreadInFilter: number }>(`/api/notifications?${qs}`)
      .then((d) => {
        setItems(d.notifications)
        setUnread(d.unreadCount)
        setUnreadInFilter(d.unreadInFilter)
        onCountChange?.(d.unreadCount)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [activeKinds, onCountChange])

  // Poll while open; pause when the tab is hidden (Phase 14: no excessive polling)
  useEffect(() => {
    if (!open) return
    load()
    const tick = setInterval(() => { if (document.visibilityState === 'visible') load() }, 20000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(tick); document.removeEventListener('visibilitychange', onVis) }
  }, [open, load])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const markRead = async (id: string) => {
    setItems((xs) => xs.map((x) => (x.id === id ? { ...x, isRead: true } : x)))
    setUnread((u) => Math.max(0, u - 1))
    setUnreadInFilter((u) => Math.max(0, u - 1))
    onCountChange?.(Math.max(0, unread - 1))
    await api.patch('/api/notifications', { id }).catch(() => load())
  }

  const markAll = async () => {
    setItems((xs) => xs.map((x) => ({ ...x, isRead: true })))
    if (!activeKinds) setUnread(0)
    setUnreadInFilter(0)
    onCountChange?.(activeKinds ? unread : 0)
    await api.patch('/api/notifications', activeKinds ? { allInKinds: activeKinds } : { all: true }).catch(() => load())
  }

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="fixed right-2 top-[58px] z-50 w-[360px] max-w-[calc(100vw-16px)] overflow-hidden rounded-xl border bg-[rgb(var(--sg-card))] shadow-large sm:absolute sm:right-0 sm:top-[calc(100%+8px)]"
            role="dialog" aria-label="Notifications"
          >
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadInFilter > 0 && (
                <button onClick={markAll} className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="flex gap-1 overflow-x-auto border-b px-3 py-2" role="tablist" aria-label="Notification categories">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={category === c.id}
                  onClick={() => setCategory(c.id)}
                  className={cn(
                    'shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                    category === c.id ? 'bg-indigo-600 text-white' : 'text-secondary hover:bg-[rgb(var(--sg-hover))]',
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="max-h-[340px] overflow-y-auto">
              {loading && items.length === 0 && <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-12" />)}</div>}
              {!loading && items.length === 0 && (
                <p className="px-4 py-10 text-center text-sm text-muted">
                  {category === 'ALL' ? "You're all caught up." : `No ${CATEGORIES.find((c) => c.id === category)?.label.toLowerCase()} notifications.`}
                </p>
              )}
              {items.map((n) => (
                <div
                  key={n.id}
                  className={cn('flex gap-3 border-b px-4 py-3 last:border-0', !n.isRead && 'bg-indigo-50/50 dark:bg-indigo-500/5')}
                >
                  <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', n.isRead ? 'text-muted' : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300')}>
                    {kindIcon[n.kind] ?? <Bell className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    {n.body && <p className="truncate text-xs text-muted">{n.body}</p>}
                    <div className="mt-1 flex items-center gap-3">
                      <span className="text-[10px] text-muted">{new Date(n.createdAt).toLocaleString()}</span>
                      {!n.isRead && (
                        <button onClick={() => markRead(n.id)} className="text-[10px] font-medium text-indigo-600 hover:underline dark:text-indigo-400">
                          Mark read
                        </button>
                      )}
                      {n.link && (
                        <Link href={n.link} onClick={() => setOpen(false)} className="flex items-center gap-0.5 text-[10px] font-medium text-secondary hover:text-[rgb(var(--sg-foreground))]">
                          Open <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
