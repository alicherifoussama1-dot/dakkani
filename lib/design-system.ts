// ============================================================
// COMMERCO — Design System Tokens 2026
// ============================================================

export const colors = {
  // Brand
  primary:   '#1B4332',  // Deep forest green
  primaryLight: '#2D6A4F',
  primaryDark:  '#0D2B1E',
  accent:    '#F59E0B',  // Amber gold
  accentLight: '#FCD34D',
  accentDark:  '#D97706',

  // Backgrounds
  bgWarm:  '#FAFAF8',    // Warm white
  bgDark:  '#111827',    // Near-black
  bgCard:  '#FFFFFF',
  bgMuted: '#F3F4F6',

  // Text
  textPrimary:  '#111827',
  textSecondary: '#6B7280',
  textMuted:    '#9CA3AF',
  textOnDark:   '#F9FAFB',

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  danger:  '#EF4444',
  info:    '#3B82F6',
} as const

export const spacing = {
  xs:  '4px',
  sm:  '8px',
  md:  '16px',
  lg:  '24px',
  xl:  '32px',
  '2xl': '48px',
  '3xl': '64px',
  '4xl': '96px',
} as const

export const radius = {
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '20px',
  '2xl': '24px',
  full: '9999px',
} as const

export const shadows = {
  sm:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
  md:  '0 4px 16px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)',
  lg:  '0 8px 32px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.06)',
  xl:  '0 20px 60px rgba(0,0,0,0.15), 0 8px 20px rgba(0,0,0,0.08)',
  card: '0 2px 12px rgba(27,67,50,0.06), 0 1px 4px rgba(27,67,50,0.04)',
  green: '0 8px 32px rgba(27,67,50,0.2)',
  amber: '0 8px 32px rgba(245,158,11,0.25)',
} as const

export const typography = {
  fontArabic: 'Tajawal, sans-serif',
  fontLatin:  'Inter, sans-serif',
  sizes: {
    xs:   '0.75rem',
    sm:   '0.875rem',
    base: '1rem',
    lg:   '1.125rem',
    xl:   '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
  },
  weights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    black: '900',
  },
} as const

// Animation presets for Framer Motion
export const animations = {
  fadeUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4 } },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  },
  slideRight: {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4 } },
  },
  stagger: {
    visible: { transition: { staggerChildren: 0.08 } },
  },
} as const
