// ============================================================
// OFFICIAL COMMERCO LOGO — verbatim from public/brand/*.svg
//
// DO NOT redesign, recolour or re-path these. They are the production
// brand assets, inlined as XML strings so react-native-svg's SvgXml can
// render true vectors (crisp at any density, no PNG raster needed).
//
// Source of truth: F:/dakkani/public/brand/logo-icon.svg
//                  F:/dakkani/public/brand/logo-primary.svg
// ============================================================

/** Mark only (48×48) — used by the launch animation and the store avatar. */
export const LOGO_ICON_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" role="img" aria-label="Commerco">
  <defs>
    <linearGradient id="flow" x1="0%" y1="0%" x2="80%" y2="100%">
      <stop offset="0%" stop-color="#0066FF"/>
      <stop offset="55%" stop-color="#0088FF"/>
      <stop offset="100%" stop-color="#00C49F"/>
    </linearGradient>
  </defs>
  <path d="M34.3 14.2A14 14 0 1 0 34.3 33.8"
        fill="none" stroke="url(#flow)" stroke-width="9"
        stroke-linecap="round"/>
  <circle cx="36.6" cy="24" r="3.4" fill="#FF8C00"/>
</svg>`

/** Full lock-up with wordmark (286×48). */
export const LOGO_PRIMARY_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 286 48" role="img" aria-label="Commerco">
  <defs>
    <linearGradient id="flow2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3D68F5"/>
      <stop offset="1" stop-color="#189E8F"/>
    </linearGradient>
  </defs>
  <g transform="translate(0 0)">
  <path d="M34.3 14.2A14 14 0 1 0 34.3 33.8"
        fill="none" stroke="url(#flow2)" stroke-width="9"
        stroke-linecap="round"/>
  <circle cx="36.6" cy="24" r="3.2" fill="#F28B0C"/></g>
  <g fill="none" stroke="#060B18" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M79.8 19.3A10 10 0 1 0 79.8 32.7"/>
    <path d="M110 26A10 10 0 1 1 90 26A10 10 0 1 1 110 26"/>
    <path d="M118 36V23.5a6.75 6.75 0 0 1 13.5 0V36"/>
    <path d="M131.5 23.5a6.75 6.75 0 0 1 13.5 0V36"/>
    <path d="M153 36V23.5a6.75 6.75 0 0 1 13.5 0V36"/>
    <path d="M166.5 23.5a6.75 6.75 0 0 1 13.5 0V36"/>
    <path d="M190 24.3H206"/>
    <path d="M206 24.3A10 10 0 1 0 204.2 32.2"/>
    <path d="M216 36V16.5"/>
    <path d="M216 26.5A10 10 0 0 1 226 16.5"/>
    <path d="M251.8 19.3A10 10 0 1 0 251.8 32.7"/>
    <path d="M282 26A10 10 0 1 1 262 26A10 10 0 1 1 282 26"/>
  </g>
</svg>`

/** Wordmark alone — the mark is animated separately in the launch screen,
 *  so this crops the lock-up to just the letters (x≈70 onward). */
export const LOGO_WORDMARK_XML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="70 8 216 32" role="img" aria-label="Commerco">
  <g fill="none" stroke="#060B18" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M79.8 19.3A10 10 0 1 0 79.8 32.7"/>
    <path d="M110 26A10 10 0 1 1 90 26A10 10 0 1 1 110 26"/>
    <path d="M118 36V23.5a6.75 6.75 0 0 1 13.5 0V36"/>
    <path d="M131.5 23.5a6.75 6.75 0 0 1 13.5 0V36"/>
    <path d="M153 36V23.5a6.75 6.75 0 0 1 13.5 0V36"/>
    <path d="M166.5 23.5a6.75 6.75 0 0 1 13.5 0V36"/>
    <path d="M190 24.3H206"/>
    <path d="M206 24.3A10 10 0 1 0 204.2 32.2"/>
    <path d="M216 36V16.5"/>
    <path d="M216 26.5A10 10 0 0 1 226 16.5"/>
    <path d="M251.8 19.3A10 10 0 1 0 251.8 32.7"/>
    <path d="M282 26A10 10 0 1 1 262 26A10 10 0 1 1 282 26"/>
  </g>
</svg>`
