import type { Metadata } from 'next'
import { Fraunces, Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const fraunces = Fraunces({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-fraunces', display: 'swap' })

export const metadata: Metadata = {
  title: 'Study-Group — Learn together, in one workspace.',
  description:
    'Find study groups, plan sessions, share resources, track progress and stay consistent — a modern workspace for students.',
}

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 }

// Single-theme bootstrap — dark only. Locks the Quad theme before hydration.
const themeInit = `(function(){try{localStorage.setItem('sg-theme','dark');document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${inter.variable} ${fraunces.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="quad-body min-h-screen bg-[rgb(var(--sg-background))] font-sans text-[rgb(var(--sg-foreground))] antialiased">
        {children}
      </body>
    </html>
  )
}
