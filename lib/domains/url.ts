// ============================================================
// Public URL builder — THE single source of truth for customer-
// facing product/store links. Custom domain when the product has
// one (its own or the store default), otherwise the platform URL.
// ============================================================

const PLATFORM_BASE = process.env.NEXT_PUBLIC_APP_URL ?? 'https://dakkani.vercel.app'

export interface DomainLite { id: string; hostname: string; status: string; is_default: boolean }

const usable = (d?: DomainLite | null) => !!d && (d.status === 'ssl_active' || d.status === 'verified')

/** Resolve the serving hostname for a product (null = platform). */
export function resolveProductHostname(domains: DomainLite[], productDomainId?: string | null): string | null {
  if (productDomainId) {
    const own = domains.find(d => d.id === productDomainId)
    if (usable(own)) return own!.hostname
  }
  const dflt = domains.find(d => d.is_default)
  if (usable(dflt)) return dflt!.hostname
  return null
}

export function productPublicUrl(opts: { hostname: string | null; storeSlug: string; productSlug: string }): string {
  return opts.hostname
    ? `https://${opts.hostname}/product/${opts.productSlug}`
    : `${PLATFORM_BASE}/store/${opts.storeSlug}/product/${opts.productSlug}`
}

export function storePublicUrl(opts: { hostname: string | null; storeSlug: string }): string {
  return opts.hostname ? `https://${opts.hostname}/` : `${PLATFORM_BASE}/store/${opts.storeSlug}`
}

/**
 * The store's primary public hostname for dashboard display: its default active
 * custom domain, else any active one, else null (→ platform URL). Same usability
 * rule as product links (ssl_active | verified), so what the dashboard shows
 * matches what the storefront actually serves.
 */
export function pickStoreHostname(domains: DomainLite[]): string | null {
  const active = domains.filter(usable)
  if (!active.length) return null
  return (active.find(d => d.is_default) ?? active[0]).hostname
}
