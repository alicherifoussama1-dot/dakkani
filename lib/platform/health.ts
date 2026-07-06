// ============================================================
// PLATFORM HEALTH — live checks for the Platform Admin dashboard.
// Each check is isolated (a failing check reports 'down', never
// throws) and time-boxed so the dashboard always renders.
// ============================================================
import { createServiceClient } from './service-client'
import { queueStats } from './queue'
import { circuitStates } from './resilience'

export type HealthStatus = 'up' | 'degraded' | 'down' | 'unconfigured'

export interface HealthCheck {
  name: string
  status: HealthStatus
  latencyMs?: number
  detail?: string
}

async function timed<T>(fn: () => Promise<T>, ms = 5000): Promise<{ value: T; latencyMs: number }> {
  const start = Date.now()
  const value = await Promise.race([
    fn(),
    new Promise<never>((_, rej) => setTimeout(() => rej(new Error(`timeout ${ms}ms`)), ms)),
  ])
  return { value, latencyMs: Date.now() - start }
}

async function checkDatabase(): Promise<HealthCheck> {
  try {
    const client = createServiceClient()
    const { latencyMs } = await timed(async () => {
      const { error } = await client.from('stores').select('id', { count: 'exact', head: true })
      if (error) throw new Error(error.message)
    })
    return { name: 'database', status: latencyMs > 2000 ? 'degraded' : 'up', latencyMs }
  } catch (e) {
    return { name: 'database', status: 'down', detail: msg(e) }
  }
}

async function checkStorage(): Promise<HealthCheck> {
  try {
    const client = createServiceClient()
    const { latencyMs } = await timed(async () => {
      const { error } = await client.storage.listBuckets()
      if (error) throw new Error(error.message)
    })
    return { name: 'storage', status: latencyMs > 3000 ? 'degraded' : 'up', latencyMs }
  } catch (e) {
    return { name: 'storage', status: 'down', detail: msg(e) }
  }
}

async function checkQueue(): Promise<HealthCheck> {
  try {
    const stats = await queueStats()
    const dead = stats.dead ?? 0
    const pending = stats.pending ?? 0
    let status: HealthStatus = 'up'
    let detail = `pending=${pending} failed=${stats.failed ?? 0} dead=${dead}`
    if (dead > 0) { status = 'degraded'; detail += ' — dead jobs need attention' }
    if (pending > 500) { status = 'degraded'; detail += ' — backlog building up' }
    return { name: 'queue', status, detail }
  } catch (e) {
    return { name: 'queue', status: 'down', detail: msg(e) }
  }
}

async function checkCloudflare(): Promise<HealthCheck> {
  if (!process.env.CLOUDFLARE_API_TOKEN) return { name: 'cloudflare', status: 'unconfigured' }
  try {
    const { value, latencyMs } = await timed(() =>
      fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
        cache: 'no-store',
      }))
    return { name: 'cloudflare', status: value.ok ? 'up' : 'down', latencyMs, detail: value.ok ? undefined : `HTTP ${value.status}` }
  } catch (e) {
    return { name: 'cloudflare', status: 'down', detail: msg(e) }
  }
}

async function checkEmail(): Promise<HealthCheck> {
  // Email goes through Supabase Auth SMTP / provider env. We can only verify configuration here.
  const configured = Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.NEXT_PUBLIC_SUPABASE_URL)
  return { name: 'email', status: configured ? 'up' : 'unconfigured', detail: 'config presence check' }
}

async function checkDomains(): Promise<HealthCheck> {
  try {
    const client = createServiceClient()
    const { count: total } = await client.from('domains').select('id', { count: 'exact', head: true })
    const { count: failed } = await client.from('domains')
      .select('id', { count: 'exact', head: true }).eq('status', 'error')
    const status: HealthStatus = (failed ?? 0) > 0 ? 'degraded' : 'up'
    return { name: 'domains', status, detail: `total=${total ?? 0} error=${failed ?? 0}` }
  } catch (e) {
    return { name: 'domains', status: 'down', detail: msg(e) }
  }
}

async function checkTracking(): Promise<HealthCheck> {
  try {
    const client = createServiceClient()
    const { count } = await client.from('tracking_integrations').select('id', { count: 'exact', head: true })
    return { name: 'tracking', status: 'up', detail: `integrations=${count ?? 0}` }
  } catch (e) {
    return { name: 'tracking', status: 'down', detail: msg(e) }
  }
}

async function checkWorkers(): Promise<HealthCheck> {
  // Worker liveness = did the queue cron complete recently? It writes a heartbeat audit row.
  try {
    const client = createServiceClient()
    const { data } = await client.from('audit_logs')
      .select('created_at').eq('action', 'queue.worker_heartbeat')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!data) return { name: 'workers', status: 'unconfigured', detail: 'no heartbeat yet' }
    const ageMin = (Date.now() - new Date(data.created_at).getTime()) / 60_000
    return {
      name: 'workers',
      status: ageMin > 15 ? 'down' : ageMin > 5 ? 'degraded' : 'up',
      detail: `last heartbeat ${Math.round(ageMin)}m ago`,
    }
  } catch (e) {
    return { name: 'workers', status: 'down', detail: msg(e) }
  }
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 200)

export async function platformHealth() {
  const checks = await Promise.all([
    checkDatabase(), checkStorage(), checkQueue(), checkCloudflare(),
    checkEmail(), checkDomains(), checkTracking(), checkWorkers(),
  ])
  const overall: HealthStatus =
    checks.some(c => c.status === 'down') ? 'down'
    : checks.some(c => c.status === 'degraded') ? 'degraded'
    : 'up'
  return { overall, checks, circuits: circuitStates(), at: new Date().toISOString() }
}
