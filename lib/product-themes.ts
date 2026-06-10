import type { CSSProperties } from 'react'

// ============================================================
// Product Page Theme System
// Each theme is a set of design tokens applied via CSS variables
// (data-theme attr on the page root). Functionality stays identical
// across themes — only look & feel changes.
// ============================================================

export interface ProductTheme {
  key: string
  name: string          // Arabic display name
  description: string   // short Arabic description for the picker
  preview: {            // colors used to render a small preview swatch
    bg: string
    accent: string
    surface: string
  }
  tokens: {
    // Colors
    '--pt-bg':            string
    '--pt-surface':       string
    '--pt-surface-soft':  string
    '--pt-border':        string
    '--pt-text':          string
    '--pt-text-soft':     string
    '--pt-text-muted':    string
    '--pt-accent':        string
    '--pt-accent-soft':   string
    '--pt-accent-text':   string
    '--pt-success':       string
    '--pt-danger':        string
    '--pt-star':          string
    // Typography
    '--pt-font-heading':  string
    '--pt-font-body':     string
    '--pt-heading-weight': string
    '--pt-heading-tracking': string
    // Shape & spacing
    '--pt-radius-sm':     string
    '--pt-radius-md':     string
    '--pt-radius-lg':     string
    '--pt-radius-pill':   string
    '--pt-btn-radius':    string
    '--pt-card-padding':  string
    '--pt-section-gap':   string
    // Buttons
    '--pt-btn-primary-bg':     string
    '--pt-btn-primary-text':   string
    '--pt-btn-secondary-bg':   string
    '--pt-btn-secondary-text': string
    '--pt-btn-secondary-border': string
    // Shadows
    '--pt-shadow-sm':  string
    '--pt-shadow-md':  string
    '--pt-shadow-lg':  string
  }
}

