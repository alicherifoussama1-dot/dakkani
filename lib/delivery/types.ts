// ============================================================
// DAKKANI — Unified Delivery Types (adapter contract + DTOs)
// One internal shape for every courier despite different APIs.
// ============================================================

export type ProviderType = 'yalidine' | 'zrexpress' | 'ecotrack' | 'maystro' | 'noest'
export type DeliveryType = 'home' | 'stopdesk'

// ── Unified internal tracking status set ─────────────────────
export type UnifiedStatus =
  | 'pending'          // created / awaiting pickup
  | 'picked_up'        // collected by courier
  | 'in_transit'       // moving between hubs
  | 'out_for_delivery' // with driver / sortie en livraison
  | 'delivered'        // livré
  | 'returned'         // retour
  | 'cancelled'        // annulé
  | 'exception'        // failed attempt / problem

// ── DTOs (the contract shared across all adapters) ───────────
export interface CreateOrderData {
  orderId: string
  orderNumber: string
  customerName: string
  phone: string
  phone2?: string
  address?: string
  wilayaCode: string        // 2-digit, e.g. "16"
  wilayaName: string
  communeId?: number
  communeName: string
  productList: string
  codAmount: number         // amount to collect (DZD)
  deliveryType: DeliveryType
  stopdeskId?: string
  weight?: number
  notes?: string
  fromWilayaCode?: string   // origin (merchant) wilaya
  storeName: string
  storePhone?: string
}

export interface OrderData {
  success: boolean
  trackingNumber?: string
  labelUrl?: string
  fee?: number
  raw?: unknown
  error?: string
}

export interface TrackingData {
  success: boolean
  trackingNumber?: string
  rawStatus?: string
  status?: UnifiedStatus
  events?: { status: string; description: string; location?: string; at: string }[]
  error?: string
}

export interface RateData {
  wilayaCode: string        // 2-digit
  wilayaName?: string
  homePrice: number
  stopdeskPrice: number
}

export interface LabelData {
  success: boolean
  url?: string
  pdfBase64?: string
  error?: string
}

export interface CancelData {
  success: boolean
  error?: string
}

export interface TestResult {
  ok: boolean
  message: string
}

// ── The adapter interface every provider implements ─────────
export interface DeliveryAdapter {
  readonly type: ProviderType
  testCredentials(): Promise<TestResult>
  createShipment(order: CreateOrderData): Promise<OrderData>
  getTracking(trackingNumber: string): Promise<TrackingData>
  cancelShipment(trackingNumber: string): Promise<CancelData>
  importRates(fromWilayaCode?: string): Promise<RateData[]>
  getLabel(trackingNumber: string): Promise<LabelData>
}

// ── Credential shapes per provider ───────────────────────────
export interface ProviderCredentials {
  // yalidine
  apiId?: string
  apiToken?: string
  // zrexpress (Procolis)
  token?: string
  key?: string
  // ecotrack / maystro / noest
  // (token reused above)
  // optional origin wilaya
  fromWilayaCode?: string
}

// ── Provider catalogue (UI metadata + which fields to ask) ───
export interface ProviderMeta {
  type: ProviderType
  label: string             // Arabic display name
  logo: string              // emoji / short tag for the UI chip
  hasRatesApi: boolean      // can auto-import prices?
  fields: { key: keyof ProviderCredentials; label: string; placeholder?: string }[]
  // JSON credentials UX
  requiredKeys: string[]              // keys the merchant must provide (real dashboard names)
  credTemplate: Record<string, string> // placeholder shown in the JSON textarea
}

export const PROVIDERS: ProviderMeta[] = [
  {
    type: 'ecotrack', label: 'Ecotrack', logo: '🟢', hasRatesApi: true,
    fields: [{ key: 'token', label: 'API Token', placeholder: 'Bearer token' }],
    requiredKeys: ['token'], credTemplate: { token: '' },
  },
  {
    type: 'zrexpress', label: 'ZR Express (Procolis)', logo: '🔴', hasRatesApi: true,
    fields: [
      { key: 'token', label: 'Token', placeholder: 'token' },
      { key: 'key',   label: 'Key',   placeholder: 'key' },
    ],
    requiredKeys: ['token', 'key'], credTemplate: { token: '', key: '' },
  },
  {
    type: 'yalidine', label: 'Yalidine', logo: '🟡', hasRatesApi: true,
    fields: [
      { key: 'apiId',    label: 'API ID',    placeholder: 'X-API-ID' },
      { key: 'apiToken', label: 'API Token', placeholder: 'X-API-TOKEN' },
    ],
    requiredKeys: ['id', 'token'], credTemplate: { id: '', token: '' },
  },
  {
    type: 'noest', label: 'Noest (Ecotrack)', logo: '🟣', hasRatesApi: true,
    fields: [{ key: 'token', label: 'API Token (Ecotrack)', placeholder: 'Bearer token' }],
    requiredKeys: ['token'], credTemplate: { token: '' },
  },
  {
    type: 'maystro', label: 'Maystro', logo: '🔵', hasRatesApi: false,
    fields: [{ key: 'token', label: 'API Token', placeholder: 'Bearer token' }],
    requiredKeys: ['token'], credTemplate: { token: '' },
  },
]

