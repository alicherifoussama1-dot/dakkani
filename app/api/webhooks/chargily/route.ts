// ============================================================
// Chargily Pay Webhook
// Handles payment success/failure callbacks
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { ChargilyWebhookPayload } from '@/lib/payment/chargily'

const supabase = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const db = supabase()

  try {
    const rawBody  = await req.text()
    const signature = req.headers.get('signature') ?? ''
    const secret    = process.env.CHARGILY_SECRET_KEY ?? ''

    // Verify signature
    if (secret) {
      const crypto  = await import('crypto')
      const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
      if (expected !== signature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload: ChargilyWebhookPayload = JSON.parse(rawBody)
    const orderId = payload.metadata?.order_id

    if (!orderId) return NextResponse.json({ ok: true, skipped: 'no order_id' })

    const { data: order } = await db
      .from('orders')
      .select('id, store_id, order_number, customer_phone')
      .eq('id', orderId)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    if (payload.status === 'paid') {
      await db.from('orders').update({
        payment_status: 'paid',
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
      }).eq('id', orderId)

      // Send confirmation WhatsApp
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications/whatsapp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone:       order.customer_phone,
          orderNumber: order.order_number,
          customerName: 'عميلنا',
          total:       payload.amount,
          storeName:   'Commerco',
          type:        'order_confirmed',
        }),
      }).catch(() => {})

    } else if (payload.status === 'failed') {
      await db.from('orders').update({ payment_status: 'failed' }).eq('id', orderId)
    }

    return NextResponse.json({ ok: true, status: payload.status })
  } catch (err) {
    console.error('Chargily webhook error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
