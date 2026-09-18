'use client'
import { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'
import { useUIStore } from '@/lib/store'

export function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useUIStore((s) => s.theme)
  const setTheme = useUIStore((s) => s.setTheme)

  // Sync store with the bootstrapped class on mount
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className={`rounded-lg p-2 text-muted transition-colors hover:bg-[rgb(var(--sg-hover))] hover:text-[rgb(var(--sg-foreground))] ${className}`}
      aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}
