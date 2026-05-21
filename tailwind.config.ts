import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class', '[data-theme="dark"]'],
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
      fontFamily: {
        inter:   ['var(--font-inter)',   'Inter',   'sans-serif'],
        tajawal: ['var(--font-tajawal)', 'Tajawal', 'sans-serif'],
        sans:    ['var(--font-inter)',   'Inter',   'Tajawal', 'sans-serif'],
      },
      colors: {
        // ── JustSell Design System ─────────────────────────
        accent: {
          DEFAULT: '#0D6EFD', dark: '#0B5ED7', soft: '#EBF5FF',
          50:'#EBF5FF', 100:'#CCE4FF', 200:'#99C8FE', 300:'#66ABFD',
          400:'#338FFD', 500:'#0D6EFD', 600:'#0B5ED7', 700:'#0950B5',
          800:'#074293', 900:'#053571',
        },
        surface: {
          white:'#FFFFFF', soft:'#F8F9FA', muted:'#F1F3F5',
          sidebar:'#FFFFFF', topbar:'#FFFFFF',
        },
        sidebar: {
          bg:'#FFFFFF', border:'#E9ECEF',
          'active-bg':'#EBF5FF', 'active-text':'#0D6EFD', 'active-border':'#0D6EFD',
          text:'#495057', icon:'#868E96',
        },
        content: { primary:'#212529', secondary:'#495057', muted:'#868E96' },
        status: {
          success:'#198754', 'success-soft':'#D1E7DD',
          warning:'#FFC107', 'warning-soft':'#FFF3CD',
          error:'#DC3545',   'error-soft':'#F8D7DA',
          info:'#0DCAF0',    'info-soft':'#CFF4FC',
        },
        // Backward compat — mapped to JustSell blue
        dakkani: {
          50:'#EBF5FF', 100:'#CCE4FF', 200:'#99C8FE', 300:'#66ABFD',
          400:'#338FFD', 500:'#0D6EFD', 600:'#0B5ED7', 700:'#0950B5',
          800:'#074293', 900:'#053571',
        },
        // shadcn tokens
        background: 'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card:        { DEFAULT:'hsl(var(--card))',    foreground:'hsl(var(--card-foreground))' },
        popover:     { DEFAULT:'hsl(var(--popover))', foreground:'hsl(var(--popover-foreground))' },
        primary:     { DEFAULT:'#0D6EFD', foreground:'#FFFFFF' },
        secondary:   { DEFAULT:'hsl(var(--secondary))', foreground:'hsl(var(--secondary-foreground))' },
        muted:       { DEFAULT:'hsl(var(--muted))',   foreground:'hsl(var(--muted-foreground))' },
        destructive: { DEFAULT:'#DC3545', foreground:'#FFFFFF' },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',
      },
      borderRadius: {
        none:'0', sm:'4px', DEFAULT:'6px', md:'6px',
        lg:'8px', xl:'12px', '2xl':'16px', '3xl':'20px', full:'9999px',
      },
      boxShadow: {
        xs:  '0 1px 2px rgba(0,0,0,0.05)',
        sm:  '0 1px 3px rgba(0,0,0,0.08)',
        DEFAULT:'0 2px 6px rgba(0,0,0,0.08)',
        md:  '0 4px 12px rgba(0,0,0,0.10)',
        lg:  '0 8px 24px rgba(0,0,0,0.10)',
        xl:  '0 16px 40px rgba(0,0,0,0.12)',
        card:'0 1px 3px rgba(0,0,0,0.08)',
        'card-hover':'0 4px 12px rgba(13,110,253,0.15)',
        blue:'0 4px 14px rgba(13,110,253,0.35)',
        none:'none',
      },
      fontSize: {
        '2xs':['11px',{lineHeight:'1.5'}], xs:['12px',{lineHeight:'1.5'}],
        sm:  ['13px',{lineHeight:'1.6'}],  base:['14px',{lineHeight:'1.6'}],
        md:  ['15px',{lineHeight:'1.7'}],  lg:  ['16px',{lineHeight:'1.7'}],
        xl:  ['18px',{lineHeight:'1.6'}],  '2xl':['20px',{lineHeight:'1.5'}],
        '3xl':['24px',{lineHeight:'1.4'}], '4xl':['28px',{lineHeight:'1.3'}],
        '5xl':['32px',{lineHeight:'1.25'}],'6xl':['40px',{lineHeight:'1.2'}],
      },
      screens: { xs:'375px', sm:'640px', md:'768px', lg:'1024px', xl:'1280px', '2xl':'1440px' },
      keyframes: {
        'accordion-down': { from:{height:'0'}, to:{height:'var(--radix-accordion-content-height)'} },
        'accordion-up':   { from:{height:'var(--radix-accordion-content-height)'}, to:{height:'0'} },
        'fade-up': { '0%':{opacity:'0',transform:'translateY(24px)'}, '100%':{opacity:'1',transform:'translateY(0)'} },
        'fade-in':  { '0%':{opacity:'0'}, '100%':{opacity:'1'} },
        'slide-down':{ '0%':{opacity:'0',transform:'translateY(-8px)'}, '100%':{opacity:'1',transform:'translateY(0)'} },
        'slide-right':{ '0%':{transform:'translateX(100%)'}, '100%':{transform:'translateX(0)'} },
        'scale-in': { '0%':{opacity:'0',transform:'scale(.96)'}, '100%':{opacity:'1',transform:'scale(1)'} },
        shimmer: { '0%':{backgroundPosition:'-200% center'}, '100%':{backgroundPosition:'200% center'} },
      },
      animation: {
        'accordion-down':'accordion-down 0.2s ease-out',
        'accordion-up':'accordion-up 0.2s ease-out',
        'fade-up':'fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':'fade-in 0.3s ease both',
        'slide-down':'slide-down 0.25s cubic-bezier(0.16,1,0.3,1) both',
        'slide-right':'slide-right 0.3s cubic-bezier(0.16,1,0.3,1) both',
        'scale-in':'scale-in 0.25s cubic-bezier(0.16,1,0.3,1) both',
        shimmer:'shimmer 1.5s linear infinite',
      },
      transitionTimingFunction: { spring:'cubic-bezier(0.34,1.56,0.64,1)', smooth:'cubic-bezier(0.16,1,0.3,1)' },
      backgroundImage: {
        'gradient-hero': 'linear-gradient(135deg, #0D6EFD 0%, #0B5ED7 100%)',
        'gradient-hero-dark': 'linear-gradient(135deg, #0950B5 0%, #074293 100%)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
