import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { getAlgiersDateRange, getAlgiersHour, getAlgiersDateString, formatAlgiersChartDate, type DatePreset } from '@/lib/utils/timezone'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { activeStore: store } = await getActiveStore(supabase, user.id)
    if (!store) {
      return NextResponse.json({ error: 'No active store' }, { status: 404 })
    }

    const searchParams = req.nextUrl.searchParams
    const preset = (searchParams.get('preset') as DatePreset) || 'today'
    const customStart = searchParams.get('startDate') || undefined
    const customEnd = searchParams.get('endDate') || undefined

    const dateRange = getAlgiersDateRange(preset, customStart, customEnd)

    // 1. Parallel DB queries for Current Period & Previous Period
    const [currentOrdersRes, prevOrdersRes, wilayasRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, total, status, utm_source, wilaya_id, created_at')
        .eq('store_id', store.id)
        .gte('created_at', dateRange.startISO)
        .lte('created_at', dateRange.endISO),

      supabase
        .from('orders')
        .select('id, total, status, utm_source, created_at')
        .eq('store_id', store.id)
        .gte('created_at', dateRange.prevStartISO)
        .lte('created_at', dateRange.prevEndISO),

      supabase
        .from('wilayas')
        .select('id, name, name_ar, code'),
    ])

    const currentOrders = currentOrdersRes.data ?? []
    const prevOrders = prevOrdersRes.data ?? []
    const wilayasList = wilayasRes.data ?? []

    // Map Wilaya IDs to Names
    const wilayaMap: Record<number, string> = {}
    wilayasList.forEach((w) => {
      wilayaMap[w.id] = w.name_ar || w.name || `ولاية ${w.id}`
    })

    // Helpers
    const isAbandoned = (s: string) => s === 'abandoned'
    const isFacebook = (src?: string | null) => (src ?? '').toLowerCase().includes('facebook') || (src ?? '').toLowerCase().includes('fb') || (src ?? '').toLowerCase().includes('meta')
    const isTikTok = (src?: string | null) => (src ?? '').toLowerCase().includes('tiktok') || (src ?? '').toLowerCase().includes('tt')

    // Calc KPI totals
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

    // Helper for percentage change comparison
    const calcPct = (cur: number, prev: number) => {
      if (prev === 0) return cur > 0 ? 100 : 0
      return Math.round(((cur - prev) / prev) * 100 * 10) / 10
    }

    // 2. Generate Mini Sparkline Data Series (7 points for each card)
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

    const kpiCards = {
      totalOrders: { value: curKpis.totalOrders, change: calcPct(curKpis.totalOrders, prevKpis.totalOrders), sparkline: sparklines.totalOrders },
      abandonedOrders: { value: curKpis.abandonedOrders, change: calcPct(curKpis.abandonedOrders, prevKpis.abandonedOrders), sparkline: sparklines.abandonedOrders },
      normalOrders: { value: curKpis.normalOrders, change: calcPct(curKpis.normalOrders, prevKpis.normalOrders), sparkline: sparklines.normalOrders },
      facebookOrders: { value: curKpis.facebookOrders, change: calcPct(curKpis.facebookOrders, prevKpis.facebookOrders), sparkline: sparklines.facebookOrders },
      tiktokOrders: { value: curKpis.tiktokOrders, change: calcPct(curKpis.tiktokOrders, prevKpis.tiktokOrders), sparkline: sparklines.tiktokOrders },
      otherOrders: { value: curKpis.otherOrders, change: calcPct(curKpis.otherOrders, prevKpis.otherOrders), sparkline: sparklines.otherOrders },
      revenue: { value: curKpis.revenue, change: calcPct(curKpis.revenue, prevKpis.revenue) },
    }

    // 3. Hourly Order Entry Times Chart (00:00 -> 23:00 Algiers time)
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

    // 4. Geographic Distribution (Wilaya Ranking)
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

    // 5. Period Analytics Multi-Line Series (Daily or Hourly)
    const isHourlyPeriod = preset === 'today' || preset === 'yesterday'
    let periodSeries: Array<{ label: string; total_orders: number; normal_orders: number; abandoned_orders: number; revenue: number }> = []

    if (isHourlyPeriod) {
      periodSeries = hourlyData.map(h => ({
        label: h.hour,
        total_orders: h.orders,
        normal_orders: h.normal,
        abandoned_orders: h.abandoned,
        revenue: 0, // Revenue grouped hourly
      }))

      // Populate hourly revenue
      currentOrders.forEach(o => {
        if (!isAbandoned(o.status)) {
          const h = getAlgiersHour(o.created_at)
          if (h >= 0 && h < 24) {
            periodSeries[h].revenue += o.total ?? 0
          }
        }
      })
    } else {
      // Group by Day (YYYY-MM-DD)
      const dayMap: Record<string, { label: string; total_orders: number; normal_orders: number; abandoned_orders: number; revenue: number }> = {}

      currentOrders.forEach(o => {
        const dateStr = getAlgiersDateString(o.created_at)
        if (!dayMap[dateStr]) {
          dayMap[dateStr] = {
            label: formatAlgiersChartDate(o.created_at),
            total_orders: 0,
            normal_orders: 0,
            abandoned_orders: 0,
            revenue: 0,
          }
        }
        dayMap[dateStr].total_orders += 1
        if (isAbandoned(o.status)) {
          dayMap[dateStr].abandoned_orders += 1
        } else {
          dayMap[dateStr].normal_orders += 1
          dayMap[dateStr].revenue += o.total ?? 0
        }
      })

      periodSeries = Object.keys(dayMap).sort().map(k => dayMap[k])
    }

    // 6. Product Performance Analytics
    // Fetch order items for the current period orders
    const currentOrderIds = currentOrders.map(o => o.id)
    let productPerformance: Array<{
      id: string
      name: string
      image_url: string | null
      total_orders: number
      normal_orders: number
      abandoned_orders: number
      abandonment_rate: number
    }> = []

    if (currentOrderIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('order_id, product_id, product_name, quantity')
        .in('order_id', currentOrderIds.slice(0, 1000)) // Safety cap

      const orderStatusMap: Record<string, string> = {}
      currentOrders.forEach(o => { orderStatusMap[o.id] = o.status })

      const prodMap: Record<string, { name: string; total: number; normal: number; abandoned: number }> = {}

      ;(itemsData ?? []).forEach(item => {
        const pId = item.product_id || item.product_name || 'unknown'
        if (!prodMap[pId]) {
          prodMap[pId] = {
            name: item.product_name || 'منتج غير معرف',
            total: 0,
            normal: 0,
            abandoned: 0,
          }
        }

        const status = orderStatusMap[item.order_id] || ''
        const isAb = isAbandoned(status)
        const qty = item.quantity || 1

        prodMap[pId].total += qty
        if (isAb) {
          prodMap[pId].abandoned += qty
        } else {
          prodMap[pId].normal += qty
        }
      })

      // Fetch images for product IDs
      const productIds = Object.keys(prodMap).filter(id => id.length > 20) // Valid UUIDs
      let productImagesMap: Record<string, string | null> = {}
      if (productIds.length > 0) {
        const { data: prods } = await supabase
          .from('products')
          .select('id, image_url, images')
          .in('id', productIds)

        ;(prods ?? []).forEach(p => {
          const img = p.image_url || (Array.isArray(p.images) && p.images[0] ? p.images[0] : null)
          productImagesMap[p.id] = img
        })
      }

      productPerformance = Object.entries(prodMap)
        .map(([pId, stats]) => {
          const total = stats.total
          const abandoned = stats.abandoned
          const rate = total > 0 ? Math.round((abandoned / total) * 100 * 10) / 10 : 0
          return {
            id: pId,
            name: stats.name,
            image_url: productImagesMap[pId] || null,
            total_orders: total,
            normal_orders: stats.normal,
            abandoned_orders: abandoned,
            abandonment_rate: rate,
          }
        })
        .sort((a, b) => b.total_orders - a.total_orders)
        .slice(0, 10) // Top 10 products
    }

    return NextResponse.json({
      ok: true,
      store: { id: store.id, name: store.name },
      dateRange,
      kpis: kpiCards,
      hourlyData,
      wilayaDistribution: {
        totalOrders: totalWilayaOrders,
        wilayaCounts,
        sortedWilayas,
      },
      periodSeries,
      productPerformance,
    })
  } catch (err: any) {
    console.error('Error fetching dashboard analytics:', err)
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
