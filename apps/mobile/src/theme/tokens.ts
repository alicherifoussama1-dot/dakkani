// ============================================================
// COMMERCO MOBILE DESIGN TOKENS
//
// A direct port of design/tokens.css — the website's design system and
// the app's only design reference. rem values are converted at the CSS
// root of 16px; CSS box-shadows become RN shadow props.
//
// Nothing here is invented. If a value is not in tokens.css it does not
// belong in this file.
// ============================================================

// ── 1. COLOR ────────────────────────────────────────────────
/** "Commerco Cobalt". primary600 is the brand: buttons, links, focus. */
export const primary = {
  50: '#EEF4FF', 100: '#DCE7FF', 200: '#B9CFFF', 300: '#8FB0FF', 400: '#608AFC',
  500: '#3D68F5', 600: '#2952E3', 700: '#1F40C7', 800: '#1C35A0', 900: '#1B2F7E',
  950: '#141F4D',
} as const

/** Teal. Stats accents, positive deltas, "delivered". Used sparingly. */
export const secondary = {
  50: '#EFFCF9', 100: '#C8F5EC', 200: '#92E9DA', 300: '#5BD4C3', 400: '#2FB9A8',
  500: '#189E8F', 600: '#0F8377', 700: '#0F6A61', 800: '#10544E', 900: '#114540',
  950: '#052825',
} as const

/** "Sahara Amber". Warmth + urgency, reserved. */
export const accent = {
  50: '#FFF8EB', 100: '#FEEBC7', 200: '#FDD68A', 300: '#FBBB4D', 400: '#F9A424',
  500: '#F28B0C', 600: '#D66E07', 700: '#B25409', 800: '#91420E', 900: '#78370F',
  950: '#451B03',
} as const

export const neutral = {
  50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CBD5E1', 400: '#94A3B8',
  500: '#64748B', 600: '#475569', 700: '#334155', 800: '#1E293B', 900: '#0F172A',
  950: '#060B18',
} as const

export const success = { 50: '#F0FDF5', 100: '#DCFCE8', 500: '#22C55E', 600: '#16A34A', 700: '#15803D' } as const
export const warning = { 50: '#FFFBEB', 100: '#FEF3C7', 500: '#F59E0B', 600: '#D97706', 700: '#B45309' } as const
export const error   = { 50: '#FEF2F2', 100: '#FEE2E2', 500: '#EF4444', 600: '#DC2626', 700: '#B91C1C' } as const

/** Semantic layer — the names screens should reach for. Mirrors the
 *  --surface-*, --text-*, --border-*, --interactive-* blocks. */
export const color = {
  // surfaces
  page: neutral[50],
  raised: '#FFFFFF',
  sunken: neutral[100],
  inverted: neutral[900],
  // text
  ink: neutral[900],
  ink2: neutral[600],
  ink3: neutral[400],
  onBrand: '#FFFFFF',
  link: primary[600],
  // borders
  border: neutral[200],
  borderStrong: neutral[300],
  borderFocus: primary[500],
  // interactive
  primary: primary[600],
  primaryHover: primary[700],
  primaryActive: primary[800],
  // status foregrounds
  success: success[600],
  warning: warning[600],
  error: error[600],
  white: '#FFFFFF',

  // ── raw scale access, for the few places that need a specific step ──
  br50: primary[50], br100: primary[100], br300: primary[300], br400: primary[400],
  br500: primary[500], br600: primary[600], br700: primary[700],
  tl500: secondary[500], tl600: secondary[600],
  amber: accent[500], amber50: warning[50], amber100: warning[100], amber700: warning[700],
  success50: success[50], success100: success[100], success700: success[700],
  rose: error[600], rose50: error[50], rose100: error[100], rose700: error[700],
  violet: '#6D28D9', violet50: '#F5F3FF',
  bg: neutral[50], surface: '#FFFFFF',
  hairline: neutral[200],
} as const

/** --brand-gradient: 135deg, primary-500 → secondary-500. Marketing and
 *  onboarding CTAs ONLY — the system forbids it in dense UI. */
export const brandGradient = [primary[500], secondary[500]] as const

// ── 2. TYPOGRAPHY ───────────────────────────────────────────
/** The dashboard's Arabic UI face is IBM Plex Sans Arabic (app/layout.tsx).
 *  These keys are the names expo-font registers. */
export const fontFamily = {
  regular:  'IBMPlexSansArabic_400Regular',
  medium:   'IBMPlexSansArabic_500Medium',
  semibold: 'IBMPlexSansArabic_600SemiBold',
  bold:     'IBMPlexSansArabic_700Bold',
} as const

/** --text-* converted from rem at root 16px. */
export const fontSize = {
  xs: 12, sm: 13, base: 14, md: 16, lg: 18, xl: 20,
  '2xl': 24, '3xl': 30, '4xl': 36, '5xl': 48,
} as const

/** RN cannot synthesise weight for a custom family — each weight is a
 *  separate file. `text()` below pairs size with the right family. */
export const fontWeight = {
  regular: 400, medium: 500, semibold: 600, bold: 700, black: 800,
} as const

type Weight = keyof typeof fontWeight

/** Size-only aliases kept for the screens that read `fontSize: font.label`.
 *  Sizes map onto the web scale above. Weight is NOT here on purpose: RN
 *  cannot synthesise a weight for a custom family, so weight must always
 *  come from `fontFamily` — see `text()`. */
