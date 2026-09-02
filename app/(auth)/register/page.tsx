'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { UserPlus, Eye, EyeOff } from 'lucide-react'
import { Button, Input, Card } from '@/components/ui'
import { useAuthStore } from '@/lib/store'
import { generateId } from '@/lib/utils'

export default function RegisterPage() {
  const router = useRouter()
  const { setAuth } = useAuthStore()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    await new Promise((r) => setTimeout(r, 1000))

    const newUser = {
      id: generateId(),
      name: formData.name,
      email: formData.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    setAuth(newUser, generateId())
    router.push('/groups')
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
            className="h-16 w-16 rounded-2xl bg-gradient-to-br from-velvet-royal to-velvet-plum mx-auto mb-4 flex items-center justify-center shadow-glow-purple"
          >
            <UserPlus className="h-8 w-8 text-text-primary" />
          </motion.div>
          <h1 className="text-3xl font-bold text-text-primary">
            Create your account
          </h1>
          <p className="text-text-muted mt-2">Join the SubCrack community</p>
        </div>

        <Card variant="glass" className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              required
            />

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              required
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
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

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isSubmitting}
              disabled={isSubmitting}
            >
              <UserPlus className="h-4 w-4" />
              Create Account
            </Button>
          </form>
        </Card>

        <p className="text-center text-sm text-text-muted mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-gold hover:text-accent-gold-muted transition-colors">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}