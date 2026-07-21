export const dynamic = 'force-dynamic'
export const metadata = { title: 'الرئيسية — Commerco' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import DashboardHome from '@/components/dashboard/DashboardHome'

// Mirocho-parity dashboard data. All values are REAL (no random/mock).
// Panels fed: 5 status cards + %change vs yesterday, gross orders value,
// estimated (delivered) revenue, funnel, wilaya distribution, 7-day series.
export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { activeStore: store } = await getActiveStore(supabase, user.id)
  const storeId = store?.id ?? ''

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000)
  const sevenDaysAgo = new Date(startOfToday.getTime() - 6 * 86400000)

  const [todayRes, yesterdayRes, weekRes, productsRes, storeReadyRes] = await Promise.all([
    supabase.from('orders')
      .select('id, total, status, utm_source, wilaya_id, created_at')
      .eq('store_id', storeId)
      .gte('created_at', startOfToday.toISOString()),
    supabase.from('orders')
      .select('id, status, total')
      .eq('store_id', storeId)
      .gte('created_at', startOfYesterday.toISOString())
      .lt('created_at', startOfToday.toISOString()),
    supabase.from('orders')
      .select('id, status, total, created_at, wilaya_id')
      .eq('store_id', storeId)
      .gte('created_at', sevenDaysAgo.toISOString()),
    supabase.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId).eq('is_active', true),
    supabase.from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', storeId),
  ])

  const today = todayRes.data ?? []
  const yesterday = yesterdayRes.data ?? []
  const week = weekRes.data ?? []

  const isNew        = (s: string) => ['new', 'duplicate'].includes(s)
  const isConfirmed  = (s: string) => ['confirmed', 'processing'].includes(s)
  const isShipped    = (s: string) => ['shipped', 'in_transit', 'out_for_delivery', 'with_driver', 'at_stopdesk'].includes(s)
  const isCompleted  = (s: string) => s === 'delivered'
  const isAbandoned  = (s: string) => s === 'abandoned'
  const countBy = (rows: any[], test: (s: string) => boolean) => rows.filter(r => test(r.status)).length
  const pct = (t: number, y: number) => (y === 0 ? (t > 0 ? 100 : 0) : Math.round(((t - y) / y) * 100))

  const statusCards = {
    new:        { today: countBy(today, isNew),       change: pct(countBy(today, isNew),       countBy(yesterday, isNew)) },
    confirmed:  { today: countBy(today, isConfirmed), change: pct(countBy(today, isConfirmed), countBy(yesterday, isConfirmed)) },
    shipped:    { today: countBy(today, isShipped),   change: pct(countBy(today, isShipped),   countBy(yesterday, isShipped)) },
    completed:  { today: countBy(today, isCompleted), change: pct(countBy(today, isCompleted), countBy(yesterday, isCompleted)) },
    abandoned:  { today: countBy(today, isAbandoned), change: pct(countBy(today, isAbandoned), countBy(yesterday, isAbandoned)) },
  }

  const grossValue = today.filter(o => !isAbandoned(o.status)).reduce((s, o) => s + (o.total ?? 0), 0)
  const grossCount = today.filter(o => !isAbandoned(o.status)).length
  const deliveredRevenue = today.filter(o => isCompleted(o.status)).reduce((s, o) => s + (o.total ?? 0), 0)
  const yesterdayRevenue = yesterday.filter(o => isCompleted(o.status)).reduce((s, o) => s + (o.total ?? 0), 0)
  const revenueChange = pct(deliveredRevenue, yesterdayRevenue)

  const funnel = {
    orders:    grossCount,
    confirmed: today.filter(o => isConfirmed(o.status) || isShipped(o.status) || isCompleted(o.status)).length,
    shipped:   today.filter(o => isShipped(o.status) || isCompleted(o.status)).length,
    delivered: today.filter(o => isCompleted(o.status)).length,
    sources: {
      facebook: today.filter(o => o.utm_source === 'facebook').length,
      tiktok:   today.filter(o => o.utm_source === 'tiktok').length,
      other:    today.filter(o => !['facebook', 'tiktok'].includes(o.utm_source ?? '')).length,
    },
  }

  const wilayaCounts: Record<number, number> = {}
  for (const o of week) {
    if (o.wilaya_id && !isAbandoned(o.status)) wilayaCounts[o.wilaya_id] = (wilayaCounts[o.wilaya_id] ?? 0) + 1
  }

  const period: { date: string; label: string; orders: number; revenue: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(startOfToday.getTime() - i * 86400000)
    const next = new Date(d.getTime() + 86400000)
    const dayRows = week.filter(o => { const t = new Date(o.created_at).getTime(); return t >= d.getTime() && t < next.getTime() })
    period.push({
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      orders: dayRows.filter(o => !isAbandoned(o.status)).length,
      revenue: dayRows.filter(o => isCompleted(o.status)).reduce((s, o) => s + (o.total ?? 0), 0),
    })
  }
  const periodRevenue = period.reduce((s, p) => s + p.revenue, 0)
  const periodOrders = period.reduce((s, p) => s + p.orders, 0)

  return (
    <DashboardHome
      storeName={store?.name ?? 'متجري'}
      userName={user.email?.split('@')[0] ?? 'التاجر'}
      plan={store?.plan ?? 'free'}
      data={{
        statusCards,
        grossValue, grossCount,
        deliveredRevenue, revenueChange,
        funnel,
        wilayaCounts,
        period, periodRevenue, periodOrders,
        productCount: productsRes.count ?? 0,
        storeReady: (storeReadyRes.count ?? 0) > 0,
      }}
    />
  )
}
