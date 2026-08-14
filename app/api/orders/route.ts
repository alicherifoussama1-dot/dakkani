import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { z } from 'zod'
import { checkFraud } from '@/lib/fraud/score'
import { resolveRouting, pushOrderToSheet, markOrderRouting } from '@/lib/orders/route-order'
import { checkRateLimit, rateLimitResponse } from '@/lib/platform/rate-limit'
import { getClientInfo } from '@/lib/platform/security'
import { emit } from '@/lib/platform/events'
import { enqueue } from '@/lib/platform/queue'
import { initPlatformRuntime } from '@/lib/platform/queue-handlers'

// Register event subscriptions once per instance so emit() fans out.
initPlatformRuntime()
import { formatCommuneFrench } from '@/lib/algeria-baladias'
import { resolveDeclaredFee } from '@/lib/delivery/pricing'
import { sendMetaPurchase } from '@/lib/tracking/meta-capi'
import { reportError } from '@/lib/monitoring/report'
import { fetchStoreIntegrations, fetchProductAssignments } from '@/lib/tracking/service'
import { resolveProductTracking } from '@/lib/tracking/resolve'

const orderSchema = z.object({
  store_id: z.string().uuid({ message: 'المتجر غير صحيح' }),
  customer_name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  customer_phone: z.string().regex(/^(05|06|07)\d{8}$/, 'رقم الهاتف غير صحيح — مثال: 0555123456'),
  customer_phone2: z.string().optional(),
  delivery_type: z.enum(['home', 'stopdesk']),
  wilaya_id: z.number({ invalid_type_error: 'اختر الولاية', required_error: 'اختر الولاية' }).int().min(1, 'اختر الولاية').max(58, 'اختر الولاية'),
  commune_id: z.number().int().optional(),
  baladia: z.string().optional(),
  address: z.string().optional(),
  stopdesk_code: z.string().optional(),
  // Stopdesk commune snapshot (AR + FR) — migration 028
  stopdesk_commune_ar: z.string().optional(),
  stopdesk_commune_fr: z.string().optional(),
  stopdesk_office_name: z.string().optional(),
  payment_method: z.enum(['cod', 'baridimob', 'ccp', 'card', 'chargily_cib', 'chargily_edahabia']).default('cod'),
  coupon_code: z.string().optional(),
  notes: z.string().optional(),
  source: z.string().optional(),
  utm_source: z.string().optional(),
  utm_medium: z.string().optional(),
  utm_campaign: z.string().optional(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    variant_key: z.string().default('default'),
    quantity: z.number().int().min(1),
  })).min(1, 'لا يوجد منتج في الطلب'),
}).superRefine((data, ctx) => {
  // Mirror the client rules so the API rejects exactly what the form rejects.
  if (data.delivery_type === 'home' && !(data.baladia ?? '').trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['baladia'], message: 'اختر البلدية التابعة لعنوانك' })
  }
  if (data.delivery_type === 'stopdesk' && !(data.baladia ?? data.stopdesk_commune_ar ?? '').trim()) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['baladia'], message: 'اختر بلدية مكتب الاستلام' })
  }
})

// First Zod issue → one specific Arabic message the customer can act on.
function zodArabicError(err: z.ZodError): string {
  const first = err.errors[0]
  if (!first) return 'بيانات غير صالحة'
  if (typeof first.message === 'string' && /[؀-ۿ]/.test(first.message)) return first.message
  const path = String(first.path[0] ?? '')
  const MAP: Record<string, string> = {
    customer_phone: 'رقم الهاتف غير صحيح — مثال: 0555123456',
    customer_name: 'الاسم يجب أن يكون حرفين على الأقل',
    wilaya_id: 'اختر الولاية',
    baladia: 'اختر البلدية',
    items: 'لا يوجد منتج في الطلب',
  }
  return MAP[path] ?? 'بيانات غير صالحة، تحقق من الحقول وأعد المحاولة'
}

// Mask a phone for server logs: 0555123456 → 0555•••456
const maskPhone = (p?: string) => (p && p.length >= 7 ? `${p.slice(0, 4)}•••${p.slice(-3)}` : '•••')

