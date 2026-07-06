// ============================================================
// SECURITY PRIMITIVES — client fingerprinting + SSRF guard
// ============================================================

export interface ClientInfo {
  ip: string
  device: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown'
  browser: string
  userAgent: string
}

/** Extract ip / device / browser from a Request (works in route handlers). */
export function getClientInfo(req: Request): ClientInfo {
  const h = req.headers
  const ip =
    h.get('x-real-ip') ??
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    h.get('cf-connecting-ip') ??
    'unknown'
  const ua = h.get('user-agent') ?? ''

  let device: ClientInfo['device'] = 'unknown'
  if (/bot|crawler|spider|curl|wget/i.test(ua)) device = 'bot'
  else if (/ipad|tablet/i.test(ua)) device = 'tablet'
  else if (/mobile|android|iphone/i.test(ua)) device = 'mobile'
  else if (ua) device = 'desktop'

  let browser = 'unknown'
  if (/edg\//i.test(ua)) browser = 'Edge'
  else if (/opr\/|opera/i.test(ua)) browser = 'Opera'
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome'
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox'
  else if (/safari/i.test(ua)) browser = 'Safari'

  return { ip, device, browser, userAgent: ua.slice(0, 300) }
}

// ── SSRF guard ──────────────────────────────────────────────
// Any outbound fetch whose URL originates from user/merchant input
// (webhook URLs, tracking endpoints, image URLs…) must pass this first.
const PRIVATE_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./, /^0\./, /^10\./, /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,               // link-local / cloud metadata
  /^\[?::1\]?$/, /^\[?fc/i, /^\[?fd/i, /^\[?fe80/i,
  /\.internal$/i, /\.local$/i,
]

export function assertSafeUrl(rawUrl: string): URL {
  let url: URL
  try { url = new URL(rawUrl) } catch { throw new Error(`Blocked outbound URL (unparseable): ${rawUrl.slice(0, 100)}`) }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error(`Blocked outbound URL (protocol ${url.protocol})`)
  }
  const host = url.hostname
  if (PRIVATE_HOST_PATTERNS.some(p => p.test(host))) {
    throw new Error(`Blocked outbound URL (private host): ${host}`)
  }
  return url
}

/** fetch() that refuses private/internal destinations. Use for any URL that came from user input. */
export async function safeFetch(rawUrl: string, init?: RequestInit): Promise<Response> {
  const url = assertSafeUrl(rawUrl)
  return fetch(url.toString(), { ...init, redirect: 'manual' })
}
