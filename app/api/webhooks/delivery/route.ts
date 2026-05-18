// ============================================================
// Unified Delivery Webhook
// Handles callbacks from Yalidine, ZR Express, Maystro
// Updates order status + delivery_timeline JSONB
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  YALIDINE_STATUS_MAP,
  ZR_STATUS_MAP,
  MAYSTRO_STATUS_MAP,
  NORMALIZED_TO_ORDER_STATUS,
  WHATSAPP_TEMPLATES,
  type NormalizedStatus,
} from '@/lib/delivery/types'

const supabase = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

// ── Provider detection ────────────────────────────────────
type Provider = 'yalidine' | 'zrexpress' | 'maystro' | 'unknown'

interface NormalizedWebhookPayload {
  trackingId: string
  rawStatus: string
  normalizedStatus: NormalizedStatus
  description?: string
  location?: string
  provider: Provider
  timestamp: string
  raw: unknown
}

function normalizeYalidine(body: Record<string, string>): NormalizedWebhookPayload | null {
  const tracking = body.tracking ?? body.Tracking
  const status = body.status ?? body.situation
  if (!tracking || !status) return null

  return {
    trackingId: tracking,
    rawStatus: status,
    normalizedStatus: (YALIDINE_STATUS_MAP[status] ?? 'exception') as NormalizedStatus,
    description: body.description ?? body.commentaire,
    location: body.commune ?? body.wilaya,
    provider: 'yalidine',
    timestamp: body.date ?? new Date().toISOString(),
    raw: body,
  }
}

function normalizeZRExpress(body: Record<string, string>): NormalizedWebhookPayload | null {
  const tracking = body.Tracking ?? body.tracking
  const status = body.Situation ?? body.situation ?? body.status
  if (!tracking || !status) return null

  return {
    trackingId: tracking,
    rawStatus: status,
    normalizedStatus: (ZR_STATUS_MAP[status] ?? 'exception') as NormalizedStatus,
    description: body.Description ?? body.description,
    location: body.Wilaya ?? body.wilaya,
    provider: 'zrexpress',
    timestamp: body.Date ?? new Date().toISOString(),
    raw: body,
  }
}

function normalizeMaystro(body: Record<string, string>): NormalizedWebhookPayload | null {
  const tracking = body.tracking_code ?? body.id
  const status = body.status
  if (!tracking || !status) return null

  return {
    trackingId: tracking,
    rawStatus: status,
    normalizedStatus: (MAYSTRO_STATUS_MAP[status] ?? 'exception') as NormalizedStatus,
    description: body.description ?? body.note,
    location: body.location,
    provider: 'maystro',
    timestamp: body.updated_at ?? new Date().toISOString(),
    raw: body,
  }
}

function detectAndNormalize(
  body: Record<string, string>,
  providerHint?: string
): NormalizedWebhookPayload | null {
  // Try explicit provider from query param first
  if (providerHint === 'yalidine') return normalizeYalidine(body)
  if (providerHint === 'zrexpress') return normalizeZRExpress(body)
  if (providerHint === 'maystro') return normalizeMaystro(body)

  // Auto-detect by payload shape
  if ('tracking' in body && 'situation' in body) return normalizeYalidine(body)
  if ('Tracking' in body && 'Situation' in body) return normalizeZRExpress(body)
  if ('tracking_code' in body && 'status' in body) return normalizeMaystro(body)

  // Last resort: try each
  return normalizeYalidine(body) ?? normalizeZRExpress(body) ?? normalizeMaystro(body)
}

