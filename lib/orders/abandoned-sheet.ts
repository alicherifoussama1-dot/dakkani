// ============================================================
// Abandoned-draft → Google Sheet push. SERVER-SIDE ONLY.
//
// One shared code path used by:
//   • /api/orders/abandoned/finalize  (beacon — INSTANT push)
//   • the 'abandoned.sheet' queue job (fallback/retry only)
//
// Rules:
//   • The PRODUCT's abandoned_send_to_sheet decides (migration 029);
//     store_settings.abandoned_push_to_sheet is only the fallback for
//     databases/products that predate the per-product columns.
//   • A claim on orders.sheet_status (null|failed → 'sent') guarantees
//     a draft is pushed at most once even if the beacon fires twice
//     and the queue retries concurrently.
//   • Converted drafts (status ≠ 'abandoned') are never pushed.
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { formatCommuneFrench } from '@/lib/algeria-baladias'

export type AbandonedPushResult =
  | { ok: true; pushed: true }
  | { ok: true; pushed: false; skipped: string }
  | { ok: false; error: string }

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function pushAbandonedDraftToSheet(orderId: string): Promise<AbandonedPushResult> {
  const client = adminClient()
  if (!client) return { ok: false, error: 'service client غير مهيأ' }

  const { data: order } = await client.from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId).maybeSingle()
  if (!order) return { ok: true, pushed: false, skipped: 'draft deleted (converted)' }
  if (order.status !== 'abandoned') return { ok: true, pushed: false, skipped: 'draft converted' }

  const items = (order.order_items ?? []) as any[]
  const firstProductId = items[0]?.product_id ?? order.abandoned_product_id
  if (!firstProductId) return { ok: true, pushed: false, skipped: 'no identifiable product' }

  // ── Per-product toggle decides; store setting is the legacy fallback ──
  let sendToSheet: boolean | null = null
  const { data: product, error: prodErr } = await client.from('products')
    .select('abandoned_send_to_sheet').eq('id', firstProductId).maybeSingle()
  if (!prodErr && product && typeof product.abandoned_send_to_sheet === 'boolean') {
    sendToSheet = product.abandoned_send_to_sheet
  }
  if (sendToSheet === null) {
    const { data: settings } = await client.from('store_settings')
      .select('abandoned_push_to_sheet').eq('store_id', order.store_id).maybeSingle()
    sendToSheet = !!settings?.abandoned_push_to_sheet
  }
  if (!sendToSheet) return { ok: true, pushed: false, skipped: 'toggle OFF (لا ترسل)' }

  // ── Claim: only one caller ever pushes this draft ──
  const { data: claimed } = await client.from('orders')
    .update({ sheet_status: 'sent' })
    .eq('id', orderId)
    .or('sheet_status.is.null,sheet_status.eq.failed')
    .select('id')
  if (!claimed || claimed.length === 0) {
    return { ok: true, pushed: false, skipped: 'already pushed/claimed' }
  }

  try {
    const { resolveRouting, pushOrderToSheet } = await import('@/lib/orders/route-order')
    const { sheetId } = await resolveRouting({ storeId: order.store_id, firstProductId })
    if (!sheetId) {
      await client.from('orders').update({ sheet_status: null }).eq('id', orderId)
      return { ok: true, pushed: false, skipped: 'no sheet assigned' }
    }

    const frCommune = order.delivery_type === 'stopdesk'
      ? (order.stopdesk_commune_fr ?? formatCommuneFrench(order.wilaya_id, order.baladia))
      : formatCommuneFrench(order.wilaya_id, order.baladia)

    let wilayaName = ''
    if (order.wilaya_id) {
      const { data: w } = await client.from('wilayas').select('name_fr, name_ar').eq('id', order.wilaya_id).maybeSingle()
      wilayaName = w?.name_fr ?? w?.name_ar ?? ''
    }

    const res = await pushOrderToSheet({
      storeId: order.store_id,
      sheetId,
      order: {
        order_number: order.order_number,
        created_at: order.created_at,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        wilaya_name: wilayaName,
        baladia: frCommune ?? null,
        address: order.address ?? null,
        delivery_type: order.delivery_type ?? null,
        delivery_fee: order.delivery_fee ?? 0,
        discount_amount: order.discount_amount ?? 0,
        total: order.total ?? 0,
        notes: order.notes ?? null,
        status: 'abandoned',
        status_label: 'Abandonné',
        source: order.source ?? null,
      },
      items: items.map(i => ({
        product_name: i.product_name ?? '',
        sku: i.sku ?? null,
        variant_key: i.variant_key ?? 'default',
        quantity: i.quantity ?? 1,
        unit_price: i.unit_price ?? 0,
      })),
    })

    if (!res.ok) {
      // Release the claim as 'failed' so the queue fallback can retry.
      await client.from('orders').update({ sheet_status: 'failed', sheet_error: res.error.slice(0, 300) }).eq('id', orderId)
      return { ok: false, error: res.error }
    }
    return { ok: true, pushed: true }
  } catch (e) {
    await client.from('orders').update({ sheet_status: 'failed' }).eq('id', orderId).then(() => {}, () => {})
    return { ok: false, error: (e as Error).message }
  }
}
