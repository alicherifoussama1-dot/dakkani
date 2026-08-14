// ============================================================
// NEW-ORDER PUSH — gathering the facts and sending the alert.
//
// This lives on its own because TWO callers need identical behaviour and
// they must never drift apart:
//   · app/api/orders/route.ts  — sends inline, the moment the order lands
//   · push.order queue handler — the retry path when that inline send fails
//
// Why inline at all: the job queue is drained by a once-a-day cron, so an
// order alert routed only through the queue reached the merchant at 3am the
// following night. For a "new order" notification that is indistinguishable
// from not working. The queue keeps its real job — surviving a failed send —
// while delivery itself happens immediately.
// ============================================================
import { createServiceClient } from '@/lib/platform/service-client'
import { sendPush, buildNewOrderMessage } from './send'

export type NotifyResult =
  | { ok: true; sent: number; failed: number }
  | { ok: false; reason: 'no-devices' | 'no-order'; sent: 0; failed: 0 }
  | { ok: false; reason: 'send-failed'; error: string; sent: number; failed: number }

/** Algeria is UTC+1 all year — no daylight saving to account for. */
const DZ_OFFSET_MS = 60 * 60 * 1000

/** Midnight in Algiers, expressed as a UTC instant. The merchant's "today"
 *  is their calendar day, not the server's. */
function algiersDayStart(now = new Date()): Date {
  const local = new Date(now.getTime() + DZ_OFFSET_MS)
  const midnightLocal = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate())
  return new Date(midnightLocal - DZ_OFFSET_MS)
}

/**
 * Notify every registered device for a store that an order arrived.
 * Never throws — the caller decides whether a failure is worth retrying.
 */
export async function notifyNewOrder(orderId: string, storeId: string): Promise<NotifyResult> {
  const client = createServiceClient()

  const { data: devices } = await client
    .from('device_tokens')
    .select('token,platform,sound_enabled')
    .eq('store_id', storeId)
    .eq('push_enabled', true)
  if (!devices || devices.length === 0) return { ok: false, reason: 'no-devices', sent: 0, failed: 0 }

  const { data: order } = await client
    .from('orders')
    .select('id,order_number,customer_name,total,wilaya_id,created_at,order_items(quantity,product_name,variant_key,variant_label)')
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return { ok: false, reason: 'no-order', sent: 0, failed: 0 }

  // The merchant counts orders per day ("today's seventh"), but order_number
  // carries a GLOBAL sequence (ABC-250814-1000), so the daily position has to
  // be counted. Bounded by this order's own timestamp so a late-running retry
  // still reports the position the order actually had.
  const { count: dailyNumber } = await client
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .gte('created_at', algiersDayStart(new Date((order as any).created_at)).toISOString())
    .lte('created_at', (order as any).created_at)

  // Badge = the merchant's real backlog of unhandled orders.
  const { count: newCount } = await client
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', storeId)
    .eq('status', 'new')

  let wilayaName: string | null = null
  if ((order as any).wilaya_id) {
    const { data: w } = await client
      .from('wilayas').select('name_ar,name_fr').eq('id', (order as any).wilaya_id).maybeSingle()
    wilayaName = (w as any)?.name_ar ?? (w as any)?.name_fr ?? null
  }

  const items = ((order as any).order_items ?? []) as Array<{
    quantity: number; product_name: string | null
    variant_key: string | null; variant_label: string | null
  }>
  const itemsCount = items.reduce((n, i) => n + (i.quantity ?? 0), 0) || items.length || 1

  const first = items[0]
  const results = await sendPush(
    devices as any[],
    buildNewOrderMessage({
      orderId: (order as any).id,
      orderNumber: (order as any).order_number,
      dailyNumber: dailyNumber ?? undefined,
      customerName: (order as any).customer_name,
      productName: first?.product_name ?? null,
      // variant_label is the human-readable form but the checkout route does
      // not populate it, so variant_key is what actually carries the choice.
      // 'default' is the schema's placeholder for "this product has no
      // variants" and must not be shown to anyone.
      variantLabel: first?.variant_label ?? (first?.variant_key === 'default' ? null : first?.variant_key ?? null),
      itemsCount,
      total: Number((order as any).total ?? 0),
      wilayaName,
      badge: newCount ?? undefined,
    }),
  )

  // Prune registrations the platforms told us are permanently dead.
  const stale = results.filter(r => r.stale).map(r => r.token)
  if (stale.length) await client.from('device_tokens').delete().in('token', stale)

  const sent = results.filter(r => r.ok).length
  // "not configured" is staging without push keys — quiet, not broken.
  const hardFailed = results.filter(r => !r.ok && !r.stale && !/not configured/i.test(r.error ?? ''))
  if (hardFailed.length === results.length && results.length > 0) {
    return { ok: false, reason: 'send-failed', error: hardFailed[0].error ?? 'unknown', sent, failed: hardFailed.length }
  }
  return { ok: true, sent, failed: hardFailed.length }
}
