// ============================================================
// Credential encryption — AES-256-GCM (server-side ONLY)
// Courier API credentials are stored encrypted in Supabase and
// only ever decrypted on the server inside API routes. The key
// comes from APP_ENCRYPTION_KEY (falls back to CRON_SECRET so the
// system keeps working before the dedicated key is provisioned).
// ============================================================
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto'

const ALGO = 'aes-256-gcm'

function key(): Buffer {
  const secret =
    process.env.APP_ENCRYPTION_KEY ??
    process.env.CRON_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'dakkani-dev-fallback-key'
  // Derive a fixed 32-byte key from the secret of any length.
  return createHash('sha256').update(secret).digest()
}

/** Encrypt a credentials object → opaque string (iv.tag.ciphertext, base64). */
export function encryptCredentials(data: Record<string, unknown>): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGO, key(), iv)
  const json = JSON.stringify(data ?? {})
  const enc = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`
}

/** Decrypt a string produced by encryptCredentials back into the object. */
export function decryptCredentials<T = Record<string, string>>(blob: string | null | undefined): T {
  if (!blob) return {} as T
  try {
    // Already a plain object that slipped through (legacy rows) → pass through.
    if (typeof blob === 'object') return blob as T
    const [ivB64, tagB64, dataB64] = String(blob).split('.')
    if (!ivB64 || !tagB64 || !dataB64) {
      // Legacy plaintext JSON (pre-encryption) — best-effort parse.
      try { return JSON.parse(String(blob)) as T } catch { return {} as T }
    }
    const decipher = createDecipheriv(ALGO, key(), Buffer.from(ivB64, 'base64'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataB64, 'base64')),
      decipher.final(),
    ])
    return JSON.parse(dec.toString('utf8')) as T
  } catch {
    return {} as T
  }
}

/** Mask a credential value for safe display (keeps last 4 chars). */
export function maskCredential(value?: string | null): string {
  if (!value) return ''
  const v = String(value)
  if (v.length <= 4) return '••••'
  return '••••' + v.slice(-4)
}
