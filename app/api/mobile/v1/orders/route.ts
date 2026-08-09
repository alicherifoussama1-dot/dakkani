// ============================================================
// GET /api/mobile/v1/orders — paginated, filterable order list.
//
// Read-only. Returns a mobile-shaped payload (wilaya name resolved,
// item summary flattened) so the app doesn't need extra round trips.
// ============================================================
export const dynamic = 'force-dynamic'

import { getMobileContext, ok, ilikeTerm } from '@/lib/mobile/context'

// Groups the UI exposes as one chip but that map to several DB statuses.
const GROUPS: Record<string, string[]> = {
  shipping: ['shipped', 'in_transit', 'out_for_delivery', 'with_driver', 'at_stopdesk'],
  failed: ['failed', 'failed_1', 'failed_2', 'failed_3'],
}

export async function GET(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const search = url.searchParams.get('q')?.trim()
  // Exact customer identity, for the customer detail screen. A fuzzy `q`
  // search on a phone number can also match an order_number that happens to
  // contain the same digits, which is wrong for a per-customer history.
  const phone = url.searchParams.get('phone')?.trim()
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 50)
  const cursor = Number(url.searchParams.get('offset') ?? 0)

  let q = ctx.supabase
    .from('orders')
    .select(
      'id,order_number,customer_name,customer_phone,total,status,delivery_type,' +
      'wilaya_id,baladia,stopdesk_office_name,utm_source,source,fraud_score,created_at,' +
      'order_items(quantity,product_id,products(name,name_ar,images))',
      { count: 'exact' },
    )
    .eq('store_id', ctx.store.id)
    .order('created_at', { ascending: false })
    .range(cursor, cursor + limit - 1)

  if (status && status !== 'all') {
    const group = GROUPS[status]
    q = group ? q.in('status', group) : q.eq('status', status)
  }
  if (phone) q = q.eq('customer_phone', phone)
  if (search) {
    // Order number or customer name/phone — matches the web list behaviour.
    const v = ilikeTerm(search)
    q = q.or(
      `order_number.ilike.${v},customer_name.ilike.${v},customer_phone.ilike.${v}`,
    )
  }

  const { data, count, error } = await q
  if (error) return ok({ orders: [], total: 0, error: error.message })

  // Resolve wilaya names in ONE query rather than per row.
  const ids = Array.from(new Set((data ?? []).map((o: any) => o.wilaya_id).filter(Boolean)))
  const names: Record<number, string> = {}
  if (ids.length) {
    // NOTE: the wilayas table has name_ar / name_fr — there is NO `name` column.
    const { data: ws } = await ctx.supabase.from('wilayas').select('id,name_ar,name_fr').in('id', ids)
    for (const w of ws ?? []) names[(w as any).id] = (w as any).name_ar ?? (w as any).name_fr
  }

  const orders = (data ?? []).map((o: any) => {
    const items = o.order_items ?? []
    const first = items[0]?.products
    return {
      id: o.id,
      order_number: o.order_number,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      total: Number(o.total ?? 0),
      status: o.status,
      delivery_type: o.delivery_type,
      wilaya_id: o.wilaya_id,
      wilaya_name: names[o.wilaya_id] ?? null,
      commune: o.baladia ?? null,
      stopdesk_office: o.stopdesk_office_name ?? null,
      source: o.utm_source ?? o.source ?? null,   // 🔒 read-only attribution
      fraud_score: o.fraud_score ?? 0,
      created_at: o.created_at,
      items_count: items.reduce((n: number, i: any) => n + (i.quantity ?? 0), 0),
      product_name: first?.name_ar ?? first?.name ?? null,
      product_image: Array.isArray(first?.images) ? first.images[0]?.url ?? null : null,
    }
  })

  return ok({
    orders,
    total: count ?? orders.length,
    next_offset: cursor + orders.length < (count ?? 0) ? cursor + orders.length : null,
  })
}