export function providerMeta(type: ProviderType): ProviderMeta | undefined {
  return PROVIDERS.find(p => p.type === type)
}

// Validate pasted credentials for a provider. Accepts the real dashboard key
// names + aliases (so {id,token}|{token,key} both work for ZR/Yalidine).
const KEY_ALIASES: Record<string, string[]> = {
  id: ['id', 'apiId', 'api_id'],
  token: ['token', 'apiToken', 'api_token'],
  key: ['key', 'apiKey', 'api_key'],
}
export function validateCreds(type: ProviderType, creds: Record<string, unknown>): { ok: boolean; missing?: string } {
  const meta = providerMeta(type)
  if (!meta) return { ok: false, missing: type }
  const has = (k: string) => (KEY_ALIASES[k] ?? [k]).some(a => {
    const v = (creds as any)[a]
    return v != null && String(v).trim() !== ''
  })
  // ZR/Yalidine accept either naming convention (2 distinct credential values).
  if (type === 'zrexpress' || type === 'yalidine') {
    const pairs = [['token', 'key'], ['id', 'token']]
    if (pairs.some(([a, b]) => has(a) && has(b))) return { ok: true }
    return { ok: false, missing: meta.requiredKeys.find(k => !has(k)) ?? meta.requiredKeys.join('+') }
  }
  for (const k of meta.requiredKeys) if (!has(k)) return { ok: false, missing: k }
  return { ok: true }
}

// ── Status normalization: every courier's strings → UnifiedStatus
// Matching is done lowercased + trimmed; numeric codes matched as-is.
const STATUS_RULES: { match: (s: string) => boolean; status: UnifiedStatus }[] = [
  { status: 'delivered',        match: s => /livr|delivered|livré|livree|تم التسليم|سلم/.test(s) },
  { status: 'returned',         match: s => /retour|return|raja|مرتجع|مرجع/.test(s) },
  { status: 'cancelled',        match: s => /annul|cancel|ملغ/.test(s) },
  { status: 'out_for_delivery', match: s => /sortie en livraison|out.?for.?delivery|en livraison|with.?driver|chez le livreur|خرج للتوصيل|مع السائق/.test(s) },
  { status: 'in_transit',       match: s => /transit|en route|centre|hub|expédi|expedi|في الطريق|نقل/.test(s) },
  { status: 'picked_up',        match: s => /ramass|pick|collect|enlev|تم الاستلام|استلم/.test(s) },
  { status: 'exception',        match: s => /échou|echou|fail|tentative|problem|exception|مشكل|فشل/.test(s) },
  { status: 'pending',          match: s => /attente|pending|cré|cree|created|new|قيد|جديد|في الانتظار/.test(s) },
]

// Numeric maps for couriers that return codes (ZR/Procolis "Situation")
const NUMERIC_MAP: Record<string, UnifiedStatus> = {
  '1': 'pending', '2': 'picked_up', '3': 'in_transit',
  '4': 'out_for_delivery', '5': 'delivered', '6': 'returned',
  '7': 'cancelled', '8': 'exception',
}

export function normalizeStatus(raw?: string | null): UnifiedStatus {
  if (raw == null) return 'pending'
  const s = String(raw).trim()
  if (NUMERIC_MAP[s]) return NUMERIC_MAP[s]
  const lower = s.toLowerCase()
  for (const rule of STATUS_RULES) {
    if (rule.match(lower)) return rule.status
  }
  return 'pending'
}

// Unified status → Confirmili/orders.status value
export const UNIFIED_TO_ORDER_STATUS: Record<UnifiedStatus, string> = {
  pending:          'processing',
  picked_up:        'shipped',
  in_transit:       'in_transit',
  out_for_delivery: 'out_for_delivery',
  delivered:        'delivered',
  returned:         'returned',
  cancelled:        'cancelled',
  exception:        'exception',
}

// Arabic labels for the unified statuses (UI)
export const UNIFIED_STATUS_LABEL: Record<UnifiedStatus, string> = {
  pending:          'قيد المعالجة',
  picked_up:        'تم الاستلام',
  in_transit:       'في الطريق',
  out_for_delivery: 'خرج للتوصيل',
  delivered:        'تم التسليم',
  returned:         'مرتجع',
  cancelled:        'ملغى',
  exception:        'مشكلة',
}
