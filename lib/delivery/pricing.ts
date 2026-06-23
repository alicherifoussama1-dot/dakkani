// ============================================================
// Storefront delivery pricing — SERVER-SIDE ONLY.
// Overrides each wilaya's delivery_fee_home/stopdesk with the STORE's
// declared prices (delivery_declared_prices, imported from the courier or
// set manually) so the customer sees the store's real fee when picking a
// wilaya. Falls back to the wilaya's static fee when no declared price.
//
// Uses the service role because delivery_declared_prices is owner-RLS and
// the storefront runs as an anonymous client. Key is server-only.
// ============================================================
import { createClient } from '@supabase/supabase-js'

function admin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

const pad = (c: unknown) => String(c ?? '').padStart(2, '0')

/** Resolve the store's declared + real delivery fee for one wilaya, server-side
 *  via service role (used at order creation so the CHARGED fee equals the fee
 *  shown to the customer). Falls back to `fallbackFee` when no declared price. */
export async function resolveDeclaredFee(opts: {
  storeId: string
  wilayaCode: string
  deliveryType: 'home' | 'stopdesk'
  fallbackFee: number
}): Promise<{ deliveryFee: number; realDeliveryFee: number; providerId: string | null }> {
  const { storeId, wilayaCode, deliveryType, fallbackFee } = opts
  const a = admin()
  const out = { deliveryFee: fallbackFee, realDeliveryFee: fallbackFee, providerId: null as string | null }
  if (!a) return out
  try {
    const code = pad(wilayaCode)
    let { data: route } = await a.from('wilaya_company_map').select('provider_id').eq('store_id', storeId).eq('wilaya_code', code).maybeSingle()
    let providerId = route?.provider_id as string | null ?? null
    if (!providerId) {
      const { data: any1 } = await a.from('delivery_providers').select('id').eq('store_id', storeId).eq('is_active', true).order('created_at').limit(1).maybeSingle()
      providerId = any1?.id ?? null
    }
    out.providerId = providerId
    if (!providerId) return out
    const [{ data: dp }, { data: rp }] = await Promise.all([
      a.from('delivery_declared_prices').select('home_price, stopdesk_price').eq('provider_id', providerId).eq('wilaya_code', code).maybeSingle(),
      a.from('delivery_real_prices').select('home_price, stopdesk_price').eq('provider_id', providerId).eq('wilaya_code', code).maybeSingle(),
    ])
    if (dp) out.deliveryFee = deliveryType === 'stopdesk' ? Number(dp.stopdesk_price) : Number(dp.home_price)
    out.realDeliveryFee = rp ? (deliveryType === 'stopdesk' ? Number(rp.stopdesk_price) : Number(rp.home_price)) : out.deliveryFee
    return out
  } catch {
    return out
  }
}

/** Merge the store's declared delivery prices into the wilayas list. */
export async function applyStoreDeliveryPrices<T extends { code?: string | number; delivery_fee_home?: number; delivery_fee_stopdesk?: number }>(
  storeId: string,
  wilayas: T[],
): Promise<T[]> {
  const a = admin()
  if (!a || !wilayas?.length) return wilayas
  try {
    const [{ data: declared }, { data: routes }] = await Promise.all([
      a.from('delivery_declared_prices').select('provider_id, wilaya_code, home_price, stopdesk_price').eq('store_id', storeId),
      a.from('wilaya_company_map').select('wilaya_code, provider_id').eq('store_id', storeId),
    ])
    if (!declared?.length) return wilayas

    // Prefer the price from each wilaya's routed provider (wilaya_company_map).
    const routeMap = new Map<string, string>((routes ?? []).map((r: any) => [pad(r.wilaya_code), r.provider_id]))
    const priceByCode = new Map<string, { home: number; desk: number }>()
    for (const row of declared) {
      const code = pad(row.wilaya_code)
      const routed = routeMap.get(code)
      const existing = priceByCode.get(code)
      const preferred = routed ? row.provider_id === routed : !existing
      if (preferred || !existing) priceByCode.set(code, { home: Number(row.home_price), desk: Number(row.stopdesk_price) })
    }

    return wilayas.map(w => {
      const p = priceByCode.get(pad(w.code))
      if (!p) return w
      return {
        ...w,
        delivery_fee_home: p.home > 0 ? p.home : w.delivery_fee_home,
        delivery_fee_stopdesk: p.desk > 0 ? p.desk : w.delivery_fee_stopdesk,
      }
    })
  } catch {
    return wilayas // table missing / any error → static fees
  }
}
