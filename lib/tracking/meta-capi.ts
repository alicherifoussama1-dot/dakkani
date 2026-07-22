// ============================================================
// Server-side Meta Conversions API — Purchase helper.
//
// Standalone (does not touch app/api/meta-events/route.ts, which stays the
// client/test path). Fires ONE Purchase event server-side after an order is
// created, using the order UUID as event_id so Meta deduplicates it against
// the browser pixel's Purchase (same eventID). PII is SHA-256 hashed here,
// server-side — tokens never reach the client. Callers must wrap this in
// try/catch and run it AFTER the response (unstable_after) so a Meta failure
// or latency can never affect order creation.
// ============================================================
import { createHash } from 'crypto'

const GRAPH = 'https://graph.facebook.com/v18.0'

const sha256 = (v: string) => createHash('sha256').update(v.trim().toLowerCase()).digest('hex')

function hashPhone(phone: string): string {
  const c = phone.replace(/\D/g, '')
  const n = c.startsWith('0') ? '213' + c.slice(1) : c.startsWith('213') ? c : '213' + c
  return sha256(n)
}

export interface MetaPurchaseInput {
  pixelId: string
  accessToken: string
  eventId: string          // order UUID — MUST match the browser pixel eventID
  value: number
  currency?: string
  contentIds?: string[]
  orderId?: string
  phone?: string
  name?: string
  city?: string
  clientIp?: string
  userAgent?: string
  fbc?: string
  fbp?: string
  sourceUrl?: string
  testEventCode?: string
}

export async function sendMetaPurchase(opts: MetaPurchaseInput): Promise<void> {
  if (!opts.pixelId || !opts.accessToken || !opts.eventId) return

  const ud: Record<string, unknown> = {}
  if (opts.phone) ud.ph = [hashPhone(opts.phone)]
  if (opts.name) {
    const parts = opts.name.trim().split(/\s+/)
    ud.fn = [sha256(parts[0] || '')]
    if (parts.length > 1) ud.ln = [sha256(parts.slice(1).join(' '))]
  }
  if (opts.city) ud.ct = [sha256(opts.city)]
  ud.country = [sha256('dz')]
  if (opts.clientIp) ud.client_ip_address = opts.clientIp
  if (opts.userAgent) ud.client_user_agent = opts.userAgent
  if (opts.fbc) ud.fbc = opts.fbc
  if (opts.fbp) ud.fbp = opts.fbp

  const event: Record<string, unknown> = {
    event_name: 'Purchase',
    event_time: Math.floor(Date.now() / 1000),
    event_id: opts.eventId,
    action_source: 'website',
    event_source_url: opts.sourceUrl,
    user_data: ud,
    custom_data: {
      value: opts.value,
      currency: opts.currency ?? 'DZD',
      content_type: 'product',
      ...(opts.contentIds?.length ? { content_ids: opts.contentIds } : {}),
      ...(opts.orderId ? { order_id: opts.orderId } : {}),
    },
  }

  const url = new URL(`${GRAPH}/${opts.pixelId}/events`)
  url.searchParams.set('access_token', opts.accessToken)
  if (opts.testEventCode) url.searchParams.set('test_event_code', opts.testEventCode)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: [event] }),
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) {
    const t = await res.text().catch(() => '')
    throw new Error(`Meta CAPI ${res.status}: ${t.slice(0, 200)}`)
  }
}
