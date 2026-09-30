import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

/**
 * Design tokens live here and in src/index.css as CSS variables.
 * Components reference token names (bg-surface, text-muted) — never raw hex.
 */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1280px' } },
    extend: {
      colors: {
        canvas: 'hsl(var(--canvas) / <alpha-value>)',
        surface: 'hsl(var(--surface) / <alpha-value>)',
        elevated: 'hsl(var(--elevated) / <alpha-value>)',
        ink: 'hsl(var(--ink) / <alpha-value>)',
        muted: 'hsl(var(--muted) / <alpha-value>)',
        subtle: 'hsl(var(--subtle) / <alpha-value>)',
        line: 'hsl(var(--line) / <alpha-value>)',
        accent: {
          DEFAULT: 'hsl(var(--accent) / <alpha-value>)',
          soft: 'hsl(var(--accent-soft) / <alpha-value>)',
          ink: 'hsl(var(--accent-ink) / <alpha-value>)',
        },
        charcoal: 'hsl(var(--charcoal) / <alpha-value>)',
        success: 'hsl(var(--success) / <alpha-value>)',
        warning: 'hsl(var(--warning) / <alpha-value>)',
        danger: 'hsl(var(--danger) / <alpha-value>)',
        ring: 'hsl(var(--ring) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
      },
      fontSize: {
        display: ['clamp(2.75rem, 6vw, 4.5rem)', { lineHeight: '1.02', letterSpacing: '-0.025em' }],
        headline: ['clamp(1.9rem, 3.6vw, 2.9rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        title: ['clamp(1.3rem, 2vw, 1.6rem)', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        kicker: ['0.72rem', { lineHeight: '1', letterSpacing: '0.16em' }],
      },
      borderRadius: {
        xs: '0.375rem',
        sm: 'calc(var(--radius) - 4px)',
        md: 'var(--radius)',
        lg: 'calc(var(--radius) + 4px)',
        xl: 'calc(var(--radius) + 10px)',
        '2xl': 'calc(var(--radius) + 18px)',
      },
      boxShadow: {
        subtle: '0 1px 2px hsl(var(--ink) / 0.04), 0 1px 3px hsl(var(--ink) / 0.03)',
        card: '0 2px 4px hsl(var(--ink) / 0.03), 0 12px 28px -12px hsl(var(--ink) / 0.14)',
        lift: '0 6px 12px hsl(var(--ink) / 0.05), 0 24px 48px -20px hsl(var(--ink) / 0.22)',
        inset: 'inset 0 1px 0 hsl(0 0% 100% / 0.06)',
      },
      spacing: { section: 'clamp(4.5rem, 9vw, 8rem)' },
      transitionDuration: { fast: '140ms', base: '240ms', slow: '480ms' },
      transitionTimingFunction: { premium: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.8s infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config
