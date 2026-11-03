// ============================================================
// Manual (re)send of an existing order to its Google Sheet. SERVER-SIDE ONLY.
//
// Used by the dashboard's bulk "send to Google Sheet" action, for orders and
// abandoned drafts that never reached the sheet (toggle was off, sheet not
// linked yet, a Sheets error…). It is an explicit merchant action, so it
// ignores the per-product abandoned_send_to_sheet toggle and the existing
// sheet_status: the merchant decides, and the UI confirms before re-sending
// an order that is already marked 'sent'.
//
// Same sheet + row shape as the automatic push (route-order.ts), and the
// result is recorded on orders.sheet_status / sheet_error.
// ============================================================
import { createClient } from '@/lib/db/compat/supabase-js'
import { formatCommuneFrench } from '@/lib/algeria-baladias'
import { resolveRouting, pushOrderToSheet } from '@/lib/orders/route-order'

export type ResendResult = { ok: true } | { ok: false; error: string }

export async function resendOrderToSheet(orderId: string, storeId: string): Promise<ResendResult> {
  const client = createClient()

  const { data: order } = await client.from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId).eq('store_id', storeId).maybeSingle()
  if (!order) return { ok: false, error: 'الطلب غير موجود' }

  const items = (order.order_items ?? []) as any[]
  const firstProductId = items[0]?.product_id ?? order.abandoned_product_id
  if (!firstProductId) return { ok: false, error: 'لا يوجد منتج في الطلب' }

  try {
    const { sheetId } = await resolveRouting({ storeId, firstProductId })
    if (!sheetId) return { ok: false, error: 'لا يوجد Google Sheet مربوط بهذا المنتج أو بالمتجر' }

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

    await client.from('orders')
      .update(res.ok
        ? { sheet_status: 'sent', sheet_error: null }
        : { sheet_status: 'failed', sheet_error: res.error.slice(0, 300) })
      .eq('id', orderId).eq('store_id', storeId)
      .then(() => {}, () => {})
    return res
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
