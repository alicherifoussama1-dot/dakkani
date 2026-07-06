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

    await audit({ action: 'queue.worker_heartbeat', metadata: totals })
    return NextResponse.json({ ok: true, ...totals })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    await audit({ action: 'queue.worker_error', metadata: { message }, severity: 'critical' })
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
