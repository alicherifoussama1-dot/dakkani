// ============================================================
// Manual (re)send of an existing order to its Google Sheet. SERVER-SIDE ONLY.
//
// Used by the dashboard's bulk "send to Google Sheet" action, for orders and
// abandoned drafts that never reached the sheet (toggle was off, sheet not
// linked yet, a Sheets error…). It is an explicit merchant action, so it
// ignores the per-product abandoned_send_to_sheet toggle.
//
// An order already marked 'sent' is never sent again (that would add a
// duplicate row): it is skipped. A claim on sheet_status (null|failed →
// 'sent') makes that hold even when two sends of the same order overlap.
//
// Same sheet + row shape as the automatic push (route-order.ts), and the
// result is recorded on orders.sheet_status / sheet_error.
// ============================================================
import { createClient } from '@/lib/db/compat/supabase-js'
import { formatCommuneFrench } from '@/lib/algeria-baladias'
import { resolveRouting, pushOrderToSheet } from '@/lib/orders/route-order'

export type ResendResult =
  | { ok: true; skipped?: false }
  | { ok: true; skipped: true }
  | { ok: false; error: string }

export async function resendOrderToSheet(orderId: string, storeId: string): Promise<ResendResult> {
  const client = createClient()

  const { data: order } = await client.from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId).eq('store_id', storeId).maybeSingle()
  if (!order) return { ok: false, error: 'الطلب غير موجود' }
  if (order.sheet_status === 'sent') return { ok: true, skipped: true }

  const items = (order.order_items ?? []) as any[]
  const firstProductId = items[0]?.product_id ?? order.abandoned_product_id
  if (!firstProductId) return { ok: false, error: 'لا يوجد منتج في الطلب' }

  const { sheetId } = await resolveRouting({ storeId, firstProductId }).catch(() => ({ sheetId: null }))
  if (!sheetId) return { ok: false, error: 'لا يوجد Google Sheet مربوط بهذا المنتج أو بالمتجر' }

  // ── Claim: only one caller ever pushes this order ──
  const { data: claimed } = await client.from('orders')
    .update({ sheet_status: 'sent' })
    .eq('id', orderId).eq('store_id', storeId)
    .or('sheet_status.is.null,sheet_status.eq.failed')
    .select('id')
  if (!claimed || claimed.length === 0) return { ok: true, skipped: true }

  try {

    let wilayaName = ''
    if (order.wilaya_id) {
      const { data: w } = await client.from('wilayas').select('name_fr, name_ar').eq('id', order.wilaya_id).maybeSingle()
      wilayaName = w?.name_fr ?? w?.name_ar ?? String(order.wilaya_id)
    }
    const frCommune = order.delivery_type === 'stopdesk'
      ? (order.stopdesk_commune_fr ?? formatCommuneFrench(order.wilaya_id, order.baladia))
      : formatCommuneFrench(order.wilaya_id, order.baladia)
    const isAbandoned = order.status === 'abandoned'

    const res = await pushOrderToSheet({
      storeId,
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
        status: order.status,
        status_label: isAbandoned ? 'Abandonné' : undefined,
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

    // On failure, release the claim as 'failed' so the order can be sent again.
    await client.from('orders')
      .update(res.ok
        ? { sheet_error: null }
        : { sheet_status: 'failed', sheet_error: res.error.slice(0, 300) })
      .eq('id', orderId).eq('store_id', storeId)
      .then(() => {}, () => {})
    return res
  } catch (e) {
    await client.from('orders').update({ sheet_status: 'failed', sheet_error: (e as Error).message.slice(0, 300) })
      .eq('id', orderId).eq('store_id', storeId).then(() => {}, () => {})
    return { ok: false, error: (e as Error).message }
  }
}
