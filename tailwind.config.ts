import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: 'rgb(var(--sg-border) / <alpha-value>)',
        subCrack: {
          primary: 'rgb(var(--sg-background) / <alpha-value>)',
          secondary: 'rgb(var(--sg-surface) / <alpha-value>)',
          tertiary: 'rgb(var(--sg-surface-muted) / <alpha-value>)',
          card: 'rgb(var(--sg-card) / <alpha-value>)',
          hover: 'rgb(var(--sg-hover) / <alpha-value>)',
        },
        velvet: {
          royal: 'rgb(var(--sg-accent) / <alpha-value>)',
          'royal-light': 'rgb(var(--sg-accent-muted) / <alpha-value>)',
          charcoal: 'rgb(var(--sg-border) / <alpha-value>)',
          deep: 'rgb(var(--sg-surface) / <alpha-value>)',
          plum: 'rgb(var(--sg-accent) / <alpha-value>)',
        },
        accent: {
          gold: 'rgb(var(--sg-accent) / <alpha-value>)',
          'gold-muted': 'rgb(var(--sg-accent-muted) / <alpha-value>)',
          silver: 'rgb(var(--sg-foreground) / <alpha-value>)',
          'silver-muted': 'rgb(var(--sg-muted) / <alpha-value>)',
        },
        text: {
          primary: 'rgb(var(--sg-foreground) / <alpha-value>)',
          secondary: 'rgb(var(--sg-secondary) / <alpha-value>)',
          muted: 'rgb(var(--sg-muted) / <alpha-value>)',
        },
        status: { success: '#10B981', warning: '#F59E0B', error: '#EF4444', info: '#3B82F6' },
      },
      fontFamily: {
        sans: ['Inter','ui-sans-serif','system-ui','Segoe UI','sans-serif'],
        mono: ['JetBrains Mono','monospace'],
      },
      borderRadius: { '4xl': '2rem' },
      boxShadow: {
        soft: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.06)',
        medium: '0 4px 12px rgba(0,0,0,0.07)',
        large: '0 10px 28px rgba(0,0,0,0.08)',
      },
      animation: {
        'shimmer': 'shimmer 1.6s ease infinite',
        'slide-up': 'slide-up 0.22s ease-out',
        'fade-in': 'fade-in 0.18s ease-out',
      },
      keyframes: {
        'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        'slide-up': { '0%': { transform: 'translateY(6px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
      },
    },
  },
  plugins: [],
}
export default config
