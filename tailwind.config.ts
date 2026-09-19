import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./pages/**/*.{js,ts,jsx,tsx,mdx}','./components/**/*.{js,ts,jsx,tsx,mdx}','./app/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        border: 'rgb(var(--sg-border) / <alpha-value>)',
        // Layered surface system — the single source of truth for backgrounds
        surface: {
          DEFAULT: 'rgb(var(--sg-surface) / <alpha-value>)',
          muted: 'rgb(var(--sg-surface-muted) / <alpha-value>)',
          card: 'rgb(var(--sg-card) / <alpha-value>)',
          elevated: 'rgb(var(--sg-elevated) / <alpha-value>)',
          hover: 'rgb(var(--sg-hover) / <alpha-value>)',
        },
        accent: {
          DEFAULT: 'rgb(var(--sg-accent) / <alpha-value>)',
          muted: 'rgb(var(--sg-accent-muted) / <alpha-value>)',
          soft: 'rgb(var(--sg-accent-soft) / <alpha-value>)',
        },
        // Status — tokenized so light/dark both get tuned shades
        success: 'rgb(var(--sg-success) / <alpha-value>)',
        warning: 'rgb(var(--sg-warning) / <alpha-value>)',
        danger: 'rgb(var(--sg-danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter','ui-sans-serif','system-ui','Segoe UI','sans-serif'],
        mono: ['JetBrains Mono','monospace'],
      },
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
