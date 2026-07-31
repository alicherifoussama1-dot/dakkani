// Queue worker — claims due jobs and runs their handlers.
// Invoked by Vercel Cron (and callable manually by platform staff with the
// cron secret). Each run also writes a heartbeat so Platform Health can
// detect a stalled worker.
export const dynamic = 'force-dynamic'
export const maxDuration = 60

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { processQueue } from '@/lib/platform/queue'
import { initPlatformRuntime } from '@/lib/platform/queue-handlers'
import { audit } from '@/lib/platform/audit'
import { createServiceClient } from '@/lib/platform/service-client'

/** Heartbeats are the worker-liveness signal for Platform Health, but this
 *  endpoint is now called every few minutes rather than once a day. Writing
 *  an audit row on every idle run would add hundreds of rows a day and bury
 *  real audit entries, so idle runs only heartbeat this often. Runs that
 *  actually did work always heartbeat. */
const IDLE_HEARTBEAT_MINUTES = 10

async function shouldHeartbeat(didWork: boolean): Promise<boolean> {
  if (didWork) return true
  try {
    const client = createServiceClient()
    const { data } = await client.from('audit_logs')
      .select('created_at').eq('action', 'queue.worker_heartbeat')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!data) return true
    return Date.now() - new Date(data.created_at).getTime() >= IDLE_HEARTBEAT_MINUTES * 60_000
  } catch {
    return true // never suppress the liveness signal because of a read error
  }
}

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  initPlatformRuntime()

  try {
    // Drain in batches until the time budget (~50s of the 60s limit) is spent.
    const deadline = Date.now() + 50_000
    let totals = { processed: 0, failed: 0, recovered: 0 }
    while (Date.now() < deadline) {
      const batch = await processQueue(10)
      totals = {
        processed: totals.processed + batch.processed,
        failed: totals.failed + batch.failed,
        recovered: totals.recovered + batch.recovered,
      }
      if (batch.processed + batch.failed === 0) break // queue drained
    }

    const didWork = totals.processed + totals.failed + totals.recovered > 0
    if (await shouldHeartbeat(didWork)) {
      await audit({ action: 'queue.worker_heartbeat', metadata: totals })
    }
    return NextResponse.json({ ok: true, ...totals })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await audit({ action: 'queue.worker_error', metadata: { message }, severity: 'critical' })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
