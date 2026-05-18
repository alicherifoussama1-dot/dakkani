import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const STATUS_MAP: Record<string, string> = {
  'En attente': 'new',
  'Ramassé': 'processing',
  'En transit': 'shipped',
  'Sorti en livraison': 'shipped',
  'Livré': 'delivered',
  'Retour': 'returned',
  'Annulé': 'cancelled',
}

export async function POST(req: Request) {
  // Initialize inside handler so env vars are available at runtime, not build time
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const body = await req.json()
    const { tracking, status, description, location } = body

    if (!tracking) return NextResponse.json({ ok: false }, { status: 400 })

    const { data: order } = await supabase
      .from('orders')
      .select('id, store_id, delivery_timeline')
      .eq('tracking_number', tracking)
      .single()

    if (!order) return NextResponse.json({ ok: false }, { status: 404 })

    const newStatus = STATUS_MAP[status]
    const timeline = [...((order.delivery_timeline as any[]) ?? []), {
      status,
      description,
      location,
      timestamp: new Date().toISOString(),
    }]

    const updates: Record<string, any> = { delivery_timeline: timeline }
    if (newStatus) {
      updates.status = newStatus
      if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString()
      if (newStatus === 'shipped') updates.shipped_at = new Date().toISOString()
    }

    await supabase.from('orders').update(updates).eq('id', order.id)
    await supabase.from('delivery_logs').insert({
      order_id: order.id,
      store_id: order.store_id,
      status,
      description,
      location,
      source: 'webhook',
      metadata: body,
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
