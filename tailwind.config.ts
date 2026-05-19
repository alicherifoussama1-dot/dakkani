import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'], // Disabled via no dark class applied
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: { DEFAULT: '1rem', sm: '1.5rem', lg: '2rem' },
      screens: { '2xl': '1440px' },
    },
    extend: {
      // ── Brand Fonts ─────────────────────────────────────
      fontFamily: {
        tajawal: ['var(--font-tajawal)', 'Tajawal', 'sans-serif'],
        inter:   ['var(--font-inter)',   'Inter',   'sans-serif'],
        sans:    ['var(--font-tajawal)', 'Tajawal', 'Inter', 'sans-serif'],
      },

      // ── Brand Colors ─────────────────────────────────────
      colors: {
        // Design system tokens
        brand: {
          accent:       '#E8431A',
          'accent-hover': '#C73615',
          'accent-tint': '#FFF0ED',
        },
        surface: {
          white:  '#FFFFFF',
          soft:   '#F9F9F9',
          card:   '#F3F3F3',
          footer: '#111111',
        },
        content: {
          primary: '#111111',
          body:    '#444444',
          muted:   '#999999',
          border:  '#EBEBEB',
        },
        // Accent semantic aliases
        accent: {
          DEFAULT: '#E8431A',
          hover:   '#C73615',
          tint:    '#FFF0ED',
        },
        // Legacy aliases kept for backward compat
        border:  'hsl(var(--border))',
        input:   'hsl(var(--input))',
        ring:    'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#E8431A',
          foreground: '#FFFFFF',
          light: '#F96540',
          dark:  '#C73615',
          50:  '#FFF0ED',
          100: '#FFD9CE',
          500: '#E8431A',
          600: '#C73615',
          900: '#7A1A09',
        },
        muted:       { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        card:        { DEFAULT: 'hsl(var(--card))',  foreground: 'hsl(var(--card-foreground))' },
        popover:     { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        secondary:   { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        // Kept for any legacy references
        dakkani: {
          50: '#FFF0ED', 100: '#FFD9CE', 200: '#FFAB94',
          300: '#FF7D5A', 400: '#F96540', 500: '#E8431A',
          600: '#C73615', 700: '#A02810', 800: '#7A1A09', 900: '#521005',
        },
      },

      // ── Border Radius ────────────────────────────────────
      borderRadius: {
        none: '0',
        sm:   '6px',
        DEFAULT: '8px',
        md:   '10px',
        lg:   '12px',
        xl:   '16px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
        full: '9999px',
      },

      // ── Box Shadows ──────────────────────────────────────
      boxShadow: {
        xs:    '0 1px 2px rgba(0,0,0,0.05)',
        sm:    '0 1px 4px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        DEFAULT: '0 2px 8px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)',
        md:    '0 4px 16px rgba(0,0,0,0.10), 0 2px 6px rgba(0,0,0,0.06)',
        lg:    '0 8px 24px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.06)',
        xl:    '0 16px 40px rgba(0,0,0,0.12)',
        card:  '0 2px 12px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
        'card-hover': '0 8px 24px rgba(0,0,0,0.10), 0 4px 10px rgba(0,0,0,0.06)',
        accent: '0 8px 24px rgba(232,67,26,0.28)',
        nav:   '0 2px 20px rgba(0,0,0,0.08)',
        none:  'none',
      },

      // ── Typography Scale ─────────────────────────────────
      fontSize: {
        '3xs': ['10px',  { lineHeight: '1.5' }],
        '2xs': ['12px',  { lineHeight: '1.6' }],
        xs:    ['12px',  { lineHeight: '1.6' }],
        sm:    ['14px',  { lineHeight: '1.7' }],
        base:  ['16px',  { lineHeight: '1.8' }],
        md:    ['16px',  { lineHeight: '1.8' }],
        lg:    ['18px',  { lineHeight: '1.8' }],
        xl:    ['22px',  { lineHeight: '1.6' }],
        '2xl': ['28px',  { lineHeight: '1.4' }],
        '3xl': ['36px',  { lineHeight: '1.3' }],
        '4xl': ['48px',  { lineHeight: '1.2' }],
        '5xl': ['56px',  { lineHeight: '1.15' }],
        '6xl': ['72px',  { lineHeight: '1.1' }],
      },

      // ── Spacing — 4px base grid ──────────────────────────
      spacing: {
        px: '1px',
        0: '0',
        0.5: '2px',
        1: '4px',
        1.5: '6px',
        2: '8px',
        2.5: '10px',
        3: '12px',
        3.5: '14px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '28px',
        8: '32px',
        9: '36px',
        10: '40px',
        11: '44px',
        12: '48px',
        14: '56px',
        16: '64px',
        18: '72px',
        20: '80px',
        24: '96px',
        28: '112px',
        32: '128px',
        36: '144px',
        40: '160px',
        44: '176px',
        48: '192px',
        52: '208px',
        56: '224px',
        60: '240px',
        64: '256px',
        72: '288px',
        80: '320px',
        96: '384px',
      },

      // ── Breakpoints ──────────────────────────────────────
      screens: {
        xs:  '375px',
        sm:  '390px',
        md:  '768px',
        lg:  '1024px',
        xl:  '1280px',
        '2xl': '1440px',
      },

      // ── Animation Keyframes ──────────────────────────────
      keyframes: {
        // Accordion
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        // Fade up for scroll reveals
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Fade in
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Slide down (navbar entrance)
        'slide-down': {
          '0%':   { opacity: '0', transform: 'translateY(-100%)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Hero float
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        // Shimmer skeleton
        shimmer: {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        // Count up (CSS trigger via class)
        'count-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Scale in
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        // Drawer slide
        'slide-right': {
          '0%':   { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-right-out': {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        // Ripple
        ripple: {
          '0%':   { transform: 'scale(0)', opacity: '0.4' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
        // Progress bar pulse
        'progress-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0.6' },
        },
      },

      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-up':    'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':    'fade-in 0.4s ease both',
        'slide-down': 'slide-down 0.3s cubic-bezier(0.16,1,0.3,1) both',
        float:        'float 3s ease-in-out infinite',
        shimmer:      'shimmer 1.5s linear infinite',
        'count-up':   'count-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':   'scale-in 0.35s cubic-bezier(0.16,1,0.3,1) both',
        'slide-right': 'slide-right 0.3s cubic-bezier(0.16,1,0.3,1) both',
        ripple:       'ripple 0.6s linear',
      },

      // ── Transition Timing ────────────────────────────────
      transitionTimingFunction: {
        spring:  'cubic-bezier(0.34,1.56,0.64,1)',
        smooth:  'cubic-bezier(0.16,1,0.3,1)',
        DEFAULT: 'cubic-bezier(0.4,0,0.2,1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
