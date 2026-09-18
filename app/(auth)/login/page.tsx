'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { api } from '@/lib/client'
import type { SafeUser } from '@/types'

function LoginForm() {
  const router = useRouter()
  const search = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    // Already signed in? go to dashboard
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.ok && j.data?.user) router.replace('/dashboard') })
      .catch(() => {})
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSubmitting(true)
    try {
      await api.post('/api/auth/login', { email, password })
      router.push(search.get('next') || '/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed')
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[rgb(var(--sg-background))]">
      <div className="hidden flex-1 flex-col justify-between border-r bg-[rgb(var(--sg-card))] p-10 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">S</span>
          <span className="font-semibold">Study-Group</span>
        </Link>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">A workspace for focused study, together.</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-secondary">
            Join groups, share resources, discuss concepts and keep momentum — one calm, organized place for learning.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-secondary">
            <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> Organized groups by subject</li>
            <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> Chat, sessions, tasks & notes</li>
            <li className="flex gap-2"><span className="text-emerald-600 dark:text-emerald-400">✓</span> Focus timer with streaks</li>
          </ul>
        </div>
        <p className="text-xs text-muted">© {new Date().getFullYear()} Study-Group</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} className="w-full max-w-[440px]">
          <div className="mb-6 flex items-center justify-center gap-2 lg:hidden">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">S</span>
            <span className="font-semibold">Study-Group</span>
          </div>
          <Card className="p-6 sm:p-7">
            <h1 className="text-xl font-semibold tracking-tight">Welcome back</h1>
            <p className="mt-1 text-sm text-secondary">Sign in to your workspace.</p>
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
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300" role="alert">
                  {error}
                </div>
              )}
              <Button type="submit" className="w-full" size="lg" isLoading={submitting} disabled={submitting}>
                <LogIn className="h-4 w-4" /> Sign in
              </Button>
            </form>
          </Card>
          <p className="mt-4 text-center text-sm text-secondary">
            Don&apos;t have an account? <Link href="/register" className="font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400">Create account</Link>
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
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
