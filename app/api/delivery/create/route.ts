// ============================================================
// Create Delivery Parcel API — triggers Yalidine/ZR/Maystro
// Server-side only (CORS blocked on delivery APIs)
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createStoreDeliveryProvider, createParcelWithRetry } from '@/lib/delivery'

const schema = z.object({
  order_id: z.string().uuid(),
  provider: z.enum(['yalidine', 'zrexpress', 'maystro']).optional(),
})

export async function POST(req: Request) {
  const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: (n) => cookieStore.get(n)?.value, set: (n,v,o) => { try { cookieStore.set({name:n,value:v,...o}) } catch {} }, remove: (n,o) => { try { cookieStore.set({name:n,value:'',...o}) } catch {} } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { order_id, provider: providerOverride } = schema.parse(body)

    // Get store + settings
    const { data: store } = await supabase
      .from('stores')
      .select('*, store_settings(*)')
      .eq('owner_id', user.id)
      .single()
    if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

    // Get full order
    const { data: order } = await supabase
      .from('orders')
      .select('*, items:order_items(*), wilaya:wilayas(*), commune:communes(*)')
      .eq('id', order_id)
      .eq('store_id', store.id)
      .single()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const settings = store.store_settings as any
    const providerName = providerOverride ?? settings?.default_delivery_partner ?? 'yalidine'

    // Build delivery config from store settings
    const deliveryConfig = {
      provider: providerName,
      yalidine_api_id: process.env.YALIDINE_API_ID,
      yalidine_api_token: process.env.YALIDINE_API_TOKEN,
      zrexpress_token: process.env.ZREXPRESS_TOKEN,
      zrexpress_key: process.env.ZREXPRESS_KEY,
      maystro_token: process.env.MAYSTRO_TOKEN,
      maystro_store_id: process.env.MAYSTRO_STORE_ID,
      from_wilaya_id: parseInt(process.env.YALIDINE_FROM_WILAYA ?? '16'),
    }

    const deliveryProvider = createStoreDeliveryProvider(deliveryConfig as any)
    if (!deliveryProvider) {
      return NextResponse.json({ error: `${providerName} not configured` }, { status: 400 })
    }

    // Build product list string
    const productList = (order.items as any[])
      .map((i: any) => `${i.product_name} x${i.quantity}`)
      .join(', ')

    const parcel = {
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      phone: order.customer_phone,
      phone2: order.customer_phone2 ?? undefined,
      address: order.address ?? undefined,
      communeId: order.commune_id ?? 1,
      communeName: (order.commune as any)?.name_fr ?? (order.commune as any)?.name_ar ?? '',
      wilayaId: order.wilaya_id,
      wilayaName: (order.wilaya as any)?.name_fr ?? '',
      productList,
      codAmount: order.total,
      isStopDesk: order.delivery_type === 'stopdesk',
      stopDeskId: order.stopdesk_code ?? undefined,
      notes: order.notes ?? undefined,
      storeName: store.name,
      storePhone: store.phone ?? undefined,
    }

    const result = await createParcelWithRetry(deliveryProvider, parcel, { maxAttempts: 2 })

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }

    // Save tracking number to order
    await supabase.from('orders').update({
      tracking_number: result.trackingId,
      delivery_partner: providerName,
      status: 'processing',
    }).eq('id', order_id)

    // Log
    await supabase.from('delivery_logs').insert({
      order_id: order.id,
      store_id: store.id,
      status: 'created',
      description: `Parcel created via ${providerName}`,
      source: 'system',
      metadata: { tracking: result.trackingId, attempts: result.attempts },
    })

    return NextResponse.json({
      ok: true,
      trackingId: result.trackingId,
      provider: result.provider,
      attempts: result.attempts,
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
