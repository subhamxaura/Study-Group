import type { Metadata } from 'next'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeController } from '@/components/ui'
export const metadata: Metadata = {
  title: 'Study-Group — Learn together, in one workspace.',
  description: 'Find study groups, collaborate, share resources and stay consistent — a modern workspace for students.',
}
export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className={cn('min-h-screen bg-[rgb(var(--sg-background))] font-sans text-[rgb(var(--sg-foreground))] antialiased')}>
        <ThemeController />
        {children}
      </body>
    </html>
  )
}
