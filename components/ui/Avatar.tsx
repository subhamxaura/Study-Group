'use client'
import { cn } from '@/lib/utils'
interface AvatarProps { src?: string; alt?: string; name?: string; size?: 'sm'|'md'|'lg'|'xl'; status?: 'online'|'offline'|'away'; className?: string }
const sizeClasses = { sm:'h-7 w-7 text-xs', md:'h-9 w-9 text-sm', lg:'h-12 w-12 text-base', xl:'h-20 w-20 text-lg' }
const statusSize = { sm:'h-2 w-2', md:'h-2.5 w-2.5', lg:'h-3 w-3', xl:'h-4 w-4' }
const bg = ['bg-indigo-100 text-indigo-700','bg-violet-100 text-violet-700','bg-sky-100 text-sky-700','bg-amber-100 text-amber-700','bg-emerald-100 text-emerald-700']
export function Avatar({ src, alt, name, size='md', status, className }: AvatarProps){
  const hasImage = Boolean(src)
  const initials = name ? name.split(' ').map(n=>n[0]).join('').toUpperCase().slice(0,2) : '?'
  const idx = name ? name.charCodeAt(0)%bg.length : 0
  return (
    <div className={cn('relative inline-flex shrink-0', className)}>
      <div className={cn('rounded-full overflow-hidden border border-[rgb(var(--sg-border))] flex items-center justify-center font-medium', sizeClasses[size], hasImage?'':'border', !hasImage&&bg[idx])}>
        {hasImage ? <img src={src} alt={alt||name||'Avatar'} loading="lazy" decoding="async" className="h-full w-full object-cover"/> : <span>{initials}</span>}
      </div>
      {status && <span className={cn('absolute bottom-0 right-0 rounded-full border-2 border-[rgb(var(--sg-card))]', statusSize[size], status==='online'&&'bg-emerald-500', status==='away'&&'bg-amber-400', status==='offline'&&'bg-zinc-400')}/>}
    </div>
  )
}
interface AvatarGroupProps { avatars: (string|{src?:string; name:string; alt?:string})[]; max?: number; size?: 'sm'|'md'|'lg'; className?: string }
export function AvatarGroup({ avatars, max=5, size='md', className }: AvatarGroupProps){
  const visible = avatars.slice(0,max); const remaining=avatars.length-max
  return (
    <div className={cn('flex -space-x-2', className)}>
      {visible.map((a,i)=><Avatar key={i} {...(typeof a==='string'?{name:a}:a)} size={size} className="ring-2 ring-[rgb(var(--sg-card))]"/>)}
      {remaining>0 && <div className={cn('flex items-center justify-center rounded-full bg-[rgb(var(--sg-surface-muted))] border-2 border-[rgb(var(--sg-card))] font-medium text-[rgb(var(--sg-secondary))] text-xs', sizeClasses[size])}>+{remaining}</div>}
    </div>
  )
}
