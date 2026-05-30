import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

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

    // Auto-send to delivery company if status = confirmed AND company has is_automatic
    if (newStatus === 'confirmed') {
      const { data: orderFull } = await supabase
        .from('orders')
        .select('*, delivery_company_id')
        .eq('id', orderId)
        .single()

      if (orderFull?.delivery_company_id) {
        const { data: company } = await supabase
          .from('confirmili_delivery_companies')
          .select('*')
          .eq('id', orderFull.delivery_company_id)
          .maybeSingle()

        if (company?.is_automatic) {
          // Create send report with auto tracking number
          const trackingNum = `${company.short_name}-${Date.now().toString(36).toUpperCase()}`
          await supabase.from('confirmili_send_reports').insert({
            store_id:    order.store_id,
            order_id:    orderId,
            company_id:  company.id,
            tracking_num: trackingNum,
            is_auto:     true,
          })
          await supabase.from('orders')
            .update({ tracking_number: trackingNum })
            .eq('id', orderId)
        }
      }
    }

    return NextResponse.json({ success: true, old_status: oldStatus, new_status: newStatus })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
