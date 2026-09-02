'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useReducedMotion } from 'framer-motion'

interface NeuralFloatProps {
  className?: string
  density?: 'low' | 'medium' | 'high'
  speed?: number
  colors?: string[]
}

/**
 * NeuralFloat — cinematic neural filament background
 * Renders thin luminous flowing lines on canvas with atmospheric depth.
 * Respects prefers-reduced-motion via framer-motion hook.
 *
 * Visual language: near-black base, violet/magenta + blue filament streams,
 * soft glow, large negative space, subtle particles, slow organic drift.
 */
export function NeuralFloat({
  className = '',
  density = 'medium',
  speed = 0.35,
  colors,
}: NeuralFloatProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const reduceMotion = useReducedMotion()

  const palette = colors ?? ['#9B00FF', '#6D00FF', '#D000FF', '#1800FF', '#4C5CFF', '#9D6FFF']

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (w === 0 || h === 0) return
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.scale(dpr, dpr)

    const filamentsPerBand = density === 'low' ? 14 : density === 'high' ? 32 : 22
    const bands = 3
    let t = 0
    const effectiveSpeed = reduceMotion ? speed * 0.08 : speed

    // Precompute band configs
    const bandConfigs = Array.from({ length: bands }, (_, b) => {
      const yBase = b === 0 ? h * 0.18 : b === 1 ? h * 0.58 : h * 0.82
      const amp = b === 0 ? h * 0.18 : b === 1 ? h * 0.14 : h * 0.16
      const freq = b === 0 ? 0.0018 : b === 1 ? 0.0014 : 0.0022
      const phase = b * 1.8
      return { yBase, amp, freq, phase, count: filamentsPerBand }
    } )

    const particles = Array.from({ length: density === 'low' ? 6 : density === 'high' ? 18 : 10 }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.4 + 0.3,
      c: palette[Math.floor(Math.random() * palette.length)],
      drift: (Math.random() - 0.5) * 0.4,
      driftY: (Math.random() - 0.5) * 0.2,
      phase: Math.random() * Math.PI * 2,
    }))

    const render = () => {
      t += effectiveSpeed
      ctx.clearRect(0, 0, w, h)

      // Deep black base is via CSS; canvas is transparent overlay.
      // Volumetric blooms — soft, not obvious circles
      // Violet bloom lower-left
      const vb = ctx.createRadialGradient(w * 0.08, h * 0.82, 0, w * 0.08, h * 0.82, w * 0.42)
      vb.addColorStop(0, 'rgba(155,0,255,0.18)')
      vb.addColorStop(0.35, 'rgba(109,0,255,0.09)')
      vb.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = vb
      ctx.fillRect(0, 0, w, h)

      // Blue bloom upper-right
      const bb = ctx.createRadialGradient(w * 0.92, h * 0.18, 0, w * 0.92, h * 0.18, w * 0.38)
      bb.addColorStop(0, 'rgba(24,0,255,0.14)')
      bb.addColorStop(0.45, 'rgba(76,92,255,0.06)')
      bb.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = bb
      ctx.fillRect(0, 0, w, h)

      // Central white/lavender highlight — very subtle like reference lens bloom
      const cb = ctx.createRadialGradient(w * 0.62, h * 0.56, 0, w * 0.62, h * 0.56, w * 0.18)
      cb.addColorStop(0, 'rgba(255,255,255,0.045)')
      cb.addColorStop(0.25, 'rgba(220,205,255,0.025)')
      cb.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = cb
      ctx.fillRect(0, 0, w, h)

      // Draw each band of filaments
      bandConfigs.forEach((band, bIdx) => {
        const isBottomBand = bIdx === 2
        for (let i = 0; i < band.count; i++) {
          const offset = (i / band.count - 0.5) * 42 // spread perpendicular
          const hueIdx = (bIdx * 2 + (i % 3)) % palette.length
          const color = palette[hueIdx]
          const alphaBase = isBottomBand ? 0.38 : 0.28
          const alphaVar = 0.18 + (i % 5) * 0.03
          const lineAlpha = Math.min(0.72, alphaBase + alphaVar + Math.sin(t * 0.3 + i * 0.4) * 0.04)

          // Parse color to rgb
          const r = parseInt(color.slice(1, 3), 16)
          const g = parseInt(color.slice(3, 5), 16)
          const b = parseInt(color.slice(5, 7), 16)

          ctx.beginPath()
          // Glow stroke underneath (blur-like)
          ctx.strokeStyle = `rgba(${r},${g},${b},${lineAlpha * 0.22})`
          ctx.lineWidth = isBottomBand ? 1.35 : 1.05
          ctx.lineCap = 'round'
          ctx.lineJoin = 'round'
          if (!reduceMotion) ctx.shadowColor = `rgba(${r},${g},${b},0.55)`
          if (!reduceMotion) ctx.shadowBlur = isBottomBand ? 9 : 6

          let first = true
          const steps = 90
          for (let s = 0; s <= steps; s++) {
            const px = (s / steps) * (w * 1.18) - w * 0.09
            // Smooth flowing wave: sin + second harmonic + slow drift
            const waveA = Math.sin(px * band.freq + t * 0.55 + band.phase) * (band.amp + offset * 0.22)
            const waveB = Math.sin(px * band.freq * 2.1 + t * 0.32 + band.phase * 1.3 + i * 0.12) * (band.amp * 0.18)
            const waveC = Math.cos(px * band.freq * 0.55 + t * 0.18) * (band.amp * 0.08)
            const py = band.yBase + waveA + waveB + waveC + offset

            // Slight horizontal curvature drift over time creates "living" feel
            const driftX = Math.sin(t * 0.12 + bIdx) * 6

            if (first) { ctx.moveTo(px + driftX, py); first = false }
            else ctx.lineTo(px + driftX, py)
          }
          ctx.stroke()

          // Core filament — sharp thin line
          ctx.shadowBlur = 0
          ctx.beginPath()
          ctx.strokeStyle = `rgba(${r},${g},${b},${lineAlpha})`
          ctx.lineWidth = isBottomBand ? 0.72 : 0.58
          first = true
          for (let s = 0; s <= steps; s++) {
            const px = (s / steps) * (w * 1.18) - w * 0.09
            const waveA = Math.sin(px * band.freq + t * 0.55 + band.phase) * (band.amp + offset * 0.22)
            const waveB = Math.sin(px * band.freq * 2.1 + t * 0.32 + band.phase * 1.3 + i * 0.12) * (band.amp * 0.18)
            const waveC = Math.cos(px * band.freq * 0.55 + t * 0.18) * (band.amp * 0.08)
            const py = band.yBase + waveA + waveB + waveC + offset
            const driftX = Math.sin(t * 0.12 + bIdx) * 6
            if (first) { ctx.moveTo(px + driftX, py); first = false }
            else ctx.lineTo(px + driftX, py)
          }
          ctx.stroke()

          // For bottom band: occasional subtle grid cross lines (like reference bottom-right mesh)
          if (isBottomBand && i % 4 === 0 && !reduceMotion) {
            ctx.beginPath()
            ctx.strokeStyle = `rgba(${r},${g},${b},0.08)`
            ctx.lineWidth = 0.35
            // short vertical mesh ticks
            for (let gv = 0; gv < 10; gv++) {
              const gx = (gv / 10) * w * 1.0 + Math.sin(t * 0.2 + gv) * 8
              const waveA = Math.sin(gx * band.freq + t * 0.55 + band.phase) * band.amp
              const gy = band.yBase + waveA + offset
              ctx.moveTo(gx, gy - 6)
              ctx.lineTo(gx, gy + 6)
            }
            ctx.stroke()
          }
        }
      })

      // Particles — small glowing dots drifting weightlessly
      particles.forEach((p) => {
        if (!reduceMotion) {
          p.x += p.drift * 0.35
          p.y += p.driftY * 0.2 + Math.sin(t * 0.4 + p.phase) * 0.12
          if (p.x < -10) p.x = w + 10
          if (p.x > w + 10) p.x = -10
          if (p.y < -10) p.y = h + 10
          if (p.y > h + 10) p.y = -10
        }
        const r = parseInt(p.c.slice(1, 3), 16)
        const g = parseInt(p.c.slice(3, 5), 16)
        const b = parseInt(p.c.slice(5, 7), 16)
        const alpha = reduceMotion ? 0.18 : 0.32 + Math.sin(t * 0.6 + p.phase) * 0.14
        // glow
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5)
        grad.addColorStop(0, `rgba(${r},${g},${b},${alpha})`)
        grad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = `rgba(255,255,255,${alpha * 0.75})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Extra subtle lens flare accent near center like reference
      if (!reduceMotion) {
        const fx = w * 0.62
        const fy = h * 0.56
        const flareGrad = ctx.createRadialGradient(fx, fy, 0, fx, fy, 58)
        flareGrad.addColorStop(0, 'rgba(255,255,255,0.14)')
        flareGrad.addColorStop(0.18, 'rgba(255,248,220,0.09)')
        flareGrad.addColorStop(0.42, 'rgba(209,190,255,0.04)')
        flareGrad.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = flareGrad
        ctx.beginPath()
        ctx.arc(fx, fy, 58, 0, Math.PI * 2)
        ctx.fill()
        // small secondary orbs like reference (blue + gold)
        ctx.fillStyle = 'rgba(76,92,255,0.42)'
        ctx.shadowColor = 'rgba(76,92,255,0.55)'
        ctx.shadowBlur = 10
        ctx.beginPath()
        ctx.arc(w * 0.34, h * 0.34, 3.2, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = 'rgba(218,181,70,0.38)'
        ctx.shadowColor = 'rgba(218,181,70,0.5)'
        ctx.beginPath()
        ctx.arc(w * 0.36, h * 0.355, 2.4, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0
      }

      rafRef.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(rafRef.current)
  }, [density, speed, palette, reduceMotion])

  useEffect(() => {
    let cleanup: (() => void) | undefined
    const start = () => {
      cleanup = draw()
    }
    // Ensure canvas has dimensions after mount
    const id = requestAnimationFrame(start)
    const onResize = () => {
      if (cleanup) cleanup()
      cleanup = draw()
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', onResize)
      if (cleanup) cleanup()
      cancelAnimationFrame(rafRef.current)
    }
  }, [draw])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={className}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}

export default NeuralFloat
