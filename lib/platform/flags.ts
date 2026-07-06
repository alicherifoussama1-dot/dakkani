// ============================================================
// FEATURE FLAGS — toggle features without deploying.
// Backed by the feature_flags table; cached in-memory for 30s
// per serverless instance. Fail-open to the provided default so
// a flags-table outage can never take a feature (or checkout) down.
// ============================================================
import { createServiceClient } from './service-client'

interface Flag { key: string; enabled: boolean; config: { store_ids?: string[] } & Record<string, unknown> }

let cache: { flags: Map<string, Flag>; at: number } | null = null
const TTL = 30_000

async function loadFlags(): Promise<Map<string, Flag>> {
  if (cache && Date.now() - cache.at < TTL) return cache.flags
  const client = createServiceClient()
  const { data, error } = await client.from('feature_flags').select('key, enabled, config')
  if (error) throw new Error(error.message)
  const flags = new Map<string, Flag>((data ?? []).map((f: Flag) => [f.key, f]))
  cache = { flags, at: Date.now() }
  return flags
}

/**
 * Is a feature enabled (optionally for a specific store)?
 * If the flag's config lists store_ids, it only applies to those tenants.
 */
export async function isEnabled(key: string, opts: { storeId?: string; fallback?: boolean } = {}): Promise<boolean> {
  const fallback = opts.fallback ?? true   // unknown/unreachable flags default ON (features already shipped)
  try {
    const flags = await loadFlags()
    const flag = flags.get(key)
    if (!flag) return fallback
    if (!flag.enabled) return false
    const targets = flag.config?.store_ids
    if (Array.isArray(targets) && targets.length > 0) {
      return opts.storeId ? targets.includes(opts.storeId) : false
    }
    return true
  } catch (e) {
    console.error('[flags] read failed, using fallback:', e instanceof Error ? e.message : e)
    return fallback
  }
}

export function invalidateFlagCache(): void { cache = null }
