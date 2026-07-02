// ============================================================
// Tracking data service — thin, reusable fetchers.
//
// Accepts any Supabase client (public/service-role on the
// storefront, authenticated server client in the dashboard).
// Every call is guarded so that if migration 025 has not been
// applied yet, the feature degrades to "no tracking" instead
// of throwing. This keeps the storefront and editor working.
// ============================================================
import {
  resolveProductTracking,
  resolvedPixelIds,
  resolveDomain,
  type TrackingIntegration,
  type ProductTrackingRow,
  type DomainRow,
  type ResolvedTracking,
  type ResolvedDomain,
} from './resolve'
import type { ProviderKey } from './registry'

// Minimal shape we need from a client — keeps this framework-agnostic.
type SB = { from: (t: string) => any }

async function safe<T>(p: Promise<{ data: T | null }>, fallback: T): Promise<T> {
  try {
    const { data } = await p
    return (data ?? fallback) as T
  } catch {
    return fallback
  }
}

export async function fetchStoreIntegrations(sb: SB, storeId: string): Promise<TrackingIntegration[]> {
  return safe<TrackingIntegration[]>(
    sb.from('tracking_integrations').select('*').eq('store_id', storeId),
    [],
  )
}

export async function fetchProductAssignments(sb: SB, productId: string): Promise<ProductTrackingRow[]> {
  return safe<ProductTrackingRow[]>(
    sb.from('product_tracking').select('*').eq('product_id', productId),
    [],
  )
}

export async function fetchStoreDomains(sb: SB, storeId: string): Promise<DomainRow[]> {
  return safe<DomainRow[]>(
    sb.from('domains').select('*').eq('store_id', storeId),
    [],
  )
}

export interface ProductTrackingBundle {
  resolved: ResolvedTracking
  pixelIds: Record<ProviderKey, string | null>
  domain: ResolvedDomain
}

/**
 * One-call resolver for a product. Safe to call on the storefront:
 * returns isolated pixel IDs (only this product's) + resolved domain.
 */
export async function getProductTracking(
  sb: SB,
  product: { id: string; store_id: string; domain_id?: string | null },
  storeSlug: string,
): Promise<ProductTrackingBundle> {
  const [integrations, assignments, domains] = await Promise.all([
    fetchStoreIntegrations(sb, product.store_id),
    fetchProductAssignments(sb, product.id),
    fetchStoreDomains(sb, product.store_id),
  ])

  const resolved = resolveProductTracking(integrations, assignments)
  return {
    resolved,
    pixelIds: resolvedPixelIds(resolved),
    domain: resolveDomain(domains, product.domain_id ?? null, storeSlug),
  }
}
