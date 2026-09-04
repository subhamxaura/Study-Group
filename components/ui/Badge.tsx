import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
interface BadgeProps extends HTMLAttributes<HTMLSpanElement> { variant?: 'gold'|'purple'|'silver'|'success'|'warning'|'error'|'info' }
export function Badge({ className, variant='silver', children, ...props}: BadgeProps){
  const m = {
    gold: 'badge-gold', purple: 'badge-purple', silver: 'badge-silver', success: 'badge-success',
    warning: 'badge bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300',
    error: 'badge bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300',
    info: 'badge bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300',
  } as const
  return <span className={cn(m[variant]||m.silver, className)} {...props}>{children}</span>
}
