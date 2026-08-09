// ============================================================
// GET /api/mobile/v1/analytics — the الإحصائيات page, for mobile.
//
// This is the MOBILE SHAPE of app/(dashboard)/analytics/page.tsx, which is a
// server component and therefore cannot be re-exported the way
// /api/mobile/v1/dashboard re-exports the analytics handler. Every number
// below is computed with the SAME rules as that page, in the same order:
//
//   revenue          = Σ total of DELIVERED orders
//   deliveryRevenue  = Σ delivery_fee of DELIVERED orders
//   grossProfit      = revenue − deliveryRevenue
//   avgOrder         = revenue / delivered count
//   deliveryRate     = delivered / all orders
//   cancelRate       = (cancelled + returned) / all orders
//   uniqueCustomers  = distinct customer_phone
//   byWilaya         = per-wilaya total / delivered / revenue, top 10
//
// If that page's rules change, change them here too — the two must agree.
// Window: last 30 days, exactly as the page uses.
// ============================================================
export const dynamic = 'force-dynamic'

import { getMobileContext, ok } from '@/lib/mobile/context'

/** The page reads every order in the window; cap the read so a very large
 *  store cannot time out the request. Ordered newest-first so the cap drops
 *  the oldest rows rather than an arbitrary slice. */
const MAX_ROWS = 5000

export async function GET(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get('days') ?? 30), 1), 90)
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const { data, error, count } = await ctx.supabase
    .from('orders')
    .select('total,status,created_at,wilaya_id,delivery_fee,customer_phone', { count: 'exact' })
    .eq('store_id', ctx.store.id)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(MAX_ROWS)

  if (error) return ok({ error: error.message, kpis: null, byWilaya: [] })

  const orders = (data ?? []) as any[]
  const delivered = orders.filter(o => o.status === 'delivered')
  const cancelled = orders.filter(o => o.status === 'cancelled')
  const returned = orders.filter(o => o.status === 'returned')

  const num = (v: any) => Number(v ?? 0)
  const revenue = delivered.reduce((s, o) => s + num(o.total), 0)
  const deliveryRevenue = delivered.reduce((s, o) => s + num(o.delivery_fee), 0)

  // Resolve wilaya names in ONE query — the web page renders "ولاية <id>",
  // which is a placeholder; the app shows the real name.
  const byWilaya: Record<string, { total: number; delivered: number; revenue: number }> = {}
  for (const o of orders) {
    const w = String(o.wilaya_id ?? 0)
    if (!byWilaya[w]) byWilaya[w] = { total: 0, delivered: 0, revenue: 0 }
    byWilaya[w].total++
    if (o.status === 'delivered') {
      byWilaya[w].delivered++
      byWilaya[w].revenue += num(o.total)
    }
  }

  const top = Object.entries(byWilaya)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 10)

  const names: Record<number, string> = {}
  const ids = top.map(([w]) => Number(w)).filter(Boolean)
  if (ids.length) {
    // The wilayas table has name_ar / name_fr — there is NO `name` column.
    const { data: ws } = await ctx.supabase.from('wilayas').select('id,name_ar,name_fr').in('id', ids)
    for (const w of ws ?? []) names[(w as any).id] = (w as any).name_ar ?? (w as any).name_fr
  }

  return ok({
    days,
    // `count` is the true number in the window; `orders.length` is what was
    // read. They differ only for a store past MAX_ROWS, and `truncated` says so
    // rather than letting the KPIs quietly describe a subset.
    totalOrders: count ?? orders.length,
    truncated: (count ?? 0) > orders.length,
    kpis: {
      revenue,
      grossProfit: revenue - deliveryRevenue,
      avgOrder: delivered.length ? revenue / delivered.length : 0,
      deliveryRate: orders.length ? Math.round((delivered.length / orders.length) * 100) : 0,
      cancelRate: orders.length
        ? Math.round(((cancelled.length + returned.length) / orders.length) * 100) : 0,
      deliveryRevenue,
      ordersCount: orders.length,
      uniqueCustomers: new Set(orders.map(o => o.customer_phone).filter(Boolean)).size,
    },
    byWilaya: top.map(([w, s]) => ({
      wilaya_id: Number(w) || null,
      wilaya_name: names[Number(w)] ?? null,
      total: s.total,
      delivered: s.delivered,
      delivery_rate: s.total > 0 ? Math.round((s.delivered / s.total) * 100) : 0,
      revenue: s.revenue,
    })),
  })
}
