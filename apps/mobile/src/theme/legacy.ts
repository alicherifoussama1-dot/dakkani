// ============================================================
// LEGACY DASHBOARD PALETTE
//
// The production dashboard has TWO design systems living side by side:
//
//   · design/tokens.css + components.css — "Commerco Cobalt" (#2952E3),
//     used by auth, settings and the newer surfaces. Ported in tokens.ts.
//   · plain Tailwind + a hardcoded #0D6EFD — used by DashboardHome,
//     KpiCardsRow and the other components/dashboard/* panels.
//
// Pixel-matching means rendering what the browser actually paints, so the
// dashboard screens use THIS palette and everything else uses tokens.ts.
// Do not "unify" them here: that would make the app stop matching the site.
// This is a website-side inconsistency; it is documented for the owner, not
// fixed from the app.
//
// Values are Tailwind 3 defaults unless noted.
// ============================================================

export const web = {
  brand: '#0D6EFD',        // hardcoded throughout components/dashboard/*

  // `border-gray-150` is NOT defined in tailwind.config.ts, so the class is
  // inert and the border falls back to Tailwind's preflight default.
  border: '#E5E7EB',       // = gray-200

  white: '#FFFFFF',
  gray50: '#F9FAFB', gray100: '#F3F4F6', gray400: '#9CA3AF',
  gray500: '#6B7280', gray600: '#4B5563', gray900: '#111827',

  blue50: '#EFF6FF', blue100: '#DBEAFE', blue600: '#2563EB',
  orange50: '#FFF7ED', orange600: '#EA580C',
  emerald50: '#ECFDF5', emerald600: '#059669',
  red500: '#EF4444',

  facebook: '#1877F2',
  amber: '#F59E0B',
  green: '#10B981',
  slate: '#6B7280',
} as const

/** `shadow-xs: 0 1px 2px rgba(0,0,0,0.05)` from tailwind.config.ts. */
export const shadowXs = {
  shadowColor: '#000000',
  shadowOpacity: 0.05,
  shadowRadius: 2,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
} as const

/** `rounded-2xl` = 16px, `rounded-xl` = 12px — the radii these panels use. */
export const webRadius = { xl: 12, '2xl': 16, full: 9999 } as const
