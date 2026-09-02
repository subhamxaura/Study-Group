'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-300 ease-velvet focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9B00FF]/40 disabled:opacity-50 disabled:pointer-events-none'

    const variantClasses = {
      primary: 'text-white border border-white/10 hover:-translate-y-0.5 active:scale-[0.98] shadow-[0_0_0_1px_rgba(155,0,255,0.18),0_8px_28px_rgba(109,0,255,0.38),0_0_18px_rgba(155,0,255,0.22)] hover:shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_10px_36px_rgba(109,0,255,0.48),0_0_26px_rgba(155,0,255,0.28)]',
      secondary: 'bg-[rgba(14,12,26,0.75)] text-white border border-[#9B00FF]/20 hover:border-[#9B00FF]/30 hover:-translate-y-0.5 active:scale-[0.98] shadow-[0_0_18px_rgba(109,0,255,0.14),inset_0_1px_0_rgba(255,255,255,0.06)]',
      ghost: 'bg-transparent text-white/70 hover:bg-white/[0.06] hover:text-white active:scale-[0.98]',
      danger: 'bg-status-error/20 text-status-error border border-status-error/30 hover:bg-status-error/30 hover:shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:-translate-y-0.5 active:scale-[0.98]',
    }

    const sizeClasses = {
      sm: 'px-3 py-2 text-xs gap-1.5',
      md: 'px-5 py-3 text-sm gap-2',
      lg: 'px-8 py-4 text-base gap-2.5',
    }

    const primaryStyle = variant === 'primary' ? { background: 'linear-gradient(135deg,#6D00FF 0%,#9B00FF 55%,#D000FF 100%)' } as const : undefined

    return (
      <button
        ref={ref}
        style={primaryStyle}
        className={cn(baseClasses, variantClasses[variant], sizeClasses[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
