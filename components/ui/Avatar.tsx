'use client'

import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'away'
  className?: string
}

const sizeClasses = {
  sm: 'h-7 w-7 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-lg',
}

const statusSizeClasses = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-3.5 w-3.5',
  xl: 'h-4 w-4',
}

export function Avatar({ src, alt, name, size = 'md', status, className }: AvatarProps) {
  const hasImage = Boolean(src)
  const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

  const bgColors = [
    'bg-velvet-royal',
    'bg-velvet-plum',
    'bg-velvet-deep',
    'bg-velvet-charcoal',
    'bg-accent-gold/30',
  ]

  const colorIndex = name ? name.charCodeAt(0) % bgColors.length : 0

  return (
    <div className={cn('relative inline-flex', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden ring-2 ring-subCrack-primary transition-all duration-300',
          sizeClasses[size],
          hasImage ? '' : bgColors[colorIndex]
        )}
      >
        {hasImage ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-medium text-text-primary">
            {initials}
          </span>
        )}
      </div>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-2 border-subCrack-primary',
            statusSizeClasses[size],
            status === 'online' && 'bg-status-success',
            status === 'away' && 'bg-status-warning',
            status === 'offline' && 'bg-text-muted'
          )}
        />
      )}
    </div>
  )
}

interface AvatarGroupProps {
  avatars: (string | { src?: string; name: string; alt?: string })[]
  max?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function AvatarGroup({ avatars, max = 5, size = 'md', className }: AvatarGroupProps) {
  const visibleAvatars = avatars.slice(0, max)
  const remainingCount = avatars.length - max

  return (
    <div className={cn('flex -space-x-2', className)}>
      {visibleAvatars.map((avatar, index) => (
        <Avatar
          key={index}
          {...(typeof avatar === 'string' ? { name: avatar } : avatar)}
          size={size}
          className="ring-2 ring-subCrack-primary"
        />
      ))}
      {remainingCount > 0 && (
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-subCrack-tertiary border-2 border-subCrack-primary font-medium text-text-secondary',
            sizeClasses[size]
          )}
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}