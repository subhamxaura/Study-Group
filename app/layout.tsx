import type { Metadata } from 'next'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeController } from '@/components/ui'

export const metadata: Metadata = {
  title: 'SubCrack Study Group',
  description: 'Sophisticated, high-performance study group platform.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={cn('min-h-screen bg-subCrack-primary font-sans text-text-primary antialiased')}>
        <ThemeController />
        {children}
      </body>
    </html>
  )
}
