import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  accent?: boolean
}

export function StatCard({ label, value, sub, icon: Icon, accent = true }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg border',
            accent
              ? 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20'
              : 'bg-[rgb(var(--sg-surface-muted))] text-[rgb(var(--sg-muted))]'
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        {sub && <span className="hidden text-xs text-muted sm:inline">{sub}</span>}
      </div>
      <p className="mt-3 text-xs text-muted">{label}</p>
      <p className="text-xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
