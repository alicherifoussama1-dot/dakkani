// ============================================================
// Google Sheets via a SINGLE server-side Service Account.
// SERVER-SIDE ONLY. No per-merchant OAuth.
//
// Each merchant shares their own sheet with our service-account email
// (as Editor); the server reads/writes via Sheets API v4 using a JWT
// signed with the service-account private key (Node crypto — no extra deps).
//
// Env (server-only):
//   GOOGLE_SERVICE_ACCOUNT_JSON   full service-account JSON, OR
//   GOOGLE_SERVICE_ACCOUNT_EMAIL  + GOOGLE_SERVICE_ACCOUNT_KEY (PEM private key)
// The private key NEVER reaches the client. The email is public (merchants
// must add it to their sheet) and is exposed via getServiceAccountEmail().
// ============================================================
import { createSign } from 'crypto'

const SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets'
const TOKEN_URL  = 'https://oauth2.googleapis.com/token'
const SCOPE      = 'https://www.googleapis.com/auth/spreadsheets'

// ── Required header row (row 1), Arabic, adapted to Algeria ──
export const SHEET_HEADERS = [
  'الاسم', 'الهاتف', 'الولاية', 'البلدية', 'SKU', 'المتغير', 'الكمية',
  'السعر', 'التوصيل', 'السعر الكلي', 'نوع التوصيل', 'اسم المنتج', 'الحالة',
] as const

export interface SheetOrderRow {
  name: string; phone: string; wilaya: string; baladia: string
  sku: string; variant: string; qty: number
  price: number; delivery: number; total: number
  deliveryType: 'home' | 'stopdesk'; productName: string; status?: string
}

/** Build a row in the exact SHEET_HEADERS order. */
export function buildOrderRow(o: SheetOrderRow): (string | number)[] {
  return [
    o.name, o.phone, o.wilaya, o.baladia, o.sku, o.variant, o.qty,
    o.price, o.delivery, o.total,
    o.deliveryType === 'stopdesk' ? 'المكتب' : 'المنزل',
    o.productName, o.status ?? 'معلقة',
  ]
}

// ── Credentials ──────────────────────────────────────────────
function getCreds(): { email: string; key: string } {
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (json) {
    const o = JSON.parse(json)
    if (!o.client_email || !o.private_key) throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON ناقص client_email/private_key')
    return { email: o.client_email, key: String(o.private_key).replace(/\\n/g, '\n') }
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key   = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!email || !key) throw new Error('حساب خدمة Google غير مهيأ على الخادم (GOOGLE_SERVICE_ACCOUNT_EMAIL / KEY)')
  return { email, key: key.replace(/\\n/g, '\n') }
}

/** Public service-account email merchants must add to their sheet as Editor. */
export function getServiceAccountEmail(): string | null {
  try { return getCreds().email } catch { return null }
}

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// In-memory access-token cache (per server instance).
let cached: { token: string; exp: number } | null = null

async function getAccessToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 60_000) return cached.token
  const { email, key } = getCreds()
  const now = Math.floor(Date.now() / 1000)
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim  = b64url(JSON.stringify({ iss: email, scope: SCOPE, aud: TOKEN_URL, exp: now + 3600, iat: now }))
  const signingInput = `${header}.${claim}`
  const signature = createSign('RSA-SHA256').update(signingInput).sign(key)
  const jwt = `${signingInput}.${b64url(signature)}`

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    throw new Error(`فشل مصادقة حساب الخدمة: ${data.error_description ?? data.error ?? `HTTP ${res.status}`}`)
  }
  cached = { token: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return cached.token
}

type Result<T> = { ok: true } & T | { ok: false; error: string }

function range(sheetName: string, a1: string): string {
  return encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'!${a1}`)
}

