// ============================================================
// Unified Delivery Webhook — courier status callbacks.
// Extracts {tracking, status} from any provider payload shape,
// normalizes the status, updates the order (status + tracking_status
// + delivery_timeline) and logs it. Optional WhatsApp notify.
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { normalizeStatus, UNIFIED_TO_ORDER_STATUS, UNIFIED_STATUS_LABEL, type UnifiedStatus } from '@/lib/delivery/types'

const supabase = () =>
  createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

const WHATSAPP_TEMPLATES: Partial<Record<UnifiedStatus, string>> = {
  picked_up:        'تم استلام طلبك رقم {n} وهو في طريقه إليك 📦',
  in_transit:       'طلبك رقم {n} في الطريق إليك 🚚',
  out_for_delivery: 'طلبك رقم {n} خرج للتوصيل اليوم، كن جاهزاً! 🎯',
  delivered:        'تم تسليم طلبك رقم {n} بنجاح ✅ شكراً لتسوقك معنا!',
  returned:         'تعذر تسليم طلبك رقم {n}، سيتم الاتصال بك قريباً 📞',
  exception:        'هناك مشكلة في تسليم طلبك رقم {n}، سيتصل بك فريقنا 📞',
}

function extract(body: Record<string, any>): { tracking?: string; status?: string; location?: string; at?: string } {
  return {
    tracking: body.tracking ?? body.Tracking ?? body.tracking_code ?? body.tracking_number ?? body.id,
    status:   body.status ?? body.situation ?? body.Situation ?? body.last_status ?? body.event,
    location: body.commune ?? body.wilaya ?? body.Wilaya ?? body.location,
    at:       body.date ?? body.Date ?? body.updated_at ?? body.created_at ?? new Date().toISOString(),
  }
}

async function notifyWhatsApp(phone: string, orderNumber: string, status: UnifiedStatus) {
  const tpl = WHATSAPP_TEMPLATES[status]
  if (!tpl || !process.env.WHATSAPP_API_URL) return
  const to = phone.startsWith('0') ? '+213' + phone.slice(1) : phone.startsWith('+') ? phone : '+213' + phone
  try {
    await fetch(process.env.WHATSAPP_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}` },
      body: JSON.stringify({ to, message: tpl.replace('{n}', orderNumber), type: 'text' }),
    })
  } catch { /* non-critical */ }
}

export async function POST(req: NextRequest) {
  const db = supabase()
  try {
    const providerHint = req.nextUrl.searchParams.get('provider') ?? undefined
    const body = await req.json() as Record<string, any>
    const { tracking, status, location, at } = extract(body)
    if (!tracking || !status) {
      return NextResponse.json({ error: 'Unrecognized webhook payload' }, { status: 400 })
    }

    const unified = normalizeStatus(status)
    const orderStatus = UNIFIED_TO_ORDER_STATUS[unified]

    const { data: order } = await db
      .from('orders')
      .select('id, store_id, order_number, customer_phone, status, delivery_timeline')
      .or(`tracking_number.eq.${tracking},order_number.eq.${tracking}`)
      .single()
    if (!order) return NextResponse.json({ error: 'Order not found', tracking }, { status: 404 })

    const timeline = [
      ...((order.delivery_timeline as unknown[]) ?? []),
      { status, normalized: unified, label: UNIFIED_STATUS_LABEL[unified], location, provider: providerHint, at },
    ]

    const RANK: Record<string, number> = { new: 0, confirmed: 1, processing: 2, in_transit: 3, out_for_delivery: 3, shipped: 3, delivered: 4, returned: 4, cancelled: 4, exception: 4 }
    const updates: Record<string, unknown> = {
      delivery_timeline: timeline,
      tracking_status: unified,
      updated_at: new Date().toISOString(),
    }
    if ((RANK[orderStatus] ?? 0) >= (RANK[order.status] ?? 0)) updates.status = orderStatus
    if (unified === 'delivered') updates.delivered_at = at

    await db.from('orders').update(updates).eq('id', order.id)
    await db.from('delivery_logs').insert({
      order_id: order.id, store_id: order.store_id, status, location,
      source: 'webhook', metadata: { provider: providerHint, unified, raw: body },
    }).then(() => {}, () => {})

    await notifyWhatsApp(order.customer_phone, order.order_number, unified)

    return NextResponse.json({ ok: true, orderId: order.id, status: orderStatus, unified })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get('hub.challenge')
  if (challenge) return new Response(challenge, { status: 200 })
  return NextResponse.json({ status: 'Dakkani delivery webhook active' })
}