export const font = {
  hero: fontSize['4xl'], h1: fontSize['3xl'], h2: fontSize['2xl'], h3: fontSize.xl,
  title: fontSize.lg, body: fontSize.base, small: fontSize.sm,
  label: fontSize.xs, micro: 11,
  familyAr: fontFamily.regular,
} as const

/** The one correct way to type text in this app. Returns the family that
 *  actually carries the weight, so nothing renders faux-bold. */
export function text(size: keyof typeof fontSize, weight: Weight = 'regular') {
  const family =
    weight === 'regular' ? fontFamily.regular
    : weight === 'medium' ? fontFamily.medium
    : weight === 'semibold' ? fontFamily.semibold
    : fontFamily.bold // bold + black both map to the 700 file
  return { fontFamily: family, fontSize: fontSize[size] }
}

// ── 3. SPACING (--space-*, 4px grid) ────────────────────────
export const space = {
  0: 0, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24,
  8: 32, 10: 40, 12: 48, 16: 64, 20: 80, 24: 96,
} as const

// ── 4. RADIUS (--radius-*) ──────────────────────────────────
export const radius = {
  sm: 6, md: 10, lg: 14, xl: 20, full: 9999,
} as const

// ── 5. ELEVATION (--shadow-*, converted to RN) ──────────────
export const shadow = {
  sm: { shadowColor: neutral[900], shadowOpacity: 0.06, shadowRadius: 2, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  md: { shadowColor: neutral[900], shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  lg: { shadowColor: neutral[900], shadowOpacity: 0.16, shadowRadius: 32, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
} as const

// ── 6. CONTROLS (--control-*) ───────────────────────────────
export const control = {
  height: { sm: 32, md: 40, lg: 48 },
  padInline: { sm: space[3], md: space[4], lg: space[5] },
  fontSize: { sm: fontSize.sm, md: fontSize.base, lg: fontSize.md },
  radius: radius.md,
} as const

/** --card-* */
export const card = {
  pad: space[5],
  padLg: space[6],
  radius: radius.lg,
  borderWidth: 1,
  borderColor: color.border,
} as const

// ── 7. MOTION (--duration-*, --ease-*) ──────────────────────
export const motion = {
  fast: 120, base: 200, slow: 320,
  // cubic-bezier(0.2, 0, 0, 1)
  standard: [0.2, 0, 0, 1] as const,
  // cubic-bezier(0.34, 1.56, 0.64, 1) — success moments only
  bounce: [0.34, 1.56, 0.64, 1] as const,
} as const

export const skeleton = { base: neutral[200], sheen: neutral[100] } as const
export const spinner = { size: 20, track: neutral[200], head: primary[600] } as const

// ── 8. ORDER STATUS ─────────────────────────────────────────
// Semantics from the web system: success = delivered/confirmed/paid,
// warning = pending/awaiting, error = cancelled/returned/fraud. Badge
// colours are .c-badge--* (100 background, 700 foreground).
export const ORDER_STATUS = {
  new:              { ar: 'جديد',        bg: primary[50],  fg: primary[700] },
  confirmed:        { ar: 'مؤكد',        bg: success[100], fg: success[700] },
  processing:       { ar: 'قيد التجهيز', bg: primary[50],  fg: primary[700] },
  shipped:          { ar: 'تم الشحن',    bg: primary[50],  fg: primary[700] },
  in_transit:       { ar: 'في الطريق',   bg: primary[50],  fg: primary[700] },
  out_for_delivery: { ar: 'خرج للتوصيل', bg: primary[50],  fg: primary[700] },
  with_driver:      { ar: 'مع السائق',   bg: primary[50],  fg: primary[700] },
  at_stopdesk:      { ar: 'في المكتب',   bg: primary[50],  fg: primary[700] },
  delivered:        { ar: 'تم التسليم',  bg: success[100], fg: success[700] },
  returned:         { ar: 'مرتجع',       bg: error[100],   fg: error[700] },
  cancelled:        { ar: 'ملغى',        bg: error[100],   fg: error[700] },
  failed:           { ar: 'فشل',         bg: error[100],   fg: error[700] },
  failed_1:         { ar: 'لم يرد 1',    bg: neutral[100], fg: neutral[600] },
  failed_2:         { ar: 'لم يرد 2',    bg: neutral[100], fg: neutral[600] },
  failed_3:         { ar: 'لم يرد 3',    bg: neutral[100], fg: neutral[600] },
  postponed:        { ar: 'مؤجل',        bg: warning[100], fg: warning[700] },
  duplicate:        { ar: 'مكرر',        bg: neutral[100], fg: neutral[600] },
  exception:        { ar: 'استثناء',     bg: error[100],   fg: error[700] },
  abandoned:        { ar: 'مهجور',       bg: warning[100], fg: warning[700] },
} as const

export type OrderStatus = keyof typeof ORDER_STATUS

/** Chip groups: one UI filter → several DB statuses (matches the API). */
export const STATUS_GROUPS: Record<string, string[]> = {
  shipping: ['shipped', 'in_transit', 'out_for_delivery', 'with_driver', 'at_stopdesk'],
  failed: ['failed', 'failed_1', 'failed_2', 'failed_3'],
}

// ── 9. NUMBER FORMATTING ────────────────────────────────────
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
