// ============================================================
// POST /api/orders/abandoned — abandoned-checkout draft capture.
//
// The storefront forms call this (debounced) once the customer has
// typed a valid phone number. The draft is an orders row with
// status 'abandoned' (migration 028):
//   • DEDUPE: one live draft per store + phone + product — repeat
//     calls update the same row (abandoned_last_activity refreshed).
//   • CONVERT: POST /api/orders deletes the matching draft when the
//     real order is created, so no duplicate مهجور ever remains.
//   • SHEET: when store_settings.abandoned_push_to_sheet is ON, an
//     'abandoned.sheet' job is enqueued; the handler pushes only
//     drafts that survived the abandonment window (status Abandonné).
// Pixels are the CLIENT's job (InitiateCheckout — never Purchase),
// gated by store_settings.abandoned_track_conversions.
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase/public'
import { checkRateLimit, rateLimitResponse } from '@/lib/platform/rate-limit'
import { getClientInfo } from '@/lib/platform/security'
import { enqueue } from '@/lib/platform/queue'

const draftSchema = z.object({
  store_id: z.string().uuid(),
  product_id: z.string().uuid().optional(),
  customer_name: z.string().max(120).optional(),
  customer_phone: z.string().regex(/^(05|06|07)\d{8}$/, 'رقم الهاتف غير صحيح'),
  customer_phone2: z.string().optional(),
  wilaya_id: z.number().int().min(1).max(58).optional(),
  baladia: z.string().max(120).optional(),
  address: z.string().max(300).optional(),
  delivery_type: z.enum(['home', 'stopdesk']).optional(),
  quantity: z.number().int().min(1).max(99).default(1),
  source: z.string().optional(),
})

export async function POST(req: Request) {
  try {
    // Drafts are cheap writes — throttle harder than checkout itself.
    const client = getClientInfo(req)
    const rl = checkRateLimit(`abandoned:${client.ip}`, { limit: 30, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl)

    const data = draftSchema.parse(await req.json())
    const supabase = createPublicClient()

    // Store must exist and be active (same gate as checkout).
    const { data: store } = await supabase
      .from('stores').select('id').eq('id', data.store_id).eq('is_active', true).maybeSingle()
    if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

    // Store settings: fast window (default 5 min) + legacy sheet fallback.
    const { data: settings } = await supabase
      .from('store_settings')
      .select('abandoned_push_to_sheet, abandoned_window_minutes')
      .eq('store_id', data.store_id).maybeSingle()
    const windowMin = settings?.abandoned_window_minutes ?? 5

    // Product snapshot (price/name + its abandoned toggles — migration 029).
    let product: { id: string; name: string; price: number; sku: string | null; cost_price: number | null; abandoned_send_to_sheet?: boolean | null } | null = null
    if (data.product_id) {
      const { data: p } = await supabase
        .from('products').select('*')
        .eq('id', data.product_id).eq('store_id', data.store_id).maybeSingle()
      product = p as any
    }
    // PER-PRODUCT setting wins; the store toggle is only the legacy fallback.
    const sendToSheet = typeof product?.abandoned_send_to_sheet === 'boolean'
      ? product.abandoned_send_to_sheet
      : !!settings?.abandoned_push_to_sheet
    const subtotal = (product?.price ?? 0) * data.quantity

    const patch = {
      customer_name: data.customer_name?.trim() || 'زائر',
      customer_phone: data.customer_phone,
      customer_phone2: data.customer_phone2 || null,
      wilaya_id: data.wilaya_id ?? null,
      baladia: data.baladia || null,
      address: data.address || null,
      delivery_type: data.delivery_type ?? 'home',
      subtotal,
      total: subtotal, // delivery fee unknown until the wilaya step completes
      abandoned_last_activity: new Date().toISOString(),
    }

    // ── DEDUPE: reuse the live draft for this store+phone+product ──
    let draftQ = supabase.from('orders')
      .select('id')
      .eq('store_id', data.store_id)
      .eq('customer_phone', data.customer_phone)
      .eq('status', 'abandoned')
    draftQ = data.product_id
      ? draftQ.eq('abandoned_product_id', data.product_id)
      : draftQ.is('abandoned_product_id', null)
    const { data: existing } = await draftQ
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (existing) {
      await supabase.from('orders').update(patch).eq('id', existing.id)
      if (product) {
        await supabase.from('order_items')
          .update({ quantity: data.quantity, total_price: subtotal })
          .eq('order_id', existing.id).eq('product_id', product.id)
          .then(() => {}, () => {})
      }
      return NextResponse.json({ ok: true, draft_id: existing.id, updated: true })
    }

    // ── CREATE the draft ──
    const orderNumber = `ABN-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    const { data: draft, error: insErr } = await supabase.from('orders').insert({
      ...patch,
      store_id: data.store_id,
      order_number: orderNumber,
      status: 'abandoned',
      payment_method: 'cod',
      delivery_fee: 0,
      discount_amount: 0,
      source: data.source ?? 'storefront',
      abandoned_product_id: data.product_id ?? null,
    }).select('id').single()

    if (insErr || !draft) {
      // Migration 028 missing (status constraint / columns) → capture is
      // silently unavailable; never surface an error to the customer.
      console.error('[abandoned] draft insert failed:', insErr?.message)
      return NextResponse.json({ ok: false, skipped: true })
    }

    if (product) {
      await supabase.from('order_items').insert({
        order_id: draft.id,
        store_id: data.store_id,
        product_id: product.id,
        product_name: product.name,
        product_sku: product.sku,
        variant_key: 'default',
        quantity: data.quantity,
        unit_price: product.price,
        cost_price: product.cost_price,
        total_price: subtotal,
      }).then(() => {}, () => {})
    }

    // Sheet push FALLBACK only: the beacon (/abandoned/finalize) pushes
    // instantly when the customer leaves. This queued job covers browsers
    // where the beacon never fired — it matures after the (short) window
    // and the claim on sheet_status prevents any double push.
    if (sendToSheet) {
      await enqueue('abandoned.sheet', { orderId: draft.id }, {
        storeId: data.store_id,
        runAt: new Date(Date.now() + windowMin * 60_000),
      })
    }

    return NextResponse.json({ ok: true, draft_id: draft.id, created: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }
    console.error('[abandoned] unexpected failure:', (err as Error)?.message ?? err)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
