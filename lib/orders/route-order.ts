// ============================================================
// Order routing — resolves WHERE a new order goes and pushes it
// to the assigned Google Sheet (service-account model). SERVER-SIDE ONLY.
//
// Routing: product.order_routing (first item) → if 'inherit'
//   → store_settings.order_routing → default 'confirmili_only'.
// Sheet:   product.google_sheet_id → else the store's default sheet
//   (sheet_mapping linked_to_type='default').
//
// GUARANTEE: never throws — a Sheets failure must NEVER block order
// creation. Failures are recorded on orders.sheet_status and retried.
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { writeRow, buildOrderRow } from '@/lib/google/service-account'

export type OrderRouting = 'sheet_only' | 'confirmili_only' | 'both'

// Service-role client: storefront customers are anonymous; routing needs
// merchant rows that RLS protects. Key is server-only (never NEXT_PUBLIC_).
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function resolveRouting(opts: {
  storeId: string
  firstProductId: string
}): Promise<{ routing: OrderRouting; sheetId: string | null }> {
  const admin = adminClient()
  if (!admin) return { routing: 'confirmili_only', sheetId: null }

  try {
    const [{ data: product }, { data: settings }] = await Promise.all([
      admin.from('products').select('order_routing, google_sheet_id').eq('id', opts.firstProductId).eq('store_id', opts.storeId).maybeSingle(),
      admin.from('store_settings').select('order_routing').eq('store_id', opts.storeId).maybeSingle(),
    ])

    const productRouting = product?.order_routing as string | undefined
    const routing: OrderRouting =
      (productRouting && productRouting !== 'inherit' ? productRouting : settings?.order_routing ?? 'confirmili_only') as OrderRouting

    let sheetId: string | null = product?.google_sheet_id ?? null
    if (routing !== 'confirmili_only' && !sheetId) {
      // Store default sheet via sheet_mapping (scoped to this store's sheets).
      const { data: maps } = await admin.from('sheet_mapping').select('sheet_id, sheets!inner(store_id)').eq('linked_to_type', 'default')
      sheetId = (maps ?? []).find((m: any) => m.sheets?.store_id === opts.storeId)?.sheet_id ?? null
    }
    return { routing, sheetId }
  } catch {
    // Columns/tables missing (migration 020 not applied) → safe default.
    return { routing: 'confirmili_only', sheetId: null }
  }
}

export async function pushOrderToSheet(opts: {
  storeId: string
  sheetId: string
  order: {
    order_number: string
    created_at?: string
    customer_name: string
    customer_phone: string
    wilaya_name?: string
    baladia?: string | null
    address?: string | null
    delivery_type?: string | null
    delivery_fee: number
    discount_amount: number
    total: number
    notes?: string | null
    status: string
    source?: string | null
  }
  items: { product_name: string; sku?: string | null; variant_key?: string; quantity: number; unit_price: number }[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = adminClient()
  if (!admin) return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY غير مهيأ' }

  try {
    const { data: sheet } = await admin.from('sheets')
      .select('sheet_id, sheet_page_name, is_active')
      .eq('id', opts.sheetId).eq('store_id', opts.storeId).maybeSingle()

    if (!sheet || !sheet.is_active) return { ok: false, error: 'الشيت غير مفعّل أو غير موجود' }

    const o = opts.order
    const first = opts.items[0]
    const productLabel = opts.items.length > 1
      ? `${first?.product_name ?? ''} (+${opts.items.length - 1})`
      : first?.product_name ?? ''
    const variant = first?.variant_key && first.variant_key !== 'default'
      ? first.variant_key.replace(/\s*\|\s*/g, ', ')
      : ''

    const row = buildOrderRow({
      name: o.customer_name,
      phone: o.customer_phone,
      wilaya: o.wilaya_name ?? '',
      baladia: o.baladia ?? '',
      sku: first?.sku ?? '',
      variant,
      qty: opts.items.reduce((s, i) => s + i.quantity, 0),
      price: first?.unit_price ?? 0,
      delivery: o.delivery_fee,
      total: o.total,
      deliveryType: o.delivery_type === 'stopdesk' ? 'stopdesk' : 'home',
      productName: productLabel,
      createdAt: ((o as any).created_at
        ? new Date((o as any).created_at)
        : new Date()
      ).toISOString().slice(0, 19).replace('T', ' '),
    })

    const res = await writeRow(sheet.sheet_id, sheet.sheet_page_name || 'Sheet1', row)
    if (res.ok) await admin.from('sheets').update({ last_sync: new Date().toISOString() }).eq('id', opts.sheetId).then(() => {}, () => {})
    return res.ok ? { ok: true } : { ok: false, error: res.error }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// Mark the routing result on the order row — best-effort
export async function markOrderRouting(orderId: string, patch: {
  routed_to: 'confirmili' | 'sheet' | 'both'
  sheet_status?: 'sent' | 'failed' | null
  sheet_error?: string | null
}): Promise<void> {
  const admin = adminClient()
  if (!admin) return
  try { await admin.from('orders').update(patch).eq('id', orderId) } catch {}
}
