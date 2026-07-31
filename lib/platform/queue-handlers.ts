// ============================================================
// QUEUE HANDLERS + EVENT SUBSCRIPTIONS — the wiring hub.
//
// Import `initPlatformRuntime()` once in any worker entry point
// (cron routes) before calling processQueue(). Handlers are
// isolated: each runs in its own job with its own retries.
//
// To add a new side effect for an event:
//   1. registerHandler('my.job', handler)
//   2. subscribe('order.created', 'my.job')
// Nothing else changes — the emitter stays untouched.
// ============================================================
import { registerHandler, type Job } from './queue'
import { subscribe } from './events'
import { createServiceClient } from './service-client'
import { safe } from './resilience'
import { safeFetch } from './security'

let initialized = false

export function initPlatformRuntime(): void {
  if (initialized) return
  initialized = true

  // ── sheets.push: (re)deliver an order to the merchant's Google Sheet.
  // Checkout still pushes synchronously (unchanged behavior); this job is
  // the RETRY path enqueued when that push fails, so orders are never lost.
  registerHandler('sheets.push', async (job: Job) => {
    const orderId = job.payload.orderId as string
    if (!orderId) throw new Error('sheets.push: missing orderId')

    const client = createServiceClient()
    const { data: order } = await client.from('orders')
      .select('*, order_items(*)')
      .eq('id', orderId).maybeSingle()
    if (!order) return // order deleted — nothing to deliver

    const items = (order.order_items ?? []) as any[]
    const firstProductId = items[0]?.product_id
    if (!firstProductId) return

    const { resolveRouting, pushOrderToSheet, markOrderRouting } = await import('@/lib/orders/route-order')
    const { routing, sheetId } = await resolveRouting({ storeId: order.store_id, firstProductId })
    if (routing === 'confirmili_only' || !sheetId) {
      await markOrderRouting(orderId, { routed_to: 'confirmili' })
      return
    }

    // Sheets receive FRENCH names only — same rule as the synchronous push.
    const { formatCommuneFrench } = await import('@/lib/algeria-baladias')
    const frCommune = order.delivery_type === 'stopdesk'
      ? (order.stopdesk_commune_fr ?? formatCommuneFrench(order.wilaya_id, order.baladia))
      : formatCommuneFrench(order.wilaya_id, order.baladia)

    const res = await pushOrderToSheet({
      storeId: order.store_id,
      sheetId,
      order: {
        order_number: order.order_number,
        created_at: order.created_at,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        wilaya_name: order.wilaya_name ?? order.wilaya ?? '',
        baladia: frCommune ?? null,
        address: order.address ?? null,
        delivery_type: order.delivery_type ?? null,
        delivery_fee: order.delivery_fee ?? 0,
        discount_amount: order.discount_amount ?? 0,
        total: order.total ?? 0,
        notes: order.notes ?? null,
        status: order.status ?? 'pending',
        source: order.source ?? null,
      },
      items: items.map(i => ({
        product_name: i.product_name ?? '',
        sku: i.sku ?? null,
        variant_key: i.variant_key ?? 'default',
        quantity: i.quantity ?? 1,
        unit_price: i.unit_price ?? 0,
      })),
    })
    if (!res.ok) throw new Error(res.error) // → queue retries with backoff
    await markOrderRouting(orderId, {
      routed_to: routing === 'both' ? 'both' : 'sheet',
      sheet_status: 'sent',
      sheet_error: null,
    })
  })

  // ── abandoned.sheet: FALLBACK/RETRY only. The instant path is the
  // /api/orders/abandoned/finalize beacon (customer leaves → immediate push).
  // This job covers browsers where the beacon never fired: it waits for the
  // short abandonment window, then delegates to the same shared push
  // (per-PRODUCT «ترسل» toggle + sheet_status claim → never a double push).
  registerHandler('abandoned.sheet', async (job: Job) => {
    const orderId = job.payload.orderId as string
    if (!orderId) throw new Error('abandoned.sheet: missing orderId')

    const client = createServiceClient()
    const { data: order } = await client.from('orders')
      .select('id, store_id, status, created_at, abandoned_last_activity')
      .eq('id', orderId).maybeSingle()
    if (!order) return                       // converted → draft deleted → done
    if (order.status !== 'abandoned') return // converted/handled → done

    const { data: settings } = await client.from('store_settings')
      .select('abandoned_window_minutes')
      .eq('store_id', order.store_id).maybeSingle()
    const windowMin = settings?.abandoned_window_minutes ?? 5
    const lastActivity = new Date(order.abandoned_last_activity ?? order.created_at).getTime()
    if (Date.now() - lastActivity < windowMin * 60_000) {
      throw new Error('abandoned draft not matured yet — retry later')
    }

    const { pushAbandonedDraftToSheet } = await import('@/lib/orders/abandoned-sheet')
    const res = await pushAbandonedDraftToSheet(orderId)
    if (!res.ok) throw new Error(res.error) // → queue retries with backoff
  })

  // ── webhook.deliver: merchant webhook with SSRF guard ──
  registerHandler('webhook.deliver', async (job: Job) => {
    const { url, body } = job.payload as { url?: string; body?: unknown }
    if (!url) throw new Error('webhook.deliver: missing url')
    const res = await safeFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'Commerco-Webhooks/1.0' },
      body: JSON.stringify(body ?? {}),
    })
    if (!res.ok && res.status !== 410) throw new Error(`webhook target returned ${res.status}`)
  })

  // ── email.send: transactional email (Resend when configured, else no-op).
  // Enabling a provider later is a handler-body change only.
  registerHandler('email.send', async (job: Job) => {
    const message = job.payload.message as Record<string, unknown> | undefined
    if (!process.env.RESEND_API_KEY || !message) {
      console.log('[email.send] provider not configured or empty message — skipping')
      return
    }
    const result = await safe('email', async () => {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })
      if (!res.ok) throw new Error(`resend returned ${res.status}`)
    }, { timeoutMs: 10_000 })
    if (!result.ok && !result.skipped) throw new Error(result.error)
  })

  // ── whatsapp.send: placeholder until a provider is connected ──
  registerHandler('whatsapp.send', async (job: Job) => {
    console.log('[whatsapp.send] no provider configured — skipping', job.payload.to ?? '')
  })

  // ── tracking.push: deferred/retried server-side conversion events ──
  registerHandler('tracking.push', async (job: Job) => {
    const { endpoint, body } = job.payload as { endpoint?: string; body?: unknown }
    if (!endpoint) return
    const result = await safe('tracking', async () => {
      const res = await safeFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body ?? {}),
      })
      if (!res.ok) throw new Error(`tracking endpoint returned ${res.status}`)
    }, { timeoutMs: 10_000 })
    if (!result.ok && !result.skipped) throw new Error(result.error)
  })

  // ── push.order: native push to the merchant's mobile devices.
  // Runs as an isolated job so a dead push provider can never slow down or
  // fail order creation. Reads only; touches no tracking/checkout code.
  registerHandler('push.order', async (job: Job) => {
    const orderId = job.payload.orderId as string
    const storeId = (job.payload.storeId ?? job.store_id) as string
    if (!orderId || !storeId) return

    const client = createServiceClient()

    const { data: devices } = await client
      .from('device_tokens')
      .select('token,platform,sound_enabled')
      .eq('store_id', storeId)
      .eq('push_enabled', true)
    if (!devices || devices.length === 0) return // nobody to notify

    const { data: order } = await client
      .from('orders')
      .select('id,order_number,customer_name,total,wilaya_id,order_items(quantity)')
      .eq('id', orderId)
      .maybeSingle()
    if (!order) return // order deleted before the job ran

    // Badge = the merchant's real backlog of unhandled orders.
    const { count: newCount } = await client
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId)
      .eq('status', 'new')

    let wilayaName: string | null = null
    if (order.wilaya_id) {
      const { data: w } = await client
        .from('wilayas').select('name_ar,name_fr').eq('id', order.wilaya_id).maybeSingle()
      wilayaName = (w as any)?.name_ar ?? (w as any)?.name_fr ?? null
    }

    const items = ((order as any).order_items ?? []) as Array<{ quantity: number }>
    const itemsCount = items.reduce((n, i) => n + (i.quantity ?? 0), 0) || items.length || 1

    const { sendPush, buildNewOrderMessage } = await import('@/lib/push/send')
    const results = await sendPush(
      devices as any[],
      buildNewOrderMessage({
        orderId: order.id,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        itemsCount,
        total: Number(order.total ?? 0),
        wilayaName,
        badge: newCount ?? undefined,
      }),
    )

    // Prune registrations the platforms told us are permanently dead.
    const stale = results.filter(r => r.stale).map(r => r.token)
    if (stale.length) await client.from('device_tokens').delete().in('token', stale)

    // Surface a real failure so the queue retries with backoff; ignore the
    // "not configured" case so staging without push keys stays quiet.
    const hardFailed = results.filter(r => !r.ok && !r.stale && !/not configured/i.test(r.error ?? ''))
    if (hardFailed.length === results.length && results.length > 0) {
      throw new Error(`push.order: all sends failed — ${hardFailed[0].error}`)
    }
  })

  // ── Event subscriptions: order.created fans out to independent jobs.
  // (sheets.push is deliberately NOT subscribed here — checkout pushes
  // synchronously and enqueues sheets.push itself only on failure,
  // avoiding double delivery.)
  subscribe('order.created', 'email.send')
  subscribe('order.created', 'whatsapp.send')
  subscribe('order.created', 'push.order')

  // ── Plugins register here (see lib/platform/plugins.ts) ──
  // Example: registerPlugin(tiktokShopPlugin)
}
