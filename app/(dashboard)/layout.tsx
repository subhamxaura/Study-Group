'use client'

import { useEffect, useState } from 'react'
import { useParams, usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home,
  Users,
  MessageCircle,
  Calendar,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  User,
  Moon,
  Sun,
} from 'lucide-react'
import { Button } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { useAuthStore, useUIStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const groupId = params.id as string
  const { user, isLoading, clearAuth } = useAuthStore()
  const { theme, setTheme } = useUIStore()

  const navItems = [
    { label: 'My Groups', icon: Users, href: '/groups' },
    { label: 'Discover', icon: Home, href: '/groups' },
    ...(groupId ? [
        { label: 'Chat', icon: MessageCircle, href: `/groups/${groupId}/chat` },
        { label: 'Calendar', icon: Calendar, href: `/groups/${groupId}/calendar` },
        { label: 'Resources', icon: BookOpen, href: `/groups/${groupId}/resources` },
        { label: 'Settings', icon: Settings, href: `/groups/${groupId}/settings` },
    ] : []),
  ]
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (isMounted && !isLoading && !user) {
      router.push('/login')
    }
  }, [isLoading, user, router, isMounted])

  if (!isMounted || isLoading) {
    return (
      <div className="min-h-screen page-container flex items-center justify-center bg-[#020203]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="h-12 w-12 border-2 border-[#9B00FF] border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_18px_rgba(155,0,255,0.45)]" />
          <p className="mt-4 text-text-muted">Loading...</p>
        </motion.div>
      </div>
    )
  }

  if (!user) return null

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  return (
    <div className="min-h-screen page-container flex">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-40 backdrop-blur-xl border-r border-white/[0.06]"
        style={{ background: 'rgba(5,5,7,0.72)' }}
      >
        <div className="flex items-center justify-between p-4 h-16">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                key="full-logo"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-3"
              >
                <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(109,0,255,0.45)]" style={{ background: 'linear-gradient(135deg,#6D00FF,#9B00FF 60%,#D000FF)' }}>
                  <span className="text-xs font-bold text-white">SC</span>
                </div>
                <span className="text-lg font-bold text-text-primary">SubCrack</span>
              </motion.div>
            ) : (
              <motion.div
                key="mini-logo"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="h-9 w-9 rounded-xl flex items-center justify-center shadow-[0_0_16px_rgba(109,0,255,0.45)] mx-auto"
                style={{ background: 'linear-gradient(135deg,#6D00FF,#9B00FF 60%,#D000FF)' }}
              >
                <span className="text-xs font-bold text-subCrack-primary">SC</span>
              </motion.div>
            )}
          </AnimatePresence>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-text-muted"
          >
            <ChevronLeft className={cn('h-5 w-5 transition-transform duration-300', !sidebarOpen && 'rotate-180')} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                  isActive
                    ? 'bg-[rgba(109,0,255,0.16)] text-[#E8D4FF] border border-[#9B00FF]/20 shadow-[0_0_18px_rgba(109,0,255,0.18)]'
                    : 'text-text-secondary hover:bg-white/[0.06] hover:text-text-primary'
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06]">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-text-secondary hover:bg-white/[0.06] hover:text-text-primary transition-all duration-200"
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5 flex-shrink-0" /> : <Moon className="h-5 w-5 flex-shrink-0" />}
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 w-full text-text-secondary hover:bg-status-error/10 hover:text-status-error transition-all duration-200"
          >
            <LogOut className="h-5 w-5 flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="text-sm font-medium whitespace-nowrap overflow-hidden"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>

        {/* User Profile */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex items-center gap-3">
              <Avatar name={user.name} src={user.avatar} size="md" status="online" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                <p className="text-xs text-text-muted truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="glass p-2"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-40 bg-subCrack-primary/80 backdrop-blur-sm"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="lg:hidden fixed inset-y-0 left-0 z-50 w-[280px] bg-subCrack-secondary border-r border-velvet-charcoal/50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 h-16 border-b border-velvet-charcoal/50">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent-gold to-accent-gold-muted flex items-center justify-center shadow-glow">
                <span className="text-xs font-bold text-white">SC</span>
                </div>
                <span className="text-lg font-bold text-text-primary">SubCrack</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/[0.06] text-text-muted"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200',
                        isActive
                          ? 'bg-[rgba(109,0,255,0.16)] text-[#E8D4FF] border border-[#9B00FF]/20 shadow-[0_0_18px_rgba(109,0,255,0.18)]'
                          : 'text-text-secondary hover:bg-white/[0.06] hover:text-text-primary'
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="p-4 border-t border-white/[0.06]">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={user.name} src={user.avatar} size="md" status="online" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{user.name}</p>
                    <p className="text-xs text-text-muted truncate">{user.email}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="w-full mb-2 justify-start"
                >
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main
        className={cn(
          'flex-1 transition-all duration-300',
          sidebarOpen ? 'lg:ml-[260px]' : 'lg:ml-[72px]'
        )}
      >
        {children}
      </main>
    </div>
  )
}
