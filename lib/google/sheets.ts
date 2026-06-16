// ============================================================
// Google Sheets integration — SERVER-SIDE ONLY
//
// SECURITY: GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET and merchant
// refresh tokens never leave the server. Frontend only talks to
// our /api/google/... routes.
//
// Scopes used (minimal — no Drive access):
//   https://www.googleapis.com/auth/spreadsheets   read/write sheets
//   https://www.googleapis.com/auth/userinfo.email account email
// The merchant pastes a spreadsheet URL; we read its metadata via
// the Sheets API, so the sensitive Drive scope is never requested.
// ============================================================

const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const AUTH_URL  = 'https://accounts.google.com/o/oauth2/v2/auth'
const SHEETS    = 'https://sheets.googleapis.com/v4/spreadsheets'

export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.email',
].join(' ')

function requireOAuthConfig() {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET غير مهيأة على السيرفر')
  }
  return { clientId, clientSecret }
}

// ── OAuth state signing (prevents CSRF on the callback) ──────
import { createHmac } from 'crypto'

function stateSecret(): string {
  return process.env.CRON_SECRET ?? process.env.GOOGLE_CLIENT_SECRET ?? 'dakkani'
}

export function signState(storeId: string): string {
  const sig = createHmac('sha256', stateSecret()).update(storeId).digest('hex').slice(0, 16)
  return `${storeId}.${sig}`
}

export function verifyState(state: string): string | null {
  const dot = state.lastIndexOf('.')
  if (dot < 1) return null
  const storeId = state.slice(0, dot)
  return signState(storeId) === state ? storeId : null
}

export function getRedirectUri(): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/+$/, '')
  return `${base}/api/google/oauth/callback`
}

// ── OAuth: consent URL ────────────────────────────────────────
export function buildAuthUrl(state: string): string {
  const { clientId } = requireOAuthConfig()
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    access_type: 'offline',   // get a refresh_token
    prompt: 'consent',        // force refresh_token even on re-connect
    state,
  })
  return `${AUTH_URL}?${params}`
}

// ── OAuth: exchange authorization code ────────────────────────
export async function exchangeCode(code: string): Promise<{
  ok: true; refreshToken: string; accessToken: string; email: string
} | { ok: false; error: string }> {
  try {
    const { clientId, clientSecret } = requireOAuthConfig()
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: getRedirectUri(),
        grant_type: 'authorization_code',
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.access_token) {
      return { ok: false, error: data.error_description ?? data.error ?? `HTTP ${res.status}` }
    }
    if (!data.refresh_token) {
      return { ok: false, error: 'Google لم يُرجع refresh_token — أزل صلاحية التطبيق من حسابك ثم أعد الربط' }
    }

    // Resolve the account email
    const infoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${data.access_token}` },
    })
    const info = await infoRes.json()
    if (!info.email) return { ok: false, error: 'تعذر قراءة البريد الإلكتروني للحساب' }

    return { ok: true, refreshToken: data.refresh_token, accessToken: data.access_token, email: info.email }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ── OAuth: refresh access token ───────────────────────────────
export async function getAccessToken(refreshToken: string): Promise<{ ok: true; token: string } | { ok: false; error: string }> {
  try {
    const { clientId, clientSecret } = requireOAuthConfig()
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    })
    const data = await res.json()
    if (!res.ok || !data.access_token) {
      return { ok: false, error: data.error_description ?? data.error ?? `HTTP ${res.status}` }
    }
    return { ok: true, token: data.access_token }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ── Parse a spreadsheet ID out of a pasted URL (or raw ID) ────
export function parseSpreadsheetId(input: string): string | null {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (m) return m[1]
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) return input.trim()
  return null
}

// ── Spreadsheet metadata: title + worksheet (tab) names ───────
export async function getSpreadsheetMeta(accessToken: string, spreadsheetId: string): Promise<{
  ok: true; title: string; worksheets: string[]
} | { ok: false; error: string }> {
  try {
    const res = await fetch(`${SHEETS}/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` }
    return {
      ok: true,
      title: data.properties?.title ?? '',
      worksheets: (data.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean),
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ── Header row for order sheets (written once if sheet empty) ─
// EXACT column layout used by the storefront sheets (Username … Created At).
// City = wilaya · State = commune · ShippingTo? = Home/Desk.
export const ORDER_SHEET_HEADER = [
  'Username', 'Phone', 'City', 'State', 'SKU', 'Variant', 'Quantity',
  'Price', 'Shipping Price', 'Total', 'ShippingTo?', 'Product Name', 'Created At',
]

export interface OrderSheetRow {
  username: string        // customer name
  phone: string
  city: string            // wilaya
  state: string           // commune / baladia
  sku: string
  variant: string
  qty: number
  price: number           // unit price
  shipping_price: number  // delivery fee
  total: number
  shipping_to: string     // 'Home' | 'Desk'
  product_name: string
  created_at: string      // YYYY-MM-DD HH:MM:SS
}

// ── Append an order row (writes header first if sheet empty) ──
export async function appendOrderRow(opts: {
  refreshToken: string
  spreadsheetId: string
  worksheetName: string
  row: OrderSheetRow
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await getAccessToken(opts.refreshToken)
  if (!auth.ok) return auth

  const range = encodeURIComponent(`'${opts.worksheetName.replace(/'/g, "''")}'!A1`)

  try {
    // Write the header once if the worksheet is empty
    const checkRes = await fetch(
      `${SHEETS}/${opts.spreadsheetId}/values/${range}?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${auth.token}` } }
    )
    const check = await checkRes.json()
    const isEmpty = checkRes.ok && !check.values?.length

    const r = opts.row
    const dataRow = [
      r.username, r.phone, r.city, r.state, r.sku, r.variant, r.qty,
      r.price, r.shipping_price, r.total, r.shipping_to, r.product_name, r.created_at,
    ]
    const values = isEmpty ? [ORDER_SHEET_HEADER, dataRow] : [dataRow]

    const res = await fetch(
      `${SHEETS}/${opts.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${auth.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ majorDimension: 'ROWS', values }),
      }
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { ok: false, error: err.error?.message ?? `HTTP ${res.status}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}
