'use client'
import { useEffect, useState, useCallback } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, Users, Compass, MessageCircle, Calendar, BookOpen,
  CheckSquare, Timer, BarChart3, Bell, Settings, LogOut, Menu, X, Search, Plus, BookMarked, Brain,
} from 'lucide-react'
import { Avatar, Button, Badge, ToastViewport } from '@/components/ui'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { CommandPalette } from '@/components/shell/CommandPalette'
import { NotificationCenter } from '@/components/shell/NotificationCenter'
import { StudymatePanel, StudymateButton } from '@/components/studymate/StudymatePanel'
import { useSession, useUIStore } from '@/lib/store'
import { api } from '@/lib/client'
import { cn } from '@/lib/utils'
import type { GroupSummary } from '@/types'
import dynamic from 'next/dynamic'

const OnboardingWizardLazy = dynamic(
  () => import('@/components/onboarding/OnboardingWizard').then((m) => m.OnboardingWizard),
  { loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--sg-background))]">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
    </div>
  ) },
)

// Grouped command-center navigation. Badges are computed from real state,
// never hardcoded — sections render only when they have entries.
type NavBadge = 'overdue' | 'nextSession' | 'unread'
const navSections: Array<{ label: string; items: Array<{ label: string; icon: React.ComponentType<{ className?: string }>; href: string; badge?: NavBadge }> }> = [
  {
    label: 'Home',
    items: [{ label: 'Dashboard', icon: LayoutDashboard, href: '/dashboard' }],
  },
  {
    label: 'Study',
    items: [
      { label: 'Focus', icon: Timer, href: '/focus' },
      { label: 'Calendar', icon: Calendar, href: '/calendar', badge: 'nextSession' },
      { label: 'Tasks', icon: CheckSquare, href: '/tasks', badge: 'overdue' },
    ],
  },
  {
    label: 'Collaborate',
    items: [
      { label: 'Discover', icon: Compass, href: '/discover' },
      { label: 'Messages', icon: MessageCircle, href: '/messages', badge: 'unread' as const },
      { label: 'Groups', icon: Users, href: '/groups' },
    ],
  },
  {
    label: 'Library',
    items: [
      { label: 'Resources', icon: BookOpen, href: '/resources' },
      { label: 'Notes', icon: BookMarked, href: '/notes' },
    ],
  },
  {
    label: 'Insights',
    items: [
      { label: 'Analytics', icon: BarChart3, href: '/analytics' },
      { label: 'My Study', icon: Brain, href: '/my-study' },
    ],
  },
]

