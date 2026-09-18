'use client'
import { useState } from 'react'
import { Settings, Bell, Palette, LogOut, ShieldCheck } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { useSession } from '@/lib/store'
import { useRouter } from 'next/navigation'

const NOTIF_PREFS = [
  { key: 'messages', label: 'New messages', desc: 'Activity in your group discussions.' },
  { key: 'mentions', label: 'Mentions', desc: 'When someone replies to you or mentions you.' },
  { key: 'sessions', label: 'Session reminders', desc: 'Before a study session you RSVPed to starts.' },
  { key: 'tasks', label: 'Task deadlines', desc: 'When an assigned task is due soon.' },
  { key: 'resources', label: 'New resources', desc: 'When a resource is shared in your groups.' },
]

export default function SettingsPage() {
  const { user, logout } = useSession()
  const router = useRouter()
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(window.localStorage.getItem('sg-notif-prefs') ?? '{}') } catch { return {} }
  })

  const togglePref = (key: string) => {
    setPrefs((p) => {
      const next = { ...p, [key]: p[key] === false }
      window.localStorage.setItem('sg-notif-prefs', JSON.stringify(next))
      return next
    })
  }

  const signOut = async () => {
    await logout()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="section-container max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-secondary">Account, appearance and notification preferences.</p>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold">Account</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={user?.name ?? ''} disabled />
          <Input label="Email" value={user?.email ?? ''} disabled />
        </div>
        <p className="mt-2 text-xs text-muted">Profile details (university, course, subjects) are edited on your <a href="/profile" className="font-medium text-indigo-600 dark:text-indigo-400">profile page</a>.</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-muted" />
            <h2 className="text-sm font-semibold">Appearance</h2>
          </div>
          <ThemeToggle />
        </div>
        <p className="mt-2 text-xs text-muted">Theme preference is saved on this device and follows your system setting by default.</p>
      </Card>

      <Card>
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold">Notification preferences</h2>
        </div>
        <div className="mt-4 space-y-3">
          {NOTIF_PREFS.map((p) => (
            <label key={p.key} className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{p.label}</p>
                <p className="text-xs text-muted">{p.desc}</p>
              </div>
              <input
                type="checkbox"
                checked={prefs[p.key] !== false}
                onChange={() => togglePref(p.key)}
                className="mt-1 h-4 w-4 shrink-0 rounded"
              />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">In-app notifications always appear in the bell menu; these control which ones are created.</p>
      </Card>

      <Card className="border-red-200 dark:border-red-500/20">
        <h2 className="text-sm font-semibold text-red-600 dark:text-red-400">Danger zone</h2>
        <p className="mt-1 text-sm text-secondary">Sign out of this device.</p>
        <Button variant="danger" size="sm" onClick={signOut} className="mt-3">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </Card>
    </div>
  )
}
