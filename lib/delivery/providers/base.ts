// Shared HTTP helper for adapters (server-side fetch with JSON + errors).
export async function httpJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, cache: 'no-store' })
  const text = await res.text()
  let body: any = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!res.ok) {
    const msg = (body && (body.message || body.error || body.detail)) || text || res.statusText
    throw new Error(`HTTP ${res.status}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`)
  }
  return body as T
}

// Run async tasks with limited concurrency (used by rate imports).
export async function pool<I, O>(items: I[], limit: number, fn: (item: I) => Promise<O>): Promise<O[]> {
  const out: O[] = []
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export const WILAYA_CODES: string[] = Array.from({ length: 58 }, (_, i) => String(i + 1).padStart(2, '0'))

// Raw fetch that never throws — returns status + body for diagnostics.
export async function fetchRaw(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; text: string; json: any }> {
  try {
    const res = await fetch(url, { ...init, cache: 'no-store' })
    const text = await res.text()
    let json: any = null
    try { json = text ? JSON.parse(text) : null } catch { json = null }
    return { ok: res.ok, status: res.status, text, json }
  } catch (e) {
    return { ok: false, status: 0, text: (e as Error).message, json: null }
  }
}
