export const dynamic = 'force-dynamic'
export const metadata = { title: 'الرئيسية — Commerco' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import DashboardHome from '@/components/dashboard/DashboardHome'
import { getAlgiersDateRange, getAlgiersHour, getAlgiersDateString, formatAlgiersChartDate } from '@/lib/utils/timezone'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { activeStore: store } = await getActiveStore(supabase, user.id)
  const storeId = store?.id ?? ''

  // Initial Algiers Date Range ('today')
  const dateRange = getAlgiersDateRange('today')

  const [currentOrdersRes, prevOrdersRes, wilayasRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status, utm_source, wilaya_id, created_at')
      .eq('store_id', storeId)
      .gte('created_at', dateRange.startISO)
      .lte('created_at', dateRange.endISO),

    supabase
      .from('orders')
      .select('id, total, status, utm_source, created_at')
      .eq('store_id', storeId)
      .gte('created_at', dateRange.prevStartISO)
      .lte('created_at', dateRange.prevEndISO),

    supabase
      .from('wilayas')
      .select('id, name, name_ar, code'),
  ])

  const currentOrders = currentOrdersRes.data ?? []
  const prevOrders = prevOrdersRes.data ?? []
  const wilayasList = wilayasRes.data ?? []

  const wilayaMap: Record<number, string> = {}
  wilayasList.forEach((w) => {
    wilayaMap[w.id] = w.name_ar || w.name || `ولاية ${w.id}`
  })

  const isAbandoned = (s: string) => s === 'abandoned'
  const isFacebook = (src?: string | null) => (src ?? '').toLowerCase().includes('facebook') || (src ?? '').toLowerCase().includes('fb') || (src ?? '').toLowerCase().includes('meta')
  const isTikTok = (src?: string | null) => (src ?? '').toLowerCase().includes('tiktok') || (src ?? '').toLowerCase().includes('tt')

  const calcKpis = (rows: any[]) => {
    const totalOrders = rows.length
    const abandonedOrders = rows.filter(r => isAbandoned(r.status)).length
    const normalOrders = totalOrders - abandonedOrders
    const facebookOrders = rows.filter(r => isFacebook(r.utm_source)).length
    const tiktokOrders = rows.filter(r => isTikTok(r.utm_source)).length
    const otherOrders = totalOrders - (facebookOrders + tiktokOrders)
    const revenue = rows.filter(r => !isAbandoned(r.status)).reduce((acc, r) => acc + (r.total ?? 0), 0)

    return {
      totalOrders,
      abandonedOrders,
      normalOrders,
      facebookOrders,
      tiktokOrders,
      otherOrders,
      revenue,
    }
  }

  const curKpis = calcKpis(currentOrders)
  const prevKpis = calcKpis(prevOrders)

  const calcPct = (cur: number, prev: number) => {
    if (prev === 0) return cur > 0 ? 100 : 0
    return Math.round(((cur - prev) / prev) * 100 * 10) / 10
  }

  const generateSparklines = (rows: any[]) => {
    const totalPoints = 7
    const sparklines = {
      totalOrders: Array(totalPoints).fill(0),
      abandonedOrders: Array(totalPoints).fill(0),
      normalOrders: Array(totalPoints).fill(0),
      facebookOrders: Array(totalPoints).fill(0),
      tiktokOrders: Array(totalPoints).fill(0),
      otherOrders: Array(totalPoints).fill(0),
    }

    if (rows.length === 0) return sparklines

    const startTime = new Date(dateRange.startISO).getTime()
    const endTime = new Date(dateRange.endISO).getTime()
    const step = Math.max(1, (endTime - startTime) / totalPoints)

    rows.forEach(r => {
      const t = new Date(r.created_at).getTime()
      let idx = Math.floor((t - startTime) / step)
      if (idx >= totalPoints) idx = totalPoints - 1
      if (idx < 0) idx = 0

      sparklines.totalOrders[idx] += 1
      if (isAbandoned(r.status)) {
        sparklines.abandonedOrders[idx] += 1
      } else {
        sparklines.normalOrders[idx] += 1
      }

      if (isFacebook(r.utm_source)) {
        sparklines.facebookOrders[idx] += 1
      } else if (isTikTok(r.utm_source)) {
        sparklines.tiktokOrders[idx] += 1
      } else {
        sparklines.otherOrders[idx] += 1
      }
    })

    return sparklines
  }

  const sparklines = generateSparklines(currentOrders)

  const kpis = {
    totalOrders: { value: curKpis.totalOrders, change: calcPct(curKpis.totalOrders, prevKpis.totalOrders), sparkline: sparklines.totalOrders },
    abandonedOrders: { value: curKpis.abandonedOrders, change: calcPct(curKpis.abandonedOrders, prevKpis.abandonedOrders), sparkline: sparklines.abandonedOrders },
    normalOrders: { value: curKpis.normalOrders, change: calcPct(curKpis.normalOrders, prevKpis.normalOrders), sparkline: sparklines.normalOrders },
    facebookOrders: { value: curKpis.facebookOrders, change: calcPct(curKpis.facebookOrders, prevKpis.facebookOrders), sparkline: sparklines.facebookOrders },
    tiktokOrders: { value: curKpis.tiktokOrders, change: calcPct(curKpis.tiktokOrders, prevKpis.tiktokOrders), sparkline: sparklines.tiktokOrders },
    otherOrders: { value: curKpis.otherOrders, change: calcPct(curKpis.otherOrders, prevKpis.otherOrders), sparkline: sparklines.otherOrders },
    revenue: { value: curKpis.revenue, change: calcPct(curKpis.revenue, prevKpis.revenue) },
  }

  const hourlyData = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    hourNum: h,
    orders: 0,
    abandoned: 0,
    normal: 0,
  }))

  currentOrders.forEach(o => {
    const h = getAlgiersHour(o.created_at)
    if (h >= 0 && h < 24) {
      hourlyData[h].orders += 1
      if (isAbandoned(o.status)) {
        hourlyData[h].abandoned += 1
      } else {
        hourlyData[h].normal += 1
      }
    }
  })

  const wilayaCounts: Record<number, number> = {}
  currentOrders.forEach(o => {
    if (o.wilaya_id && !isAbandoned(o.status)) {
      wilayaCounts[o.wilaya_id] = (wilayaCounts[o.wilaya_id] || 0) + 1
    }
  })

  const totalWilayaOrders = Object.values(wilayaCounts).reduce((a, b) => a + b, 0)
  const sortedWilayas = Object.entries(wilayaCounts)
    .map(([wId, count]) => {
      const id = Number(wId)
      return {
        id,
        name: wilayaMap[id] || `ولاية ${id}`,
        count,
        pct: totalWilayaOrders > 0 ? Math.round((count / totalWilayaOrders) * 100 * 10) / 10 : 0,
      }
    })
    .sort((a, b) => b.count - a.count)

  const periodSeries = hourlyData.map(h => ({
    label: h.hour,
    total_orders: h.orders,
    normal_orders: h.normal,
    abandoned_orders: h.abandoned,
    revenue: 0,
  }))

  currentOrders.forEach(o => {
    if (!isAbandoned(o.status)) {
      const h = getAlgiersHour(o.created_at)
      if (h >= 0 && h < 24) {
        periodSeries[h].revenue += o.total ?? 0
      }
    }
  })

  const initialData = {
    dateRange,
    kpis,
    hourlyData,
    wilayaDistribution: {
      totalOrders: totalWilayaOrders,
      wilayaCounts,
      sortedWilayas,
    },
    periodSeries,
    productPerformance: [],
  }

  return (
    <DashboardHome
      storeName={store?.name ?? 'CPMMERCO'}
      userName={user.email?.split('@')[0] ?? 'التاجر'}
      plan={store?.plan ?? 'free'}
      initialData={initialData}
    />
  )
}
