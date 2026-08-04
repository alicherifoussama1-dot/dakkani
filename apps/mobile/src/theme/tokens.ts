// ============================================================
// The shell's own tokens — deliberately tiny.
//
// The website is the entire UI. Nothing here styles product surfaces;
// these values only paint the few pixels the WebView cannot: the splash
// backdrop and the offline screen. Values match design/tokens.css so the
// seams around the web view are the same blue the site uses.
// ============================================================

export const color = {
  brand: '#2952E3',        // --color-primary-600
  brandDark: '#1F40C7',    // --color-primary-700
  bg: '#F8FAFC',           // --surface-page
  surface: '#FFFFFF',
  ink: '#0F172A',          // --text-primary
  ink2: '#475569',         // --text-secondary
  ink3: '#94A3B8',         // --text-muted
  border: '#E2E8F0',       // --border-default
  white: '#FFFFFF',
} as const

export const motion = {
  fast: 140, med: 250, slow: 400,
  // Reanimated Easing.bezier(.22,1,.36,1) — decelerate
  easeOut: [0.22, 1, 0.36, 1] as const,
} as const
