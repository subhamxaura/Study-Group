'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/lib/store'
import { mockUsers } from '@/lib/mockData'
import { generateId } from '@/lib/utils'

export default function LoginPage() {
  const router = useRouter()
  const { setAuth, isLoading } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (useAuthStore.getState().user && !isLoading) {
      router.push('/groups')
    }
  }, [isLoading, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    await new Promise((r) => setTimeout(r, 800))

    const user = mockUsers.find((u) => u.email === email)
    if (user) {
      setAuth(user, generateId())
      router.push('/groups')
    } else {
      setError('Invalid email or password. Try using one of the demo accounts below.')
      setIsSubmitting(false)
    }
  }

  const handleDemoLogin = async (userId: string) => {
    setIsSubmitting(true)
    setError('')
    await new Promise((r) => setTimeout(r, 500))
    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      setAuth(user, generateId())
      router.push('/groups')
    }
  }

  return (
    <div className="min-h-screen page-container flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-velvet-radial opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="h-16 w-16 rounded-2xl bg-gradient-to-br from-accent-gold to-accent-gold-muted mx-auto mb-4 flex items-center justify-center shadow-glow"
          >
            <span className="text-2xl font-bold text-subCrack-primary">SC</span>
          </motion.div>
          <h1 className="text-3xl font-bold text-text-primary">
            Welcome back
          </h1>
          <p className="text-text-muted mt-2">Sign in to your study group</p>
        </div>

        <Card variant="glass" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-10 p-1 text-text-muted hover:text-text-primary transition-colors"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="p-3 rounded-xl bg-status-error/10 border border-status-error/20 text-status-error text-sm"
              >
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              <LogIn className="h-4 w-4" />
              Sign In
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-velvet-charcoal/50">
            <p className="text-center text-sm text-text-muted mb-4">Or sign in with a demo account</p>
            <div className="grid grid-cols-2 gap-2">
              {mockUsers.slice(0, 4).map((user) => (
                <Button
                  key={user.id}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDemoLogin(user.id)}
                  disabled={isSubmitting}
                  className="justify-start gap-2"
                >
                  <div className="h-6 w-6 rounded-full bg-velvet-royal flex items-center justify-center">
                    <span className="text-xs font-medium">{user.name.charAt(0)}</span>
                  </div>
                  <span className="truncate text-xs">{user.name.split(' ')[0]}</span>
                </Button>
              ))}
            </div>
          </div>
        </Card>

        <p className="text-center text-sm text-text-muted mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-accent-gold hover:text-accent-gold-muted transition-colors">
            Sign up
          </Link>
        </p>
      </motion.div>
    </div>
  )
}