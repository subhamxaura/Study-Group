'use client'
import { useState } from 'react'
import { Bell, Palette, LogOut, ShieldCheck, User } from 'lucide-react'
import { Button, Card, Input } from '@/components/ui'
import { useSession } from '@/lib/store'
import { useRouter } from 'next/navigation'

const NOTIF_PREFS = [
  { key: 'messages', label: 'New messages', desc: 'Activity in your group discussions.' },
  { key: 'mentions', label: 'Mentions', desc: 'When someone replies to you or mentions you.' },
  { key: 'sessions', label: 'Session reminders', desc: 'Before a study session you RSVPed to starts.' },
  { key: 'tasks', label: 'Task deadlines', desc: 'When an assigned task is due soon.' },
  { key: 'resources', label: 'New resources', desc: 'When a resource is shared in your groups.' },
]

function SectionCard({ icon: Icon, title, desc, children, danger = false }: { icon: React.ComponentType<{ className?: string }>; title: string; desc?: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={
              danger
                ? 'flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--sg-danger))]/10 text-[rgb(var(--sg-danger))]'
                : 'flex h-8 w-8 items-center justify-center rounded-lg bg-[rgb(var(--sg-surface-muted))] text-muted'
            }
            aria-hidden="true"
          >
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            {desc && <p className="text-xs text-muted">{desc}</p>}
          </div>
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  )
}

/** Accessible switch — real checkbox semantics with a visible track/thumb. */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={
        'relative h-6 w-11 shrink-0 rounded-full transition-colors duration-150 ' +
        (checked ? 'bg-[rgb(var(--sg-accent))]' : 'bg-[rgb(var(--sg-border))]')
      }
    >
      <span
        className={
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-150 ' +
          (checked ? 'translate-x-[22px]' : 'translate-x-0.5')
        }
      />
    </button>
  )
}

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

      <SectionCard icon={User} title="Account" desc="Your sign-in identity.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" value={user?.name ?? ''} disabled />
          <Input label="Email" value={user?.email ?? ''} disabled />
        </div>
        <p className="mt-2 text-xs text-muted">
          Profile details (university, course, subjects) are edited on your{' '}
          <a href="/profile" className="font-medium text-[rgb(var(--sg-accent))] hover:underline dark:text-[rgb(var(--sg-accent-muted))]">profile page</a>.
        </p>
      </SectionCard>

      <SectionCard icon={Palette} title="Appearance" desc="Study-Group uses the dark Quad theme.">
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <p className="text-sm font-medium">Dark theme</p>
            <p className="text-xs text-muted">Always on — there is no light mode.</p>
          </div>
          <span className="rounded-full border border-[rgb(var(--sg-border))] px-2.5 py-1 text-xs font-medium text-secondary">Always on</span>
        </div>
      </SectionCard>

      <SectionCard icon={Bell} title="Notifications" desc="Which in-app notifications are created.">
        <div className="space-y-2">
          {NOTIF_PREFS.map((p) => (
            <label key={p.key} className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 rounded-lg border p-3 transition-colors hover:bg-[rgb(var(--sg-hover))]">
              <span>
                <span className="block text-sm font-medium">{p.label}</span>
                <span className="block text-xs text-muted">{p.desc}</span>
              </span>
              <Toggle checked={prefs[p.key] !== false} onChange={() => togglePref(p.key)} label={p.label} />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">In-app notifications always appear in the bell menu; these control which ones are created.</p>
      </SectionCard>

      <SectionCard icon={ShieldCheck} title="Danger zone" desc="Irreversible or sign-out actions." danger>
        <p className="text-sm text-secondary">Sign out of this device. Your study data stays intact.</p>
        <Button variant="danger" size="sm" onClick={signOut} className="mt-3">
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </SectionCard>
    </div>
  )
}
