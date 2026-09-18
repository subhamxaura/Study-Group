import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  compact?: boolean
}

export function EmptyState({ icon: Icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={compact ? 'py-8 text-center' : 'py-14 text-center'}>
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[rgb(var(--sg-accent-soft))] text-[rgb(var(--sg-accent))]">
        <Icon className="h-6 w-6" />
      </div>
      <p className="mt-4 font-medium">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-sm text-sm text-secondary">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
