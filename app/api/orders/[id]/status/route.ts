import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { adapterFromRow, type CreateOrderData } from '@/lib/delivery'

const schema = z.object({
  status:     z.string().min(1),
  changed_by: z.string().optional().default('system'),
  notes:      z.string().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json()
    const { status: newStatus, changed_by, notes } = schema.parse(body)
    const orderId = params.id

    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (n) => cookieStore.get(n)?.value,
          set: (n, v, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
          remove: (n, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
        },
      }
    )

    // Get current order (verify ownership)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: order } = await supabase
      .from('orders')
      .select('id, status, store_id, order_number, stores!inner(owner_id)')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    if ((order.stores as any).owner_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const oldStatus = order.status

    // Timestamps for key statuses
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString()
    if (newStatus === 'shipped')   updates.shipped_at   = new Date().toISOString()
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString()

    // Update order
    const { error: updateErr } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', orderId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // Insert history entry
    await supabase.from('order_history').insert({
      order_id:   orderId,
      store_id:   order.store_id,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changed_by || user.email?.split('@')[0] || 'system',
      notes,
    })

    // Auto-ship via the unified provider when confirmed AND provider is_automatic.
    if (newStatus === 'confirmed') {
      try {
        const { data: o } = await supabase
          .from('orders')
          .select('*, items:order_items(product_name,quantity), wilaya:wilayas(code,name_ar,name_fr), commune:communes(id,name_fr,name_ar), stores(name,phone)')
          .eq('id', orderId)
          .single()

        if (o?.delivery_provider_id && !o.tracking_number) {
          const { data: provider } = await supabase
            .from('delivery_providers').select('*').eq('id', o.delivery_provider_id).eq('is_automatic', true).maybeSingle()

          if (provider) {
            const dto: CreateOrderData = {
              orderId: o.id, orderNumber: o.order_number,
              customerName: o.customer_name, phone: o.customer_phone, phone2: o.customer_phone2 ?? undefined,
              address: o.address ?? undefined,
              wilayaCode: String((o.wilaya as any)?.code ?? '').padStart(2, '0'),
              wilayaName: (o.wilaya as any)?.name_fr ?? (o.wilaya as any)?.name_ar ?? '',
              communeId: o.commune_id ?? undefined,
              communeName: (o.commune as any)?.name_fr ?? (o.commune as any)?.name_ar ?? '',
              productList: (o.items as any[] ?? []).map(i => `${i.product_name} x${i.quantity}`).join(', ') || 'منتج',
              codAmount: Number(o.total ?? 0),
              deliveryType: o.delivery_type === 'stopdesk' ? 'stopdesk' : 'home',
              stopdeskId: o.stopdesk_code ?? undefined, notes: o.notes ?? undefined,
              fromWilayaCode: provider.from_wilaya_code ?? '16',
              storeName: (o.stores as any)?.name ?? '', storePhone: (o.stores as any)?.phone ?? undefined,
            }
            const result = await adapterFromRow(provider).createShipment(dto)
            if (result.success) {
              await supabase.from('orders').update({
                tracking_number: result.trackingNumber,
                tracking_status: 'pending',
                label_url: result.labelUrl ?? null,
                shipped_at: new Date().toISOString(),
              }).eq('id', orderId)
              await supabase.from('confirmili_send_reports').insert({
                store_id: order.store_id, order_id: orderId,
                tracking_num: result.trackingNumber, is_auto: true,
              }).then(() => {}, () => {})
            }
          }
        }
      } catch { /* auto-ship is best-effort; manual 🚚 remains available */ }
    }

    return NextResponse.json({ success: true, old_status: oldStatus, new_status: newStatus })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
