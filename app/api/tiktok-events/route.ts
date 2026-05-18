// ============================================================
// TikTok Events API — Server-Side Events
// POST https://business-api.tiktok.com/open_api/v1.3/pixel/track/
// SHA-256 hashed PII, event_id deduplication with browser pixel
// ============================================================
import { NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { z } from 'zod'

const TIKTOK_API_URL = 'https://business-api.tiktok.com/open_api/v1.3/pixel/track/'

// ── Hashing helpers ───────────────────────────────────────
function sha256(value: string): string {
  return createHash('sha256')
    .update(value.trim().toLowerCase())
    .digest('hex')
}

function hashPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  const normalized = cleaned.startsWith('0')
    ? '213' + cleaned.slice(1)
    : cleaned.startsWith('213')
    ? cleaned
    : '213' + cleaned
  return sha256(normalized)
}

// ── Request schema ────────────────────────────────────────
const UserDataSchema = z.object({
  phone: z.string().optional(),
  email: z.string().email().optional(),
  externalId: z.string().optional(),  // hashed user ID
  ttclid: z.string().optional(),       // TikTok click ID
  ip: z.string().optional(),
  userAgent: z.string().optional(),
  locale: z.string().default('ar-DZ'),
})

const EventSchema = z.object({
  pixelId: z.string().min(1),
  accessToken: z.string().optional(), // Falls back to env var
  testEventCode: z.string().optional(),
  eventName: z.enum([
    'PageView',
    'ViewContent',
    'AddToCart',
    'InitiateCheckout',
    'PlaceAnOrder',
    'CompletePayment',
    'SubmitForm',
    'Search',
    'Subscribe',
  ]),
  eventId: z.string().min(1),
  eventSourceUrl: z.string().url().optional(),
  timestamp: z.string().optional(),
  userData: UserDataSchema,
  properties: z.object({
    value: z.number().optional(),
    currency: z.string().default('DZD'),
    contentId: z.string().optional(),
    contentName: z.string().optional(),
    contentType: z.string().default('product'),
    contentCategory: z.string().optional(),
    orderId: z.string().optional(),
    quantity: z.number().optional(),
    searchString: z.string().optional(),
    description: z.string().optional(),
  }).optional(),
})

type EventRequest = z.infer<typeof EventSchema>

// ── Build TikTok event payload ────────────────────────────
function buildPayload(data: EventRequest, clientIp?: string) {
  const { userData, properties, eventName, eventId, eventSourceUrl, timestamp } = data

  // Build user context
  const userContext: Record<string, string | undefined> = {}

  if (userData.phone) {
    userContext.phone_number = hashPhone(userData.phone)
  }
  if (userData.email) {
    userContext.email = sha256(userData.email)
  }
  if (userData.externalId) {
    userContext.external_id = sha256(userData.externalId)
  }
  if (userData.ttclid) {
    userContext.ttclid = userData.ttclid
  }
  if (userData.ip ?? clientIp) {
    userContext.ip = userData.ip ?? clientIp
  }
  if (userData.userAgent) {
    userContext.user_agent = userData.userAgent
  }
  if (userData.locale) {
    userContext.locale = userData.locale
  }

  // Build content properties
  const props: Record<string, unknown> = {}
  if (properties) {
    if (properties.value !== undefined) props.value = String(properties.value)
    if (properties.currency) props.currency = properties.currency
    if (properties.contentId) {
      props.contents = [{
        content_id: properties.contentId,
        content_type: properties.contentType,
        content_name: properties.contentName,
        quantity: properties.quantity ?? 1,
        price: properties.value,
      }]
    }
    if (properties.orderId) props.order_id = properties.orderId
    if (properties.description) props.description = properties.description
    if (properties.searchString) props.query = properties.searchString
  }

  return {
    pixel_code: data.pixelId,
    test_event_code: data.testEventCode,
    event: {
      event: eventName,
      event_time: timestamp
        ? Math.floor(new Date(timestamp).getTime() / 1000)
        : Math.floor(Date.now() / 1000),
      event_id: eventId,
      event_source: 'web',
      page: {
        url: eventSourceUrl ?? process.env.NEXT_PUBLIC_APP_URL,
      },
      user: userContext,
      properties: Object.keys(props).length > 0 ? props : undefined,
    },
  }
}

// ── Route handler ─────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const parsed = EventSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.errors },
        { status: 400 }
      )
    }

    const data = parsed.data
    const accessToken = data.accessToken ?? process.env.TIKTOK_ACCESS_TOKEN

    if (!accessToken) {
      return NextResponse.json({ error: 'TikTok access token not configured' }, { status: 500 })
    }

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      ?? req.headers.get('x-real-ip')
      ?? undefined

    const payload = buildPayload(data, clientIp)

    const ttRes = await fetch(TIKTOK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Access-Token': accessToken,
      },
      body: JSON.stringify(payload),
    })

    const ttData = await ttRes.json()

    if (!ttRes.ok || ttData.code !== 0) {
      return NextResponse.json({
        error: 'TikTok Events API error',
        code: ttData.code,
        message: ttData.message,
        details: ttData,
      }, { status: ttRes.ok ? 400 : ttRes.status })
    }

    return NextResponse.json({
      ok: true,
      eventId: data.eventId,
      eventName: data.eventName,
      requestId: ttData.request_id,
    })
  } catch (err) {
    return NextResponse.json(
      { error: 'Server error', message: (err as Error).message },
      { status: 500 }
    )
  }
}
