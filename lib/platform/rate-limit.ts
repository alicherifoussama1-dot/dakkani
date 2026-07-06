// ============================================================
// RATE LIMITING — sliding-window, in-memory per instance.
//
// On serverless each instance keeps its own window, so the real
// global limit is (limit × instances) — still an effective brake
// on brute force and scraping from a single source. For a strict
// global limit later, swap the store for Upstash/Redis behind the
// same check() signature; callers won't change.
// ============================================================

interface Window { timestamps: number[] }
const windows = new Map<string, Window>()
let lastSweep = Date.now()

export interface RateLimitResult { allowed: boolean; remaining: number; retryAfterSeconds: number }

/**
 * Check (and consume) one hit for `key` within a sliding window.
 *   const rl = checkRateLimit(`checkout:${ip}`, { limit: 10, windowMs: 60_000 })
 *   if (!rl.allowed) return 429
 */
export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now()

  // Periodic sweep so abandoned keys don't leak memory.
  if (now - lastSweep > 300_000) {
    windows.forEach((w, k) => {
      if (w.timestamps.length === 0 || w.timestamps[w.timestamps.length - 1] < now - opts.windowMs) {
        windows.delete(k)
      }
    })
    lastSweep = now
  }

  const w = windows.get(key) ?? { timestamps: [] }
  w.timestamps = w.timestamps.filter(t => t > now - opts.windowMs)

  if (w.timestamps.length >= opts.limit) {
    const oldest = w.timestamps[0]
    windows.set(key, w)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((oldest + opts.windowMs - now) / 1000),
    }
  }

  w.timestamps.push(now)
  windows.set(key, w)
  return { allowed: true, remaining: opts.limit - w.timestamps.length, retryAfterSeconds: 0 }
}

/** Standard 429 payload for route handlers. */
export function rateLimitResponse(result: RateLimitResult) {
  return new Response(JSON.stringify({ error: 'Too many requests' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(result.retryAfterSeconds),
    },
  })
}
