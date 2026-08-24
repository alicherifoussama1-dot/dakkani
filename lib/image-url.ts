// ============================================================
// cdnImage — rewrite a Supabase Storage public URL to /api/img.
//
// Used by the next/image loader AND by the raw <img> tags on visitor-facing
// pages. It NEVER mutates stored data: the product row keeps its original
// absolute URL, and the rewrite happens only on the way to the browser.
// ============================================================

/** Set at build time; falls back to '' so the guard below simply passes
 *  everything through rather than throwing in an environment without it. */
const SUPABASE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host }
  catch { return '' }
})()

const PUBLIC_PREFIX = '/storage/v1/object/public/'

/**
 * Returns a proxied, edge-cacheable URL for a Supabase public image.
 * Anything else — a relative path, a data: URI, a third-party host, an
 * already-proxied URL — is returned untouched, so this is safe to apply
 * blanket-wide.
 */
export function cdnImage(src: string | null | undefined, width?: number, quality?: number): string {
  if (!src) return ''
  // Relative paths and data URIs are local; there is nothing to shield.
  if (!src.startsWith('http')) return src

  let u: URL
  try { u = new URL(src) } catch { return src }

  if (!SUPABASE_HOST || u.host !== SUPABASE_HOST) return src
  if (!u.pathname.startsWith(PUBLIC_PREFIX)) return src

  // Drop any incoming query: it is not part of the object's identity, and
  // keeping it would split the CDN cache across identical images.
  u.search = ''

  const qs = new URLSearchParams({ u: u.toString() })
  if (width) qs.set('w', String(width))
  if (quality) qs.set('q', String(quality))
  return `/api/img?${qs.toString()}`
}
