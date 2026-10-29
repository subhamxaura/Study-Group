'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { api } from '@/lib/client'
import { useSession } from '@/lib/store'
import type { SafeUser } from '@/types'

function safeReturnPath(candidate: string | null): string {
  if (!candidate) return '/dashboard'
  try {
    const target = new URL(candidate, window.location.origin)
    if (target.origin !== window.location.origin) return '/dashboard'
    return `${target.pathname}${target.search}${target.hash}`
  } catch {
    return '/dashboard'
  }
}

function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const setUser = useSession((s) => s.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(true)
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // If already authenticated, redirect immediately
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.ok && j.data?.user) {
          setUser(j.data.user)
          router.replace(safeReturnPath(search.get('next')))
        }
      })
      .catch(() => {})
  }, [router, search, setUser])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const res = await api.post<{ user: SafeUser }>('/api/auth/login', { email, password, rememberMe })
      if (res?.user) {
        setUser(res.user)
      }
      router.push(safeReturnPath(search.get('next')))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[rgb(var(--sg-background))]">
      {/* Left editorial brand panel */}
      <div className="hidden flex-1 flex-col justify-between border-r border-[rgb(var(--sg-border))] bg-[rgb(var(--sg-card))] p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[rgb(var(--sg-accent))] text-white shadow-md shadow-[rgb(var(--sg-accent))]/20">
            <svg className="h-5 w-5 text-emerald-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-[rgb(var(--sg-foreground))]">Study·Group</span>
        </Link>
        <div className="max-w-md space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgb(var(--sg-accent))]/30 bg-[rgb(var(--sg-accent-soft))] px-3 py-1 text-xs font-semibold text-[rgb(var(--sg-accent))]">
            <span>🌿</span> Botanical Academic Workspace
          </div>
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight text-[rgb(var(--sg-foreground))]">
            Cultivate your knowledge, <span className="font-normal italic text-[rgb(var(--sg-accent))]">together.</span>
          </h2>
          <p className="text-sm leading-relaxed text-secondary">
            Join study circles, share lecture notes, conquer problem sets, and study with distraction-free focus rooms.
          </p>
          <ul className="space-y-2.5 pt-2 text-sm text-secondary">
            <li className="flex items-center gap-2"><span className="text-[rgb(var(--sg-accent))] font-bold">✓</span> Subject circles with role permissions</li>
            <li className="flex items-center gap-2"><span className="text-[rgb(var(--sg-accent))] font-bold">✓</span> Real-time chat & Pomodoro focus rooms</li>
            <li className="flex items-center gap-2"><span className="text-[rgb(var(--sg-accent))] font-bold">✓</span> StudyMate AI active recall tutor</li>
          </ul>
        </div>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Study-Group. All rights reserved.</p>
      </div>

      {/* Right login form panel */}
      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="w-full max-w-[440px]">
          <div className="mb-6 flex items-center justify-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--sg-accent))] text-white">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <span className="font-display text-lg font-bold text-[rgb(var(--sg-foreground))]">Study·Group</span>
          </div>
          <Card className="rounded-3xl border border-[rgb(var(--sg-border))] p-6 sm:p-8 shadow-sm">
            <h1 className="font-display text-2xl font-bold tracking-tight text-[rgb(var(--sg-foreground))]">Welcome back</h1>
            <p className="mt-1 text-xs sm:text-sm text-secondary">Sign in to resume your study sessions.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input
                label="Email address" type="email" placeholder="you@university.edu"
                value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email"
              />
              <div className="relative">
                <Input
                  label="Password" type={show ? 'text' : 'password'} placeholder="••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password"
                />
                <button
                  type="button" onClick={() => setShow(!show)}
                  className="absolute right-2.5 top-[32px] rounded-md p-1.5 text-muted transition-colors hover:bg-[rgb(var(--sg-hover))]"
                  aria-label={show ? 'Hide password' : 'Show password'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {/* Persistent Remember Me Checkbox */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-secondary">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[rgb(var(--sg-border))] text-[rgb(var(--sg-accent))] focus:ring-0 cursor-pointer"
                  />
                  <span className="font-medium">Remember me on this device (30 days)</span>
                </label>
              </div>

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300" role="alert">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full btn-primary rounded-xl font-bold" size="lg" isLoading={submitting} disabled={submitting}>
                <LogIn className="h-4 w-4" /> Sign in
              </Button>
            </form>
          </Card>
          <p className="mt-5 text-center text-xs sm:text-sm text-secondary">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-bold text-[rgb(var(--sg-accent))] hover:underline">
              Create free account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--sg-background))]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[rgb(var(--sg-accent))] border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
