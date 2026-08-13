// ============================================================
// COMMERCO API CLIENT
//
// Deliberately dependency-free (plain fetch, no RN imports) so the whole
// data layer can be exercised in Node against the real backend — see
// scripts/verify-api.mjs. Auth + store id are INJECTED, never imported,
// which is what keeps it testable.
//
// Talks only to /api/mobile/v1/* and /api/dashboard/analytics.
// It must NEVER call meta-events, tiktok-events or tracking/* .
// ============================================================

export const API_URL =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'https://dakkani.vercel.app'

/** 15s is generous for 3G but still fails fast enough to show a retry. */
const REQUEST_TIMEOUT_MS = 15_000
/** Uploads carry image payloads, so they get a longer leash. */
const UPLOAD_TIMEOUT_MS = 60_000

export interface AuthProvider {
  /** Current access token, refreshing it first if it is about to expire. */
  getAccessToken(): Promise<string | null>
  /** Active store id → sent as X-Commerco-Store. */
  getStoreId(): string | null
  /** Called on a 401 so the app can force re-login. */
  onUnauthorized?(): void
}

export class ApiError extends Error {
  constructor(public status: number, message: string, public body?: unknown) {
    super(message)
    this.name = 'ApiError'
  }
  /** Network failure / device offline — the UI shows the offline state. */
  get isOffline() { return this.status === 0 }
}

let auth: AuthProvider = {
  async getAccessToken() { return null },
  getStoreId() { return null },
}
export function configureApi(provider: AuthProvider) { auth = provider }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await auth.getAccessToken()
  const storeId = auth.getStoreId()

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(storeId ? { 'X-Commerco-Store': storeId } : {}),
    ...((init.headers as Record<string, string>) ?? {}),
  }

  // NOTE: do NOT use AbortSignal.timeout() here. React Native polyfills
  // AbortSignal from the `abort-controller` package, which has no static
  // timeout(); calling it throws and every request would surface as "offline".
  // AbortController + a cleared timer is the portable equivalent.
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS)

  let res: Response
  try {
    res = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      signal: ctrl.signal,
    })
  } catch (e) {
    const msg = (e as Error)?.message || 'network error'
    // An aborted request is a timeout, not a hard failure — same offline UI.
    throw new ApiError(0, ctrl.signal.aborted ? 'timeout' : msg)
  } finally {
    clearTimeout(timer)
  }

  if (res.status === 401) {
    auth.onUnauthorized?.()
    throw new ApiError(401, 'Unauthorized')
  }

  const text = await res.text()
  let json: any = null
  try { json = text ? JSON.parse(text) : null } catch { /* non-JSON error page */ }

  if (!res.ok) {
    throw new ApiError(res.status, json?.error ?? `HTTP ${res.status}`, json)
  }
  return json as T
}

// ── Types (mirror the verified API responses) ──────────────
export interface Bootstrap {
  ok: true
  store: { id: string; name: string; slug: string | null; plan: string | null; logo_url: string | null }
  stores: Array<{ id: string; name: string; slug: string | null }>
  settings: Record<string, unknown> | null
  counters: {
    newOrders: number; unreadNotifications: number; activeProducts: number
    ordersToday: number; revenueToday: number
    /** Calendar-month usage for the subscription screen. */
    ordersThisMonth: number; productCount: number
  }
  server_time: string
}

export interface OrderRow {
  id: string; order_number: string; customer_name: string; customer_phone: string
  total: number; status: string; delivery_type: 'home' | 'stopdesk'
  wilaya_id: number | null; wilaya_name: string | null
  commune: string | null; stopdesk_office: string | null
  source: string | null; fraud_score: number; created_at: string
  items_count: number; product_name: string | null; product_image: string | null
}

export interface ProductRow {
  id: string; name: string; slug: string | null; sku: string | null
  price: number; compare_price: number | null; discount_pct: number
  image: string | null; is_active: boolean; variants: unknown[]
  stock: number; orders_count: number; abandonment_rate: number
}

export interface CustomerRow {
  phone: string; name: string; wilaya_id: number | null; wilaya_name?: string | null
  commune: string | null; orders: number; spend: number; last_order: string
}

export interface ReviewRow {
  id: string; product_name: string | null; customer_name: string
  rating: number; comment: string | null; is_approved: boolean
  is_verified: boolean; reply: string | null; created_at: string
}

/** Whitelisted on the server — anything else is 404. */
export type CatalogResource =
  | 'coupons' | 'warehouses' | 'blacklist' | 'sheets' | 'landing-pages' | 'notifications'
  | 'categories'
  // Read-only from mobile: the server returns 405 for POST/PATCH/DELETE.
  | 'delivery-providers' | 'delivery-prices' | 'stopdesk-offices'

