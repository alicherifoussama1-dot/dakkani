// ============================================================
// Confirmili — Typed Supabase query functions
// Source of truth for orders = shared `orders` table.
// Confirmili-specific data lives in confirmili_* tables.
// ============================================================
import { createClient } from '@/lib/supabase/client'
import { toDbStatus, normalizeStatus } from './statuses'

// ─── Types ───────────────────────────────────────────────────
export interface OrderFilters {
  storeId:    string
  search?:    string
  status?:    string
  source?:    string
  from?:      string   // ISO date
  to?:        string   // ISO date
  trashed?:   boolean
  limit?:     number
}

export interface Statistics {
  totalRevenue:    number
  deliveryCost:    number
  netRevenue:      number
  confirmed:       number
  cancelled:       number
  failed:          number
  pending:         number
  postponed:       number
  duplicate:       number
  delivered:       number
  returned:        number
  confirmRate:     number
  deliveryRate:    number
  topWilayas:      { name: string; count: number }[]
  topProducts:     { name: string; count: number }[]
}

const ORDER_SELECT = `
  id,order_number,customer_name,customer_phone,customer_phone2,
  address,total,subtotal,status,delivery_fee,declared_delivery_fee,real_delivery_fee,
  delivery_type,delivery_company_id,tracking_number,
  call_attempts,last_call_at,notes,is_trashed,
  confirmed_at,shipped_at,delivered_at,created_at,source,utm_source,
  wilaya:wilayas(name_ar),commune:communes(name_ar),
  items:order_items(product_name,quantity,unit_price,product_id)
`

