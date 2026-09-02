import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // SubCrack Background - Deep blacks with tech undertones
        subCrack: {
          primary: 'rgb(var(--sg-background) / <alpha-value>)',
          secondary: 'rgb(var(--sg-surface) / <alpha-value>)',
          tertiary: 'rgb(var(--sg-surface-muted) / <alpha-value>)',
          card: 'rgb(var(--sg-card) / <alpha-value>)',
          hover: 'rgb(var(--sg-hover) / <alpha-value>)',
        },
        // Neon Accents - Vibrant high-tech colors
        neon: {
          cyan: 'rgb(var(--sg-accent) / <alpha-value>)',
          'cyan-muted': 'rgb(var(--sg-accent-muted) / <alpha-value>)',
          magenta: 'rgb(var(--sg-accent) / <alpha-value>)',
          'magenta-muted': 'rgb(var(--sg-accent-muted) / <alpha-value>)',
          purple: 'rgb(var(--sg-accent) / <alpha-value>)',
          'purple-muted': 'rgb(var(--sg-accent-muted) / <alpha-value>)',
          blue: 'rgb(var(--sg-accent) / <alpha-value>)',
          'blue-muted': 'rgb(var(--sg-accent-muted) / <alpha-value>)',
        },
        // Velvet Tones (legacy support)
        velvet: {
          royal: 'rgb(var(--sg-accent-muted) / <alpha-value>)',
          'royal-light': 'rgb(var(--sg-accent) / <alpha-value>)',
          charcoal: 'rgb(var(--sg-border) / <alpha-value>)',
          deep: 'rgb(var(--sg-surface) / <alpha-value>)',
          plum: 'rgb(var(--sg-accent-muted) / <alpha-value>)',
        },
        // Accent Colors (updated for neon aesthetic)
        accent: {
          gold: 'rgb(var(--sg-accent) / <alpha-value>)',
          'gold-muted': 'rgb(var(--sg-accent-muted) / <alpha-value>)',
          'gold-dark': 'rgb(var(--sg-accent-muted) / <alpha-value>)',
          silver: 'rgb(var(--sg-foreground) / <alpha-value>)',
          'silver-muted': 'rgb(var(--sg-muted) / <alpha-value>)',
        },
        // Text Colors
        text: {
          primary: 'rgb(var(--sg-foreground) / <alpha-value>)',
          secondary: 'rgb(var(--sg-secondary) / <alpha-value>)',
          muted: 'rgb(var(--sg-muted) / <alpha-value>)',
          dark: 'rgb(var(--sg-muted) / <alpha-value>)',
        },
        // Status Colors
        status: {
          success: '#4ADE80',
          warning: '#FBBF24',
          error: '#EF4444',
          info: '#60A5FA',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '112': '28rem',
        '128': '32rem',
      },
      borderRadius: {
        '4xl': '2rem',
      },
       boxShadow: {
        'glow': '0 0 20px rgba(155, 0, 255, 0.38)',
        'glow-lg': '0 0 40px rgba(155, 0, 255, 0.45)',
        'glow-purple': '0 0 20px rgba(109, 0, 255, 0.42)',
        'glow-purple-lg': '0 0 40px rgba(109, 0, 255, 0.52)',
        'glow-magenta': '0 0 20px rgba(208, 0, 255, 0.42)',
        'glow-magenta-lg': '0 0 40px rgba(208, 0, 255, 0.5)',
        'velvet': '0 4px 30px rgba(0, 0, 0, 0.6)',
        'velvet-lg': '0 8px 50px rgba(0, 0, 0, 0.68)',
        'inner-glow': 'inset 0 0 20px rgba(155, 0, 255, 0.12)',
        'inner-glow-purple': 'inset 0 0 20px rgba(109, 0, 255, 0.18)',
        'neon-border': '0 0 10px rgba(155, 0, 255, 0.52), inset 0 0 10px rgba(155, 0, 255, 0.09)',
      },
      backgroundImage: {
        'velvet-gradient': 'linear-gradient(135deg, #0A0A0F 0%, #14141F 50%, #0F0F18 100%)',
        'velvet-radial': 'radial-gradient(circle at 50% 0%, #18182A 0%, #0A0A0F 100%)',
        'neon-gradient': 'linear-gradient(135deg, #00F0FF 0%, #B026FF 50%, #FF00FF 100%)',
        'neon-glow': 'linear-gradient(135deg, rgba(0,240,255,0.2) 0%, rgba(176,38,255,0.2) 100%)',
        'card-gradient': 'linear-gradient(145deg, #18182A 0%, #14141F 100%)',
        'glass-gradient': 'linear-gradient(145deg, rgba(24,24,42,0.7) 0%, rgba(20,20,31,0.5) 100%)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      transitionTimingFunction: {
        'velvet': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      backdropBlur: {
        'xs': '2px',
      },
    },
  },
  plugins: [],
}

export default config