export async function POST(req: Request) {
  try {
    // Brake on bot bursts: 20 checkout attempts / minute / IP.
    // Real shoppers never hit this; scripted order-spam does.
    const client = getClientInfo(req)
    const rl = checkRateLimit(`checkout:${client.ip}`, { limit: 20, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl)

    const body = await req.json()
    const data = orderSchema.parse(body)
    // Guest checkout writes with the service client (same pattern as
    // storefront reads in lib/supabase/public.ts). The anon-cookie client
    // used before could only insert orders when the caller happened to be
    // the logged-in store owner — real customers were rejected by RLS
    // (orders has no anonymous INSERT policy), and order_items /
    // order_history / notifications inserts failed silently. All input is
    // zod-validated and prices come from the DB, never from the client.
    const supabase = createPublicClient()

    // 1. Validate store exists and is active
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('id, is_active, store_settings(fraud_auto_block_score, max_call_attempts)')
      .eq('id', data.store_id)
      .eq('is_active', true)
      .single()

    if (storeErr || !store) {
      return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })
    }

    // 2. Get wilaya delivery fee (static fallback)
    const { data: wilaya } = await supabase
      .from('wilayas')
      .select('code, name_ar, name_fr, delivery_fee_home, delivery_fee_stopdesk')
      .eq('id', data.wilaya_id)
      .single()

    let deliveryFee = data.delivery_type === 'stopdesk'
      ? (wilaya?.delivery_fee_stopdesk ?? 0)
      : (wilaya?.delivery_fee_home ?? 0)

    // 2b. Unified delivery routing: resolve the provider's DECLARED price
    // (shown to customer) + REAL price (profit only) via service role, so the
    // CHARGED fee equals the fee the storefront showed (anon RLS would block
    // these tables, falling back to the static wilaya fee → mismatch).
    const wilayaCode = String(wilaya?.code ?? data.wilaya_id).padStart(2, '0')
    const resolved = await resolveDeclaredFee({
      storeId: data.store_id, wilayaCode,
      deliveryType: data.delivery_type === 'stopdesk' ? 'stopdesk' : 'home',
      fallbackFee: deliveryFee,
    })
    deliveryFee = resolved.deliveryFee
    const realDeliveryFee = resolved.realDeliveryFee
    const unifiedProviderId = resolved.providerId

    // 3. Get product prices and calculate totals
    const productIds = data.items.map(i => i.product_id)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, cost_price, sku, images')
      .eq('store_id', data.store_id)
      .in('id', productIds)

    if (!products || products.length !== productIds.length) {
      console.error('[orders] product lookup failed', { store: data.store_id, requested: productIds.length, found: products?.length ?? 0 })
      return NextResponse.json({ error: 'المنتج غير متوفر حالياً' }, { status: 400 })
    }

    const productMap = Object.fromEntries(products.map(p => [p.id, p]))
    let subtotal = 0
    const orderItems = data.items.map(item => {
      const p = productMap[item.product_id]
      const total = p.price * item.quantity
      subtotal += total
      return {
        product_id: item.product_id,
        product_name: p.name,
        product_sku: p.sku,
        variant_key: item.variant_key,
        quantity: item.quantity,
        unit_price: p.price,
        cost_price: p.cost_price,
        total_price: total,
        image_url: (p.images as any[])?.[0]?.url,
      }
    })

    // 4. Apply coupon — full SERVER-side validation (expiry, min order,
    // max uses). The client check is advisory only.
    let discountAmount = 0
    let couponId = null
    if (data.coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', data.store_id)
        .eq('code', data.coupon_code.toUpperCase())
        .eq('is_active', true)
        .maybeSingle()

      const couponValid = !!coupon
        && (!coupon.expires_at || new Date(coupon.expires_at) > new Date())
        && (!coupon.min_order_amount || subtotal >= coupon.min_order_amount)
        && (!coupon.max_uses || (coupon.used_count ?? 0) < coupon.max_uses)

      if (couponValid && coupon) {
        if (coupon.type === 'percentage') discountAmount = (subtotal * coupon.value) / 100
        else if (coupon.type === 'fixed') discountAmount = coupon.value
        else if (coupon.type === 'free_shipping') discountAmount = deliveryFee
        couponId = coupon.id
      }
      // Invalid coupon never blocks the order — it simply doesn't discount.
    }

    const total = Math.max(0, subtotal + deliveryFee - discountAmount)

    // 4b. Idempotency — collapse ACCIDENTAL duplicate submissions (double-click,
    // network/browser retry, timeout-after-success, two tabs). An identical
    // submission = same store + phone + delivery_type + total in the last 90s.
    // We return the EXISTING order instead of inserting a second one, so the
    // client's retry still gets a success + the same order id/number. This never
    // blocks a genuine new order: a different product, quantity, total, or a gap
    // beyond 90s all pass through. The separate 24h "duplicate" STATUS flag below
    // is unchanged (that one still creates the order, for merchant review).
    const idemSince = new Date(Date.now() - 90_000).toISOString()
    const { data: idemHit } = await supabase
      .from('orders')
      .select('id, order_number, total')
      .eq('store_id', data.store_id)
      .eq('customer_phone', data.customer_phone)
      .eq('delivery_type', data.delivery_type)
      .eq('total', total)
      .neq('status', 'abandoned')
      .gte('created_at', idemSince)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (idemHit) {
      console.warn(`[orders] idempotent replay → returning existing ${idemHit.order_number}`)
      return NextResponse.json({
        success: true,
        order_id: idemHit.id,
        order_number: idemHit.order_number,
        total: idemHit.total,
        is_duplicate: false,
        idempotent_replay: true,
        chargily_url: null,
      })
    }

    // 5. Fraud check
    const settings = (store.store_settings as any)
    const fraudResult = await checkFraud(supabase, {
      storeId: data.store_id,
      phone: data.customer_phone,
      name: data.customer_name,
      wilayaId: data.wilaya_id,
      orderTotal: total,
    }, settings?.fraud_auto_block_score ?? 80)

    // 5b. Duplicate detection: same phone in last 24h → status "duplicate".
    // Abandoned drafts are checkout leftovers, NOT prior orders — excluded,
    // otherwise every recovered abandoned checkout would be flagged duplicate.
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', data.store_id)
      .eq('customer_phone', data.customer_phone)
      .neq('status', 'abandoned')
      .gte('created_at', oneDayAgo)
      .limit(1)
    const isDuplicate = (recentOrders?.length ?? 0) > 0

    // 5c. Wilaya → delivery company auto-routing
    let autoDeliveryCompanyId: string | null = null
    try {
      const { data: wilayaMap } = await supabase
        .from('confirmili_wilaya_company_map')
        .select('company_id')
        .eq('store_id', data.store_id)
        .eq('wilaya_id', data.wilaya_id)
        .maybeSingle()
      autoDeliveryCompanyId = wilayaMap?.company_id ?? null
    } catch {}

    // 6. Generate order number — RPC with fallback so a missing function can
    // never produce a NOT NULL violation (previously an opaque failure).
    const { data: orderNum, error: orderNumErr } = await supabase.rpc('generate_order_number', { p_store_id: data.store_id })
    const orderNumber = orderNum ?? `ORD-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`
    if (orderNumErr) console.error('[orders] generate_order_number failed, using fallback:', orderNumErr.message)

    // 7. Determine final status
    // Note: 'duplicate' status requires migration 009 to be run
    // If not run yet, use 'new' as fallback (constraint will reject 'duplicate')
    let finalStatus = 'new'
    if (fraudResult.shouldBlock) finalStatus = 'failed'
    else if (isDuplicate) finalStatus = 'duplicate'

    // Stopdesk commune snapshot in both languages (migration 028). The client
    // sends both; the server re-derives whatever is missing from the shared
    // commune table so the Sheets export always has a French name.
    const isStopdesk = data.delivery_type === 'stopdesk'
    const stopdeskCommuneAr = isStopdesk
      ? (data.stopdesk_commune_ar || data.baladia || null)
      : null
    const stopdeskCommuneFr = isStopdesk
      ? (data.stopdesk_commune_fr || formatCommuneFrench(data.wilaya_id, stopdeskCommuneAr) || null)
      : null

    // 7b. Create order — ONE shared row for the initial insert AND the
    // constraint-fallback retry, so no field (baladia…) can be dropped again.
    const orderRow = {
      store_id: data.store_id,
      order_number: orderNumber,
      customer_name: data.customer_name,
      customer_phone: data.customer_phone,
      customer_phone2: data.customer_phone2,
      delivery_type: data.delivery_type,
      wilaya_id: data.wilaya_id,
      commune_id: data.commune_id,
      baladia: data.baladia,
      address: data.address,
      stopdesk_code: data.stopdesk_code,
      stopdesk_commune_ar: stopdeskCommuneAr,
      stopdesk_commune_fr: stopdeskCommuneFr,
      stopdesk_office_name: isStopdesk ? (data.stopdesk_office_name ?? null) : null,
      delivery_fee: deliveryFee,
      declared_delivery_fee: deliveryFee,
      real_delivery_fee: realDeliveryFee,
      subtotal,
      discount_amount: discountAmount,
      coupon_id: couponId,
      coupon_code: data.coupon_code?.toUpperCase(),
      total,
      payment_method: data.payment_method,
      fraud_score: fraudResult.score,
      is_blacklisted: fraudResult.isBlacklisted,
      status: finalStatus,
      delivery_company_id: autoDeliveryCompanyId,
      delivery_provider_id: unifiedProviderId,
      source: data.source ?? 'storefront',
      utm_source: data.utm_source,
      utm_medium: data.utm_medium,
      utm_campaign: data.utm_campaign,
      notes: data.notes,
    }

    let insertRes = await supabase.from('orders').insert(orderRow).select().single()

    // Migration-028/013 not applied → unknown columns: retry without the
    // stopdesk snapshot so orders never fail on older databases.
    if (insertRes.error && /column .*stopdesk_commune|column .*stopdesk_office/i.test(insertRes.error.message)) {
      const { stopdesk_commune_ar: _a, stopdesk_commune_fr: _f, stopdesk_office_name: _n, ...legacyRow } = orderRow
      insertRes = await supabase.from('orders').insert(legacyRow).select().single()
    }
    // Constraint rejection of 'duplicate' (migration 009 missing) → same row,
    // status 'new', duplicate flagged in the notes. Nothing else changes.
    if (insertRes.error && finalStatus === 'duplicate' && insertRes.error.message?.includes('check')) {
      insertRes = await supabase.from('orders').insert({
        ...orderRow,
        status: 'new',
        notes: data.notes ? `${data.notes} [مكرر]` : '[مكرر]',
      }).select().single()
    }

    const order = insertRes.data
    if (insertRes.error || !order) {
      reportError(insertRes.error ?? new Error('order insert returned no row'), {
        route: 'POST /api/orders', level: 'fatal',
        tags: { kind: 'order_insert_failure', store: data.store_id, wilaya: data.wilaya_id, delivery_type: data.delivery_type },
      })
      return NextResponse.json({ error: 'حدث خطأ أثناء تسجيل الطلب، أعد المحاولة بعد لحظات' }, { status: 500 })
    }

    // 7c. The completed order supersedes any abandoned draft for the same
    // customer/product (last 24h) — delete it so no duplicate مهجور remains.
    try {
      let draftQ = supabase.from('orders').delete()
        .eq('store_id', data.store_id)
        .eq('customer_phone', data.customer_phone)
        .eq('status', 'abandoned')
        .gte('created_at', oneDayAgo)
      const firstProduct = data.items[0]?.product_id
      if (firstProduct) draftQ = draftQ.or(`abandoned_product_id.eq.${firstProduct},abandoned_product_id.is.null`)
      await draftQ
    } catch { /* draft cleanup is best-effort */ }

    // 8. Insert order items
    await supabase.from('order_items').insert(
      orderItems.map(i => ({ ...i, order_id: order.id, store_id: data.store_id }))
    )

    // Server-side Meta Purchase (CAPI). Deduplicated against the browser pixel
    // via event_id = order.id. Started here so it runs CONCURRENTLY with the
    // stock/notification/sheet work below; awaited (with its failure already
    // swallowed) just before the response, so it never blocks or breaks the
    // order. Skips fraud-blocked orders (not real conversions).
    const metaPurchasePromise = finalStatus === 'failed' ? null : (async () => {
      try {
        const firstProductId = data.items[0]?.product_id
        const [integrations, assignments] = await Promise.all([
          fetchStoreIntegrations(supabase, data.store_id),
          firstProductId ? fetchProductAssignments(supabase, firstProductId) : Promise.resolve([]),
        ])
        const metaR = resolveProductTracking(integrations, assignments).meta
        const integ = metaR?.enabled ? metaR.integration : null
        const pixelId = integ?.pixel_id
        const token = (integ?.credentials as any)?.accessToken ?? process.env.META_ACCESS_TOKEN
        if (!pixelId || !token) return
        const cookie = req.headers.get('cookie') ?? ''
        await sendMetaPurchase({
          pixelId, accessToken: token, eventId: order.id,
          value: subtotal, currency: 'DZD', contentIds: productIds, orderId: order.id,
          phone: data.customer_phone, name: data.customer_name, city: wilaya?.name_fr ?? undefined,
          clientIp: client.ip, userAgent: req.headers.get('user-agent') ?? undefined,
          fbc: cookie.match(/_fbc=([^;]+)/)?.[1], fbp: cookie.match(/_fbp=([^;]+)/)?.[1],
          sourceUrl: req.headers.get('referer') ?? undefined,
        })
      } catch (e) {
        console.error('[orders] meta CAPI purchase failed (non-blocking):', (e as Error).message)
      }
    })()

    // 8b. Decrement product stock + stock alert notifications
    for (const item of data.items) {
      const p = productMap[item.product_id]
      // Decrement stock (can go negative) — direct update
      try {
        const { data: stock } = await supabase.from('warehouse_stock')
          .select('quantity, warehouse_id')
          .eq('product_id', item.product_id)
          .eq('store_id', data.store_id)
          .limit(1)
        if (stock && stock.length > 0) {
          const s = stock[0]
          await supabase.from('warehouse_stock')
            .update({ quantity: (s.quantity ?? 0) - item.quantity })
            .eq('product_id', item.product_id)
            .eq('warehouse_id', s.warehouse_id)
        }
      } catch { /* stock update is non-critical */ }

      // Stock alert notification
      const { data: stockRow } = await supabase
        .from('warehouse_stock')
        .select('quantity')
        .eq('product_id', item.product_id)
        .limit(1)
        .maybeSingle()
      const minAlert = (p as any).min_stock_alert ?? 5
      if (stockRow && stockRow.quantity < minAlert) {
        await supabase.from('confirmili_notifications').insert({
          store_id: data.store_id,
          type: 'stock',
          title: 'تنبيه المخزون',
          message: `تنبيه حول المخزون : ${p.name}`,
          is_read: false,
        }).then(() => {})
      }
    }

    // 8c. Order creation notification
    await supabase.from('confirmili_notifications').insert({
      store_id: data.store_id,
      type: 'order',
      title: 'طلبية جديدة',
      message: `لديك طلبية جديدة : ${order.order_number}`,
      order_id: order.id,
      is_read: false,
    }).then(() => {})

    // 8d. Order history entry
    await supabase.from('order_history').insert({
      order_id: order.id,
      store_id: data.store_id,
      old_status: null,
      new_status: finalStatus,
      changed_by: 'system',
      notes: `تم إنشاء الطلب من ${data.source ?? 'storefront'}${isDuplicate ? ' (مكرر)' : ''}`,
    }).then(() => {})

    // 8e. ORDER ROUTING — Google Sheet / Confirmili / both.
    // Resolved per first product (override) → store default.
    // A Sheets failure NEVER blocks the order — it's recorded on the row.
    let routedTo: 'confirmili' | 'sheet' | 'both' = 'confirmili'
    try {
      const { routing, sheetId } = await resolveRouting({
        storeId: data.store_id,
        firstProductId: data.items[0].product_id,
      })
      if (routing !== 'confirmili_only' && sheetId) {
        routedTo = routing === 'both' ? 'both' : 'sheet'
        const push = await pushOrderToSheet({
          storeId: data.store_id,
          sheetId,
          order: {
            order_number: order.order_number,
            created_at: order.created_at,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            // Google Sheets receives FRENCH names only (the bilingual labels are
            // for the customer UI). IDs/calc/DB row are untouched. Stopdesk
            // orders use the FR commune snapshot captured at order time.
            wilaya_name: (wilaya as any)?.name_fr ?? (wilaya as any)?.name_ar ?? String(data.wilaya_id),
            baladia: isStopdesk
              ? (stopdeskCommuneFr ?? formatCommuneFrench(data.wilaya_id, data.baladia))
              : formatCommuneFrench(data.wilaya_id, data.baladia),
            address: data.address,
            delivery_type: data.delivery_type,
            delivery_fee: deliveryFee,
            discount_amount: discountAmount,
            total,
            notes: data.notes,
            status: finalStatus,
            source: data.source ?? 'storefront',
          },
          items: orderItems.map(i => ({
            product_name: i.product_name,
            sku: i.product_sku,
            variant_key: i.variant_key,
            quantity: i.quantity,
            unit_price: i.unit_price,
          })),
        })
        await markOrderRouting(order.id, {
          routed_to: routedTo,
          sheet_status: push.ok ? 'sent' : 'failed',
          sheet_error: push.ok ? null : push.error.slice(0, 300),
        })
        if (!push.ok) {
          console.error('Sheet push failed for', order.order_number, '—', push.error)
          // Queue an async retry so the order still reaches the sheet later.
          await enqueue('sheets.push', { orderId: order.id }, { storeId: data.store_id })
        }
      } else {
        // sheet_only without an assigned/default sheet falls back to Confirmili
        // so the order is never lost.
        await markOrderRouting(order.id, { routed_to: 'confirmili' })
      }
    } catch (e) {
      console.error('Order routing error (non-blocking):', e)
    }

    // 8e-bis. PUSH — notify the merchant's phones NOW.
    //
    // This is deliberately NOT left to the event bus. Queue jobs are drained
    // by a cron that runs once a day at 03:00, so a "new order" alert routed
    // through the queue arrived up to 24 hours late — the merchant heard
    // nothing while the order was actually sitting there. Same reasoning as
    // the synchronous Sheets push above: time-critical delivery happens here,
    // and the queue is the retry net rather than the delivery mechanism.
    //
    // Wrapped so that no push failure can ever cost the customer their order.
    try {
      const { notifyNewOrder } = await import('@/lib/push/notify-new-order')
      const res = await notifyNewOrder(order.id, data.store_id)
      if (!res.ok && res.reason === 'send-failed') {
        console.error('[orders] push failed for', order.order_number, '—', res.error)
        await enqueue('push.order', { orderId: order.id }, { storeId: data.store_id })
      }
    } catch (e) {
      console.error('[orders] push dispatch error (non-blocking):', (e as Error).message)
      await enqueue('push.order', { orderId: order.id }, { storeId: data.store_id }).catch(() => {})
    }

    // 8f. EVENT BUS — announce the new order. Subscribers (emails, WhatsApp,
    // analytics, future plugins) run as isolated queue jobs; emit() never throws.
    await emit('order.created', {
      storeId: data.store_id,
      orderId: order.id,
      orderNumber: order.order_number,
      total,
      status: finalStatus,
      wilayaId: data.wilaya_id,
      source: data.source ?? 'storefront',
    })

    // 9. Update coupon usage — atomic RPC (migration 028), with a guarded
    // read-then-update fallback for databases that don't have it yet.
    // Never blocks the order.
    if (couponId) {
      try {
        const { error: rpcErr } = await supabase.rpc('increment_coupon_usage', { p_coupon_id: couponId })
        if (rpcErr) {
          const { data: c } = await supabase.from('coupons').select('used_count').eq('id', couponId).single()
          await supabase.from('coupons').update({ used_count: (c?.used_count ?? 0) + 1 }).eq('id', couponId)
        }
      } catch (e) {
        console.error('[orders] coupon usage increment failed (non-blocking):', (e as Error).message)
      }
    }

    // 10. Chargily payment — create checkout URL
    let chargilyUrl: string | null = null
    if (['chargily_cib', 'chargily_edahabia'].includes(data.payment_method)) {
      const chargilyKey = process.env.CHARGILY_SECRET_KEY
      if (chargilyKey) {
        const { ChargilyClient } = await import('@/lib/payment/chargily')
        const chargily = new ChargilyClient(chargilyKey)
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        try {
          const checkout = await chargily.createCheckout({
            amount: Math.round(total),
            currency: 'dzd',
            payment_method: data.payment_method === 'chargily_cib' ? 'CIB' : 'EDAHABIA',
            success_url: `${appUrl}/order/${order.id}?payment=success`,
            failure_url:  `${appUrl}/order/${order.id}?payment=failed`,
            webhook_endpoint: `${appUrl}/api/webhooks/chargily`,
            locale: 'ar',
            metadata: { order_id: order.id, order_number: order.order_number },
          })
          chargilyUrl = checkout.checkout_url
        } catch (e) {
          console.error('Chargily checkout error:', e)
        }
      }
    }

    // Await the concurrently-started server Purchase before returning so it
    // completes on serverless, but its failure is already swallowed (caught
    // inside) and it never affects the order result.
    if (metaPurchasePromise) await metaPurchasePromise

    return NextResponse.json({
      success: true,
      order_id: order.id,
      order_number: order.order_number,
      total: order.total,
      fraud_score: fraudResult.score,
      fraud_blocked: fraudResult.shouldBlock,
      is_duplicate: isDuplicate,
      chargily_url: chargilyUrl,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error('[orders] validation failed:', err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(' | '))
      return NextResponse.json({ error: zodArabicError(err), details: err.errors }, { status: 400 })
    }
    reportError(err, { route: 'POST /api/orders', tags: { kind: 'order_create_failure' } })
    return NextResponse.json({ error: 'حدث خطأ، أعد المحاولة' }, { status: 500 })
  }
}
