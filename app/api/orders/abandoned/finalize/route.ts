// ============================================================
// POST /api/orders/abandoned/finalize — beacon endpoint.
//
// Fired by navigator.sendBeacon on pagehide/visibilitychange when the
// customer leaves without completing the order. Makes abandonment
// INSTANT: the draft (already status 'abandoned') gets its activity
// stamped and — when the PRODUCT's «ترسل» toggle is ON — is pushed to
// the Google Sheet immediately in this request. The queue job remains
// the retry fallback only; nothing waits for the daily cron anymore.
//
// sendBeacon can't read responses, so this always answers quickly and
// never leaks details.
// ============================================================
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createPublicClient } from '@/lib/supabase/public'
import { checkRateLimit, rateLimitResponse } from '@/lib/platform/rate-limit'
import { getClientInfo } from '@/lib/platform/security'
import { pushAbandonedDraftToSheet } from '@/lib/orders/abandoned-sheet'
import { enqueue } from '@/lib/platform/queue'

const schema = z.object({
  draft_id: z.string().uuid(),
  store_id: z.string().uuid(),
})

export async function POST(req: Request) {
  try {
    const client = getClientInfo(req)
    const rl = checkRateLimit(`abandoned-fin:${client.ip}`, { limit: 30, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl)

    // sendBeacon may deliver text/plain — parse the raw body ourselves.
    const raw = await req.text()
    const data = schema.parse(JSON.parse(raw || '{}'))

    const supabase = createPublicClient()
    const { data: draft } = await supabase.from('orders')
      .select('id, status, store_id')
      .eq('id', data.draft_id).eq('store_id', data.store_id)
      .eq('status', 'abandoned')
      .maybeSingle()
    if (!draft) return NextResponse.json({ ok: true, skipped: true }) // converted or unknown — done

    await supabase.from('orders')
      .update({ abandoned_last_activity: new Date().toISOString() })
      .eq('id', draft.id)

    // INSTANT sheet push (per-product toggle checked inside). A failure
    // falls back to the retry queue — never blocks the beacon response.
    const res = await pushAbandonedDraftToSheet(draft.id)
    if (!res.ok) {
      console.error('[abandoned/finalize] instant push failed, queuing retry:', res.error)
      await enqueue('abandoned.sheet', { orderId: draft.id }, { storeId: draft.store_id })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof z.ZodError || err instanceof SyntaxError) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }
    console.error('[abandoned/finalize] unexpected failure:', (err as Error)?.message ?? err)
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