// ── testAccess: sheet exists + service account can edit it ──
export async function testAccess(spreadsheetId: string): Promise<Result<{ title: string; worksheets: string[] }>> {
  let token: string
  try { token = await getAccessToken() } catch (e) { return { ok: false, error: (e as Error).message } }
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}?fields=properties.title,sheets.properties.title`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 403) return { ok: false, error: 'حساب الخدمة لا يملك صلاحية الوصول. شارك الشيت مع بريد حساب الخدمة كـ Editor ثم أعد المحاولة.' }
  if (res.status === 404) return { ok: false, error: 'مُعرّف الشيت (Sheet ID) غير صحيح أو الشيت غير موجود.' }
  if (res.status === 401) return { ok: false, error: 'فشل مصادقة حساب الخدمة على الخادم — تحقّق من إعدادات المفتاح.' }
  if (!res.ok) { const e = await res.json().catch(() => ({})); return { ok: false, error: e.error?.message ?? `خطأ غير متوقع (HTTP ${res.status})` } }
  const data = await res.json()
  return { ok: true, title: data.properties?.title ?? '', worksheets: (data.sheets ?? []).map((s: any) => s.properties?.title).filter(Boolean) }
}

// ── readSheet ──
export async function readSheet(spreadsheetId: string, sheetName: string): Promise<Result<{ rows: string[][] }>> {
  let token: string
  try { token = await getAccessToken() } catch (e) { return { ok: false, error: (e as Error).message } }
  const res = await fetch(`${SHEETS_API}/${spreadsheetId}/values/${range(sheetName, 'A1:Z')}?majorDimension=ROWS`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 403) return { ok: false, error: 'لا توجد صلاحية للوصول — أضف بريد حساب الخدمة كـ Editor.' }
  if (res.status === 400 || res.status === 404) return { ok: false, error: 'تعذّر قراءة الورقة — تحقّق من اسم الورقة (Sheet Page Name).' }
  if (!res.ok) { const e = await res.json().catch(() => ({})); return { ok: false, error: e.error?.message ?? `HTTP ${res.status}` } }
  const data = await res.json()
  return { ok: true, rows: data.values ?? [] }
}

// ── validateHeaders: required Arabic headers present in row 1 ──
export async function validateHeaders(spreadsheetId: string, sheetName: string): Promise<Result<{ missing: string[] }>> {
  const r = await readSheet(spreadsheetId, sheetName)
  if (!r.ok) return r
  const header = (r.rows[0] ?? []).map(c => String(c).trim())
  const missing = SHEET_HEADERS.filter(h => !header.includes(h))
  if (missing.length) return { ok: false, error: `الصف الأول ينقصه أعمدة: ${missing.join('، ')}` }
  return { ok: true, missing: [] }
}

/** Write the header row (row 1) if the sheet is empty. */
export async function ensureHeaders(spreadsheetId: string, sheetName: string): Promise<Result<{}>> {
  const r = await readSheet(spreadsheetId, sheetName)
  if (!r.ok) return r
  if ((r.rows[0] ?? []).length > 0) return { ok: true }
  return writeRow(spreadsheetId, sheetName, [...SHEET_HEADERS])
}

// ── writeRow: append a row ──
export async function writeRow(spreadsheetId: string, sheetName: string, row: (string | number)[]): Promise<Result<{}>> {
  let token: string
  try { token = await getAccessToken() } catch (e) { return { ok: false, error: (e as Error).message } }
  const res = await fetch(
    `${SHEETS_API}/${spreadsheetId}/values/${range(sheetName, 'A1')}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ majorDimension: 'ROWS', values: [row] }),
    }
  )
  if (res.status === 403) return { ok: false, error: 'لا توجد صلاحية للكتابة — أضف بريد حساب الخدمة كـ Editor.' }
  if (!res.ok) { const e = await res.json().catch(() => ({})); return { ok: false, error: e.error?.message ?? `HTTP ${res.status}` } }
  return { ok: true }
}

/** Extract a spreadsheet ID from a pasted URL or accept a raw ID. */
export function parseSpreadsheetId(input: string): string {
  const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m ? m[1] : input.trim()
}
