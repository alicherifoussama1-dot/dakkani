// ============================================================
// Lightweight, dependency-free error reporting (server-side).
//
// Sends events to Sentry's Envelope endpoint using only fetch — no SDK, so it
// adds ZERO client bundle weight and does not touch next.config (which wraps
// next-pwa + rewrites and is fragile). If SENTRY_DSN is not set it degrades to
// console.error, so nothing breaks when monitoring is not yet configured.
//
// PII policy: we send error message + stack + coarse context (route, storeId,
// wilaya). We NEVER send customer name, phone, address, or full order bodies.
//
// Required env var (server-only, do NOT prefix NEXT_PUBLIC):
//   SENTRY_DSN = https://<key>@<org>.ingest.sentry.io/<project_id>
// ============================================================

interface Dsn { host: string; projectId: string; key: string; protocol: string }

function parseDsn(dsn: string): Dsn | null {
  try {
    const u = new URL(dsn)
    const projectId = u.pathname.replace(/^\//, '')
    if (!u.username || !projectId) return null
    return { host: u.host, projectId, key: u.username, protocol: u.protocol.replace(':', '') }
  } catch {
    return null
  }
}

function hex32(): string {
  let s = ''
  for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16)
  return s
}

export interface ReportContext {
  route?: string
  tags?: Record<string, string | number | undefined>
  extra?: Record<string, unknown>
  level?: 'error' | 'warning' | 'fatal'
}

/**
 * Report a server-side error. Never throws — safe to call in any catch block.
 * Fire-and-forget: does not block the request.
 */
export function reportError(err: unknown, ctx: ReportContext = {}): void {
  const message = err instanceof Error ? err.message : String(err)
  const stack = err instanceof Error ? err.stack : undefined
  // Always keep a structured server log (visible in Vercel logs).
  console.error(`[report] ${ctx.route ?? 'server'}: ${message}`)

  const dsn = process.env.SENTRY_DSN
  if (!dsn) return
  const parsed = parseDsn(dsn)
  if (!parsed) return

  const eventId = hex32()
  const now = new Date().toISOString()
  const tags: Record<string, string> = {}
  for (const [k, v] of Object.entries(ctx.tags ?? {})) if (v !== undefined) tags[k] = String(v)

  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: 'node',
    level: ctx.level ?? 'error',
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'production',
    server_name: undefined,
    transaction: ctx.route,
    tags,
    extra: ctx.extra,
    exception: {
      values: [{
        type: err instanceof Error ? err.name : 'Error',
        value: message,
        stacktrace: stack ? { frames: [{ filename: ctx.route ?? 'server', function: stack.split('\n')[1]?.trim() }] } : undefined,
      }],
    },
  }

  const envelope =
    JSON.stringify({ event_id: eventId, sent_at: now, dsn }) + '\n' +
    JSON.stringify({ type: 'event' }) + '\n' +
    JSON.stringify(event) + '\n'

  const url = `${parsed.protocol}://${parsed.host}/api/${parsed.projectId}/envelope/`
  // Fire-and-forget; swallow all failures so reporting never affects the request.
  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-sentry-envelope',
      'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.key}, sentry_client=dakkani-lite/1.0`,
    },
    body: envelope,
    signal: AbortSignal.timeout(3000),
  }).catch(() => { /* monitoring must never break the app */ })
}
