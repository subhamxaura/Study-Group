'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Link2, ShieldCheck, Users } from 'lucide-react'
import { Button, Card } from '@/components/ui'
import { ApiError, api } from '@/lib/client'

type InvitePreview = {
  group: { id: string; name: string; subject: string; avatarUrl: string | null; memberCount: number }
}

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [group, setGroup] = useState<InvitePreview['group'] | null>(null)
  const [signedIn, setSignedIn] = useState(false)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([
      api.get<InvitePreview>(`/api/invites/${encodeURIComponent(code)}`),
      api.get('/api/auth/me').then(() => true).catch((err) => {
        if (err instanceof ApiError && err.status === 401) return false
        throw err
      }),
    ]).then(([preview, authenticated]) => {
      if (!active) return
      setGroup(preview.group)
      setSignedIn(authenticated)
    }).catch((err) => {
      if (active) setError(err instanceof Error ? err.message : 'This invite link is unavailable.')
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [code])

  const accept = async () => {
    setAccepting(true)
    setError('')
    try {
      const result = await api.post<{ groupId: string }>(`/api/invites/${encodeURIComponent(code)}/accept`)
      router.replace(`/groups/${result.groupId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept this invitation.')
      setAccepting(false)
    }
  }

  const signInHref = `/login?next=${encodeURIComponent(`/invite/${code}`)}`

  return (
    <div className="flex min-h-screen items-center justify-center bg-[rgb(var(--sg-background))] p-4">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-300">
          <Link2 className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-xl font-semibold tracking-tight">Private group invitation</h1>
        {loading ? (
          <p className="mt-2 text-sm text-secondary" role="status">Checking this invitation…</p>
        ) : group ? (
          <>
            <p className="mt-2 text-sm text-secondary">You’ve been invited to join this study group.</p>
            <div className="mt-5 rounded-xl border p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
                <div className="min-w-0">
                  <h2 className="font-semibold">{group.name}</h2>
                  <p className="mt-1 text-sm text-secondary">{group.subject}</p>
                  <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted"><Users className="h-3.5 w-3.5" />{group.memberCount} members</p>
                </div>
              </div>
            </div>
            {error && <p className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-300" role="alert">{error}</p>}
            {signedIn ? (
              <Button className="mt-5 w-full" isLoading={accepting} disabled={accepting} onClick={accept}>Accept invitation</Button>
            ) : (
              <Link href={signInHref} className="btn btn-primary mt-5 flex w-full justify-center">Sign in to accept</Link>
            )}
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-secondary">{error || 'This invitation is invalid or has expired.'}</p>
            <Link href="/" className="btn btn-secondary mt-5 flex w-full justify-center">Return home</Link>
          </>
        )}
      </Card>
    </div>
  )
}
