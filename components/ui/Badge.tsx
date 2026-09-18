import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

type Tone = 'accent' | 'muted' | 'success' | 'warning' | 'danger'

const tones: Record<Tone, string> = {
  accent: 'badge-accent',
  muted: 'badge-muted',
  success: 'badge bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20',
  warning: 'badge bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20',
  danger: 'badge bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20',
}

export function Badge({ children, tone = 'accent', className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn(tones[tone], className)}>{children}</span>
}
