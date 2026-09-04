'use client'
import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutDashboard, Users, Compass, MessageCircle, Calendar, BookOpen, CheckSquare, Bell, Settings, LogOut, Menu, X, ChevronLeft, Search, Moon, Sun } from 'lucide-react'
import { Button, Avatar } from '@/components/ui'
import { useAuthStore, useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const groupId = params.id as string
  const { user, isLoading, clearAuth } = useAuthStore()
  const { theme, setTheme } = useUIStore()

  const mainNav = [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/groups' },
    { label: 'My Groups', icon: Users, href: '/groups' },
    { label: 'Discover', icon: Compass, href: '/groups' },
    { label: 'Messages', icon: MessageCircle, href: groupId ? `/groups/${groupId}/chat` : '/groups', badge: 3 },
    { label: 'Resources', icon: BookOpen, href: groupId ? `/groups/${groupId}/resources` : '/groups' },
    { label: 'Tasks', icon: CheckSquare, href: groupId ? `/groups/${groupId}/calendar` : '/groups' },
  ]
  const groupNav = groupId ? [
    { label: 'Overview', icon: LayoutDashboard, href: `/groups/${groupId}` },
    { label: 'Discussion', icon: MessageCircle, href: `/groups/${groupId}/chat` },
    { label: 'Resources', icon: BookOpen, href: `/groups/${groupId}/resources` },
    { label: 'Schedule', icon: Calendar, href: `/groups/${groupId}/calendar` },
    { label: 'Members', icon: Users, href: `/groups/${groupId}/members` },
    { label: 'Settings', icon: Settings, href: `/groups/${groupId}/settings` },
  ] : []

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(()=> setMounted(true), [])
  useEffect(()=>{ if(mounted && !isLoading && !user) router.push('/login') }, [mounted,isLoading,user,router])

  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--sg-background))]">
        <div className="text-center">
          <div className="h-10 w-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-[rgb(var(--sg-muted))]">Loading workspace…</p>
        </div>
      </div>
    )
  }
  if (!user) return null

  const handleLogout = () => { clearAuth(); router.push('/login') }
  const isActive = (href: string) => pathname === href || (href !== '/groups' && pathname.startsWith(href))

  return (
    <div className="min-h-screen bg-[rgb(var(--sg-background))] flex">
      {/* Desktop sidebar */}
      <motion.aside initial={false} animate={{ width: sidebarOpen ? 256 : 72 }} transition={{ duration: 0.22, ease: [0.4,0,0.2,1] }}
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30 border-r bg-[rgb(var(--sg-card))]">
        <div className="flex items-center justify-between h-[64px] px-3 border-b shrink-0">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div key="full" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="flex items-center gap-2.5">
                <span className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">S</span>
                <span className="text-sm font-semibold">Study-Group</span>
              </motion.div>
            ) : (
              <motion.span key="mini" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mx-auto h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">S</motion.span>
            )}
          </AnimatePresence>
          <button onClick={()=> setSidebarOpen(!sidebarOpen)} className="hidden lg:flex p-1.5 rounded-md hover:bg-[rgb(var(--sg-hover))] text-[rgb(var(--sg-muted))]"><ChevronLeft className={cn('h-4 w-4 transition-transform', !sidebarOpen && 'rotate-180')} /></button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-5">
          <nav className="space-y-1">
            {mainNav.map(item=>(
              <Link key={item.label} href={item.href} className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors', isActive(item.href) ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/20' : 'text-[rgb(var(--sg-secondary))] hover:bg-[rgb(var(--sg-hover))] hover:text-[rgb(var(--sg-foreground))]')}>
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {sidebarOpen && <><span className="flex-1 truncate">{item.label}</span>{(item as any).badge && <span className="ml-auto text-xs bg-indigo-600 text-white rounded-full px-1.5 py-0.5">{(item as any).badge}</span>}</>}
              </Link>
            ))}
          </nav>

          {groupId && sidebarOpen && (
            <div>
              <p className="px-2.5 mb-2 text-[11px] font-semibold tracking-widest text-[rgb(var(--sg-muted))] uppercase">Current group</p>
              <nav className="space-y-1">
                {groupNav.map(item=>(
                  <Link key={item.href} href={item.href} className={cn('flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors', isActive(item.href) ? 'bg-[rgb(var(--sg-hover))] text-[rgb(var(--sg-foreground))] font-medium' : 'text-[rgb(var(--sg-secondary))] hover:bg-[rgb(var(--sg-hover))]')}>
                    <item.icon className="h-4 w-4" /> {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>

        <div className="border-t p-2 space-y-2 shrink-0">
          <button onClick={()=> setTheme(theme==='dark'?'light':'dark')} className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm text-[rgb(var(--sg-secondary))] hover:bg-[rgb(var(--sg-hover))]"><span className="h-8 w-8 rounded-lg bg-[rgb(var(--sg-hover))] flex items-center justify-center">{theme==='dark'?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}</span>{sidebarOpen && <span className="text-sm">{theme==='dark'?'Light mode':'Dark mode'}</span>}</button>
          <button onClick={handleLogout} className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-sm text-[rgb(var(--sg-secondary))] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><LogOut className="h-4 w-4" />{sidebarOpen && 'Sign out'}</button>
          {sidebarOpen && (
            <div className="flex items-center gap-2.5 rounded-lg border p-2.5 bg-[rgb(var(--sg-surface-muted))]">
              <Avatar name={user.name} src={user.avatar} size="md" status="online" />
              <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate leading-none">{user.name}</p><p className="text-xs text-[rgb(var(--sg-muted))] truncate">{user.email}</p></div>
              <span className="h-2 w-2 rounded-full bg-emerald-500" title="Online" />
            </div>
          )}
        </div>
      </motion.aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-[56px] border-b bg-[rgb(var(--sg-card))] flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <button onClick={()=> setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-[rgb(var(--sg-hover))]"><Menu className="h-5 w-5" /></button>
          <span className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">S</span>
          <span className="text-sm font-semibold">Study-Group</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/groups" className="p-2 rounded-lg hover:bg-[rgb(var(--sg-hover))]"><Search className="h-5 w-5 text-[rgb(var(--sg-muted))]" /></Link>
          <Avatar name={user.name} src={user.avatar} size="sm" />
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="lg:hidden fixed inset-0 z-40 bg-black/30" onClick={()=> setMobileOpen(false)} />
            <motion.aside initial={{x:-280}} animate={{x:0}} exit={{x:-280}} transition={{type:'spring', damping:24, stiffness:260}} className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-[rgb(var(--sg-card))] border-r flex flex-col">
              <div className="h-[56px] flex items-center justify-between px-4 border-b">
                <span className="flex items-center gap-2 font-semibold"><span className="h-7 w-7 rounded-md bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">S</span> Study-Group</span>
                <button onClick={()=> setMobileOpen(false)} className="p-2 rounded-lg hover:bg-[rgb(var(--sg-hover))]"><X className="h-5 w-5" /></button>
              </div>
              <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                {mainNav.map(item=>(
                  <Link key={item.label} href={item.href} onClick={()=> setMobileOpen(false)} className={cn('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm', isActive(item.href)?'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300':'text-[rgb(var(--sg-secondary))]')}>
                    <item.icon className="h-5 w-5" />{item.label}
                  </Link>
                ))}
                {groupId && <div className="pt-4 border-t mt-3"><p className="text-[11px] font-semibold tracking-widest text-[rgb(var(--sg-muted))] uppercase px-3 mb-2">Current group</p>{groupNav.map(i=>(<Link key={i.href} href={i.href} onClick={()=> setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-[rgb(var(--sg-secondary))]"><i.icon className="h-4 w-4" />{i.label}</Link>))}</div>}
              </nav>
              <div className="p-3 border-t space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar name={user.name} src={user.avatar} size="md" status="online" />
                  <div className="min-w-0"><p className="text-sm font-medium truncate">{user.name}</p><p className="text-xs text-[rgb(var(--sg-muted))] truncate">{user.email}</p></div>
                </div>
                <Button variant="ghost" size="sm" onClick={()=> setTheme(theme==='dark'?'light':'dark')} className="w-full justify-start"><Sun className="h-4 w-4" /> {theme==='dark'?'Light mode':'Dark mode'}</Button>
                <Button variant="danger" size="sm" onClick={handleLogout} className="w-full">Sign out</Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Content */}
      <main className={cn('flex-1 min-w-0', sidebarOpen ? 'lg:ml-[256px]' : 'lg:ml-[72px]', 'pt-[56px] lg:pt-0')}>
        {/* Top bar for desktop search */}
        <div className="hidden lg:flex h-[64px] items-center justify-between border-b bg-[rgb(var(--sg-card))] px-6 gap-4 sticky top-0 z-20">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[rgb(var(--sg-muted))]" />
              <input placeholder="Search groups, resources, people…" className="w-full rounded-lg border bg-[rgb(var(--sg-surface-muted))] pl-9 pr-3 py-2 text-sm placeholder:text-[rgb(var(--sg-muted))] focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-500/20" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-lg hover:bg-[rgb(var(--sg-hover))] border"><Bell className="h-5 w-5 text-[rgb(var(--sg-muted))]" /><span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-[rgb(var(--sg-card))]" /></button>
            <div className="h-6 w-px bg-[rgb(var(--sg-border))]" />
            <Avatar name={user.name} src={user.avatar} size="sm" status="online" />
          </div>
        </div>
        <div className="min-h-[calc(100vh-64px)]">
          {children}
        </div>
      </main>
    </div>
  )
}
