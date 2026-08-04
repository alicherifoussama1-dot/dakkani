// ============================================================
// COMMERCO MOBILE DESIGN TOKENS
// Ported from design/tokens.css — the web platform's design system —
// so phone and desktop read as one product. Cobalt primary, teal
// secondary (the logo's green), Sahara amber accent, slate neutrals.
//
// Values are the web tokens converted to React Native units: rem→px,
// CSS box-shadow→RN shadow props. Where mobile needs to differ (touch
// targets, radii), the deviation is noted inline.
// ============================================================

export const color = {
  // Brand — "Commerco Cobalt". br600 is the main brand: buttons, links, focus.
  br700: '#1F40C7', br600: '#2952E3', br500: '#3D68F5',
  br400: '#608AFC', br300: '#8FB0FF', br100: '#DCE7FF', br50: '#EEF4FF',
  br800: '#1C35A0', br950: '#141F4D',
  // Secondary — teal. The green half of the logo; stats accents, positive deltas.
  tl600: '#0F8377', tl500: '#189E8F', tl300: '#5BD4C3', tl100: '#C8F5EC', tl50: '#EFFCF9',
  // Accent — "Sahara Amber". Warmth + urgency, used sparingly.
  amber: '#F28B0C', amber50: '#FFF8EB', amber100: '#FEEBC7', amber600: '#D66E07',
  // Status
  success: '#16A34A', success50: '#F0FDF5', success100: '#DCFCE8',
  warning: '#D97706', warning50: '#FFFBEB', warning100: '#FEF3C7',
  rose: '#DC2626', rose50: '#FEF2F2', rose100: '#FEE2E2', rose700: '#B91C1C',
  violet: '#6D28D9', violet50: '#F5F3FF',
  // Surfaces — web --surface-*
  bg: '#F8FAFC', surface: '#FFFFFF', sunken: '#F1F5F9', inverted: '#0F172A',
  // Text — web --text-*
  ink: '#0F172A', ink2: '#475569', ink3: '#94A3B8',
  // Lines — web --border-*
  hairline: '#E2E8F0', border: '#E2E8F0', borderStrong: '#CBD5E1',
  // Translucent chrome. Neutral white now, not emerald-tinted.
  glass: 'rgba(255,255,255,0.78)',
  glass2: 'rgba(255,255,255,0.92)',
  glassBorder: 'rgba(226,232,240,0.90)',
  white: '#FFFFFF',
} as const

export const gradient = {
  // Cobalt → teal traces the logo left-to-right.
  brand: ['#2952E3', '#1F40C7', '#0F8377'] as const,
  brandSoft: ['rgba(41,82,227,0.10)', 'rgba(15,131,119,0.10)'] as const,
  navSheen: ['rgba(41,82,227,0.12)', 'transparent', 'rgba(15,131,119,0.12)'] as const,
}

/** Web --radius-* (6/10/14/20). Nudged up one step: the same corner reads
 *  tighter on a phone than in a desktop card of the same radius. */
export const radius = {
  sm: 8, md: 12, lg: 16, xl: 22, pill: 999,
} as const

/** Web --space-* on the same 4px grid. */
export const space = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32,
} as const

/** Web --shadow-* converted to RN. Tighter and less diffuse than the old
 *  prototype's — the web system uses short, low-opacity shadows. */
export const shadow = {
  xs: { shadowColor: '#0F172A', shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  sm: { shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  md: { shadowColor: '#0F172A', shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 5 },
  lg: { shadowColor: '#0F172A', shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
  brand: { shadowColor: '#2952E3', shadowOpacity: 0.28, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
} as const

export const font = {
  // Tajawal matches the production storefront; system fallback keeps
  // first paint instant if the font is still loading.
  familyAr: 'Tajawal_700Bold',
  // Web --text-* (px). Mobile drops the 48px marketing step.
  hero: 36, h1: 30, h2: 24, h3: 20, title: 18,
  body: 14, small: 13, label: 12, micro: 11,
  w: { regular: '400', medium: '500', semibold: '600', bold: '700', black: '800' },
} as const

/** Motion — mirrors the prototype's easing/duration system. */
export const motion = {
  fast: 140, med: 250, slow: 400, pill: 420,
  // Reanimated Easing.bezier(.22,1,.36,1) — decelerate
  easeOut: [0.22, 1, 0.36, 1] as const,
} as const

/** The 19 production order statuses (migrations 009 + 028). */
// Semantics mirror the web's status colors (design/tokens.css comments):
// success = delivered/confirmed/paid · warning = pending/awaiting ·
// error = cancelled/returned/fraud. "New" wears the brand cobalt; the
// in-transit family shares violet so the shipping leg reads as one block.
export const ORDER_STATUS = {
  new: { ar: 'جديد', bg: color.br50, fg: color.br700 },
  confirmed: { ar: 'مؤكد', bg: color.success50, fg: color.success },
  processing: { ar: 'قيد التجهيز', bg: color.violet50, fg: color.violet },
  shipped: { ar: 'تم الشحن', bg: color.violet50, fg: color.violet },
  in_transit: { ar: 'في الطريق', bg: color.violet50, fg: color.violet },
  out_for_delivery: { ar: 'خرج للتوصيل', bg: color.violet50, fg: color.violet },
  with_driver: { ar: 'مع السائق', bg: color.violet50, fg: color.violet },
  at_stopdesk: { ar: 'في المكتب', bg: color.violet50, fg: color.violet },
  delivered: { ar: 'تم التسليم', bg: color.success100, fg: color.success },
  returned: { ar: 'مرتجع', bg: color.rose50, fg: color.rose700 },
  cancelled: { ar: 'ملغى', bg: color.rose50, fg: color.rose700 },
  failed: { ar: 'فشل', bg: color.rose50, fg: color.rose700 },
  failed_1: { ar: 'لم يرد 1', bg: color.sunken, fg: color.ink2 },
  failed_2: { ar: 'لم يرد 2', bg: color.sunken, fg: color.ink2 },
  failed_3: { ar: 'لم يرد 3', bg: color.sunken, fg: color.ink2 },
  postponed: { ar: 'مؤجل', bg: color.sunken, fg: color.ink2 },
  duplicate: { ar: 'مكرر', bg: color.sunken, fg: color.ink2 },
  exception: { ar: 'استثناء', bg: color.rose50, fg: color.rose700 },
  abandoned: { ar: 'مهجور', bg: color.warning50, fg: color.warning },
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
