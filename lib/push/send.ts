// ============================================================
// PUSH DELIVERY — FCM v1 (Android) + APNs (iOS).
//
// Zero new dependencies: JWTs are signed with node:crypto, and APNs is
// spoken over node:http2 (APNs REQUIRES HTTP/2 — plain fetch/undici will
// not work against api.push.apple.com).
//
// Every function here is best-effort and self-contained. Callers run it
// from the job queue, never inline with order creation.
// ============================================================
import { createSign, createPrivateKey, sign as cryptoSign } from 'crypto'
import http2 from 'http2'

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'
const APNS_HOST_PROD = 'api.push.apple.com'
const APNS_HOST_DEV = 'api.sandbox.push.apple.com'

export interface PushMessage {
  title: string
  body: string
  data: Record<string, string>
  badge?: number
  sound?: boolean
  androidChannel?: string
  iosSound?: string
}

export interface PushTarget {
  token: string
  platform: 'ios' | 'android'
  sound_enabled?: boolean
}

/** Result per token so the caller can prune dead registrations. */
export interface PushResult {
  token: string
  ok: boolean
  /** true when the token is permanently invalid (404/410/Unregistered). */
  stale: boolean
  error?: string
}

const b64url = (b: Buffer | string) =>
  Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// ── FCM: OAuth2 access token (cached until ~1 min before expiry) ──
let fcmToken: { value: string; exp: number } | null = null

async function fcmAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  if (fcmToken && Date.now() < fcmToken.exp) return fcmToken.value

  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: FCM_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  const jwt = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) throw new Error(`FCM auth ${res.status}: ${(await res.text()).slice(0, 180)}`)

  const json = (await res.json()) as { access_token: string; expires_in: number }
  fcmToken = { value: json.access_token, exp: Date.now() + (json.expires_in - 60) * 1000 }
  return json.access_token
}

interface ServiceAccount { client_email: string; private_key: string; project_id: string }

/** Parse FCM_SERVICE_ACCOUNT_JSON defensively.
 *
 *  This value is pasted by hand into a dashboard, so it arrives malformed in
 *  predictable ways. A bare JSON.parse() throws, which fails the whole queue
 *  job and hides the real cause behind a generic retry loop. Returning a
 *  reason instead lets the caller report it per-token. */
function readServiceAccount(): { sa: ServiceAccount } | { error: string } {
  const raw = process.env.FCM_SERVICE_ACCOUNT_JSON
  if (!raw || !raw.trim()) return { error: 'FCM not configured' }

  // Some dashboards preserve wrapping quotes when the value is pasted.
  let text = raw.trim()
  if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) {
    text = text.slice(1, -1)
  }

  let sa: ServiceAccount
  try {
    let parsed: unknown = JSON.parse(text)
    // `vercel env add` with a quoted value can store the JSON double-encoded,
    // in which case the first parse yields a string, not an object.
    if (typeof parsed === 'string') parsed = JSON.parse(parsed)
    sa = parsed as ServiceAccount
  } catch {
    return { error: 'FCM service account is not valid JSON' }
  }

  if (!sa.client_email || !sa.private_key || !sa.project_id) {
    return { error: 'FCM service account missing client_email/private_key/project_id' }
  }

  // If the JSON was escaped twice, private_key still contains the two
  // characters \ and n instead of real newlines, and RSA signing fails with
  // an opaque OpenSSL error. Normalise it.
  if (sa.private_key.includes('\\n')) {
    sa = { ...sa, private_key: sa.private_key.replace(/\\n/g, '\n') }
  }
  if (!sa.private_key.includes('BEGIN PRIVATE KEY')) {
    return { error: 'FCM private_key is not a PEM block' }
  }

  return { sa }
}

