// ============================================================
// Order routing — resolves WHERE a new order goes and pushes it
// to the assigned Google Sheet when required. SERVER-SIDE ONLY.
//
// Resolution: product.order_routing (first item) → if 'inherit'
// → store_settings.order_routing → default 'confirmili_only'.
// Sheet: product.google_sheet_id → else store default sheet.
//
// GUARANTEE: never throws — a Sheets failure must NEVER block
// order creation. Failures are recorded on orders.sheet_status.
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { appendOrderRow } from '@/lib/google/sheets'

export type OrderRouting = 'sheet_only' | 'confirmili_only' | 'both'

// Service-role client: storefront customers are anonymous, but routing
// needs merchant rows (google_accounts.refresh_token) that RLS protects.
// This key exists only in server env — never NEXT_PUBLIC_.
function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function resolveRouting(opts: {
  storeId: string
  firstProductId: string
}): Promise<{ routing: OrderRouting; sheetId: string | null }> {
  const admin = adminClient()
  if (!admin) return { routing: 'confirmili_only', sheetId: null }

  try {
    const [{ data: product }, { data: settings }] = await Promise.all([
      admin.from('products')
        .select('order_routing, google_sheet_id')
        .eq('id', opts.firstProductId).eq('store_id', opts.storeId).maybeSingle(),
      admin.from('store_settings')
        .select('order_routing')
        .eq('store_id', opts.storeId).maybeSingle(),
    ])

    const productRouting = product?.order_routing as string | undefined
    const routing: OrderRouting =
      (productRouting && productRouting !== 'inherit'
        ? productRouting
        : settings?.order_routing ?? 'confirmili_only') as OrderRouting

    let sheetId: string | null = product?.google_sheet_id ?? null
    if (routing !== 'confirmili_only' && !sheetId) {
      const { data: def } = await admin.from('google_sheets')
        .select('id').eq('store_id', opts.storeId)
        .eq('is_default', true).eq('status', true).maybeSingle()
      sheetId = def?.id ?? null
    }
    return { routing, sheetId }
  } catch {
    // Columns missing (migration 015 not applied) → current behavior
    return { routing: 'confirmili_only', sheetId: null }
  }
}

export async function pushOrderToSheet(opts: {
  storeId: string
  sheetId: string
  order: {
    order_number: string
    created_at?: string
    customer_name: string
    customer_phone: string
    wilaya_name?: string
    baladia?: string | null
    address?: string | null
    delivery_fee: number
    discount_amount: number
    total: number
    notes?: string | null
    status: string
    source?: string | null
  }
  items: { product_name: string; variant_key?: string; quantity: number; unit_price: number }[]
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = adminClient()
  if (!admin) return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY غير مهيأ' }

  try {
    const { data: sheet } = await admin.from('google_sheets')
      .select('spreadsheet_id, worksheet_name, status, account:google_accounts(refresh_token, status)')
      .eq('id', opts.sheetId).eq('store_id', opts.storeId).maybeSingle()

    if (!sheet || !sheet.status) return { ok: false, error: 'الشيت غير مفعّل أو غير موجود' }
    const account = sheet.account as any
    if (!account?.refresh_token || account.status === false) {
      return { ok: false, error: 'حساب Google غير مرتبط أو معطّل' }
    }

    const o = opts.order
    const first = opts.items[0]
    const productLabel = opts.items.length > 1
      ? `${first?.product_name ?? ''} (+${opts.items.length - 1})`
      : first?.product_name ?? ''
    const qty = opts.items.reduce((s, i) => s + i.quantity, 0)

    return appendOrderRow({
      refreshToken: account.refresh_token,
      spreadsheetId: sheet.spreadsheet_id,
      worksheetName: sheet.worksheet_name,
      row: {
        order_ref: o.order_number,
        date: new Date(o.created_at ?? Date.now()).toLocaleString('fr-DZ', { dateStyle: 'short', timeStyle: 'short' }),
        name: o.customer_name,
        phone: o.customer_phone,
        wilaya: o.wilaya_name ?? '',
        baladia: o.baladia ?? '',
        address: o.address ?? '',
        product: productLabel,
        variant: first?.variant_key && first.variant_key !== 'default' ? first.variant_key : '',
        qty,
        unit_price: first?.unit_price ?? 0,
        delivery_fee: o.delivery_fee,
        discount: o.discount_amount,
        total: o.total,
        notes: o.notes ?? '',
        status: 'معلقة',
        source: o.source ?? 'storefront',
      },
    })
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// Mark the routing result on the order row — best-effort
export async function markOrderRouting(orderId: string, patch: {
  routed_to: 'confirmili' | 'sheet' | 'both'
  sheet_status?: 'sent' | 'failed' | null
  sheet_error?: string | null
}): Promise<void> {
  const admin = adminClient()
  if (!admin) return
  try { await admin.from('orders').update(patch).eq('id', orderId) } catch {}
}
