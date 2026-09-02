'use client'

import { ReactNode, useRef } from 'react'
import { motion, useScroll, useTransform, useReducedMotion } from 'framer-motion'

export interface ScrollStackCard {
  id: string
  node: ReactNode
  accent?: string
}

interface ScrollStackProps {
  cards: ScrollStackCard[]
  className?: string
}

/**
 * ScrollStack — sticky stacking cards that pin, overlap, rotate subtly and transform as user scrolls.
 * Uses framer-motion scroll progress. Respects prefers-reduced-motion.
 */
export function ScrollStack({ cards, className = '' }: ScrollStackProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  return (
    <div ref={containerRef} className={`relative ${className}`} style={{ height: `${cards.length * 92}vh` }}>
      <div className="sticky top-0 flex min-h-screen items-center justify-center overflow-hidden py-10">
        <div className="relative w-full max-w-3xl px-5 sm:px-6">
          {cards.map((card, index) => {
            // Each card becomes dominant as we pass its segment
            const segment = 1 / cards.length
            const start = index * segment
            const end = start + segment
            const mid = (start + end) / 2

            // Use transforms — framer MotionValues so they compose correctly outside hooks loop.
            // We create per-card animated wrapper using the shared scroll progress.
            return (
              <StackCard
                key={card.id}
                scrollYProgress={scrollYProgress}
                index={index}
                total={cards.length}
                start={start}
                end={end}
                mid={mid}
                accent={card.accent}
                reduceMotion={!!reduceMotion}
              >
                {card.node}
              </StackCard>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StackCard({
  children,
  scrollYProgress,
  index,
  total,
  start,
  end,
  mid,
  accent,
  reduceMotion,
}: {
  children: ReactNode
  scrollYProgress: ReturnType<typeof useScroll>['scrollYProgress']
  index: number
  total: number
  start: number
  end: number
  mid: number
  accent?: string
  reduceMotion: boolean
}) {
  // Framer motion transforms — mapped to scroll progress
  // y: cards start below, rise and stack
  const y = useTransform(scrollYProgress, [start, mid, end, 1], [160 + index * 18, index * 14, index * 10, index * 8])
  const scale = useTransform(scrollYProgress, [start, mid, end], [0.92, 1, 0.96 - index * 0.015])
  const rotate = useTransform(scrollYProgress, [start, mid], reduceMotion ? [0, 0] : [(index % 2 === 0 ? -2.2 : 1.8), index * 0.35])
  const opacity = useTransform(scrollYProgress, [Math.max(0, start - 0.08), start, end, Math.min(1, end + 0.12)], [0, 1, 1, index === total - 1 ? 1 : 0.88])
  // Slight brightness shift as card becomes active
  const brightness = useTransform(scrollYProgress, [start, mid, end], [0.82, 1.08, 0.96])

  // zIndex keeps later cards on top as they arrive
  const zIndex = index

  return (
    <motion.div
      style={{
        y: reduceMotion ? 0 : y as any,
        scale: reduceMotion ? 1 : scale as any,
        rotate: reduceMotion ? 0 : (rotate as any),
        opacity: opacity as any,
        zIndex,
        filter: reduceMotion ? undefined : useTransform(brightness, (b) => `brightness(${b})`) as any,
      }}
      className="absolute inset-x-0 top-1/2 will-change-transform"
      // Center vertically using translateY(-50%)
    >
      <div className="-translate-y-1/2">
        <div
          className="relative overflow-hidden rounded-[28px] border bg-[#0A0A0F]/70 backdrop-blur-2xl shadow-[0_20px_80px_rgba(0,0,0,0.65),0_0_40px_rgba(109,0,255,0.18)]"
          style={{
            borderColor: accent ? `${accent}33` : 'rgba(109,0,255,0.18)',
            boxShadow: accent
              ? `0 20px 80px rgba(0,0,0,0.65), 0 0 38px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.06)`
              : undefined,
          }}
        >
          {/* Top soft glow line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px opacity-60"
            style={{ background: `linear-gradient(90deg, transparent, ${accent || '#9B00FF'}88, transparent)` }}
          />
          {/* Ambient inner glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{ background: `radial-gradient(600px 300px at 70% 0%, ${accent || '#9B00FF'}, transparent 70%)` }}
          />
          {children}
        </div>
      </div>
    </motion.div>
  )
}

export default ScrollStack
