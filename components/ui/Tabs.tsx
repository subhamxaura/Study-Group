'use client'
import { cn } from '@/lib/utils'

export interface TabItem {
  key: string
  label: string
  count?: number
}

interface TabsProps {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
  className?: string
}

export function Tabs({ items, active, onChange, className }: TabsProps) {
  return (
    <div role="tablist" className={cn('flex gap-1 overflow-x-auto border-b', className)} aria-label="Sections">
      {items.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors',
            active === t.key
              ? 'text-[rgb(var(--sg-foreground))] after:absolute after:inset-x-2 after:-bottom-px after:h-0.5 after:rounded-full after:bg-[rgb(var(--sg-accent))]'
              : 'text-muted hover:text-[rgb(var(--sg-foreground))]'
          )}
        >
          {t.label}
          {t.count !== undefined && (
            <span className="ml-1.5 rounded-full bg-[rgb(var(--sg-surface-muted))] px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
