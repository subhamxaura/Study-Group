'use client'

import { HTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'glass' | 'velvet'
  hover?: boolean
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hover = false, children, ...props }, ref) => {
    const cardClass = cn(
      'rounded-2xl border transition-all duration-300 ease-velvet overflow-hidden',
      variant === 'default' && 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl',
      variant === 'glass' && 'glass shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
      variant === 'velvet' && 'border-[#9B00FF]/20 bg-[radial-gradient(600px_300px_at_20%_0%,rgba(155,0,255,0.14),transparent_70%),linear-gradient(145deg,rgba(14,11,26,0.72),rgba(10,8,20,0.56))] shadow-[0_0_28px_rgba(109,0,255,0.18)] backdrop-blur-xl',
      hover && 'hover:-translate-y-1 hover:border-[#9B00FF]/24 hover:shadow-[0_14px_44px_rgba(0,0,0,0.58),0_0_28px_rgba(109,0,255,0.16)]',
      className
    )

    return (
      <div ref={ref} className={cardClass} {...props}>
        {children}
      </div>
    )
  }
)

Card.displayName = 'Card'

interface MotionCardProps extends HTMLMotionProps<'div'> {
  variant?: 'default' | 'glass' | 'velvet'
  hover?: boolean
}

export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(
  ({ className, variant = 'default', hover = false, children, ...props }, ref) => {
    const cardClass = cn(
      'rounded-2xl border transition-all duration-300 ease-velvet overflow-hidden',
      variant === 'default' && 'bg-gradient-to-br from-white/[0.04] to-white/[0.02] border-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-xl',
      variant === 'glass' && 'glass shadow-[0_8px_32px_rgba(0,0,0,0.5)]',
      variant === 'velvet' && 'border-[#9B00FF]/20 bg-[radial-gradient(600px_300px_at_20%_0%,rgba(155,0,255,0.14),transparent_70%),linear-gradient(145deg,rgba(14,11,26,0.72),rgba(10,8,20,0.56))] shadow-[0_0_28px_rgba(109,0,255,0.18)] backdrop-blur-xl',
      hover && 'hover:border-[#9B00FF]/24 hover:shadow-[0_14px_44px_rgba(0,0,0,0.58),0_0_28px_rgba(109,0,255,0.16)]',
      className
    )

    return (
      <motion.div
        ref={ref}
        className={cardClass}
        whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        {...props}
      >
        {children}
      </motion.div>
    )
  }
)

MotionCard.displayName = 'MotionCard'