// Notes is a group-scoped feature: /notes index routes into the user's groups.
const mobileNav = [
  { label: 'Home', icon: LayoutDashboard, href: '/dashboard' },
  { label: 'Groups', icon: Users, href: '/groups' },
  { label: 'Focus', icon: Timer, href: '/focus' },
  { label: 'Messages', icon: MessageCircle, href: '/messages' },
  { label: 'Profile', icon: Avatar, href: '/profile' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, isLoading, init, logout } = useSession()
  const { theme, sidebarCollapsed, setSidebarCollapsed, setCommandOpen } = useUIStore()

  const [mobileOpen, setMobileOpen] = useState(false)
  const [myGroups, setMyGroups] = useState<GroupSummary[]>([])
  const [notifCount, setNotifCount] = useState(0)
  const [overdueCount, setOverdueCount] = useState(0)
  const [nextSession, setNextSession] = useState<{ id: string; startsAt: string } | null>(null)
  // Server-derived unread counts: Messages nav badge + per-group dots.
  const totalUnread = myGroups.reduce((sum, g) => sum + (g.unreadCount ?? 0), 0)
  // Contextual sidebar badges: overdue task count and "today" session dot.
  const badgeState = {
    // Hide the overdue badge entirely when there is nothing overdue (no red "0")
    overdue: overdueCount > 0 ? overdueCount : null,
    nextSession:
      nextSession && new Date(nextSession.startsAt).toDateString() === new Date().toDateString()
        ? 'today'
        : null,
    unread: totalUnread > 0 ? totalUnread : null,
  } as { overdue: number | null; nextSession: string | null; unread: number | null }
  const [needsOnboarding, setNeedsOnboarding] = useState(false)

  useEffect(() => { init() }, [init])

  // First-time onboarding gate (checked once per session after auth resolves)
  useEffect(() => {
    if (!user || needsOnboarding) return
    api.get<{ completed: boolean }>('/api/onboarding')
      .then((d) => { if (!d.completed) setNeedsOnboarding(true) })
      .catch(() => { /* fail open — onboarding is not worth blocking the app */ })
  }, [user, needsOnboarding])

  // Close mobile drawer on navigation
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Load sidebar groups + unread count (light payload)
  useEffect(() => {
    if (!user) return
    let alive = true
    api.get<{ groups: GroupSummary[] }>('/api/groups?mine=1&pageSize=12')
      .then((d) => { if (alive) setMyGroups(d.groups) })
      .catch(() => {})
    api.get<{ unreadCount: number }>('/api/notifications?pageSize=1')
      .then((d) => { if (alive) setNotifCount(d.unreadCount) })
      .catch(() => {})
    // Contextual nav badges — real data, refreshed per navigation (tiny payloads)
    // The overdue badge reads the aggregate `total`, not the (min-clamped) rows.
    api.get<{ total: number }>('/api/tasks?scope=mine&due=overdue&pageSize=10')
      .then((d) => { if (alive) setOverdueCount(d.total) })
      .catch(() => {})
    api.get<{ sessions: Array<{ id: string; startsAt: string }> }>('/api/sessions?limit=1')
      .then((d) => { setNextSession(d.sessions[0] ?? null) })
      .catch(() => {})
    return () => { alive = false }
  }, [user, pathname])

  // Global shortcuts: Cmd/Ctrl-K palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setCommandOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [setCommandOpen])

  const handleLogout = useCallback(async () => {
    await logout()
    router.push('/login')
    router.refresh()
  }, [logout, router])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--sg-background))]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <p className="mt-3 text-sm text-muted">Loading workspace…</p>
        </div>
      </div>
    )
  }

  // Block the workspace behind the one-time wizard (full-screen)
  if (needsOnboarding) {
    return <OnboardingWizardLazy onFinished={() => setNeedsOnboarding(false)} />
  }

  const isActive = (href: string) => pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-[60px] shrink-0 items-center justify-between border-b px-3">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark />
          {!sidebarCollapsed && <span className="text-sm font-semibold tracking-tight">Study-Group</span>}
        </Link>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden rounded-md p-1.5 text-muted transition-colors hover:bg-[rgb(var(--sg-hover))] lg:block"
          aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <PanelLeft className={cn('h-4 w-4 transition-transform', sidebarCollapsed && 'rotate-180')} />
        </button>
      </div>

      {/* Mobile-only search entry — the header pill hides below md, so the
          drawer carries the affordance. One tap opens the command palette. */}
      <button
        onClick={() => { setMobileOpen(false); setCommandOpen(true) }}
        className="mx-2 mt-2 flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border bg-[rgb(var(--sg-background))] px-3 text-sm text-muted transition-colors hover:border-[rgb(var(--sg-accent))]/40 lg:hidden"
        aria-label="Search"
      >
        <Search className="h-4 w-4" />
        <span>Search groups, tasks, sessions…</span>
      </button>

      <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <nav className="space-y-3" aria-label="Primary">
          {navSections.map((section) => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <p className="px-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted">{section.label}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const badgeValue = item.badge === 'overdue' ? badgeState.overdue : item.badge === 'nextSession' ? badgeState.nextSession : item.badge === 'unread' ? badgeState.unread : null
                  return (
                    <Link
                      key={item.label} href={item.href}
                      className={cn('nav-item', isActive(item.href) ? 'nav-item-active' : 'nav-item-inactive')}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                      {!sidebarCollapsed && badgeValue !== null && (
                        <span
                          className={cn(
                            'ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none',
                            item.badge === 'overdue' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300',
                          )}
                        >
                          {badgeValue}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {!sidebarCollapsed && myGroups.length > 0 && (
          <div className="border-t pt-3">
            <p className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted">My groups</p>
            <div className="space-y-0.5">
              {myGroups.slice(0, 6).map((g) => (
                <Link
                  key={g.id} href={`/groups/${g.id}`}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors',
                    pathname.startsWith(`/groups/${g.id}`) ? 'nav-item-active' : 'text-secondary hover:bg-[rgb(var(--sg-hover))]'
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-[10px] font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                    {g.name[0]}
                  </span>
                  <span className="truncate">{g.name}</span>
                  {!!g.unreadCount && (
                    <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-indigo-500" aria-label={`${g.unreadCount} unread messages`} />
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 space-y-0.5 border-t px-2 py-2">
        <Link href="/profile" className={cn('nav-item', isActive('/profile') ? 'nav-item-active' : 'nav-item-inactive')} title="Profile">
          <Avatar name={user.name} src={user.avatarUrl} size="xs" />
          {!sidebarCollapsed && <span className="truncate text-sm">Profile</span>}
        </Link>
        <Link href="/settings" className={cn('nav-item', isActive('/settings') ? 'nav-item-active' : 'nav-item-inactive')}>
          <Settings className="h-[18px] w-[18px]" />
          {!sidebarCollapsed && <span>Settings</span>}
        </Link>
        <button onClick={handleLogout} className="nav-item nav-item-inactive w-full">
          <LogOut className="h-[18px] w-[18px]" />
          {!sidebarCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[rgb(var(--sg-background))]">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-[rgb(var(--sg-card))] transition-all duration-200 lg:flex',
          sidebarCollapsed ? 'w-[68px]' : 'w-60'
        )}
      >
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed inset-y-0 left-0 z-50 w-64 border-r bg-[rgb(var(--sg-card))] lg:hidden"
            >
              {sidebar}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className={cn('flex min-h-screen w-full flex-col transition-all duration-200', sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-60')}>
        {/* Topbar */}
        <header className="sticky top-0 z-20 border-b bg-[rgb(var(--sg-card))]/90 backdrop-blur">
          <div className="flex h-[60px] items-center justify-between gap-3 px-4 pb-[env(safe-area-inset-bottom)] sm:px-6">
            <div className="flex items-center gap-2">
              <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-muted hover:bg-[rgb(var(--sg-hover))] lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCommandOpen(true)}
                className="hidden items-center gap-2 rounded-lg border bg-[rgb(var(--sg-background))] px-3 py-2 text-sm text-muted transition-colors hover:border-[rgb(var(--sg-accent))]/40 md:flex"
              >
                <Search className="h-4 w-4" />
                <span>Search…</span>
                <kbd className="ml-4 rounded bg-[rgb(var(--sg-hover))] px-1.5 py-0.5 text-[10px] font-medium">⌘K</kbd>
              </button>
              {/* Compact search affordance on small screens — one tap to the palette */}
              <button
                onClick={() => setCommandOpen(true)}
                className="rounded-md p-3 text-muted transition-colors hover:bg-[rgb(var(--sg-hover))] hover:text-[rgb(var(--sg-foreground))] md:hidden"
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <StudymateButton />
              <Link href="/groups?create=1" className="btn btn-primary btn-sm hidden sm:inline-flex">
                <Plus className="h-4 w-4" /> Create group
              </Link>
              <NotificationCenter trigger={(
                <button className="relative rounded-lg p-2 text-muted transition-colors hover:bg-[rgb(var(--sg-hover))] hover:text-[rgb(var(--sg-foreground))]" aria-label={`Notifications (${notifCount} unread)`}>
                  <Bell className="h-[18px] w-[18px]" />
                  {notifCount > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {notifCount > 9 ? '9+' : notifCount}
                    </span>
                  )}
                </button>
              )} onCountChange={setNotifCount} />
              <ThemeToggle />
              <Link
                href="/profile"
                className="ml-1 rounded-full ring-offset-2 transition-shadow hover:ring-2 hover:ring-[rgb(var(--sg-accent))]/30"
                aria-label="Your profile"
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 pb-20 lg:pb-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-[rgb(var(--sg-card))] lg:hidden" aria-label="Mobile">
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
          {mobileNav.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.label} href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-1 text-[10px] font-medium transition-colors',
                  active ? 'text-indigo-600 dark:text-indigo-400' : 'text-muted'
                )}
              >
                {item.label === 'Profile'
                  ? <Avatar name={user.name} src={user.avatarUrl} size="xs" className={cn(!active && 'opacity-60')} />
                  : <item.icon className="h-5 w-5" />}
                {item.label}
              </Link>
            )
          })}
        </div>
      </nav>

      <CommandPalette />
      <StudymatePanel />
      <ToastViewport />
    </div>
  )
}

function PanelLeft({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
    </svg>
  )
}

/** Brand icon mark — two joined figures forming an S, the collaboration identity. */
function BrandMark() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-gradient-to-br from-[rgb(var(--sg-accent))] to-[rgb(var(--sg-accent-muted))] text-white shadow-sm" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
        <circle cx="8" cy="7" r="2.6" />
        <path d="M3.5 18.5c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
        <circle cx="16.5" cy="9" r="2.1" />
        <path d="M13.5 18.5c.4-2.2 2.3-3.6 4.5-3.6 1.4 0 2.7.6 3.5 1.6" />
      </svg>
    </span>
  )
}
