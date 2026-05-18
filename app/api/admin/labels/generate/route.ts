// ============================================================
// Bulk Label Generation API
// GET /api/admin/labels/generate?ids=id1,id2,id3
// Returns PDF with A4 labels for each order
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: (n) => cookieStore.get(n)?.value, set: (n,v,o) => { try { cookieStore.set({name:n,value:v,...o}) } catch {} }, remove: (n,o) => { try { cookieStore.set({name:n,value:'',...o}) } catch {} } } })
  const { data: { user } } = await supabase.auth.getUser()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const ids = req.nextUrl.searchParams.get('ids')?.split(',').filter(Boolean) ?? []
  if (!ids.length) return NextResponse.json({ error: 'No order IDs' }, { status: 400 })

  const { data: store } = await supabase.from('stores').select('id, name, phone').eq('owner_id', user.id).single()
  if (!store) return NextResponse.json({ error: 'Store not found' }, { status: 404 })

  const { data: orders } = await supabase
    .from('orders')
    .select('*, wilaya:wilayas(name_ar), commune:communes(name_ar), items:order_items(*)')
    .eq('store_id', store.id)
    .in('id', ids)

  if (!orders?.length) return NextResponse.json({ error: 'No orders found' }, { status: 404 })

  // Return order data for client-side label generation
  // (jsPDF must run on client side, this endpoint provides the data)
  return NextResponse.json({
    orders: orders.map(o => ({
      orderNumber:  o.order_number,
      trackingNumber: o.tracking_number,
      createdAt:    o.created_at,
      notes:        o.notes,
      customerName: o.customer_name,
      customerPhone: o.customer_phone,
      wilayaName:   (o.wilaya as any)?.name_ar ?? String(o.wilaya_id),
      communeName:  (o.commune as any)?.name_ar,
      address:      o.address,
      deliveryType: o.delivery_type,
      stopDeskCode: o.stopdesk_code,
      codAmount:    o.total,
      storeName:    store.name,
      storePhone:   store.phone,
      productList:  (o.items as any[])?.map((i: any) => `${i.product_name} ×${i.quantity}`).join(', ') ?? '',
    })),
  })
}
