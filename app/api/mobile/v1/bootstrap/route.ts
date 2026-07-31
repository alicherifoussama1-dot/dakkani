// ============================================================
// GET /api/mobile/v1/bootstrap
//
// ONE call at app launch: store identity, settings, store list for the
// switcher, and the counters the home screen needs. Replaces ~6 round
// trips — the single biggest cold-start win on 3G.
// ============================================================
export const dynamic = 'force-dynamic'

import { getMobileContext, ok } from '@/lib/mobile/context'

export async function GET(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const { supabase, store } = ctx
  const since = new Date(); since.setHours(0, 0, 0, 0)
  // Billing usage is measured per calendar month, matching the web
  // billing/plans page exactly so the two never disagree.
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1); firstOfMonth.setHours(0, 0, 0, 0)

  const countBy = (col: string, val: string | string[]) => {
    const q = supabase.from('orders').select('id', { count: 'exact', head: true }).eq('store_id', store.id)
    return Array.isArray(val) ? q.in(col, val) : q.eq(col, val)
  }

  const [settings, newOrders, unread, products, todays, monthOrders, allProducts] = await Promise.all([
    supabase.from('store_settings').select('*').eq('store_id', store.id).maybeSingle(),
    countBy('status', 'new'),
    supabase.from('confirmili_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store.id).eq('is_read', false),
    supabase.from('products').select('id', { count: 'exact', head: true })
      .eq('store_id', store.id).eq('is_active', true),
    supabase.from('orders').select('total,status')
      .eq('store_id', store.id).gte('created_at', since.toISOString()),
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('store_id', store.id).gte('created_at', firstOfMonth.toISOString()),
    // Plan limits count ALL products, active or not — same as the web.
    supabase.from('products').select('id', { count: 'exact', head: true })
      .eq('store_id', store.id),
  ])

  // Revenue rule mirrors /api/dashboard/analytics exactly: abandoned excluded.
  const rows = todays.data ?? []
  const revenueToday = rows
    .filter((r: any) => r.status !== 'abandoned')
    .reduce((a: number, r: any) => a + Number(r.total ?? 0), 0)

  return ok({
    store: {
      id: store.id, name: store.name, slug: store.slug,
      plan: store.plan, logo_url: store.logo_url,
    },
    stores: ctx.allStores,
    settings: settings.data ?? null,
    counters: {
      newOrders: newOrders.count ?? 0,
      unreadNotifications: unread.count ?? 0,
      activeProducts: products.count ?? 0,
      ordersToday: rows.length,
      revenueToday,
      // Billing usage (calendar month) — drives the الاشتراك screen.
      ordersThisMonth: monthOrders.count ?? 0,
      productCount: allProducts.count ?? 0,
    },
    server_time: new Date().toISOString(),
  })
}
