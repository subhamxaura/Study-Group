import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Study-Group — Learn together, in one workspace.',
  description:
    'Find study groups, plan sessions, share resources, track progress and stay consistent — a modern workspace for students.',
}

export const viewport = { width: 'device-width', initialScale: 1, maximumScale: 5 }

// Inline theme bootstrap — prevents dark-mode flash before hydration.
const themeInit = `(function(){try{var t=localStorage.getItem('sg-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}if(t==='dark'){document.documentElement.classList.add('dark');}}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-screen bg-[rgb(var(--sg-background))] font-sans text-[rgb(var(--sg-foreground))] antialiased">
        {children}
      </body>
    </html>
  )
}
