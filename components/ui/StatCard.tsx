import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  /** Context line — trend, comparison, or an encouraging zero-state hint. */
  sub?: string
  icon: LucideIcon
  /** Renders the value in the accent color (used when the number is the hero). */
  accent?: boolean
}

export function StatCard({ label, value, sub, icon: Icon, accent = false }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
        <p className="truncate text-xs font-medium text-secondary">{label}</p>
      </div>
      <p
        className={cn(
          'mt-2 text-2xl font-semibold tracking-tight tabular-nums',
          accent && 'text-[rgb(var(--sg-accent))] dark:text-[rgb(var(--sg-accent-muted))]'
        )}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted">{sub}</p>}
    </div>
  )
}
