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

  const dotClass = ['quad-dot-b', 'quad-dot-v', 'quad-dot-a', 'quad-dot-g']
  const initialsOf = (n: string) => n.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
  const avatarTone = (n: string) => {
    const tones = ['quad-avatar-sa', 'quad-avatar-ap', 'quad-avatar-jk', 'quad-avatar-mr', 'quad-avatar-lt']
    let h = 0
    for (const c of n) h = (h * 31 + c.charCodeAt(0)) >>> 0
    return tones[h % tones.length]
  }

  const sidebar = (
    <div className="relative isolate flex h-full flex-col overflow-hidden">
      {/* Quad design mesh — visual only */}
      <div className="quad-mesh hidden dark:block" aria-hidden="true" />
      <div className="flex shrink-0 items-center justify-between border-b px-[18px] pb-[18px] pt-[20px]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark />
          {!sidebarCollapsed && (
            <span className="leading-tight">
              <span className="block text-[14.5px] font-semibold tracking-[-0.01em]">Study-Group</span>
              <span className="block text-[11.5px] font-normal text-muted">{user.name.split(' ')[0]} · Study workspace</span>
            </span>
          )}
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

      <div className="flex-1 space-y-2 overflow-y-auto py-[14px]">
        <nav className="space-y-3" aria-label="Primary">
          {navSections.map((section) => (
            <div key={section.label}>
              {!sidebarCollapsed && (
                <p className="px-[18px] pb-2 text-[11.5px] font-medium text-muted">{section.label}</p>
              )}
              <div className="space-y-0">
                {section.items.map((item) => {
                  const badgeValue = item.badge === 'overdue' ? badgeState.overdue : item.badge === 'nextSession' ? badgeState.nextSession : item.badge === 'unread' ? badgeState.unread : null
                  return (
                    <Link
                      key={item.label} href={item.href}
                      className={cn(
                        'nav-item border-l-2 border-transparent dark:rounded-none dark:px-[18px] dark:py-[8px] dark:text-[13.5px] dark:font-medium',
                        isActive(item.href) ? 'nav-item-active dark:quad-nav-active' : 'nav-item-inactive dark:hover:bg-white/[0.03]',
                      )}
                      title={sidebarCollapsed ? item.label : undefined}
                    >
                      <item.icon className="h-4 w-4 shrink-0 dark:h-[16px] dark:w-[16px]" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                      {!sidebarCollapsed && badgeValue !== null && (
                        <span className="ml-auto rounded-full border border-[rgb(var(--sg-border))] bg-white/[0.07] px-[7px] py-px text-[11px] text-muted dark:border-white/[0.06]">
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

        {!sidebarCollapsed && (
          <div className="mt-2 border-t pt-[10px] dark:border-white/[0.06]">
            <p className="px-[18px] pb-2 text-[11.5px] font-medium text-muted">Groups</p>
            <div className="space-y-0">
              {myGroups.slice(0, 6).map((g, i) => (
                <Link
                  key={g.id} href={`/groups/${g.id}`}
                  className={cn(
                    'flex items-center gap-2.5 border-l-2 border-transparent px-[18px] py-[7px] text-[13px] transition-colors dark:rounded-none',
                    pathname.startsWith(`/groups/${g.id}`) ? 'nav-item-active dark:quad-nav-active' : 'text-secondary hover:bg-[rgb(var(--sg-hover))] dark:text-[#9E9EB4] dark:hover:bg-white/[0.03] dark:hover:text-[#F1F1F5]'
                  )}
                >
                  <span className={cn('quad-dot', dotClass[i % dotClass.length])} aria-hidden="true" />
                  <span className="truncate font-normal not-italic">{g.name}</span>
                  <span className="ml-auto text-[11px] text-muted">{g.memberCount}</span>
                  {!!g.unreadCount && (
                    <span className="quad-pulse h-2 w-2 shrink-0 rounded-full bg-[#5B8DEF]" aria-label={`${g.unreadCount} unread messages`} />
                  )}
                </Link>
              ))}
              {myGroups.length === 0 && (
                <Link href="/discover" className="block px-[18px] py-[7px] text-[13px] text-muted hover:text-[rgb(var(--sg-foreground))]">
                  Discover groups…
                </Link>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t px-2 py-2 dark:border-white/[0.06]">
        {/* Quad user block — real user, links to profile (visual only, no logic change) */}
        {!sidebarCollapsed && (
          <Link href="/profile" className="mt-auto flex items-center gap-2.5 px-[8px] pb-2 pt-[14px]">
            <span className={cn('grid h-8 w-8 flex-none place-items-center rounded-full border border-white/20 text-[12px] font-semibold text-white', avatarTone(user.name))} aria-hidden="true">
              {initialsOf(user.name)}
            </span>
            <span className="leading-tight">
              <span className="block text-[13px] font-semibold leading-[1.3]">{user.name.split(' ')[0]}</span>
              <span className="block text-[11.5px] text-muted">View profile</span>
            </span>
          </Link>
        )}
        <Link href="/profile" className={cn('nav-item border-l-2 border-transparent dark:rounded-none dark:px-[18px] dark:py-[8px]', isActive('/profile') ? 'nav-item-active dark:quad-nav-active' : 'nav-item-inactive')} title="Profile">
          <Avatar name={user.name} src={user.avatarUrl} size="xs" />
          {!sidebarCollapsed && <span className="truncate text-sm">Profile</span>}
        </Link>
        <Link href="/settings" className={cn('nav-item border-l-2 border-transparent dark:rounded-none dark:px-[18px] dark:py-[8px]', isActive('/settings') ? 'nav-item-active dark:quad-nav-active' : 'nav-item-inactive')}>
          <Settings className="h-[18px] w-[18px] dark:h-[16px] dark:w-[16px]" />
          {!sidebarCollapsed && <span>Settings</span>}
        </Link>
        <button onClick={handleLogout} className="nav-item nav-item-inactive w-full border-l-2 border-transparent dark:rounded-none dark:px-[18px] dark:py-[8px]">
          <LogOut className="h-[18px] w-[18px] dark:h-[16px] dark:w-[16px]" />
          {!sidebarCollapsed && <span>Sign out</span>}
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex min-h-screen bg-[rgb(var(--sg-background))]">
      {/* Desktop sidebar — Quad: 220px, #0A0A14 in dark */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 hidden flex-col border-r bg-[rgb(var(--sg-card))] transition-all duration-200 dark:border-white/[0.06] dark:bg-[#0A0A14] lg:flex',
          sidebarCollapsed ? 'w-[68px]' : 'w-[220px]'
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

      {/* Main column — Quad: 0 28px 40px content padding lives on pages */}
      <div className={cn('relative z-[1] flex min-h-screen w-full flex-col transition-all duration-200', sidebarCollapsed ? 'lg:pl-[68px]' : 'lg:pl-[220px]')}>
        {/* Topbar — Quad: sticky gradient fade, 460px search, 36px icon-btn, primary New session */}
        <header className="sticky top-0 z-20 border-b bg-[rgb(var(--sg-card))]/90 backdrop-blur dark:border-transparent dark:bg-gradient-to-b dark:from-[#08080F] dark:via-[#08080F]/85 dark:to-transparent">
          <div className="flex min-h-[60px] items-center gap-[14px] px-4 py-[18px] pb-[env(safe-area-inset-bottom)] sm:px-7">
            <div className="relative flex-1 md:max-w-[460px]">
              <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-muted hover:bg-[rgb(var(--sg-hover))] lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </button>
              <button
                onClick={() => setCommandOpen(true)}
                className="hidden w-full items-center gap-2 rounded-[10px] border bg-[rgb(var(--sg-background))] py-[9px] pl-[34px] pr-[40px] text-left text-[13.5px] text-muted transition-colors hover:border-[rgb(var(--sg-accent))]/40 dark:border-white/[0.07] dark:bg-[#0F0F1A] md:flex"
                aria-label="Search sessions, notes, files"
              >
                <Search className="absolute left-3 h-[15px] w-[15px] text-muted" aria-hidden="true" />
                <span>Search sessions, notes, files…</span>
                <kbd className="absolute right-[10px] rounded-md border border-[rgb(var(--sg-border))] bg-white/[0.03] px-1.5 py-px font-sans text-[11px] dark:border-white/10">⌘K</kbd>
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
            <div className="ml-auto flex items-center gap-2.5">
              <StudymateButton />
              <Link href="/groups?create=1" className="btn btn-secondary btn-sm hidden xl:inline-flex">
                <Plus className="h-4 w-4" /> Create group
              </Link>
              <Link href="/calendar?create=1" className="btn btn-primary btn-sm hidden sm:inline-flex">
                New session
              </Link>
              <NotificationCenter trigger={(
                <button className="quad-icon-btn relative grid h-9 w-9 place-items-center rounded-[10px] text-muted transition-colors hover:text-[rgb(var(--sg-foreground))]" aria-label={`Notifications (${notifCount} unread)`}>
                  <Bell className="h-[17px] w-[17px]" />
                  {notifCount > 0 && (
                    <span className="absolute right-[9px] top-2 h-[7px] w-[7px] rounded-full bg-[#F87171] ring-2 ring-[#0F0F1A]" aria-hidden="true" />
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
                  active ? 'text-indigo-600 dark:text-[#8AA8F5]' : 'text-muted'
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

/** Brand icon mark — Quad gradient tile with Q (visual only, same identity). */
function BrandMark() {
  return (
    <span className="quad-brand-mark font-display grid h-[30px] w-[30px] flex-none place-items-center rounded-[9px] text-[16px] font-semibold text-white" aria-hidden="true">
      Q
    </span>
  )
}