// ── WhatsApp notification (via Twilio or direct) ──────────
async function sendWhatsAppNotification(
  phone: string,
  orderNumber: string,
  normalizedStatus: NormalizedStatus
): Promise<void> {
  const template = WHATSAPP_TEMPLATES[normalizedStatus]
  if (!template || !process.env.WHATSAPP_API_URL) return

  const message = template.replace('{order_number}', orderNumber)
  const algerianPhone = phone.startsWith('0')
    ? '+213' + phone.slice(1)
    : phone.startsWith('+') ? phone : '+213' + phone

  try {
    await fetch(process.env.WHATSAPP_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.WHATSAPP_API_TOKEN}`,
      },
      body: JSON.stringify({
        to: algerianPhone,
        message,
        type: 'text',
      }),
    })
  } catch {
    // Non-critical — log but don't fail
    console.error(`WhatsApp notification failed for order ${orderNumber}`)
  }
}

// ── Main handler ──────────────────────────────────────────
export async function POST(req: NextRequest) {
  const db = supabase()

  try {
    const providerHint = req.nextUrl.searchParams.get('provider') ?? undefined
    const body = await req.json() as Record<string, string>

    const payload = detectAndNormalize(body, providerHint)
    if (!payload) {
      return NextResponse.json({ error: 'Unrecognized webhook payload' }, { status: 400 })
    }

    // Find order by tracking number
    const { data: order, error: findErr } = await db
      .from('orders')
      .select('id, store_id, order_number, customer_phone, status, delivery_timeline')
      .or(`tracking_number.eq.${payload.trackingId},order_number.eq.${payload.trackingId}`)
      .single()

    if (findErr || !order) {
      return NextResponse.json({ error: 'Order not found', tracking: payload.trackingId }, { status: 404 })
    }

    const newOrderStatus = NORMALIZED_TO_ORDER_STATUS[payload.normalizedStatus]
    const timelineEntry = {
      status: payload.rawStatus,
      normalized: payload.normalizedStatus,
      description: payload.description ?? payload.rawStatus,
      location: payload.location,
      provider: payload.provider,
      timestamp: payload.timestamp,
    }

    const updatedTimeline = [
      ...((order.delivery_timeline as unknown[]) ?? []),
      timelineEntry,
    ]

    // Build update payload
    const updates: Record<string, unknown> = {
      delivery_timeline: updatedTimeline,
      updated_at: new Date().toISOString(),
    }

    // Only update status if it's a meaningful transition
    const STATUS_RANK: Record<string, number> = {
      new: 0, confirmed: 1, processing: 2,
      shipped: 3, delivered: 4, returned: 4, cancelled: 4, failed: 4,
    }
    const currentRank = STATUS_RANK[order.status] ?? 0
    const newRank = STATUS_RANK[newOrderStatus] ?? 0

    if (newRank >= currentRank) {
      updates.status = newOrderStatus
    }

    if (payload.normalizedStatus === 'delivered') {
      updates.delivered_at = payload.timestamp
    } else if (['picked_up', 'in_transit'].includes(payload.normalizedStatus)) {
      if (!order.delivery_timeline?.length) {
        updates.shipped_at = payload.timestamp
      }
    }

    await db.from('orders').update(updates).eq('id', order.id)

    // Insert delivery log
    await db.from('delivery_logs').insert({
      order_id: order.id,
      store_id: order.store_id,
      status: payload.rawStatus,
      description: payload.description,
      location: payload.location,
      source: 'webhook',
      metadata: { provider: payload.provider, raw: payload.raw },
    })

    // Send WhatsApp if status changed
    if (newRank >= currentRank) {
      await sendWhatsAppNotification(
        order.customer_phone,
        order.order_number,
        payload.normalizedStatus
      )
    }

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.order_number,
      newStatus: newOrderStatus,
      normalizedStatus: payload.normalizedStatus,
      provider: payload.provider,
    })
  } catch (err) {
    console.error('Delivery webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Some providers use GET for verification ping
export async function GET(req: NextRequest) {
  const challenge = req.nextUrl.searchParams.get('hub.challenge')
  if (challenge) return new Response(challenge, { status: 200 })
  return NextResponse.json({ status: 'Dakkani delivery webhook active' })
}
