// GET /api/delivery/label/[orderId] — return the shipment label URL.
import { NextResponse } from 'next/server'
import { adapterFromRow } from '@/lib/delivery'
import { storeCtx } from '@/lib/delivery/route-helpers'

export async function GET(_req: Request, { params }: { params: { orderId: string } }) {
  const ctx = await storeCtx(); if ('error' in ctx) return ctx.error

  const { data: order } = await ctx.supabase
    .from('orders').select('id, tracking_number, delivery_provider_id, label_url')
    .eq('id', params.orderId).eq('store_id', ctx.store.id).single()
  if (!order?.tracking_number || !order.delivery_provider_id) {
    return NextResponse.json({ error: 'لا توجد شحنة لهذا الطلب' }, { status: 400 })
  }
  if (order.label_url) return NextResponse.json({ ok: true, url: order.label_url })

  const { data: provider } = await ctx.supabase
    .from('delivery_providers').select('*').eq('id', order.delivery_provider_id).single()
  if (!provider) return NextResponse.json({ error: 'الشركة غير موجودة' }, { status: 404 })

  const result = await adapterFromRow(provider).getLabel(order.tracking_number)
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 502 })
  if (result.url) await ctx.supabase.from('orders').update({ label_url: result.url }).eq('id', order.id)
  return NextResponse.json({ ok: true, url: result.url, pdfBase64: result.pdfBase64 })
}