export interface DeliveryProviderRow {
  id: string
  provider_type: 'yalidine' | 'zrexpress' | 'ecotrack' | 'maystro' | 'noest'
  display_name: string
  is_active: boolean
  is_automatic: boolean
  from_wilaya_code: string | null
  created_at: string
}

export interface DeliveryPriceRow {
  id: string; provider_id: string | null; wilaya_code: string
  home_price: number | null; stopdesk_price: number | null
  source: string | null; updated_at: string
}

export interface StopdeskOfficeRow {
  id: string; provider_id: string | null; wilaya_code: string
  name: string; address: string | null; is_active: boolean; created_at: string
}

export type DatePreset = 'today' | 'yesterday' | '7d' | '30d' | 'custom'

/** Shape returned by the SHARED web+mobile analytics handler. */
export interface Analytics {
  ok?: boolean
  store?: unknown
  dateRange: { startISO: string; endISO: string; label?: string }
  kpis: Record<string, any>
  hourlyData: Array<{ hour: string; hourNum: number; orders: number; abandoned: number; normal: number }>
  wilayaDistribution: {
    totalOrders: number
    sortedWilayas: Array<{ id: number; name: string; count: number; pct: number }>
  }
  periodSeries: Array<{ label: string; total_orders: number; normal_orders: number; abandoned_orders: number; revenue: number }>
  productPerformance: Array<{ id: string; name: string; image_url: string | null; total_orders: number; normal_orders: number; abandoned_orders: number; abandonment_rate: number }>
}

/** Mirrors app/(dashboard)/analytics/page.tsx — the الإحصائيات page. */
export interface StoreAnalytics {
  ok?: boolean
  days: number
  totalOrders: number
  truncated: boolean
  kpis: {
    revenue: number; grossProfit: number; avgOrder: number
    deliveryRate: number; cancelRate: number; deliveryRevenue: number
    ordersCount: number; uniqueCustomers: number
  } | null
  byWilaya: Array<{
    wilaya_id: number | null; wilaya_name: string | null
    total: number; delivered: number; delivery_rate: number; revenue: number
  }>
}

