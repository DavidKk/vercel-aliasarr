import type { Config } from 'tailwindcss'

export default {
  content: ['./components/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx,mdx}', './services/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        app: {
          bg: 'rgb(var(--app-bg) / <alpha-value>)',
          surface: 'rgb(var(--app-surface) / <alpha-value>)',
          subtle: 'rgb(var(--app-subtle) / <alpha-value>)',
          border: 'rgb(var(--app-border) / <alpha-value>)',
          text: 'rgb(var(--app-text) / <alpha-value>)',
          muted: 'rgb(var(--app-muted) / <alpha-value>)',
          accent: 'rgb(var(--app-accent) / <alpha-value>)',
          accentSoft: 'rgb(var(--app-accent-soft) / <alpha-value>)',
          ink: 'rgb(var(--app-ink) / <alpha-value>)',
          success: 'rgb(var(--app-success) / <alpha-value>)',
          successSoft: 'rgb(var(--app-success-soft) / <alpha-value>)',
          danger: 'rgb(var(--app-danger) / <alpha-value>)',
          dangerSoft: 'rgb(var(--app-danger-soft) / <alpha-value>)',
          warning: 'rgb(var(--app-warning) / <alpha-value>)',
          warningSoft: 'rgb(var(--app-warning-soft) / <alpha-value>)',
        },
      },
      fontFamily: {
        display: ['var(--font-sora)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-ibm-plex-mono)', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
