// ============================================================
// JOB QUEUE — Postgres-backed async work.
//
// Heavy or fragile side effects (email, WhatsApp, tracking,
// webhooks, Confirmili, AI) never run inline in a request.
// Enqueue them; the worker (app/api/cron/process-queue) claims
// jobs atomically (FOR UPDATE SKIP LOCKED) and retries with
// exponential backoff until max_attempts, then marks them dead.
//
// Register handlers in lib/platform/queue-handlers.ts — one
// handler per job type, each isolated from the others.
// ============================================================
import { createServiceClient } from './service-client'

export type JobType =
  | 'email.send'
  | 'whatsapp.send'
  | 'tracking.push'
  | 'webhook.deliver'
  | 'confirmili.sync'
  | 'sheets.push'
  | 'ai.generate'
  | 'event.fanout'
  | (string & {})    // plugins can register custom types

export interface Job {
  id: string
  type: JobType
  payload: Record<string, unknown>
  store_id: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'dead'
  attempts: number
  max_attempts: number
  last_error: string | null
}

export type JobHandler = (job: Job) => Promise<void>

const handlers = new Map<string, JobHandler>()

/** Register a handler for a job type (idempotent; last registration wins). */
export function registerHandler(type: JobType, handler: JobHandler): void {
  handlers.set(type, handler)
}

/** Enqueue a job. Never throws — a full queue table outage must not break checkout. */
export async function enqueue(
  type: JobType,
  payload: Record<string, unknown>,
  opts: { storeId?: string; runAt?: Date; maxAttempts?: number } = {},
): Promise<string | null> {
  try {
    const client = createServiceClient()
    const { data, error } = await client.from('job_queue').insert({
      type,
      payload,
      store_id: opts.storeId ?? null,
      run_at: (opts.runAt ?? new Date()).toISOString(),
      max_attempts: opts.maxAttempts ?? 5,
    }).select('id').single()
    if (error) { console.error('[queue] enqueue failed:', error.message); return null }
    return data.id
  } catch (e) {
    console.error('[queue] enqueue failed:', e instanceof Error ? e.message : e)
    return null
  }
}

const backoffMinutes = (attempt: number) => Math.min(2 ** attempt, 60) // 2,4,8,16,32,60…

/**
 * Claim and process up to `limit` due jobs. Called by the cron worker.
 * Each job is isolated: one failing job never affects the others.
 */
export async function processQueue(limit = 10): Promise<{ processed: number; failed: number; recovered: number }> {
  const client = createServiceClient()
  const workerId = `worker-${Math.random().toString(36).slice(2, 8)}`

  // Recover jobs orphaned by crashed/timed-out workers.
  const { data: recoveredCount } = await client.rpc('recover_stuck_jobs', { p_minutes: 10 })

  const { data: jobs, error } = await client.rpc('claim_jobs', { p_worker: workerId, p_limit: limit })
  if (error) throw new Error(`claim_jobs failed: ${error.message}`)

  let processed = 0
  let failed = 0

  for (const job of (jobs ?? []) as Job[]) {
    const handler = handlers.get(job.type)
    try {
      if (!handler) throw new Error(`No handler registered for job type '${job.type}'`)
      await handler(job)
      await client.from('job_queue')
        .update({ status: 'completed', completed_at: new Date().toISOString(), last_error: null })
        .eq('id', job.id)
      processed++
    } catch (e) {
      failed++
      const message = (e instanceof Error ? e.message : String(e)).slice(0, 1000)
      const isDead = job.attempts >= job.max_attempts
      await client.from('job_queue').update({
        status: isDead ? 'dead' : 'pending',
        last_error: message,
        run_at: isDead ? undefined : new Date(Date.now() + backoffMinutes(job.attempts) * 60_000).toISOString(),
        locked_at: null,
        locked_by: null,
      }).eq('id', job.id)
      console.error(`[queue] job ${job.id} (${job.type}) attempt ${job.attempts} failed: ${message}`)
    }
  }

  return { processed, failed, recovered: (recoveredCount as number) ?? 0 }
}

/** Queue depth stats for the health dashboard. */
export async function queueStats() {
  const client = createServiceClient()
  const counts: Record<string, number> = {}
  for (const status of ['pending', 'processing', 'failed', 'dead'] as const) {
    const { count } = await client.from('job_queue')
      .select('id', { count: 'exact', head: true }).eq('status', status)
    counts[status] = count ?? 0
  }
  return counts
}
