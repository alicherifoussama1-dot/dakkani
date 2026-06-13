import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkFraud } from '@/lib/fraud/score'
import { resolveRouting, pushOrderToSheet, markOrderRouting } from '@/lib/orders/route-order'

const orderSchema = z.object({
  store_id: z.string().uuid(),
  customer_name: z.string().min(2),
  customer_phone: z.string().regex(/^(05|06|07)\d{8}$/),
  customer_phone2: z.string().optional(),
  delivery_type: z.enum(['home', 'stopdesk']),
  wilaya_id: z.number().int().min(1).max(58),
  commune_id: z.number().int().optional(),
  baladia: z.string().optional(),
  address: z.string().optional(),
  stopdesk_code: z.string().optional(),
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
  })).min(1),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = orderSchema.parse(body)
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: (n) => cookieStore.get(n)?.value, set: (n,v,o) => { try { cookieStore.set({name:n,value:v,...o}) } catch {} }, remove: (n,o) => { try { cookieStore.set({name:n,value:'',...o}) } catch {} } } })

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
      .select('code, name_ar, delivery_fee_home, delivery_fee_stopdesk')
      .eq('id', data.wilaya_id)
      .single()

    let deliveryFee = data.delivery_type === 'stopdesk'
      ? (wilaya?.delivery_fee_stopdesk ?? 0)
      : (wilaya?.delivery_fee_home ?? 0)

    // 2b. Unified delivery routing: resolve provider for this wilaya, then
    // use its DECLARED price (shown to customer) + REAL price (profit only).
    const wilayaCode = String(wilaya?.code ?? data.wilaya_id).padStart(2, '0')
    let unifiedProviderId: string | null = null
    let realDeliveryFee = deliveryFee
    {
      const { data: route } = await supabase
        .from('wilaya_company_map').select('provider_id')
        .eq('store_id', data.store_id).eq('wilaya_code', wilayaCode).maybeSingle()
      unifiedProviderId = route?.provider_id ?? null
      if (!unifiedProviderId) {
        const { data: anyProv } = await supabase
          .from('delivery_providers').select('id')
          .eq('store_id', data.store_id).eq('is_active', true).order('created_at').limit(1).maybeSingle()
        unifiedProviderId = anyProv?.id ?? null
      }
      if (unifiedProviderId) {
        const [{ data: dp }, { data: rp }] = await Promise.all([
          supabase.from('delivery_declared_prices').select('home_price,stopdesk_price').eq('provider_id', unifiedProviderId).eq('wilaya_code', wilayaCode).maybeSingle(),
          supabase.from('delivery_real_prices').select('home_price,stopdesk_price').eq('provider_id', unifiedProviderId).eq('wilaya_code', wilayaCode).maybeSingle(),
        ])
        if (dp) deliveryFee = data.delivery_type === 'stopdesk' ? Number(dp.stopdesk_price) : Number(dp.home_price)
        if (rp) realDeliveryFee = data.delivery_type === 'stopdesk' ? Number(rp.stopdesk_price) : Number(rp.home_price)
        else realDeliveryFee = deliveryFee
      }
    }

    // 3. Get product prices and calculate totals
    const productIds = data.items.map(i => i.product_id)
    const { data: products } = await supabase
      .from('products')
      .select('id, name, price, cost_price, sku, images')
      .eq('store_id', data.store_id)
      .in('id', productIds)

    if (!products || products.length !== productIds.length) {
      return NextResponse.json({ error: 'بعض المنتجات غير متوفرة' }, { status: 400 })
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

    // 4. Apply coupon
    let discountAmount = 0
    let couponId = null
    if (data.coupon_code) {
      const { data: coupon } = await supabase
        .from('coupons')
        .select('*')
        .eq('store_id', data.store_id)
        .eq('code', data.coupon_code.toUpperCase())
        .eq('is_active', true)
        .single()

      if (coupon && (!coupon.expires_at || new Date(coupon.expires_at) > new Date())) {
        if (coupon.type === 'percentage') discountAmount = (subtotal * coupon.value) / 100
        else if (coupon.type === 'fixed') discountAmount = coupon.value
        else if (coupon.type === 'free_shipping') discountAmount = deliveryFee
        couponId = coupon.id
      }
    }

    const total = Math.max(0, subtotal + deliveryFee - discountAmount)

    // 5. Fraud check
    const settings = (store.store_settings as any)
    const fraudResult = await checkFraud(supabase, {
      storeId: data.store_id,
      phone: data.customer_phone,
      name: data.customer_name,
      wilayaId: data.wilaya_id,
      orderTotal: total,
    }, settings?.fraud_auto_block_score ?? 80)

    // 5b. Duplicate detection: same phone in last 24h → status "duplicate"
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: recentOrders } = await supabase
      .from('orders')
      .select('id')
      .eq('store_id', data.store_id)
      .eq('customer_phone', data.customer_phone)
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

    // 6. Generate order number
    const { data: orderNum } = await supabase.rpc('generate_order_number', { p_store_id: data.store_id })

    // 7. Determine final status
    // Note: 'duplicate' status requires migration 009 to be run
    // If not run yet, use 'new' as fallback (constraint will reject 'duplicate')
    let finalStatus = 'new'
    if (fraudResult.shouldBlock) finalStatus = 'failed'
    else if (isDuplicate) finalStatus = 'duplicate'

    // 7b. Create order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        store_id: data.store_id,
        order_number: orderNum,
        customer_name: data.customer_name,
        customer_phone: data.customer_phone,
        customer_phone2: data.customer_phone2,
        delivery_type: data.delivery_type,
        wilaya_id: data.wilaya_id,
        commune_id: data.commune_id,
        baladia: data.baladia,
        address: data.address,
        stopdesk_code: data.stopdesk_code,
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
      })
      .select()
      .single()

    if (orderErr || !order) {
      // If constraint violation on 'duplicate' status, retry with 'new'
      if (orderErr?.message?.includes('check') && finalStatus === 'duplicate') {
        const { data: order2, error: orderErr2 } = await supabase
          .from('orders')
          .insert({
            store_id: data.store_id,
            order_number: orderNum,
            customer_name: data.customer_name,
            customer_phone: data.customer_phone,
            customer_phone2: data.customer_phone2,
            delivery_type: data.delivery_type,
            wilaya_id: data.wilaya_id,
            commune_id: data.commune_id,
            address: data.address,
            stopdesk_code: data.stopdesk_code,
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
            status: 'new', // fallback
            delivery_company_id: autoDeliveryCompanyId,
            delivery_provider_id: unifiedProviderId,
            source: data.source ?? 'storefront',
            utm_source: data.utm_source,
            utm_medium: data.utm_medium,
            utm_campaign: data.utm_campaign,
            notes: data.notes ? `${data.notes} [مكرر]` : '[مكرر]',
          })
          .select()
          .single()
        if (orderErr2 || !order2) {
          return NextResponse.json({ error: 'فشل في إنشاء الطلب' }, { status: 500 })
        }
        // Use order2 for rest of flow
        return NextResponse.json({
          success: true,
          order_id: order2.id,
          order_number: order2.order_number,
          total: order2.total,
          fraud_score: fraudResult.score,
          fraud_blocked: fraudResult.shouldBlock,
          is_duplicate: true,
        })
      }
      return NextResponse.json({ error: 'فشل في إنشاء الطلب' }, { status: 500 })
    }

    // 8. Insert order items
    await supabase.from('order_items').insert(
      orderItems.map(i => ({ ...i, order_id: order.id, store_id: data.store_id }))
    )

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
            wilaya_name: (wilaya as any)?.name_ar ?? String(data.wilaya_id),
            baladia: data.baladia,
            address: data.address,
            delivery_fee: deliveryFee,
            discount_amount: discountAmount,
            total,
            notes: data.notes,
            status: finalStatus,
            source: data.source ?? 'storefront',
          },
          items: orderItems.map(i => ({
            product_name: i.product_name,
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
        if (!push.ok) console.error('Sheet push failed for', order.order_number, '—', push.error)
      } else {
        // sheet_only without an assigned/default sheet falls back to Confirmili
        // so the order is never lost.
        await markOrderRouting(order.id, { routed_to: 'confirmili' })
      }
    } catch (e) {
      console.error('Order routing error (non-blocking):', e)
    }

    // 9. Update coupon usage
    if (couponId) {
      await supabase.from('coupons')
        .update({ used_count: supabase.rpc('increment' as any, { x: 1 }) as any })
        .eq('id', couponId)
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
      return NextResponse.json({ error: 'بيانات غير صالحة', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