// ─── ORDERS ──────────────────────────────────────────────────
export async function getOrders(filters: OrderFilters) {
  const sb = createClient()
  let q = sb.from('orders').select(ORDER_SELECT).eq('store_id', filters.storeId)

  if (filters.status)        q = q.eq('status', toDbStatus(filters.status))
  if (filters.source)        q = q.eq('source', filters.source)
  if (filters.from)          q = q.gte('created_at', filters.from)
  if (filters.to)            q = q.lte('created_at', filters.to)
  if (filters.search) {
    const s = filters.search.trim()
    q = q.or(`customer_name.ilike.%${s}%,customer_phone.ilike.%${s}%,order_number.ilike.%${s}%`)
  }
  q = q.order('created_at', { ascending: false }).limit(filters.limit ?? 1000)

  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function getOrderById(orderId: string) {
  const sb = createClient()
  const { data, error } = await sb.from('orders').select(ORDER_SELECT).eq('id', orderId).single()
  if (error) throw error
  return data
}

// Update status + write order_history. Handles failed escalation via caller.
export async function updateOrderStatus(orderId: string, newStatusUi: string, changedBy = 'me') {
  const sb = createClient()
  const dbStatus = toDbStatus(newStatusUi)

  // capture old status for history
  const { data: existing } = await sb.from('orders').select('status,store_id').eq('id', orderId).single()
  const oldStatus = existing?.status ?? null

  const patch: Record<string, any> = { status: dbStatus }
  if (dbStatus === 'confirmed') patch.confirmed_at = new Date().toISOString()
  if (dbStatus === 'shipped')   patch.shipped_at   = new Date().toISOString()
  if (dbStatus === 'delivered') patch.delivered_at = new Date().toISOString()

  const { error } = await sb.from('orders').update(patch).eq('id', orderId)
  if (error) throw error

  // history (best-effort — table from migration 010)
  if (existing?.store_id) {
    await sb.from('order_history').insert({
      order_id: orderId, store_id: existing.store_id,
      old_status: oldStatus, new_status: dbStatus, changed_by: changedBy,
    }).then(() => {}, () => {})
  }
  return { oldStatus, newStatus: dbStatus }
}

export async function bulkUpdateStatus(orderIds: string[], newStatusUi: string, changedBy = 'me') {
  await Promise.all(orderIds.map(id => updateOrderStatus(id, newStatusUi, changedBy)))
}

export async function incrementCallAttempt(orderId: string, current: number) {
  const sb = createClient()
  const { error } = await sb.from('orders')
    .update({ call_attempts: (current ?? 0) + 1, last_call_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) throw error
}

export async function moveOrderToTrash(orderId: string) {
  const sb = createClient()
  const { error } = await sb.from('orders').update({ is_trashed: true }).eq('id', orderId)
  if (error) throw error
}

export async function restoreOrder(orderId: string) {
  const sb = createClient()
  const { error } = await sb.from('orders').update({ is_trashed: false }).eq('id', orderId)
  if (error) throw error
}

export async function getOrderHistory(orderId: string) {
  const sb = createClient()
  const { data } = await sb.from('order_history')
    .select('*').eq('order_id', orderId).order('created_at', { ascending: false })
  return data ?? []
}

// ─── VERIFY (blacklist across all orders by phone) ───────────
export interface VerifyResult {
  delivered: number
  returned:  number
  total:     number
  riskRatio: number  // 0-100 (% returned/failed)
}
export async function getVerifyCounters(storeId: string, phone: string): Promise<VerifyResult> {
  const sb = createClient()
  const { data } = await sb.from('orders')
    .select('status').eq('store_id', storeId).eq('customer_phone', phone)
  const rows = data ?? []
  const delivered = rows.filter(r => r.status === 'delivered').length
  const returned  = rows.filter(r => ['returned','cancelled','failed_1','failed_2','failed_3'].includes(r.status)).length
  const denom = delivered + returned
  return {
    delivered, returned, total: rows.length,
    riskRatio: denom > 0 ? Math.round((returned / denom) * 100) : 0,
  }
}

// ─── STATISTICS ──────────────────────────────────────────────
export async function getStatistics(storeId: string, from?: string, to?: string): Promise<Statistics> {
  const sb = createClient()
  let q = sb.from('orders')
    .select('status,total,declared_delivery_fee,real_delivery_fee,delivery_fee,wilaya:wilayas(name_ar),items:order_items(product_name,quantity)')
    .eq('store_id', storeId).eq('is_trashed', false)
  if (from) q = q.gte('created_at', from)
  if (to)   q = q.lte('created_at', to)
  const { data } = await q
  const rows = (data ?? []) as any[]

  const by = (s: string) => rows.filter(r => normalizeStatus(r.status) === s).length
  const delivered = rows.filter(r => r.status === 'delivered')
  const returned  = rows.filter(r => r.status === 'returned').length
  const confirmed = by('confirmed')
  const totalRevenue = delivered.reduce((s, r) => s + (r.total ?? 0), 0)
  const deliveryCost = delivered.reduce((s, r) => s + (r.real_delivery_fee ?? r.delivery_fee ?? 0), 0)

  const wilCount: Record<string, number> = {}
  const prodCount: Record<string, number> = {}
  rows.forEach(r => {
    const w = r.wilaya?.name_ar ?? '—'; wilCount[w] = (wilCount[w] ?? 0) + 1
    ;(r.items ?? []).forEach((it: any) => { prodCount[it.product_name] = (prodCount[it.product_name] ?? 0) + (it.quantity ?? 1) })
  })
  const top = (m: Record<string, number>) => Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,count])=>({name,count}))

  const totalForRate = rows.length || 1
  const deliverDenom = (delivered.length + returned) || 1
  return {
    totalRevenue, deliveryCost, netRevenue: totalRevenue - deliveryCost,
    confirmed, cancelled: by('cancelled'),
    failed: by('failed_01') + by('failed_02') + by('failed_03'),
    pending: by('pending'), postponed: by('postponed'), duplicate: by('duplicate'),
    delivered: delivered.length, returned,
    confirmRate: Math.round((confirmed / totalForRate) * 100),
    deliveryRate: Math.round((delivered.length / deliverDenom) * 100),
    topWilayas: top(wilCount), topProducts: top(prodCount),
  }
}

// ─── TEAM ────────────────────────────────────────────────────
export async function getTeam(storeId: string, teamType?: 'confirmation'|'delivery') {
  const sb = createClient()
  let q = sb.from('confirmili_team').select('*').eq('store_id', storeId)
  if (teamType) q = q.eq('team_type', teamType)
  const { data } = await q.order('created_at', { ascending: false })
  return data ?? []
}
export async function createTeamMember(payload: any) {
  const sb = createClient()
  const { data, error } = await sb.from('confirmili_team').insert(payload).select().single()
  if (error) throw error
  return data
}
export async function updateTeamMember(id: string, patch: any) {
  const sb = createClient()
  const { error } = await sb.from('confirmili_team').update(patch).eq('id', id)
  if (error) throw error
}
export async function deleteTeamMember(id: string) {
  const sb = createClient()
  const { error } = await sb.from('confirmili_team').delete().eq('id', id)
  if (error) throw error
}

