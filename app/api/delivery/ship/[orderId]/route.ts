// POST /api/delivery/ship/[orderId]
// Resolves the provider (explicit → wilaya routing → first active),
// creates the shipment, stores tracking + label + unified status.
import { NextResponse } from 'next/server'
import { adapterFromRow, normalizeStatus, UNIFIED_TO_ORDER_STATUS } from '@/lib/delivery'
import type { CreateOrderData } from '@/lib/delivery'
import { storeCtx } from '@/lib/delivery/route-helpers'

export async function POST(req: Request, { params }: { params: { orderId: string } }) {
  const ctx = await storeCtx(); if ('error' in ctx) return ctx.error
  const body = await req.json().catch(() => ({}))

  const { data: order } = await ctx.supabase
    .from('orders')
    .select('*, items:order_items(product_name,quantity), wilaya:wilayas(code,name_ar,name_fr), commune:communes(id,name_fr,name_ar)')
    .eq('id', params.orderId).eq('store_id', ctx.store.id).single()
  if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })

  const wilayaCode = String((order.wilaya as any)?.code ?? '').padStart(2, '0')

  // Resolve provider: explicit body → existing on order → wilaya routing → first active
  let providerId: string | undefined = body.provider_id ?? order.delivery_provider_id ?? undefined
  if (!providerId && wilayaCode) {
    const { data: map } = await ctx.supabase.from('wilaya_company_map')
      .select('provider_id').eq('store_id', ctx.store.id).eq('wilaya_code', wilayaCode).maybeSingle()
    providerId = map?.provider_id
  }
  let provider
  if (providerId) {
    const { data } = await ctx.supabase.from('delivery_providers').select('*').eq('id', providerId).eq('store_id', ctx.store.id).single()
    provider = data
  } else {
    const { data } = await ctx.supabase.from('delivery_providers').select('*').eq('store_id', ctx.store.id).eq('is_active', true).order('created_at').limit(1).maybeSingle()
    provider = data
  }
  if (!provider) return NextResponse.json({ error: 'لا توجد شركة توصيل مُفعّلة' }, { status: 400 })

  const dto: CreateOrderData = {
    orderId: order.id,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    phone: order.customer_phone,
    phone2: order.customer_phone2 ?? undefined,
    address: order.address ?? undefined,
    wilayaCode,
    wilayaName: (order.wilaya as any)?.name_fr ?? (order.wilaya as any)?.name_ar ?? '',
    communeId: order.commune_id ?? undefined,
    communeName: (order.commune as any)?.name_fr ?? (order.commune as any)?.name_ar ?? '',
    productList: (order.items as any[] ?? []).map(i => `${i.product_name} x${i.quantity}`).join(', ') || 'منتج',
    codAmount: Number(order.total ?? 0),
    deliveryType: order.delivery_type === 'stopdesk' ? 'stopdesk' : 'home',
    stopdeskId: order.stopdesk_code ?? undefined,
    notes: order.notes ?? undefined,
    fromWilayaCode: provider.from_wilaya_code ?? '16',
    storeName: ctx.store.name,
    storePhone: ctx.store.phone ?? undefined,
  }

  const result = await adapterFromRow(provider).createShipment(dto)
  if (!result.success) {
    // Record the failed attempt so it surfaces in تقرير الإرسال.
    await ctx.supabase.from('confirmili_send_reports').insert({
      store_id: ctx.store.id, order_id: order.id, tracking_num: null, is_auto: false, status: 'failed',
    }).then(() => {}, () => {})
    return NextResponse.json({ error: result.error ?? 'فشل إنشاء الشحنة' }, { status: 502 })
  }

  const unified = 'pending'
  await ctx.supabase.from('orders').update({
    delivery_provider_id: provider.id,
    tracking_number: result.trackingNumber,
    tracking_status: unified,
    label_url: result.labelUrl ?? null,
    status: UNIFIED_TO_ORDER_STATUS[unified],
    shipped_at: new Date().toISOString(),
  }).eq('id', order.id)

  await ctx.supabase.from('delivery_logs').insert({
    order_id: order.id, store_id: ctx.store.id, status: 'created',
    source: 'system', metadata: { provider: provider.provider_type, tracking: result.trackingNumber },
  }).then(() => {}, () => {})

  // Surface the send in تقرير الإرسال (confirmili_send_reports).
  await ctx.supabase.from('confirmili_send_reports').insert({
    store_id: ctx.store.id, order_id: order.id,
    tracking_num: result.trackingNumber, is_auto: false, status: 'sent',
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, trackingNumber: result.trackingNumber, labelUrl: result.labelUrl, provider: provider.display_name })
}
