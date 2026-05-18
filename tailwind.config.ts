import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: { center: true, padding: '1.5rem', screens: { '2xl': '1440px' } },
    extend: {
      fontFamily: {
        tajawal: ['Tajawal', 'sans-serif'],
        inter:   ['Inter', 'sans-serif'],
        sans:    ['Tajawal', 'Inter', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#1B4332',
          light:   '#2D6A4F',
          dark:    '#0D2B1E',
          foreground: '#FFFFFF',
          50:  '#F0FDF4', 100: '#DCFCE7', 200: '#BBF7D0',
          300: '#86EFAC', 400: '#4ADE80', 500: '#22C55E',
          600: '#16A34A', 700: '#15803D', 800: '#166534', 900: '#14532D',
        },
        accent: {
          DEFAULT: '#F59E0B',
          light:   '#FCD34D',
          dark:    '#D97706',
          foreground: '#FFFFFF',
          50:  '#FFFBEB', 100: '#FEF3C7', 200: '#FDE68A',
          300: '#FCD34D', 400: '#FBBF24', 500: '#F59E0B',
          600: '#D97706', 700: '#B45309', 800: '#92400E', 900: '#78350F',
        },
        forest: { DEFAULT: '#1B4332', 50: '#ECFDF5', 100: '#D1FAE5', 500: '#1B4332', 600: '#0D2B1E' },
        muted:     { DEFAULT: 'hsl(var(--muted))', foreground: 'hsl(var(--muted-foreground))' },
        card:      { DEFAULT: 'hsl(var(--card))',  foreground: 'hsl(var(--card-foreground))' },
        popover:   { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive:{ DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        dakkani: {
          50:'#FFF7ED', 100:'#FFEDD5', 200:'#FED7AA', 300:'#FDBA74', 400:'#FB923C',
          500:'#F97316', 600:'#EA580C', 700:'#C2410C', 800:'#9A3412', 900:'#7C2D12',
        },
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)', md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)', xl: '16px', '2xl': '20px', '3xl': '24px', '4xl': '32px',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%)',
        'gradient-accent':  'linear-gradient(135deg,#D97706 0%,#F59E0B 100%)',
        'gradient-hero':    'linear-gradient(160deg,#0D2B1E 0%,#1B4332 50%,#2D6A4F 100%)',
      },
      boxShadow: {
        card:        '0 2px 12px rgba(27,67,50,.06),0 1px 4px rgba(27,67,50,.04)',
        'card-hover':'0 8px 36px rgba(27,67,50,.13),0 4px 14px rgba(27,67,50,.08)',
        green:       '0 8px 32px rgba(27,67,50,.22)',
        amber:       '0 8px 32px rgba(245,158,11,.28)',
        float:       '0 20px 60px rgba(27,67,50,.18)',
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up':   { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } },
        'fade-up':  { '0%': { opacity:'0', transform:'translateY(20px)' }, '100%': { opacity:'1', transform:'translateY(0)' } },
        'fade-in':  { from: { opacity:'0' }, to: { opacity:'1' } },
        'scale-in': { '0%': { opacity:'0', transform:'scale(.95)' }, '100%': { opacity:'1', transform:'scale(1)' } },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up':   'accordion-up 0.2s ease-out',
        'fade-up':  'fade-up .5s cubic-bezier(.22,1,.36,1)',
        'fade-in':  'fade-in .4s ease',
        'scale-in': 'scale-in .35s cubic-bezier(.22,1,.36,1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