// ─── DELIVERY COMPANIES ──────────────────────────────────────
export async function getDeliveryCompanies(storeId: string) {
  const sb = createClient()
  const { data } = await sb.from('confirmili_delivery_companies')
    .select('*').eq('store_id', storeId).order('created_at', { ascending: true })
  return data ?? []
}
export async function createDeliveryCompany(payload: any) {
  const sb = createClient()
  const { data, error } = await sb.from('confirmili_delivery_companies').insert(payload).select().single()
  if (error) throw error
  return data
}
export async function toggleDeliveryCompany(id: string, field: 'is_active'|'is_automatic', value: boolean) {
  const sb = createClient()
  const { error } = await sb.from('confirmili_delivery_companies').update({ [field]: value }).eq('id', id)
  if (error) throw error
}
export async function deleteDeliveryCompany(id: string) {
  const sb = createClient()
  const { error } = await sb.from('confirmili_delivery_companies').delete().eq('id', id)
  if (error) throw error
}

// ─── PRODUCTS (uses shared products table + min_stock_alert) ──
export async function addStock(productId: string, storeId: string, qty: number) {
  const sb = createClient()
  const { data: rows } = await sb.from('warehouse_stock')
    .select('id,quantity').eq('product_id', productId).eq('store_id', storeId).limit(1)
  if (rows && rows[0]) {
    await sb.from('warehouse_stock').update({ quantity: (rows[0].quantity ?? 0) + qty }).eq('id', rows[0].id)
  }
}

// ─── WILAYA ⇄ COMPANY MAP ────────────────────────────────────
export async function getWilayaCompanyMap(storeId: string) {
  const sb = createClient()
  const { data } = await sb.from('confirmili_wilaya_company_map').select('*').eq('store_id', storeId)
  return data ?? []
}
export async function setWilayaCompany(storeId: string, wilayaId: number, companyId: string) {
  const sb = createClient()
  const { error } = await sb.from('confirmili_wilaya_company_map')
    .upsert({ store_id: storeId, wilaya_id: wilayaId, company_id: companyId }, { onConflict: 'store_id,wilaya_id' })
  if (error) throw error
}

// ─── NOTIFICATIONS ───────────────────────────────────────────
export async function getNotifications(storeId: string) {
  const sb = createClient()
  const { data } = await sb.from('confirmili_notifications')
    .select('*').eq('store_id', storeId).order('created_at', { ascending: false }).limit(50)
  return data ?? []
}
export async function markNotificationsRead(storeId: string) {
  const sb = createClient()
  await sb.from('confirmili_notifications').update({ is_read: true }).eq('store_id', storeId).eq('is_read', false)
}

// ─── SEND REPORTS / SEND TO DELIVERY COMPANY ────────────────
export async function sendOrderToDeliveryCompany(opts: {
  storeId: string; orderId: string; companyId?: string; companyName?: string; deliveryType?: string
}) {
  const sb = createClient()
  const prefix = opts.deliveryType === 'stopdesk' ? 'SD' : 'HM'
  const tracking = `${prefix}-${Date.now().toString(36).toUpperCase()}`
  // persist tracking on the order
  await sb.from('orders').update({ tracking_number: tracking, status: 'shipped', shipped_at: new Date().toISOString() }).eq('id', opts.orderId)
  // send report
  const { error } = await sb.from('confirmili_send_reports').insert({
    store_id: opts.storeId, order_id: opts.orderId, company_id: opts.companyId ?? null,
    tracking_num: tracking, is_auto: false, status: 'sent',
  })
  if (error) throw error
  return tracking
}
export async function getSendReports(storeId: string) {
  const sb = createClient()
  const { data } = await sb.from('confirmili_send_reports')
    .select('*').eq('store_id', storeId).order('sent_at', { ascending: false }).limit(100)
  return data ?? []
}

// ─── FINANCE CONFIG ──────────────────────────────────────────
export async function getFinanceConfig(storeId: string) {
  const sb = createClient()
  const { data } = await sb.from('confirmili_finance_config').select('*').eq('store_id', storeId).maybeSingle()
  return data
}
export async function saveFinanceConfig(storeId: string, cfg: any) {
  const sb = createClient()
  const { error } = await sb.from('confirmili_finance_config')
    .upsert({ store_id: storeId, ...cfg }, { onConflict: 'store_id' })
  if (error) throw error
}

export interface ProfitInput {
  declaredRevenue: number
  realDelivery:    number
  monthlyAd:       number
  confirmationCost:number
  packagingCost:   number
  trackingCost:    number
  otherCosts:      number
}
export function calculateProfit(i: ProfitInput): number {
  return i.declaredRevenue - i.realDelivery - i.monthlyAd
    - i.confirmationCost - i.packagingCost - i.trackingCost - i.otherCosts
}
