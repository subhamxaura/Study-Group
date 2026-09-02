'use client'

import { useEffect } from 'react'
import { useUIStore } from '@/lib/store'

export function ThemeController() {
  const theme = useUIStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  return null
}
