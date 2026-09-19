'use client'
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { create } from 'zustand'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type ToastKind = 'success' | 'error' | 'info'

export interface ToastItem {
  id: number
  kind: ToastKind
  message: string
  shownAt: number
  action?: { label: string; onClick: () => void }
}

interface ToastStore {
  toasts: ToastItem[]
  push: (t: Omit<ToastItem, 'id' | 'shownAt'>) => void
  dismiss: (id: number) => void
  /** Remove every toast whose 4.5s window elapsed while the tab was hidden. */
  sweepExpired: (now: number) => void
}

const TOAST_TTL_MS = 4500

let nextId = 1

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  push: (t) => {
    const id = nextId++
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id, shownAt: Date.now() }] }))
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
  sweepExpired: (now) =>
    set((s) => ({ toasts: s.toasts.filter((x) => now - x.shownAt < TOAST_TTL_MS) })),
}))

export const toast = {
  success: (message: string) => useToastStore.getState().push({ kind: 'success', message }),
  error: (message: string) => useToastStore.getState().push({ kind: 'error', message }),
  info: (message: string, action?: ToastItem['action']) =>
    useToastStore.getState().push({ kind: 'info', message, action }),
}

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />,
  error: <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />,
  info: <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />,
}

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts)
  const dismiss = useToastStore((s) => s.dismiss)
  const sweepExpired = useToastStore((s) => s.sweepExpired)
  // tick only re-runs the effect; the countdown itself reads fresh state
  const [, tick] = useReducer((n: number) => n + 1, 0)

  // Auto-dismiss oldest toast when its TTL elapses. Pauses while the tab is hidden
  // (no setTimeout drift) and sweeps expired toasts when the tab becomes visible again.
  const timerRef = useRef<number | null>(null)
  const armTimer = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    const oldest = useToastStore.getState().toasts[0]
    if (!oldest) return
    const remaining = TOAST_TTL_MS - (Date.now() - oldest.shownAt)
    if (remaining <= 0) {
      useToastStore.getState().dismiss(oldest.id)
      armTimer()
      return
    }
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      const next = useToastStore.getState().toasts[0]
      if (next) {
        useToastStore.getState().dismiss(next.id)
        armTimer()
      }
    }, remaining)
  }, [])
  useEffect(() => {
    if (document.visibilityState === 'visible') armTimer()
    else if (timerRef.current !== null) clearTimeout(timerRef.current)
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    }
  }, [toasts, armTimer])

  // On becoming visible after being hidden: drop toasts whose TTL already elapsed.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        sweepExpired(Date.now())
        tick()
      }
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [sweepExpired])

  return (
    <div aria-live="polite" aria-atomic="false" className="pointer-events-none fixed bottom-20 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 sm:bottom-6 sm:left-auto sm:right-6 sm:translate-x-0 sm:items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="pointer-events-auto flex w-full items-center gap-2.5 rounded-xl border bg-[rgb(var(--sg-elevated))] py-2.5 pl-3.5 pr-2 shadow-large"
          >
            <span className="shrink-0">{ICONS[t.kind]}</span>
            <p className="min-w-0 flex-1 text-sm text-strong">{t.message}</p>
            {t.action && (
              <button
                onClick={() => {
                  t.action!.onClick()
                  dismiss(t.id)
                }}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-indigo-600 hover:bg-[rgb(var(--sg-hover))] dark:text-indigo-400"
              >
                {t.action.label}
              </button>
            )}
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-[rgb(var(--sg-hover))] hover:text-strong"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
