// GET /api/delivery/track/[orderId] — sync unified status from courier.
import { NextResponse } from 'next/server'
import { adapterFromRow, UNIFIED_TO_ORDER_STATUS } from '@/lib/delivery'
import { storeCtx } from '@/lib/delivery/route-helpers'

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const ctx = await storeCtx(); if ('error' in ctx) return ctx.error

  const { data: order } = await ctx.supabase
    .from('orders').select('id, tracking_number, delivery_provider_id, status')
    .eq('id', params.orderId).eq('store_id', ctx.store.id).single()
  if (!order) return NextResponse.json({ error: 'الطلب غير موجود' }, { status: 404 })
  if (!order.tracking_number || !order.delivery_provider_id) {
    return NextResponse.json({ error: 'لا توجد شحنة لهذا الطلب' }, { status: 400 })
  }

  const { data: provider } = await ctx.supabase
    .from('delivery_providers').select('*').eq('id', order.delivery_provider_id).single()
  if (!provider) return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 })

  const result = await adapterFromRow(provider).getTracking(order.tracking_number)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 })

  const orderStatus = result.status ? UNIFIED_TO_ORDER_STATUS[result.status] : order.status
  await ctx.supabase.from('orders').update({
    tracking_status: result.status,
    status: orderStatus,
    ...(result.status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
    updated_at: new Date().toISOString(),
  }).eq('id', order.id)

  return NextResponse.json({ ok: true, status: result.status, rawStatus: result.rawStatus, events: result.events ?? [] })
}
