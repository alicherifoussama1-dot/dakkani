// ============================================================
// Delivery registry — build a server-side adapter from a stored
// provider row (decrypting its credentials). Single entry point
// used by every /api/delivery/* route.
// ============================================================
import type { DeliveryAdapter, ProviderType, ProviderCredentials } from './types'
import { decryptCredentials } from './crypto'
import { YalidineAdapter } from './providers/yalidine'
import { ZRExpressAdapter } from './providers/zrexpress'
import { EcotrackAdapter } from './providers/ecotrack'
import { MaystroAdapter } from './providers/maystro'

export * from './types'
export { encryptCredentials, decryptCredentials, maskCredential } from './crypto'

export function buildAdapter(type: ProviderType, credentials: ProviderCredentials): DeliveryAdapter {
  switch (type) {
    case 'yalidine':  return new YalidineAdapter(credentials)
    case 'zrexpress': return new ZRExpressAdapter(credentials)
    case 'ecotrack':  return new EcotrackAdapter(credentials, 'ecotrack')
    case 'noest':     return new EcotrackAdapter(credentials, 'noest') // Noest runs on Ecotrack
    case 'maystro':   return new MaystroAdapter(credentials)
    default:          throw new Error(`Unknown provider: ${type}`)
  }
}

// Build an adapter straight from a delivery_providers row.
export function adapterFromRow(row: {
  provider_type: ProviderType
  credentials: string | Record<string, unknown> | null
}): DeliveryAdapter {
  const creds = decryptCredentials<ProviderCredentials>(row.credentials as string)
  return buildAdapter(row.provider_type, creds)
}
