// Stateless signed session tokens (replaces Supabase Auth JWTs).
// Edge-safe: uses only Web Crypto, so middleware can verify sessions too.
//
// Token = base64url(JSON payload) + "." + base64url(HMAC-SHA256(payload, AUTH_SECRET))
// Carried in the `cm_session` cookie (web) or `Authorization: Bearer` (mobile).

export const SESSION_COOKIE = 'cm_session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30 // 30 days

export interface SessionPayload { sub: string; email: string; exp: number; iat: number }
export interface SessionUser { id: string; email: string; aud: 'authenticated'; role: 'authenticated'; user_metadata: Record<string, unknown>; app_metadata: Record<string, unknown>; created_at?: string }

const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i])
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function fromB64url(s: string): Uint8Array {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)
  const bin = atob(pad)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error('AUTH_SECRET must be set (>= 32 chars)')
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'])
}

export async function signSession(user: { id: string; email: string }, ttl = SESSION_TTL_SECONDS): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const payload: SessionPayload = { sub: user.id, email: user.email, iat: now, exp: now + ttl }
  const body = b64url(enc.encode(JSON.stringify(payload)))
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(body)))
  return `${body}.${b64url(sig)}`
}

export async function verifySession(token: string | null | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  try {
    const ok = await crypto.subtle.verify('HMAC', await hmacKey(), fromB64url(sig) as BufferSource, enc.encode(body))
    if (!ok) return null
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(body))) as SessionPayload
    if (!payload.sub || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch { return null }
}

export function toUser(p: SessionPayload): SessionUser {
  return { id: p.sub, email: p.email, aud: 'authenticated', role: 'authenticated', user_metadata: {}, app_metadata: {} }
}

export function bearer(authHeader?: string | null): string | null {
  const m = authHeader?.match(/^Bearer\s+(.+)$/i)
  return m ? m[1].trim() : null
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_TTL_SECONDS,
}
