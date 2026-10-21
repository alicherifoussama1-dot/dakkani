// ============================================================
// cdnImage — make an uploaded image load from the page's own host, resized.
//
// Used by the next/image loader AND by the raw <img> tags on visitor-facing
// pages. It NEVER mutates stored data: the product row keeps its absolute
// https://commerco.store/uploads/... URL, and the rewrite happens only on the
// way to the browser.
//
// Why relative: a store on its own domain (afnane.store) would otherwise open
// a second TLS connection to commerco.store just for images. /uploads is
// served on every host, so `/uploads/...` reuses the page's connection.
// ============================================================

/** Public base of our uploads, set at build time (https://commerco.store/uploads). */
const STORAGE = (() => {
  try {
    const u = new URL(process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ?? '')
    return { host: u.host, prefix: u.pathname.replace(/\/$/, '') + '/' }
  } catch { return null }
})()

/**
 * Returns a same-host URL for one of our uploads (resized to WebP when a
 * width is given). Anything else — a relative path, a data: URI, a
 * third-party host — is returned untouched, so this is safe blanket-wide.
 */
export function cdnImage(src: string | null | undefined, width?: number, quality?: number): string {
  if (!src) return ''
  let pathname: string
  if (src.startsWith('/uploads/')) pathname = src.split('?')[0]
  else {
    if (!src.startsWith('http') || !STORAGE) return src
    let u: URL
    try { u = new URL(src) } catch { return src }
    if (u.host !== STORAGE.host || !u.pathname.startsWith(STORAGE.prefix)) return src
    pathname = u.pathname
  }
  if (!width) return pathname
  const qs = new URLSearchParams({ w: String(width) })
  if (quality) qs.set('q', String(quality))
  return `${pathname}?${qs.toString()}`
}
