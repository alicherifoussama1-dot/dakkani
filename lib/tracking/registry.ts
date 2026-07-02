// ============================================================
// Tracking Provider Registry — the single source of truth.
//
// Everything provider-specific lives here: labels, ID format,
// credential fields, whether it supports a server-side test.
// The Settings UI, the Product "Tracking & Domain" tab, the
// resolver, and the storefront loader all read from this map.
//
// Adding a new provider = add ONE entry to PROVIDERS. No schema
// change, no product-settings change. (New DB `provider` values
// also need adding to the CHECK constraints in a follow-up
// migration — the only DB touch required.)
// ============================================================

export type ProviderKey = 'meta' | 'tiktok' | 'google' | 'snapchat'

export interface CredentialField {
  key: string
  label: string
  labelAr: string
  placeholder?: string
  secret?: boolean
  required?: boolean
}

export interface ProviderMeta {
  key: ProviderKey
  label: string          // "Meta Pixel"
  labelAr: string        // "بكسل ميتا"
  color: string          // brand color for chips/badges
  idLabel: string        // "Pixel ID" / "Measurement ID"
  idLabelAr: string
  idPlaceholder: string
  // Optional server-side credentials (Conversions API). Empty = browser-only.
  credentialFields: CredentialField[]
  supportsServerEvents: boolean
}

// Order here defines the order rows appear in every UI.
export const PROVIDERS: Record<ProviderKey, ProviderMeta> = {
  meta: {
    key: 'meta',
    label: 'Meta Pixel',
    labelAr: 'بكسل ميتا (فيسبوك)',
    color: '#1877F2',
    idLabel: 'Pixel ID',
    idLabelAr: 'معرّف البكسل',
    idPlaceholder: '123456789012345',
    supportsServerEvents: true,
    credentialFields: [
      { key: 'capiToken', label: 'Conversions API Token', labelAr: 'رمز Conversions API', secret: true, required: false, placeholder: 'EAAG...' },
    ],
  },
  tiktok: {
    key: 'tiktok',
    label: 'TikTok Pixel',
    labelAr: 'بكسل تيك توك',
    color: '#000000',
    idLabel: 'Pixel ID',
    idLabelAr: 'معرّف البكسل',
    idPlaceholder: 'CXXXXXXXXXXXXXXXXX',
    supportsServerEvents: true,
    credentialFields: [
      { key: 'accessToken', label: 'Events API Token', labelAr: 'رمز Events API', secret: true, required: false, placeholder: '...' },
    ],
  },
  google: {
    key: 'google',
    label: 'Google Analytics',
    labelAr: 'جوجل أناليتكس (GA4)',
    color: '#E37400',
    idLabel: 'Measurement ID',
    idLabelAr: 'معرّف القياس',
    idPlaceholder: 'G-XXXXXXXXXX',
    supportsServerEvents: false,
    credentialFields: [],
  },
  snapchat: {
    key: 'snapchat',
    label: 'Snapchat Pixel',
    labelAr: 'بكسل سناب شات',
    color: '#FFFC00',
    idLabel: 'Pixel ID',
    idLabelAr: 'معرّف البكسل',
    idPlaceholder: '00000000-0000-0000-0000-000000000000',
    supportsServerEvents: false,
    credentialFields: [],
  },
}

// Registry-ordered list — iterate this to render provider rows.
export const PROVIDER_LIST: ProviderMeta[] = Object.values(PROVIDERS)

export const PROVIDER_KEYS: ProviderKey[] = PROVIDER_LIST.map(p => p.key)

export function getProvider(key: string): ProviderMeta | undefined {
  return PROVIDERS[key as ProviderKey]
}

export function isProviderKey(key: string): key is ProviderKey {
  return key in PROVIDERS
}

// Canonical, fixed event set. No custom events, ever.
export const TRACKED_EVENTS = ['ViewContent', 'InitiateCheckout', 'Purchase'] as const
export type TrackedEvent = (typeof TRACKED_EVENTS)[number]
