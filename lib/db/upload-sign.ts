// HMAC-signed, short-lived upload targets for the direct PUT upload flow.
import { createHmac, timingSafeEqual } from 'crypto'

const TTL_SECONDS = 10 * 60

function mac(payload: string) {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error('AUTH_SECRET is not set')
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function signUploadPath(fullPath: string, maxBytes: number) {
  const exp = Math.floor(Date.now() / 1000) + TTL_SECONDS
  return { exp, sig: mac(`${fullPath}|${exp}|${maxBytes}`) }
}

export function verifyUploadPath(fullPath: string, exp: number, maxBytes: number, sig: string): boolean {
  if (!sig || !exp || exp < Math.floor(Date.now() / 1000)) return false
  const expected = Buffer.from(mac(`${fullPath}|${exp}|${maxBytes}`))
  const got = Buffer.from(sig)
  return expected.length === got.length && timingSafeEqual(expected, got)
}
