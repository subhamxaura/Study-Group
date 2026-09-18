'use client'
import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { api } from '@/lib/client'

function RegisterForm() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', university: '' })
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setFieldErrors({}); setSubmitting(true)
    try {
      await api.post('/api/auth/register', form)
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed'
      if (msg.includes('password')) setFieldErrors({ password: msg })
      else if (msg.includes('email')) setError(msg)
      else setError(msg)
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
          <h2 className="text-3xl font-semibold leading-tight tracking-tight">Create your workspace.</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-secondary">
            Start a study group, invite classmates and keep everything organized from day one.
          </p>
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
            <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-secondary">Find your people. Keep your momentum.</p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <Input label="Full name" placeholder="Aarav Sharma" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
              <Input label="Email address" type="email" placeholder="you@university.edu" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required autoComplete="email" />
              <Input label="University (optional)" placeholder="Delhi University" value={form.university} onChange={(e) => setForm((p) => ({ ...p, university: e.target.value }))} />
              <div className="relative">
                <Input
                  label="Password" type={show ? 'text' : 'password'} placeholder="At least 8 characters"
                  value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required minLength={8}
                  autoComplete="new-password" error={fieldErrors.password}
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
                <UserPlus className="h-4 w-4" /> Create account
              </Button>
              <p className="text-center text-xs text-muted">By creating an account you agree to our Terms and Privacy.</p>
            </form>
          </Card>
          <p className="mt-4 text-center text-sm text-secondary">
            Already have an account? <Link href="/login" className="font-medium text-indigo-600 dark:text-indigo-400">Sign in</Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--sg-background))]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}
