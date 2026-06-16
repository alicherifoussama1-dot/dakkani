import type { CSSProperties } from 'react'

// ============================================================
// Storefront / Product Theme System
//
// Each theme is a committed design language — palette, Arabic font
// pairing, shape, motion — applied via CSS variables (data-theme on the
// root). Built with ui-ux-pro-max (niche-matched palettes + font pairings,
// AA contrast) and impeccable (tinted neutrals — never pure #fff/#000 —
// committed color strategy, ease-out-expo motion, no gradient text).
//
// Font pairings (loaded lazily in app/layout.tsx):
//   classic  Cairo        — geometric, trustworthy
//   modern   Cairo 900    — bold, technical
//   elegant  Amiri        — Arabic serif, editorial
//   vibrant  El Messiri   — friendly display
//   luxury   Reem Kufi    — refined kufi, premium
//   minimal  Tajawal      — quiet, neutral
//   poster   Cairo 900    — loud, promotional
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
    // Motion (ease-out-expo per impeccable: no bounce, no elastic)
    '--pt-ease':          string
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

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)' // ease-out-expo

export const PRODUCT_THEMES: ProductTheme[] = [
  // ───────────────────────── CLASSIC ─────────────────────────
  // Versatile editorial blue on warm-tinted paper. Cairo headings.
  {
    key: 'classic',
    name: 'كلاسيكي',
    description: 'أزرق محرري واثق على ورق ناصع — متعدد الاستخدامات لكل أنواع المتاجر',
    preview: { bg: '#FDFDFF', accent: '#2F4BE0', surface: '#F4F6FB' },
    tokens: {
      '--pt-bg':            '#FDFDFF',
      '--pt-surface':       '#FFFFFE',
      '--pt-surface-soft':  '#F4F6FB',
      '--pt-border':        '#E3E8F1',
      '--pt-text':          '#12141A',
      '--pt-text-soft':     '#4A5160',
      '--pt-text-muted':    '#99A1B2',
      '--pt-accent':        '#2F4BE0',
      '--pt-accent-soft':   '#ECEFFE',
      '--pt-accent-text':   '#2A41C7',
      '--pt-success':       '#15A34A',
      '--pt-danger':        '#DC2626',
      '--pt-star':          '#F4B740',
      '--pt-font-heading':  'var(--font-cairo), var(--font-tajawal), sans-serif',
      '--pt-font-body':     'var(--font-tajawal), sans-serif',
      '--pt-heading-weight': '800',
      '--pt-heading-tracking': '-0.01em',
      '--pt-radius-sm':     '8px',
      '--pt-radius-md':     '14px',
      '--pt-radius-lg':     '20px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '12px',
      '--pt-card-padding':  '20px',
      '--pt-section-gap':   '40px',
      '--pt-ease':          EASE,
      '--pt-btn-primary-bg':       'linear-gradient(135deg,#2F4BE0,#2238C4)',
      '--pt-btn-primary-text':     '#FFFFFF',
      '--pt-btn-secondary-bg':     '#FFFFFE',
      '--pt-btn-secondary-text':   '#2A41C7',
      '--pt-btn-secondary-border': 'rgba(47,75,224,0.28)',
      '--pt-shadow-sm': '0 2px 8px rgba(18,20,26,0.05)',
      '--pt-shadow-md': '0 10px 28px rgba(18,20,26,0.08)',
      '--pt-shadow-lg': '0 24px 56px rgba(47,75,224,0.18)',
    },
  },
  // ───────────────────────── MODERN ──────────────────────────
  // Electric teal on blue-tinted near-black. Electronics / streetwear.
  {
    key: 'modern',
    name: 'عصري',
    description: 'تيل كهربائي على أسود مزرق — للإلكترونيات والموضة الجريئة',
    preview: { bg: '#0A0E18', accent: '#2DE0D2', surface: '#121829' },
    tokens: {
      '--pt-bg':            '#0A0E18',
      '--pt-surface':       '#121829',
      '--pt-surface-soft':  '#1B2336',
      '--pt-border':        '#2C3650',
      '--pt-text':          '#F4F7FC',
      '--pt-text-soft':     '#B9C2D6',
      '--pt-text-muted':    '#8593AD',
      '--pt-accent':        '#2DE0D2',
      '--pt-accent-soft':   'rgba(45,224,210,0.12)',
      '--pt-accent-text':   '#4FEADD',
      '--pt-success':       '#34D399',
      '--pt-danger':        '#FB7185',
      '--pt-star':          '#FBBF24',
      '--pt-font-heading':  'var(--font-cairo), var(--font-tajawal), sans-serif',
      '--pt-font-body':     'var(--font-tajawal), sans-serif',
      '--pt-heading-weight': '900',
      '--pt-heading-tracking': '-0.02em',
      '--pt-radius-sm':     '6px',
      '--pt-radius-md':     '10px',
      '--pt-radius-lg':     '16px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '10px',
      '--pt-card-padding':  '22px',
      '--pt-section-gap':   '44px',
      '--pt-ease':          EASE,
      '--pt-btn-primary-bg':       '#F4F7FC',
      '--pt-btn-primary-text':     '#0A0E18',
      '--pt-btn-secondary-bg':     'rgba(255,255,255,0.06)',
      '--pt-btn-secondary-text':   '#F4F7FC',
      '--pt-btn-secondary-border': 'rgba(255,255,255,0.16)',
      '--pt-shadow-sm': '0 2px 12px rgba(0,0,0,0.4)',
      '--pt-shadow-md': '0 14px 34px rgba(0,0,0,0.5)',
      '--pt-shadow-lg': '0 26px 64px rgba(45,224,210,0.20)',
    },
  },
  // ───────────────────────── ELEGANT ─────────────────────────
  // Ivory + bronze, Amiri Arabic serif. Jewelry / perfume / beauty.
  {
    key: 'elegant',
    name: 'أنيق',
    description: 'عناوين بخط عربي كلاسيكي (أميري) وألوان عاجية وبرونزية — للمجوهرات والعطور والتجميل',
    preview: { bg: '#FAF6EF', accent: '#A87B4E', surface: '#F1E9DC' },
    tokens: {
      '--pt-bg':            '#FAF6EF',
      '--pt-surface':       '#FFFEFB',
      '--pt-surface-soft':  '#F1E9DC',
      '--pt-border':        '#E6DBCB',
      '--pt-text':          '#2A2420',
      '--pt-text-soft':     '#6A5E51',
      '--pt-text-muted':    '#A99C8C',
      '--pt-accent':        '#A87B4E',
      '--pt-accent-soft':   '#F1E6D6',
      '--pt-accent-text':   '#8C6238',
      '--pt-success':       '#5B8266',
      '--pt-danger':        '#B5544A',
      '--pt-star':          '#C7A45C',
      '--pt-font-heading':  'var(--font-amiri), Georgia, var(--font-tajawal), serif',
      '--pt-font-body':     'var(--font-tajawal), sans-serif',
      '--pt-heading-weight': '700',
      '--pt-heading-tracking': '0.005em',
      '--pt-radius-sm':     '4px',
      '--pt-radius-md':     '8px',
      '--pt-radius-lg':     '12px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '6px',
      '--pt-card-padding':  '28px',
      '--pt-section-gap':   '56px',
      '--pt-ease':          EASE,
      '--pt-btn-primary-bg':       '#2A2420',
      '--pt-btn-primary-text':     '#FAF6EF',
      '--pt-btn-secondary-bg':     'transparent',
      '--pt-btn-secondary-text':   '#2A2420',
      '--pt-btn-secondary-border': '#2A2420',
      '--pt-shadow-sm': '0 2px 10px rgba(42,36,32,0.05)',
      '--pt-shadow-md': '0 12px 32px rgba(42,36,32,0.08)',
      '--pt-shadow-lg': '0 26px 64px rgba(168,123,78,0.20)',
    },
  },
  // ───────────────────────── VIBRANT ─────────────────────────
  // Tangerine + warm cream, rounded, El Messiri. Kids / accessories.
  {
    key: 'vibrant',
    name: 'حيوي',
    description: 'برتقالي مفعم وأشكال دائرية مرحة بخط المسيري — للأطفال والإكسسوارات',
    preview: { bg: '#FFF9F3', accent: '#FB6A2E', surface: '#FFEFE0' },
    tokens: {
      '--pt-bg':            '#FFF9F3',
      '--pt-surface':       '#FFFDFB',
      '--pt-surface-soft':  '#FFEFE0',
      '--pt-border':        '#FFDCC2',
      '--pt-text':          '#221A14',
      '--pt-text-soft':     '#5A4A3E',
      '--pt-text-muted':    '#9A8979',
      '--pt-accent':        '#FB6A2E',
      '--pt-accent-soft':   '#FFE6D6',
      '--pt-accent-text':   '#E8521A',
      '--pt-success':       '#22C55E',
      '--pt-danger':        '#EF4444',
      '--pt-star':          '#FBBF24',
      '--pt-font-heading':  'var(--font-messiri), var(--font-tajawal), sans-serif',
      '--pt-font-body':     'var(--font-tajawal), sans-serif',
      '--pt-heading-weight': '700',
      '--pt-heading-tracking': 'normal',
      '--pt-radius-sm':     '14px',
      '--pt-radius-md':     '22px',
      '--pt-radius-lg':     '30px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '999px',
      '--pt-card-padding':  '22px',
      '--pt-section-gap':   '40px',
      '--pt-ease':          EASE,
      '--pt-btn-primary-bg':       'linear-gradient(135deg,#FB6A2E,#FF8A4C)',
      '--pt-btn-primary-text':     '#FFFFFF',
      '--pt-btn-secondary-bg':     '#FFFDFB',
      '--pt-btn-secondary-text':   '#E8521A',
      '--pt-btn-secondary-border': 'rgba(251,106,46,0.3)',
      '--pt-shadow-sm': '0 4px 14px rgba(251,106,46,0.14)',
      '--pt-shadow-md': '0 12px 30px rgba(251,106,46,0.20)',
      '--pt-shadow-lg': '0 24px 60px rgba(251,106,46,0.30)',
    },
  },
  // ───────────────────────── LUXURY ──────────────────────────
  // Warm near-black + gold, Reem Kufi, sharp edges, wide space.
  {
    key: 'luxury',
    name: 'فخم',
    description: 'أسود دافئ وذهبي بخط الريم كوفي ومساحات واسعة — للساعات والمنتجات الفاخرة',
    preview: { bg: '#0B0A08', accent: '#C9A45C', surface: '#1F1C16' },
    tokens: {
      '--pt-bg':            '#0B0A08',
      '--pt-surface':       '#15130F',
      '--pt-surface-soft':  '#1F1C16',
      '--pt-border':        '#322C20',
      '--pt-text':          '#F4EEE0',
      '--pt-text-soft':     '#C8BFA9',
      '--pt-text-muted':    '#8C8472',
      '--pt-accent':        '#C9A45C',
      '--pt-accent-soft':   'rgba(201,164,92,0.12)',
      '--pt-accent-text':   '#D8B873',
      '--pt-success':       '#7FBF8E',
      '--pt-danger':        '#E08989',
      '--pt-star':          '#C9A45C',
      '--pt-font-heading':  'var(--font-reem), var(--font-amiri), var(--font-tajawal), serif',
      '--pt-font-body':     'var(--font-tajawal), sans-serif',
      '--pt-heading-weight': '600',
      '--pt-heading-tracking': '0.04em',
      '--pt-radius-sm':     '2px',
      '--pt-radius-md':     '4px',
      '--pt-radius-lg':     '8px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '2px',
      '--pt-card-padding':  '32px',
      '--pt-section-gap':   '64px',
      '--pt-ease':          EASE,
      '--pt-btn-primary-bg':       'linear-gradient(135deg,#C9A45C,#A8843F)',
      '--pt-btn-primary-text':     '#0B0A08',
      '--pt-btn-secondary-bg':     'transparent',
      '--pt-btn-secondary-text':   '#C9A45C',
      '--pt-btn-secondary-border': '#C9A45C',
      '--pt-shadow-sm': '0 2px 14px rgba(0,0,0,0.55)',
      '--pt-shadow-md': '0 18px 44px rgba(0,0,0,0.6)',
      '--pt-shadow-lg': '0 32px 84px rgba(201,164,92,0.16)',
    },
  },
  // ───────────────────────── MINIMAL ─────────────────────────
  // Tinted white, monochrome, very wide whitespace. Quiet & precise.
  {
    key: 'minimal',
    name: 'بسيط',
    description: 'أحادي اللون بمساحات بيضاء فسيحة وحواف حادة — للتصاميم الهادئة الدقيقة',
    preview: { bg: '#FCFCFC', accent: '#16161A', surface: '#F6F6F5' },
    tokens: {
      '--pt-bg':            '#FCFCFC',
      '--pt-surface':       '#FEFEFE',
      '--pt-surface-soft':  '#F6F6F5',
      '--pt-border':        '#EAEAE8',
      '--pt-text':          '#16161A',
      '--pt-text-soft':     '#56565C',
      '--pt-text-muted':    '#A0A0A4',
      '--pt-accent':        '#16161A',
      '--pt-accent-soft':   '#F2F2F1',
      '--pt-accent-text':   '#16161A',
      '--pt-success':       '#15A34A',
      '--pt-danger':        '#DC2626',
      '--pt-star':          '#16161A',
      '--pt-font-heading':  'var(--font-tajawal), sans-serif',
      '--pt-font-body':     'var(--font-tajawal), sans-serif',
      '--pt-heading-weight': '600',
      '--pt-heading-tracking': '-0.01em',
      '--pt-radius-sm':     '0px',
      '--pt-radius-md':     '2px',
      '--pt-radius-lg':     '2px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '0px',
      '--pt-card-padding':  '24px',
      '--pt-section-gap':   '72px',
      '--pt-ease':          EASE,
      '--pt-btn-primary-bg':       '#16161A',
      '--pt-btn-primary-text':     '#FCFCFC',
      '--pt-btn-secondary-bg':     '#FEFEFE',
      '--pt-btn-secondary-text':   '#16161A',
      '--pt-btn-secondary-border': '#16161A',
      '--pt-shadow-sm': 'none',
      '--pt-shadow-md': '0 1px 3px rgba(0,0,0,0.06)',
      '--pt-shadow-lg': '0 4px 16px rgba(0,0,0,0.08)',
    },
  },
  // ───────────────────────── POSTER ──────────────────────────
  // Deep maroon gradient + gold overlay; long promotional infographic.
  {
    key: 'poster',
    name: 'ملصق طويل (إنفوجرافيك)',
    description: 'خلفية متدرجة غامقة مع تراكب النصوص فوق الصور — يحاكي الملصقات الإعلانية لزيادة المبيعات',
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
      '--pt-font-heading':  'var(--font-cairo), var(--font-tajawal), sans-serif',
      '--pt-font-body':     'var(--font-tajawal), sans-serif',
      '--pt-heading-weight': '900',
      '--pt-heading-tracking': 'normal',
      '--pt-radius-sm':     '10px',
      '--pt-radius-md':     '16px',
      '--pt-radius-lg':     '24px',
      '--pt-radius-pill':   '999px',
      '--pt-btn-radius':    '16px',
      '--pt-card-padding':  '24px',
      '--pt-section-gap':   '36px',
      '--pt-ease':          EASE,
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
