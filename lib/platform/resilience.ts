// ============================================================
// GRACEFUL DEGRADATION — error isolation between services.
//
//   const res = await safe('tracking', () => pushTracking(order))
//   if (!res.ok) { /* order flow continues; failure recorded */ }
//
// A failing integration (tracking, Cloudflare, email, sheets…)
// must never take down the business action that triggered it.
// A lightweight circuit breaker skips a service for a cooldown
// after repeated failures so a dead dependency stops adding
// latency to every request.
// ============================================================

type ServiceName =
  | 'tracking' | 'cloudflare' | 'email' | 'whatsapp' | 'sheets'
  | 'confirmili' | 'delivery' | 'ai' | 'webhooks' | (string & {})

interface Breaker { failures: number; openedAt: number | null }
const breakers = new Map<string, Breaker>()

const FAILURE_THRESHOLD = 5      // consecutive failures before opening
const COOLDOWN_MS = 60_000       // how long an open circuit skips calls

export type SafeResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string; skipped: boolean }

/**
 * Run `fn` with error isolation. Returns a result object instead of throwing.
 * When the service's circuit is open, the call is skipped entirely.
 */
export async function safe<T>(
  service: ServiceName,
  fn: () => Promise<T>,
  opts: { timeoutMs?: number } = {},
): Promise<SafeResult<T>> {
  const breaker = breakers.get(service) ?? { failures: 0, openedAt: null }

  if (breaker.openedAt !== null) {
    if (Date.now() - breaker.openedAt < COOLDOWN_MS) {
      return { ok: false, error: `${service}: circuit open (cooling down)`, skipped: true }
    }
    breaker.openedAt = null   // half-open: allow one probe call
    breaker.failures = FAILURE_THRESHOLD - 1
  }

  try {
    const value = opts.timeoutMs
      ? await withTimeout(fn(), opts.timeoutMs, service)
      : await fn()
    breakers.set(service, { failures: 0, openedAt: null })
    return { ok: true, value }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    breaker.failures += 1
    if (breaker.failures >= FAILURE_THRESHOLD) breaker.openedAt = Date.now()
    breakers.set(service, breaker)
    console.error(`[degraded] ${service} failed (${breaker.failures}/${FAILURE_THRESHOLD}): ${message}`)
    return { ok: false, error: message, skipped: false }
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: timed out after ${ms}ms`)), ms)),
  ])
}

/** Current breaker states (for the health dashboard). */
export function circuitStates(): Record<string, { failures: number; open: boolean }> {
  const out: Record<string, { failures: number; open: boolean }> = {}
  breakers.forEach((b, name) => {
    out[name] = { failures: b.failures, open: b.openedAt !== null && Date.now() - b.openedAt < COOLDOWN_MS }
  })
  return out
}
