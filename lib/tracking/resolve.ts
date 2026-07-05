// ============================================================
// Tracking resolver — the isolation choke point.
//
// Pure functions. Given a store's integration library + a
// product's assignments, returns EXACTLY the integrations that
// product may load. The storefront loader, the Preview panel,
// and Health all consume this single result, so a product can
// never load another product's pixels.
// ============================================================
import { PROVIDER_KEYS, type ProviderKey } from './registry'

export interface TrackingIntegration {
  id: string
  store_id: string
  provider: ProviderKey
  name: string
  pixel_id: string
  credentials?: Record<string, unknown> | null
  is_active: boolean
  is_default: boolean
  last_test_at?: string | null
  last_test_status?: 'healthy' | 'warning' | 'error' | null
}

export interface ProductTrackingRow {
  product_id: string
  provider: ProviderKey
  mode: 'default' | 'disabled' | 'integration'
  integration_id: string | null
}

export type ResolvedSource = 'default' | 'override' | 'disabled' | 'none'

export interface ResolvedProvider {
  provider: ProviderKey
  integration: TrackingIntegration | null
  source: ResolvedSource
  enabled: boolean
}

export type ResolvedTracking = Record<ProviderKey, ResolvedProvider>

/**
 * Resolve which single integration (if any) a product loads per provider.
 * `integrations` is the WHOLE store library; `assignments` is only this
 * product's rows. Returns a closed, per-provider result.
 */
export function resolveProductTracking(
  integrations: TrackingIntegration[],
  assignments: ProductTrackingRow[],
): ResolvedTracking {
  const result = {} as ResolvedTracking

  for (const provider of PROVIDER_KEYS) {
    const assignment = assignments.find(a => a.provider === provider)
    const storeDefault = integrations.find(
      i => i.provider === provider && i.is_default && i.is_active,
    )

    // Explicitly disabled for this product → inject nothing.
    if (assignment?.mode === 'disabled') {
      result[provider] = { provider, integration: null, source: 'disabled', enabled: false }
      continue
    }

    // Explicit per-product override.
    if (assignment?.mode === 'integration' && assignment.integration_id) {
      const override = integrations.find(
        i => i.id === assignment.integration_id && i.is_active,
      )
      result[provider] = override
        ? { provider, integration: override, source: 'override', enabled: true }
        : { provider, integration: null, source: 'none', enabled: false } // deleted/disabled
      continue
    }

    // Default (explicit mode='default' OR no row at all) → store default.
    result[provider] = storeDefault
      ? { provider, integration: storeDefault, source: 'default', enabled: true }
      : { provider, integration: null, source: 'none', enabled: false }
  }

  return result
}

/**
 * Flatten a resolved result into just the pixel IDs the storefront must load.
 * Only enabled providers appear; everything else is null → never injected.
 */
export function resolvedPixelIds(resolved: ResolvedTracking): Record<ProviderKey, string | null> {
  const out = {} as Record<ProviderKey, string | null>
  for (const provider of PROVIDER_KEYS) {
    const r = resolved[provider]
    out[provider] = r.enabled && r.integration ? r.integration.pixel_id : null
  }
  return out
}

// ── Domain resolution ───────────────────────────────────────
export interface DomainRow {
  id: string
  store_id: string
  hostname: string
  status: 'pending' | 'verified' | 'ssl_active' | 'error'
  is_default: boolean
}

export interface ResolvedDomain {
  hostname: string
  source: 'product' | 'store_default' | 'platform'
  isCustom: boolean
}

/**
 * Domain fallback chain:
 *   1. product's chosen domain (if verified/ssl_active)
 *   2. store default custom domain (if verified/ssl_active)
 *   3. platform domain: <slug>.dakkani.app   ← always succeeds
 */
export function resolveDomain(
  domains: DomainRow[],
  productDomainId: string | null,
  storeSlug: string,
  platformSuffix = 'dakkani.app',
): ResolvedDomain {
  const usable = (d?: DomainRow) => !!d && (d.status === 'verified' || d.status === 'ssl_active')

  if (productDomainId) {
    const chosen = domains.find(d => d.id === productDomainId)
    if (usable(chosen)) return { hostname: chosen!.hostname, source: 'product', isCustom: true }
  }
  const dflt = domains.find(d => d.is_default)
  if (usable(dflt)) return { hostname: dflt!.hostname, source: 'store_default', isCustom: true }

  return { hostname: `${storeSlug}.${platformSuffix}`, source: 'platform', isCustom: false }
}
