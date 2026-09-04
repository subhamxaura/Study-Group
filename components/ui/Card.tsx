'use client'
import { HTMLAttributes, forwardRef } from 'react'
import { motion, HTMLMotionProps } from 'framer-motion'
import { cn } from '@/lib/utils'
interface CardProps extends HTMLAttributes<HTMLDivElement> { variant?: 'default'|'glass'|'velvet'; hover?: boolean }
export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, variant='default', hover=false, children, ...props}, ref)=>{
  const base = 'rounded-xl border bg-[rgb(var(--sg-card))] shadow-sm overflow-hidden transition-all duration-200'
  const hoverCls = hover ? 'hover:shadow-md hover:-translate-y-[1px] hover:border-[rgb(var(--sg-border))]' : ''
  return <div ref={ref} className={cn(base, hoverCls, className)} {...props}>{children}</div>
})
Card.displayName='Card'
interface MotionCardProps extends HTMLMotionProps<'div'> { variant?: 'default'|'glass'|'velvet'; hover?: boolean }
export const MotionCard = forwardRef<HTMLDivElement, MotionCardProps>(({ className, hover=false, children, ...props}, ref)=>{
  return <motion.div ref={ref} className={cn('rounded-xl border bg-[rgb(var(--sg-card))] shadow-sm overflow-hidden', hover&&'hover:shadow-md', className)} whileHover={hover?{y:-2}:undefined} transition={{duration:0.2}} {...props}>{children}</motion.div>
})
MotionCard.displayName='MotionCard'