export const PRODUCT_THEMES: ProductTheme[] = [
  // ─────────────────────────────────────────────────────────
  {
    key: 'classic',
    name: 'كلاسيكي',
    description: 'تصميم نظيف بخلفية بيضاء ولون أزرق بنفسجي — مثالي لكل أنواع المتاجر',
    preview: { bg: '#FFFFFF', accent: '#4F46E5', surface: '#F8FAFC' },
    tokens: {
      '--pt-bg':            '#FFFFFF',
      '--pt-surface':       '#FFFFFF',
      '--pt-surface-soft':  '#F8FAFC',
      '--pt-border':        '#E2E8F0',
      '--pt-text':          '#0F172A',
      '--pt-text-soft':     '#475569',
      '--pt-text-muted':    '#94A3B8',
      '--pt-accent':        '#4F46E5',
      '--pt-accent-soft':   '#EEF2FF',
      '--pt-accent-text':   '#4F46E5',
      '--pt-success':       '#16A34A',
      '--pt-danger':        '#DC2626',
      '--pt-star':          '#FBBF24',
      '--pt-font-heading':  'var(--font-tajawal)',
      '--pt-font-body':     'var(--font-tajawal)',
      '--pt-heading-weight': '800',
      '--pt-heading-tracking': 'normal',
      '--pt-radius-sm':     '8px',
      '--pt-radius-md':     '14px',
      '--pt-radius-lg':     '20px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '14px',
      '--pt-card-padding':  '20px',
      '--pt-section-gap':   '32px',
      '--pt-btn-primary-bg':       'linear-gradient(135deg,#4F46E5,#4338CA)',
      '--pt-btn-primary-text':     '#FFFFFF',
      '--pt-btn-secondary-bg':     '#FFFFFF',
      '--pt-btn-secondary-text':   '#4F46E5',
      '--pt-btn-secondary-border': 'rgba(79,70,229,0.3)',
      '--pt-shadow-sm': '0 2px 8px rgba(15,23,42,0.06)',
      '--pt-shadow-md': '0 8px 24px rgba(15,23,42,0.08)',
      '--pt-shadow-lg': '0 20px 50px rgba(79,70,229,0.16)',
    },
  },
  // ─────────────────────────────────────────────────────────
  {
    key: 'modern',
    name: 'عصري',
    description: 'صور كبيرة وجريئة وأزرار داكنة — لمتاجر الإلكترونيات والموضة العصرية',
    preview: { bg: '#0F172A', accent: '#22D3EE', surface: '#1E293B' },
    tokens: {
      '--pt-bg':            '#0B1220',
      '--pt-surface':       '#111827',
      '--pt-surface-soft':  '#1E293B',
      '--pt-border':        '#334155',
      '--pt-text':          '#F8FAFC',
      '--pt-text-soft':     '#CBD5E1',
      '--pt-text-muted':    '#94A3B8',
      '--pt-accent':        '#22D3EE',
      '--pt-accent-soft':   'rgba(34,211,238,0.12)',
      '--pt-accent-text':   '#22D3EE',
      '--pt-success':       '#34D399',
      '--pt-danger':        '#F87171',
      '--pt-star':          '#FBBF24',
      '--pt-font-heading':  'var(--font-tajawal)',
      '--pt-font-body':     'var(--font-tajawal)',
      '--pt-heading-weight': '900',
      '--pt-heading-tracking': '-0.01em',
      '--pt-radius-sm':     '6px',
      '--pt-radius-md':     '10px',
      '--pt-radius-lg':     '16px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '10px',
      '--pt-card-padding':  '20px',
      '--pt-section-gap':   '36px',
      '--pt-btn-primary-bg':       '#F8FAFC',
      '--pt-btn-primary-text':     '#0B1220',
      '--pt-btn-secondary-bg':     'rgba(255,255,255,0.06)',
      '--pt-btn-secondary-text':   '#F8FAFC',
      '--pt-btn-secondary-border': 'rgba(255,255,255,0.16)',
      '--pt-shadow-sm': '0 2px 12px rgba(0,0,0,0.35)',
      '--pt-shadow-md': '0 12px 32px rgba(0,0,0,0.45)',
      '--pt-shadow-lg': '0 24px 64px rgba(34,211,238,0.18)',
    },
  },
  // ─────────────────────────────────────────────────────────
  {
    key: 'elegant',
    name: 'أنيق',
    description: 'عناوين بخط كلاسيكي وألوان هادئة — للمجوهرات والعطور ومنتجات التجميل الراقية',
    preview: { bg: '#FAF7F2', accent: '#A37E5C', surface: '#F2EBE1' },
    tokens: {
      '--pt-bg':            '#FAF7F2',
      '--pt-surface':       '#FFFFFF',
      '--pt-surface-soft':  '#F2EBE1',
      '--pt-border':        '#E7DDD0',
      '--pt-text':          '#2B2521',
      '--pt-text-soft':     '#6B5F54',
      '--pt-text-muted':    '#A89A8C',
      '--pt-accent':        '#A37E5C',
      '--pt-accent-soft':   '#F2E7D9',
      '--pt-accent-text':   '#8A6644',
      '--pt-success':       '#5B8266',
      '--pt-danger':        '#B5544A',
      '--pt-star':          '#C7A45C',
      '--pt-font-heading':  'Georgia, "Times New Roman", var(--font-tajawal)',
      '--pt-font-body':     'var(--font-tajawal)',
      '--pt-heading-weight': '600',
      '--pt-heading-tracking': '0.01em',
      '--pt-radius-sm':     '4px',
      '--pt-radius-md':     '8px',
      '--pt-radius-lg':     '12px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '4px',
      '--pt-card-padding':  '28px',
      '--pt-section-gap':   '44px',
      '--pt-btn-primary-bg':       '#2B2521',
      '--pt-btn-primary-text':     '#FAF7F2',
      '--pt-btn-secondary-bg':     'transparent',
      '--pt-btn-secondary-text':   '#2B2521',
      '--pt-btn-secondary-border': '#2B2521',
      '--pt-shadow-sm': '0 2px 10px rgba(43,37,33,0.05)',
      '--pt-shadow-md': '0 10px 30px rgba(43,37,33,0.08)',
      '--pt-shadow-lg': '0 24px 60px rgba(163,126,92,0.18)',
    },
  },
  // ─────────────────────────────────────────────────────────
  {
    key: 'vibrant',
    name: 'حيوي',
    description: 'ألوان زاهية وأشكال دائرية مرحة — للأطفال والإكسسوارات والمنتجات الممتعة',
    preview: { bg: '#FFFBEB', accent: '#F97316', surface: '#FEF3C7' },
    tokens: {
      '--pt-bg':            '#FFFBF5',
      '--pt-surface':       '#FFFFFF',
      '--pt-surface-soft':  '#FFF1E0',
      '--pt-border':        '#FFE0BD',
      '--pt-text':          '#1F2937',
      '--pt-text-soft':     '#4B5563',
      '--pt-text-muted':    '#9CA3AF',
      '--pt-accent':        '#F97316',
      '--pt-accent-soft':   '#FFEDD5',
      '--pt-accent-text':   '#EA580C',
      '--pt-success':       '#22C55E',
      '--pt-danger':        '#EF4444',
      '--pt-star':          '#FACC15',
      '--pt-font-heading':  'var(--font-tajawal)',
      '--pt-font-body':     'var(--font-tajawal)',
      '--pt-heading-weight': '900',
      '--pt-heading-tracking': 'normal',
      '--pt-radius-sm':     '14px',
      '--pt-radius-md':     '20px',
      '--pt-radius-lg':     '28px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '999px',
      '--pt-card-padding':  '20px',
      '--pt-section-gap':   '32px',
      '--pt-btn-primary-bg':       'linear-gradient(135deg,#F97316,#FB923C)',
      '--pt-btn-primary-text':     '#FFFFFF',
      '--pt-btn-secondary-bg':     '#FFFFFF',
      '--pt-btn-secondary-text':   '#EA580C',
      '--pt-btn-secondary-border': 'rgba(249,115,22,0.3)',
      '--pt-shadow-sm': '0 4px 14px rgba(249,115,22,0.12)',
      '--pt-shadow-md': '0 10px 28px rgba(249,115,22,0.18)',
      '--pt-shadow-lg': '0 22px 56px rgba(249,115,22,0.28)',
    },
  },
  // ─────────────────────────────────────────────────────────
  {
    key: 'luxury',
    name: 'فخم',
    description: 'أسود وذهبي بمساحات واسعة — للمنتجات الفاخرة والساعات والملابس الراقية',
    preview: { bg: '#0A0A0A', accent: '#D4AF6A', surface: '#1A1A1A' },
    tokens: {
      '--pt-bg':            '#0A0A0A',
      '--pt-surface':       '#141414',
      '--pt-surface-soft':  '#1F1F1F',
      '--pt-border':        '#2E2A22',
      '--pt-text':          '#F5F1E8',
      '--pt-text-soft':     '#C9C2B4',
      '--pt-text-muted':    '#8A8478',
      '--pt-accent':        '#D4AF6A',
      '--pt-accent-soft':   'rgba(212,175,106,0.12)',
      '--pt-accent-text':   '#D4AF6A',
      '--pt-success':       '#7FBF8E',
      '--pt-danger':        '#E08989',
      '--pt-star':          '#D4AF6A',
      '--pt-font-heading':  'Georgia, "Times New Roman", var(--font-tajawal)',
      '--pt-font-body':     'var(--font-tajawal)',
      '--pt-heading-weight': '600',
      '--pt-heading-tracking': '0.04em',
      '--pt-radius-sm':     '2px',
      '--pt-radius-md':     '4px',
      '--pt-radius-lg':     '8px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '2px',
      '--pt-card-padding':  '32px',
      '--pt-section-gap':   '56px',
      '--pt-btn-primary-bg':       'linear-gradient(135deg,#D4AF6A,#B8945A)',
      '--pt-btn-primary-text':     '#0A0A0A',
      '--pt-btn-secondary-bg':     'transparent',
      '--pt-btn-secondary-text':   '#D4AF6A',
      '--pt-btn-secondary-border': '#D4AF6A',
      '--pt-shadow-sm': '0 2px 14px rgba(0,0,0,0.5)',
      '--pt-shadow-md': '0 16px 40px rgba(0,0,0,0.6)',
      '--pt-shadow-lg': '0 30px 80px rgba(212,175,106,0.15)',
    },
  },
  // ─────────────────────────────────────────────────────────
  {
    key: 'minimal',
    name: 'بسيط',
    description: 'أقصى درجات البساطة بمساحات بيضاء فسيحة ولمسات صغيرة — للتصاميم الهادئة',
    preview: { bg: '#FFFFFF', accent: '#0F172A', surface: '#FAFAFA' },
    tokens: {
      '--pt-bg':            '#FFFFFF',
      '--pt-surface':       '#FFFFFF',
      '--pt-surface-soft':  '#FAFAFA',
      '--pt-border':        '#EDEDED',
      '--pt-text':          '#171717',
      '--pt-text-soft':     '#525252',
      '--pt-text-muted':    '#A3A3A3',
      '--pt-accent':        '#171717',
      '--pt-accent-soft':   '#F5F5F5',
      '--pt-accent-text':   '#171717',
      '--pt-success':       '#16A34A',
      '--pt-danger':        '#DC2626',
      '--pt-star':          '#171717',
      '--pt-font-heading':  'var(--font-tajawal)',
      '--pt-font-body':     'var(--font-tajawal)',
      '--pt-heading-weight': '500',
      '--pt-heading-tracking': '-0.01em',
      '--pt-radius-sm':     '0px',
      '--pt-radius-md':     '2px',
      '--pt-radius-lg':     '2px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '0px',
      '--pt-card-padding':  '24px',
      '--pt-section-gap':   '64px',
      '--pt-btn-primary-bg':       '#171717',
      '--pt-btn-primary-text':     '#FFFFFF',
      '--pt-btn-secondary-bg':     '#FFFFFF',
      '--pt-btn-secondary-text':   '#171717',
      '--pt-btn-secondary-border': '#171717',
      '--pt-shadow-sm': 'none',
      '--pt-shadow-md': '0 1px 3px rgba(0,0,0,0.06)',
      '--pt-shadow-lg': '0 4px 16px rgba(0,0,0,0.08)',
    },
  },
  // ─────────────────────────────────────────────────────────
  {
    key: 'poster',
    name: 'ملصق طويل (إنفوجرافيك)',
    description: 'خلفية متدرجة غامقة مع تراكب النصوص فوق الصور، يحاكي الملصقات الإعلانية المتصلة لزيادة المبيعات',
    preview: { bg: '#2B0F16', accent: '#D4AF37', surface: '#3D151E' },
    tokens: {
      '--pt-bg':            'linear-gradient(180deg, #2D0B12 0%, #150508 100%)',
      '--pt-surface':       'rgba(61, 21, 30, 0.45)',
      '--pt-surface-soft':  'rgba(61, 21, 30, 0.25)',
      '--pt-border':        'rgba(212, 175, 106, 0.2)',
      '--pt-text':          '#FFF5F6',
      '--pt-text-soft':     '#E5D2D5',
      '--pt-text-muted':    '#A68E91',
      '--pt-accent':        '#D4AF6A',
      '--pt-accent-soft':   'rgba(212, 175, 106, 0.15)',
      '--pt-accent-text':   '#E5C180',
      '--pt-success':       '#22C55E',
      '--pt-danger':        '#EF4444',
      '--pt-star':          '#D4AF6A',
      '--pt-font-heading':  'var(--font-tajawal)',
      '--pt-font-body':     'var(--font-tajawal)',
      '--pt-heading-weight': '900',
      '--pt-heading-tracking': 'normal',
      '--pt-radius-sm':     '10px',
      '--pt-radius-md':     '16px',
      '--pt-radius-lg':     '24px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '16px',
      '--pt-card-padding':  '24px',
      '--pt-section-gap':   '36px',
      '--pt-btn-primary-bg':       'linear-gradient(135deg,#D4AF6A,#B8945A)',
      '--pt-btn-primary-text':     '#150508',
      '--pt-btn-secondary-bg':     'rgba(255,255,255,0.06)',
      '--pt-btn-secondary-text':   '#D4AF6A',
      '--pt-btn-secondary-border': 'rgba(212,175,106,0.3)',
      '--pt-shadow-sm': '0 4px 12px rgba(0,0,0,0.4)',
      '--pt-shadow-md': '0 12px 30px rgba(0,0,0,0.5)',
      '--pt-shadow-lg': '0 24px 60px rgba(212,175,106,0.18)',
    },
  },
]

export const DEFAULT_THEME_KEY = 'classic'

export function getProductTheme(key?: string | null): ProductTheme {
  return PRODUCT_THEMES.find(t => t.key === key) ?? PRODUCT_THEMES[0]
}

/** Convert a theme's token map into a React style object for inline application */
export function themeToCSSVars(theme: ProductTheme): CSSProperties {
  return theme.tokens as unknown as CSSProperties
}

// Default section order for product pages
export const DEFAULT_SECTION_ORDER = [
  'gallery',
  'info',
  'variants',
  'buybox',
  'trust',
  'description',
  'reviews',
  'upsells',
  'related',
] as const

export type ProductSectionId = typeof DEFAULT_SECTION_ORDER[number]

export const SECTION_LABELS: Record<ProductSectionId, string> = {
  gallery:     'معرض الصور',
  info:        'العنوان والسعر',
  variants:    'الخيارات (الألوان/المقاسات)',
  buybox:      'صندوق الشراء (الكمية + الأزرار)',
  trust:       'شارات الثقة',
  description: 'الوصف والتفاصيل',
  reviews:     'التقييمات',
  upsells:     'يُشترى عادة مع',
  related:     'منتجات مشابهة',
}
