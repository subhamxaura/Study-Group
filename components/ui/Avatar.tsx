'use client'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'away'
  className?: string
}

const sizeClasses = { xs: 'h-6 w-6 text-[10px]', sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base', xl: 'h-20 w-20 text-lg' }
const statusSize = { xs: 'h-1.5 w-1.5', sm: 'h-2 w-2', md: 'h-2.5 w-2.5', lg: 'h-3 w-3', xl: 'h-4 w-4' }
const bg = [
  'bg-[#D8F0E2] text-[#157343] dark:bg-emerald-500/20 dark:text-emerald-300',
  'bg-[#E0EFE6] text-[#115E38] dark:bg-teal-500/20 dark:text-teal-300',
  'bg-[#E8F4EC] text-[#14633A] dark:bg-green-500/20 dark:text-green-300',
  'bg-[#FDE6C4] text-[#9A5B13] dark:bg-amber-500/20 dark:text-amber-300',
  'bg-[#D2E8DA] text-[#157343] dark:bg-emerald-600/20 dark:text-emerald-200',
]

export function Avatar({ src, alt, name, size = 'md', status, className }: AvatarProps) {
  const hasImage = Boolean(src)
  const initials = name ? name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) : '?'
  const idx = name ? name.charCodeAt(0) % bg.length : 0
  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div
        className={cn(
          'flex items-center justify-center overflow-hidden rounded-full font-medium',
          sizeClasses[size],
          !hasImage && bg[idx]
        )}
      >
        {hasImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src!} alt={alt || name || 'Avatar'} loading="lazy" decoding="async" className="h-full w-full object-cover" />
        ) : (
          <span aria-hidden="true">{initials}</span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-[rgb(var(--sg-card))]',
            statusSize[size],
            status === 'online' && 'bg-emerald-500',
            status === 'away' && 'bg-amber-400',
            status === 'offline' && 'bg-zinc-400'
          )}
        />
      )}
    </div>
  )
}

interface AvatarGroupProps {
  people: Array<{ name: string; src?: string | null }>
  max?: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

export function AvatarGroup({ people, max = 5, size = 'sm', className }: AvatarGroupProps) {
  const visible = people.slice(0, max)
  const remaining = people.length - max
  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((p, i) => (
        <Avatar key={i} name={p.name} src={p.src} size={size} className="ring-2 ring-[rgb(var(--sg-card))]" />
      ))}
      {remaining > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full border-2 border-[rgb(var(--sg-card))] bg-[rgb(var(--sg-surface-muted))] text-xs font-medium text-secondary',
            sizeClasses[size]
          )}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}
