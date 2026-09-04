'use client'
import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: 'primary'|'secondary'|'ghost'|'danger'; size?: 'sm'|'md'|'lg'; isLoading?: boolean }
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({ className, variant='primary', size='md', isLoading, children, disabled, ...props}, ref)=>{
  const variantClass = variant==='primary'?'btn-primary':variant==='secondary'?'btn-secondary':variant==='danger'?'btn-danger':'btn-ghost'
  const sizeClass = size==='sm'?'btn-sm':size==='lg'?'btn-lg':''
  return (
    <button ref={ref} className={cn(variantClass, sizeClass, className)} disabled={disabled||isLoading} {...props}>
      {isLoading && <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>}
      {children}
    </button>
  )
})
Button.displayName='Button'