async function sendFcm(targets: PushTarget[], msg: PushMessage): Promise<PushResult[]> {
  const parsed = readServiceAccount()
  if ('error' in parsed) {
    return targets.map(t => ({ token: t.token, ok: false, stale: false, error: parsed.error }))
  }
  const sa = parsed.sa
  const access = await fcmAccessToken(sa)
  const url = `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`

  return Promise.all(targets.map(async (t): Promise<PushResult> => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${access}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: t.token,
            notification: { title: msg.title, body: msg.body },
            data: msg.data,
            android: {
              priority: 'HIGH',
              notification: {
                // channel_id is MANDATORY for the custom sound to play on API 26+.
                // Without it Android falls back to the default channel.
                // MUST match CHANNELS.orders in apps/mobile/src/lib/push.ts.
                // Channels are immutable, so the id carries a version: _v2 is
                // the one created with the cash-register sound.
                channel_id: msg.androidChannel ?? 'orders_v2',
                sound: t.sound_enabled === false ? undefined : 'new_order',
                notification_priority: 'PRIORITY_HIGH',
                default_vibrate_timings: false,
                vibrate_timings: ['0s', '0.25s', '0.15s', '0.25s'],
              },
            },
          },
        }),
        signal: AbortSignal.timeout(10_000),
      })

      if (res.ok) return { token: t.token, ok: true, stale: false }

      const text = await res.text().catch(() => '')
      // UNREGISTERED / NOT_FOUND → the app was uninstalled; prune the token.
      const stale = res.status === 404 || /UNREGISTERED|INVALID_ARGUMENT/i.test(text)
      return { token: t.token, ok: false, stale, error: `${res.status} ${text.slice(0, 140)}` }
    } catch (e) {
      return { token: t.token, ok: false, stale: false, error: (e as Error).message }
    }
  }))
}

// ── APNs: ES256 JWT (cached — Apple rejects tokens refreshed too often) ──
let apnsJwt: { value: string; exp: number } | null = null

function apnsToken(): string {
  if (apnsJwt && Date.now() < apnsJwt.exp) return apnsJwt.value

  const key = (process.env.APNS_KEY_P8 ?? '').replace(/\\n/g, '\n')
  const kid = process.env.APNS_KEY_ID!
  const iss = process.env.APNS_TEAM_ID!
  const now = Math.floor(Date.now() / 1000)

  const header = b64url(JSON.stringify({ alg: 'ES256', kid }))
  const claims = b64url(JSON.stringify({ iss, iat: now }))
  const sig = cryptoSign('sha256', Buffer.from(`${header}.${claims}`), {
    key: createPrivateKey(key),
    dsaEncoding: 'ieee-p1363', // ES256 requires raw R||S, not DER
  })

  const value = `${header}.${claims}.${b64url(sig)}`
  // Apple requires refresh no more than once every 20 min; reuse for 45.
  apnsJwt = { value, exp: Date.now() + 45 * 60 * 1000 }
  return value
}

function sendApnsOne(
  session: http2.ClientHttp2Session,
  jwt: string,
  target: PushTarget,
  msg: PushMessage,
): Promise<PushResult> {
  return new Promise((resolve) => {
    const payload = JSON.stringify({
      aps: {
        alert: { title: msg.title, body: msg.body },
        // The bundled asset is new_order.wav (expo-notifications copies it
        // into the app bundle). It used to name new-order.caf, which is not a
        // file this app has ever shipped — iOS silently fell back to the
        // default sound.
        sound: target.sound_enabled === false ? undefined : (msg.iosSound ?? 'new_order.wav'),
        badge: msg.badge,
        // Breaks through Focus modes. Needs NO special entitlement (unlike
        // Critical Alerts) and is appropriate for business-critical orders.
        'interruption-level': 'time-sensitive',
        'mutable-content': 1,
      },
      ...msg.data,
    })

    const req = session.request({
      ':method': 'POST',
      ':path': `/3/device/${target.token}`,
      'apns-topic': process.env.APNS_BUNDLE_ID!,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'content-type': 'application/json',
      authorization: `bearer ${jwt}`,
    })

    let status = 0
    let body = ''
    req.on('response', (h) => { status = Number(h[':status'] ?? 0) })
    req.on('data', (c) => { body += c })
    req.on('error', (e) => resolve({ token: target.token, ok: false, stale: false, error: e.message }))
    req.on('end', () => {
      if (status === 200) return resolve({ token: target.token, ok: true, stale: false })
      // 410 Gone = device unregistered; 400 BadDeviceToken = malformed.
      const stale = status === 410 || /BadDeviceToken|Unregistered/i.test(body)
      resolve({ token: target.token, ok: false, stale, error: `${status} ${body.slice(0, 140)}` })
    })
    req.setTimeout(10_000, () => { req.close(); resolve({ token: target.token, ok: false, stale: false, error: 'timeout' }) })
    req.end(payload)
  })
}

