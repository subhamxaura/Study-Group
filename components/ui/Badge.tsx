import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'gold' | 'purple' | 'silver' | 'success' | 'warning' | 'error' | 'info'
}

export function Badge({ className, variant = 'gold', children, ...props }: BadgeProps) {
  const badgeClasses = cn(
    'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all duration-200',
    variant === 'gold' && 'bg-accent-gold/10 text-accent-gold border-accent-gold/20',
    variant === 'purple' && 'bg-velvet-royal/20 text-accent-gold border-velvet-plum/30 shadow-glow-purple/10',
    variant === 'silver' && 'bg-accent-silver/5 text-accent-silver border-accent-silver/15',
    variant === 'success' && 'bg-status-success/10 text-status-success border-status-success/20',
    variant === 'warning' && 'bg-status-warning/10 text-status-warning border-status-warning/20',
    variant === 'error' && 'bg-status-error/10 text-status-error border-status-error/20',
    variant === 'info' && 'bg-status-info/10 text-status-info border-status-info/20',
    className
  )

  return (
    <span className={badgeClasses} {...props}>
      {children}
    </span>
  )
}