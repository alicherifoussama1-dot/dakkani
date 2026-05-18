// ============================================================
// Meta Conversions API (CAPI) — Server-Side Events
// POST https://graph.facebook.com/v18.0/{pixelId}/events
// Hashes PII with SHA-256, includes event_id for deduplication
// ============================================================
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'

const META_GRAPH_URL = 'https://graph.facebook.com/v18.0'

// ── SHA-256 hash helper (required by Meta for PII) ────────
function sha256(value: string): string {
  return createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
}

function hashPhone(phone: string): string {
  // Normalize to E.164 Algeria: 0555... → 213555...
  const cleaned = phone.replace(/\D/g, '')
  const normalized = cleaned.startsWith('0')
    ? '213' + cleaned.slice(1)
    : cleaned.startsWith('213')
    ? cleaned
    : '213' + cleaned
  return sha256(normalized)
}

function hashEmail(email: string): string {
  return sha256(email)
}

function hashName(name: string): string {
  return sha256(name.trim().toLowerCase())
}

// ── Request schema ────────────────────────────────────────
const UserDataSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  city: z.string().optional(),
  country: z.string().default('DZ'),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  fbc: z.string().optional(),   // Facebook click ID cookie
  fbp: z.string().optional(),   // Facebook browser ID cookie
})

const EventSchema = z.object({
  pixelId: z.string().min(1),
  accessToken: z.string().optional(), // Falls back to env var
  testEventCode: z.string().optional(),
  eventName: z.enum([
    'PageView', 'ViewContent', 'AddToCart',
    'InitiateCheckout', 'Purchase', 'Lead', 'CompleteRegistration',
  ]),
  eventId: z.string().min(1),          // For deduplication with browser pixel
  eventSourceUrl: z.string().url().optional(),
  userData: UserDataSchema,
  customData: z.object({
    value: z.number().optional(),
    currency: z.string().default('DZD'),
    contentIds: z.array(z.string()).optional(),
    contentName: z.string().optional(),
    contentType: z.string().default('product'),
    orderId: z.string().optional(),
    numItems: z.number().optional(),
  }).optional(),
})

type EventRequest = z.infer<typeof EventSchema>

// ── Build Meta CAPI payload ───────────────────────────────
function buildEventPayload(req: EventRequest, clientIp?: string) {
  const { userData, customData, eventName, eventId, eventSourceUrl } = req

  const hashedUserData: Record<string, string | string[]> = {}

  if (userData.phone) {
    hashedUserData.ph = [hashPhone(userData.phone)]
  }
  if (userData.email) {
    hashedUserData.em = [hashEmail(userData.email)]
  }
  if (userData.firstName) {
    hashedUserData.fn = [hashName(userData.firstName)]
  }
  if (userData.lastName) {
    hashedUserData.ln = [hashName(userData.lastName)]
  }
  if (userData.city) {
    hashedUserData.ct = [sha256(userData.city.trim().toLowerCase())]
  }
  hashedUserData.country = [sha256(userData.country.toLowerCase())]
  if (userData.ip ?? clientIp) {
    hashedUserData.client_ip_address = userData.ip ?? clientIp ?? ''
  }
  if (userData.userAgent) {
    hashedUserData.client_user_agent = userData.userAgent
  }
  if (userData.fbc) hashedUserData.fbc = userData.fbc
  if (userData.fbp) hashedUserData.fbp = userData.fbp

  const event: Record<string, unknown> = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: 'website',
    event_source_url: eventSourceUrl ?? process.env.NEXT_PUBLIC_APP_URL,
    user_data: hashedUserData,
  }

  if (customData) {
    const cd: Record<string, unknown> = {}
    if (customData.value !== undefined) cd.value = customData.value
    if (customData.currency) cd.currency = customData.currency
    if (customData.contentIds) cd.content_ids = customData.contentIds
    if (customData.contentName) cd.content_name = customData.contentName
    if (customData.contentType) cd.content_type = customData.contentType
    if (customData.orderId) cd.order_id = customData.orderId
    if (customData.numItems) cd.num_items = customData.numItems
    event.custom_data = cd
  }

  return event
}

// ── Route handler ─────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = EventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.errors }, { status: 400 })
    }

    const data = parsed.data
    const accessToken = data.accessToken ?? process.env.META_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json({ error: 'Meta access token not configured' }, { status: 500 })
    }

    // Get client IP from headers
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? undefined

    const eventPayload = buildEventPayload(data, clientIp)

    const url = new URL(`${META_GRAPH_URL}/${data.pixelId}/events`)
    url.searchParams.set('access_token', accessToken)
    if (data.testEventCode) {
      url.searchParams.set('test_event_code', data.testEventCode)
    }

    const metaRes = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [eventPayload],
      }),
    })

    const metaData = await metaRes.json()

    if (!metaRes.ok) {
      return NextResponse.json({
        error: 'Meta CAPI error',
        details: metaData,
      }, { status: metaRes.status })
    }

    return NextResponse.json({
      ok: true,
      eventId: data.eventId,
      eventName: data.eventName,
      eventsReceived: metaData.events_received,
      fbtrace_id: metaData.fbtrace_id,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Server error', message: (err as Error).message }, { status: 500 })
  }
}
