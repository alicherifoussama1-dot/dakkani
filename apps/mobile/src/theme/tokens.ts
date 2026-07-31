// ============================================================
// COMMERCO MOBILE DESIGN TOKENS
// Ported 1:1 from the approved v2-light prototype.
// White + very light gray · emerald/mint · subtle cyan gradients
// · light glassmorphism. Single source of truth for the RN app.
// ============================================================

export const color = {
  // Brand — emerald primary
  em700: '#047857', em600: '#059669', em500: '#10B981',
  em400: '#34D399', em300: '#6EE7B7', em100: '#D1FAE5', em50: '#ECFDF5',
  // Accents
  cy500: '#06B6D4', cy400: '#22D3EE',
  co500: '#0D6EFD',            // COMMERCO web cobalt, kept for data-viz
  violet: '#8B5CF6',
  amber: '#F59E0B', amber50: '#FFFBEB',
  rose: '#EF4444', rose50: '#FEF2F2',
  // Surfaces
  bg: '#F6F8FA', surface: '#FFFFFF', sunken: '#F1F5F9',
  // Text
  ink: '#0F172A', ink2: '#475569', ink3: '#94A3B8',
  // Lines / glass
  hairline: 'rgba(15,23,42,0.07)',
  glass: 'rgba(255,255,255,0.72)',
  glass2: 'rgba(255,255,255,0.88)',
  glassBorder: 'rgba(255,255,255,0.90)',
  white: '#FFFFFF',
} as const

export const gradient = {
  brand: ['#06B6D4', '#10B981', '#059669'] as const,
  brandSoft: ['rgba(6,182,212,0.12)', 'rgba(16,185,129,0.14)'] as const,
  navSheen: ['rgba(6,182,212,0.14)', 'transparent', 'rgba(16,185,129,0.16)'] as const,
}

export const radius = {
  sm: 12, md: 18, lg: 24, xl: 30, pill: 999,
} as const

export const space = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28,
} as const

/** iOS-style soft elevation. Android uses `elevation`. */
export const shadow = {
  xs: { shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  sm: { shadowColor: '#0F172A', shadowOpacity: 0.055, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 26, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
  lg: { shadowColor: '#0F172A', shadowOpacity: 0.12, shadowRadius: 44, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
  emerald: { shadowColor: '#10B981', shadowOpacity: 0.32, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
} as const

export const font = {
  // Tajawal matches the production storefront; system fallback keeps
  // first paint instant if the font is still loading.
  familyAr: 'Tajawal_700Bold',
  hero: 38, h1: 28, h2: 21, h3: 17,
  body: 14, small: 12.5, label: 11, micro: 9.5,
  w: { regular: '400', medium: '600', bold: '700', black: '800' },
} as const

/** Motion — mirrors the prototype's easing/duration system. */
export const motion = {
  fast: 140, med: 250, slow: 400, pill: 420,
  // Reanimated Easing.bezier(.22,1,.36,1) — decelerate
  easeOut: [0.22, 1, 0.36, 1] as const,
} as const

/** The 19 production order statuses (migrations 009 + 028). */
export const ORDER_STATUS = {
  new: { ar: 'جديد', bg: '#EFF6FF', fg: '#1D4ED8' },
  confirmed: { ar: 'مؤكد', bg: color.em50, fg: color.em700 },
  processing: { ar: 'قيد التجهيز', bg: '#F5F3FF', fg: '#6D28D9' },
  shipped: { ar: 'تم الشحن', bg: '#F5F3FF', fg: '#6D28D9' },
  in_transit: { ar: 'في الطريق', bg: '#F5F3FF', fg: '#6D28D9' },
  out_for_delivery: { ar: 'خرج للتوصيل', bg: '#F5F3FF', fg: '#6D28D9' },
  with_driver: { ar: 'مع السائق', bg: '#F5F3FF', fg: '#6D28D9' },
  at_stopdesk: { ar: 'في المكتب', bg: '#F5F3FF', fg: '#6D28D9' },
  delivered: { ar: 'تم التسليم', bg: color.em100, fg: color.em700 },
  returned: { ar: 'مرتجع', bg: color.rose50, fg: '#B91C1C' },
  cancelled: { ar: 'ملغى', bg: color.rose50, fg: '#B91C1C' },
  failed: { ar: 'فشل', bg: color.rose50, fg: '#B91C1C' },
  failed_1: { ar: 'لم يرد 1', bg: color.sunken, fg: color.ink2 },
  failed_2: { ar: 'لم يرد 2', bg: color.sunken, fg: color.ink2 },
  failed_3: { ar: 'لم يرد 3', bg: color.sunken, fg: color.ink2 },
  postponed: { ar: 'مؤجل', bg: color.sunken, fg: color.ink2 },
  duplicate: { ar: 'مكرر', bg: color.sunken, fg: color.ink2 },
  exception: { ar: 'استثناء', bg: color.rose50, fg: '#B91C1C' },
  abandoned: { ar: 'مهجور', bg: color.amber50, fg: '#B45309' },
} as const

export type OrderStatus = keyof typeof ORDER_STATUS

/** Chip groups: one UI filter → several DB statuses (matches the API). */
export const STATUS_GROUPS: Record<string, string[]> = {
  shipping: ['shipped', 'in_transit', 'out_for_delivery', 'with_driver', 'at_stopdesk'],
  failed: ['failed', 'failed_1', 'failed_2', 'failed_3'],
}

// ── Number formatting ─────────────────────────────────────────
// Constructing Intl.NumberFormat is expensive and these run per row while
// lists scroll, so the formatter is built once and reused. Hermes ships only
// a partial Intl, so a manual fallback reproduces the ar-DZ result exactly:
// Latin digits grouped with dots — 1234567 → "1.234.567".
const groupWithDots = (v: number) => {
  const s = Math.abs(v).toString()
  let out = ''
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += '.'
    out += s[i]
  }
  // U+200E before the minus, exactly as ar-DZ does: inside RTL text an
  // unmarked minus renders on the wrong side ("4.500-").
  return v < 0 ? `‎-${out}` : out
}

const numberFormatter: { format: (v: number) => string } = (() => {
  try {
    const nf = new Intl.NumberFormat('ar-DZ', { maximumFractionDigits: 0 })
    // Only trust the engine if it produced exactly the expected shape —
    // Latin digits, dot grouping. Anything else (partial ICU, Arabic-Indic
    // digits) falls through to the deterministic formatter below.
    if (nf.format(1234567) === '1.234.567') return nf
  } catch { /* Intl unavailable in this Hermes build */ }
  return { format: groupWithDots }
})()

/** Safe integer for display: guards NaN/Infinity coming back from the API. */
const safeInt = (n: number) => (Number.isFinite(n) ? Math.round(n) : 0)

export const fmtNum = (n: number) => numberFormatter.format(safeInt(n))
export const fmtDZD = (n: number) => `${fmtNum(n)} دج`
