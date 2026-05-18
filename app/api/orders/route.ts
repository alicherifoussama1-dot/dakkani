import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkFraud } from '@/lib/fraud/score'

const orderSchema = z.object({
  store_id: z.string().uuid(),
  customer_name: z.string().min(2),
  customer_phone: z.string().regex(/^(05|06|07)\d{8}$/),
  customer_phone2: z.string().optional(),
  delivery_type: z.enum(['home', 'stopdesk']),
  wilaya_id: z.number().int().min(1).max(58),
  commune_id: z.number().int().optional(),
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
    const supabase = createRouteHandlerClient({ cookies })

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

    // 2. Get wilaya delivery fee
    const { data: wilaya } = await supabase
      .from('wilayas')
      .select('delivery_fee_home, delivery_fee_stopdesk')
      .eq('id', data.wilaya_id)
      .single()

    const deliveryFee = data.delivery_type === 'stopdesk'
      ? (wilaya?.delivery_fee_stopdesk ?? 0)
      : (wilaya?.delivery_fee_home ?? 0)

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

    // 6. Generate order number
    const { data: orderNum } = await supabase.rpc('generate_order_number', { p_store_id: data.store_id })

    // 7. Create order
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
        address: data.address,
        stopdesk_code: data.stopdesk_code,
        delivery_fee: deliveryFee,
        subtotal,
        discount_amount: discountAmount,
        coupon_id: couponId,
        coupon_code: data.coupon_code?.toUpperCase(),
        total,
        payment_method: data.payment_method,
        fraud_score: fraudResult.score,
        is_blacklisted: fraudResult.isBlacklisted,
        status: fraudResult.shouldBlock ? 'failed' : 'new',
        source: data.source,
        utm_source: data.utm_source,
        utm_medium: data.utm_medium,
        utm_campaign: data.utm_campaign,
        notes: data.notes,
      })
      .select()
      .single()

    if (orderErr || !order) {
      return NextResponse.json({ error: 'فشل في إنشاء الطلب' }, { status: 500 })
    }

    // 8. Insert order items
    await supabase.from('order_items').insert(
      orderItems.map(i => ({ ...i, order_id: order.id, store_id: data.store_id }))
    )

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
      chargily_url: chargilyUrl,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
