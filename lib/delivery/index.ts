// ============================================================
// Unified Delivery Factory — Auto-retry fallback pattern
// ============================================================
import { YalidineDelivery } from './yalidine'
import { ZRExpressDelivery } from './zrexpress'
import { MaystroDelivery } from './maystro'
import type {
  UnifiedDelivery, DeliveryProvider, DeliveryParcel,
  DeliveryResult, TrackingResult,
} from './types'

export * from './types'
export { YalidineDelivery } from './yalidine'
export { ZRExpressDelivery } from './zrexpress'
export { MaystroDelivery } from './maystro'

// ── Factory ───────────────────────────────────────────────
export function createDeliveryProvider(
  provider: DeliveryProvider,
  config: Record<string, string>
): UnifiedDelivery {
  switch (provider) {
    case 'yalidine':
      return new YalidineDelivery(
        config.apiId ?? '',
        config.apiToken ?? '',
        parseInt(config.fromWilayaId ?? '16')
      )
    case 'zrexpress':
      return new ZRExpressDelivery(config.token ?? '', config.key ?? '')
    case 'maystro':
      return new MaystroDelivery(config.token ?? '', config.storeId)
    default:
      throw new Error(`Unknown delivery provider: ${provider}`)
  }
}

// ── From env vars ─────────────────────────────────────────
export function getDefaultDeliveryProvider(): UnifiedDelivery | null {
  const provider = (process.env.DEFAULT_DELIVERY_PROVIDER ?? 'yalidine') as DeliveryProvider

  try {
    switch (provider) {
      case 'yalidine':
        if (!process.env.YALIDINE_API_ID || !process.env.YALIDINE_API_TOKEN) return null
        return new YalidineDelivery(
          process.env.YALIDINE_API_ID,
          process.env.YALIDINE_API_TOKEN,
          parseInt(process.env.YALIDINE_FROM_WILAYA ?? '16')
        )
      case 'zrexpress':
        if (!process.env.ZREXPRESS_TOKEN || !process.env.ZREXPRESS_KEY) return null
        return new ZRExpressDelivery(process.env.ZREXPRESS_TOKEN, process.env.ZREXPRESS_KEY)
      case 'maystro':
        if (!process.env.MAYSTRO_TOKEN) return null
        return new MaystroDelivery(process.env.MAYSTRO_TOKEN, process.env.MAYSTRO_STORE_ID)
      default:
        return null
    }
  } catch {
    return null
  }
}

// ── Retry wrapper ─────────────────────────────────────────
interface RetryOptions {
  maxAttempts?: number
  delayMs?: number
  fallbackProviders?: UnifiedDelivery[]
}

export async function createParcelWithRetry(
  primary: UnifiedDelivery,
  parcel: DeliveryParcel,
  options: RetryOptions = {}
): Promise<DeliveryResult & { provider: DeliveryProvider; attempts: number }> {
  const { maxAttempts = 3, delayMs = 1000, fallbackProviders = [] } = options
  const allProviders = [primary, ...fallbackProviders]

  let lastError = ''
  let totalAttempts = 0

  for (const provider of allProviders) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      totalAttempts++
      const result = await provider.createParcel(parcel)

      if (result.success) {
        return { ...result, provider: provider.provider, attempts: totalAttempts }
      }

      lastError = result.error ?? 'Unknown error'

      // Don't retry terminal errors
      if (isTerminalError(lastError)) break

      if (attempt < maxAttempts) {
        await sleep(delayMs * attempt)
      }
    }
  }

  return {
    success: false,
    error: `All providers failed. Last error: ${lastError}`,
    provider: primary.provider,
    attempts: totalAttempts,
  }
}

export async function trackParcelWithFallback(
  providers: UnifiedDelivery[],
  trackingId: string
): Promise<TrackingResult & { provider?: DeliveryProvider }> {
  for (const provider of providers) {
    const result = await provider.trackParcel(trackingId)
    if (result.success) return { ...result, provider: provider.provider }
  }
  return { success: false, error: 'All providers failed to track parcel' }
}

// ── Helpers ───────────────────────────────────────────────
function isTerminalError(error: string): boolean {
  const terminal = ['not found', '404', 'invalid', 'unauthorized', '401', '403']
  return terminal.some(t => error.toLowerCase().includes(t))
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Store-specific provider factory ──────────────────────
export interface StoreDeliveryConfig {
  provider: DeliveryProvider
  yalidine_api_id?: string | null
  yalidine_api_token?: string | null
  zrexpress_token?: string | null
  zrexpress_key?: string | null
  maystro_token?: string | null
  maystro_store_id?: string | null
  from_wilaya_id?: number
}

export function createStoreDeliveryProvider(config: StoreDeliveryConfig): UnifiedDelivery | null {
  try {
    switch (config.provider) {
      case 'yalidine':
        if (!config.yalidine_api_id || !config.yalidine_api_token) return null
        return new YalidineDelivery(
          config.yalidine_api_id,
          config.yalidine_api_token,
          config.from_wilaya_id ?? 16
        )
      case 'zrexpress':
        if (!config.zrexpress_token || !config.zrexpress_key) return null
        return new ZRExpressDelivery(config.zrexpress_token, config.zrexpress_key)
      case 'maystro':
        if (!config.maystro_token) return null
        return new MaystroDelivery(
          config.maystro_token,
          config.maystro_store_id ?? undefined
        )
      default:
        return null
    }
  } catch {
    return null
  }
}