async function sendApns(targets: PushTarget[], msg: PushMessage): Promise<PushResult[]> {
  // APNS_BUNDLE_ID belongs in this guard: it is sent as the apns-topic header,
  // and when it is missing the header goes out as the string "undefined".
  // Apple answers 400 BadTopic, which reads like a broken payload rather than
  // a missing env var and sends you looking in the wrong place.
  if (!process.env.APNS_KEY_P8 || !process.env.APNS_KEY_ID || !process.env.APNS_TEAM_ID || !process.env.APNS_BUNDLE_ID) {
    return targets.map(t => ({ token: t.token, ok: false, stale: false, error: 'APNs not configured' }))
  }

  const host = process.env.APNS_USE_SANDBOX === 'true' ? APNS_HOST_DEV : APNS_HOST_PROD
  const jwt = apnsToken()
  const session = http2.connect(`https://${host}`)

  try {
    // One HTTP/2 session multiplexes every device — this is why APNs needs h2.
    return await Promise.all(targets.map(t => sendApnsOne(session, jwt, t, msg)))
  } finally {
    session.close()
  }
}

/** Fan a message out to mixed iOS/Android targets. Never throws. */
export async function sendPush(targets: PushTarget[], msg: PushMessage): Promise<PushResult[]> {
  if (targets.length === 0) return []

  const android = targets.filter(t => t.platform === 'android')
  const ios = targets.filter(t => t.platform === 'ios')

  const [a, i] = await Promise.all([
    android.length ? sendFcm(android, msg).catch((e): PushResult[] =>
      android.map(t => ({ token: t.token, ok: false, stale: false, error: (e as Error).message }))) : [],
    ios.length ? sendApns(ios, msg).catch((e): PushResult[] =>
      ios.map(t => ({ token: t.token, ok: false, stale: false, error: (e as Error).message }))) : [],
  ])

  return [...a, ...i]
}

/** Build the "طلب جديد" notification exactly as specified by the merchant. */
export function buildNewOrderMessage(o: {
  orderId: string
  orderNumber: string
  /** Position within the merchant's day ("today's 7th"). order_number cannot
   *  supply this — it carries a global sequence. */
  dailyNumber?: number
  customerName: string
  productName?: string | null
  variantLabel?: string | null
  itemsCount: number
  total: number
  wilayaName?: string | null
  badge?: number
}): PushMessage {
  const money = new Intl.NumberFormat('ar-DZ').format(Math.round(o.total))

  // The title is the only part guaranteed to be visible in a collapsed
  // notification, so it carries what the merchant reacts to: which order of
  // the day this is, and what it is worth.
  const title = o.dailyNumber
    ? `🔔 طلب اليوم رقم ${o.dailyNumber} · ${money} دج`
    : `🔔 طلب جديد · ${money} دج`

  // customer_name is one field holding the full name as the customer typed
  // it; there is no separate surname column to join.
  const lines = [`الاسم: ${o.customerName}`]

  if (o.productName) {
    lines.push(o.variantLabel ? `المنتج: ${o.productName} — ${o.variantLabel}` : `المنتج: ${o.productName}`)
  }
  // Only worth saying when there is more than the item already named above.
  if (o.itemsCount > 1) lines.push(`عدد المنتجات: ${o.itemsCount}`)
  if (o.wilayaName) lines.push(`الولاية: ${o.wilayaName}`)
  lines.push(`رقم الطلب: ${o.orderNumber}`)

  return {
    title,
    body: lines.join('\n'),
    badge: o.badge,
    androidChannel: 'orders_v2',
    iosSound: 'new_order.wav',
    data: {
      type: 'new_order',
      order_id: o.orderId,
      order_number: o.orderNumber,
      daily_number: o.dailyNumber != null ? String(o.dailyNumber) : '',
      customer: o.customerName,
      product: o.productName ?? '',
      variant: o.variantLabel ?? '',
      items_count: String(o.itemsCount),
      total: String(o.total),
      wilaya: o.wilayaName ?? '',
      deeplink: `commerco://orders/${o.orderId}`,
    },
  }
}