const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams()
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v))
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const api = {
  bootstrap: () => request<Bootstrap>('/api/mobile/v1/bootstrap'),

  /** SAME handler the web dashboard uses — numbers can never drift. */
  analytics: (preset: DatePreset, startDate?: string, endDate?: string) =>
    request<Analytics>(`/api/mobile/v1/dashboard${qs({ preset, startDate, endDate })}`),

  /** The الإحصائيات page's numbers (delivery rate, AOV, cancellation…),
   *  which the dashboard handler does not compute. */
  storeAnalytics: (days = 30) =>
    request<StoreAnalytics>(`/api/mobile/v1/analytics${qs({ days })}`),

  /** `phone` is an EXACT customer match; `q` is the fuzzy list search. */
  orders: (p: { status?: string; q?: string; phone?: string; limit?: number; offset?: number } = {}) =>
    request<{ ok: true; orders: OrderRow[]; total: number; next_offset: number | null }>(
      `/api/mobile/v1/orders${qs(p)}`),

  order: (id: string) =>
    request<{ ok: true; order: any; history: any[] }>(`/api/mobile/v1/orders/${id}`),

  setOrderStatus: (id: string, status: string, note?: string) =>
    request<{ ok: true; id: string; status: string }>(`/api/mobile/v1/orders/${id}`, {
      method: 'PATCH', body: JSON.stringify({ status, note }),
    }),

  products: (p: { q?: string; filter?: string; limit?: number } = {}) =>
    request<{ ok: true; products: ProductRow[]; total: number }>(`/api/mobile/v1/products${qs(p)}`),

  product: (id: string) =>
    request<{ ok: true; product: any }>(`/api/mobile/v1/products/${id}`),

  createProduct: (body: Record<string, unknown>) =>
    request<{ ok: true; product: any }>('/api/mobile/v1/products', {
      method: 'POST', body: JSON.stringify(body),
    }),

  updateProduct: (id: string, body: Record<string, unknown>) =>
    request<{ ok: true; product: any }>(`/api/mobile/v1/products/${id}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),

  deleteProduct: (id: string) =>
    request<{ ok: true }>(`/api/mobile/v1/products/${id}`, { method: 'DELETE' }),

  setStock: (id: string, quantity: number, variantKey = 'default') =>
    request<{ ok: true; stock: number }>(`/api/mobile/v1/products/${id}/stock`, {
      method: 'PATCH', body: JSON.stringify({ quantity, variant_key: variantKey }),
    }),

  customers: (p: { q?: string; limit?: number } = {}) =>
    request<{ ok: true; customers: CustomerRow[]; total: number }>(`/api/mobile/v1/customers${qs(p)}`),

  /** Exact aggregate for ONE customer — orders count and spend over every
   *  order they have placed, not over one page of a fuzzy search. */
  customer: (phone: string) =>
    request<{ ok: true; customer: CustomerRow | null }>(`/api/mobile/v1/customers${qs({ phone })}`),

  notifications: () =>
    request<{ ok: true; notifications: any[]; unread: number }>('/api/mobile/v1/notifications'),

  markNotifications: (body: { id?: string; all?: boolean }) =>
    request<{ ok: true }>('/api/mobile/v1/notifications', { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Reviews ──
  reviews: (status?: 'approved' | 'pending') =>
    request<{ ok: true; reviews: ReviewRow[]; avg: number; total: number }>(
      `/api/mobile/v1/reviews${qs({ status })}`),

  patchReview: (body: { id: string; is_approved?: boolean; reply?: string }) =>
    request<{ ok: true }>('/api/mobile/v1/reviews', { method: 'PATCH', body: JSON.stringify(body) }),

  // ── Generic merchant resources (whitelisted server-side) ──
  catalog: <T = any>(resource: CatalogResource, limit = 100) =>
    request<{ ok: true; items: T[]; total: number; unavailable?: boolean }>(
      `/api/mobile/v1/catalog/${resource}${qs({ limit })}`),

  catalogCreate: <T = any>(resource: CatalogResource, body: Record<string, unknown>) =>
    request<{ ok: true; item: T }>(`/api/mobile/v1/catalog/${resource}`, {
      method: 'POST', body: JSON.stringify(body),
    }),

  catalogUpdate: (resource: CatalogResource, id: string | null, body: Record<string, unknown>) =>
    request<{ ok: true }>(`/api/mobile/v1/catalog/${resource}${id ? qs({ id }) : qs({ all: 'true' })}`, {
      method: 'PATCH', body: JSON.stringify(body),
    }),

  catalogDelete: (resource: CatalogResource, id: string) =>
    request<{ ok: true }>(`/api/mobile/v1/catalog/${resource}${qs({ id })}`, { method: 'DELETE' }),

  // ── Store settings (read + safe subset write) ──
  settings: () => request<{ ok: true; settings: Record<string, any> | null }>('/api/mobile/v1/settings'),

  updateSettings: (body: Record<string, unknown>) =>
    request<{ ok: true; settings: Record<string, any> }>('/api/mobile/v1/settings', {
      method: 'PATCH', body: JSON.stringify(body),
    }),

  /** Per-device push preferences as PERSISTED — the settings screen must
   *  render these, not optimistic defaults. */
  devicePrefs: (token: string) =>
    request<{
      ok: true; registered: boolean
      prefs: { push_enabled: boolean; sound_enabled: boolean; vibration_enabled: boolean } | null
    }>(`/api/mobile/v1/devices${qs({ token })}`),

  registerDevice: (body: { token: string; platform: 'ios' | 'android'; app_version?: string; locale?: string }) =>
    request<{ ok: true; registered: boolean }>('/api/mobile/v1/devices', {
      method: 'POST', body: JSON.stringify(body),
    }),

  updateDevicePrefs: (body: { token: string; push_enabled?: boolean; sound_enabled?: boolean; vibration_enabled?: boolean }) =>
    request<{ ok: true }>('/api/mobile/v1/devices', { method: 'PATCH', body: JSON.stringify(body) }),

  /** Ask the SERVER to push to this device — the real FCM/APNs path, so a
   *  failure here means the chain is broken, not that the phone is muted. */
  testPush: (token: string) =>
    request<{ ok: true; sent: boolean; platform: 'ios' | 'android' }>(
      '/api/mobile/v1/devices/test', { method: 'POST', body: JSON.stringify({ token }) }),

  unregisterDevice: (token: string) =>
    request<{ ok: true }>(`/api/mobile/v1/devices?token=${encodeURIComponent(token)}`, { method: 'DELETE' }),

  /** Direct upload to the existing /api/upload route (multipart). */
  async uploadImage(file: { uri: string; name: string; type: string }, folder: string) {
    const token = await auth.getAccessToken()
    const storeId = auth.getStoreId()
    const fd = new FormData()
    // RN's FormData accepts this shape for file parts.
    fd.append('file', file as unknown as Blob)
    fd.append('folder', folder)

    // Without a timeout a stalled upload hangs the save button forever.
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), UPLOAD_TIMEOUT_MS)

    let res: Response
    try {
      res = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        // Content-Type is intentionally omitted so RN sets the multipart boundary.
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(storeId ? { 'X-Commerco-Store': storeId } : {}),
        },
        body: fd,
        signal: ctrl.signal,
      })
    } catch (e) {
      throw new ApiError(0, ctrl.signal.aborted ? 'timeout' : ((e as Error)?.message || 'network error'))
    } finally {
      clearTimeout(timer)
    }

    if (res.status === 401) { auth.onUnauthorized?.(); throw new ApiError(401, 'Unauthorized') }
    if (!res.ok) throw new ApiError(res.status, 'upload failed')
    return res.json() as Promise<{ url: string; path: string }>
  },
}
