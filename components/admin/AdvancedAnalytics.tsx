'use client'
import { useState, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Package, RefreshCw, Wallet } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'

interface Order { id: string; total: number; subtotal: number; delivery_fee: number; status: string; created_at: string; wilaya_id: number; wilaya?: { name_ar: string } }
interface Item   { product_name: string; quantity: number; total_price: number; cost_price?: number; order_id: string }
interface Props  { storeId: string; orders: Order[]; items: Item[]; wilayaOrders: Order[] }

const DELIVERED = ['delivered']
const RETURNED  = ['returned']
const TODAY = new Date()

function getWeekDates(weeksAgo: number) {
  const end   = new Date(TODAY)
  end.setDate(end.getDate() - weeksAgo * 7)
  const start = new Date(end)
  start.setDate(start.getDate() - 6)
  return { start, end }
}

function dayKey(d: string) { return d.slice(0, 10) }

export default function AdvancedAnalytics({ orders, items }: Props) {
  const [adSpend, setAdSpend]   = useState(0)
  const [compare, setCompare]   = useState(false)

  // ── Date filters ────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000)
  const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 3600000)

  const thisWeek = getWeekDates(0)
  const lastWeek = getWeekDates(1)

  const inRange = (o: Order, from: Date, to: Date) => {
    const d = new Date(o.created_at)
    return d >= from && d <= to
  }

  // ── Core metrics ─────────────────────────────────────────
  const metrics = useMemo(() => {
    const period = orders.filter(o => new Date(o.created_at) >= thirtyDaysAgo)
    const delivered = period.filter(o => DELIVERED.includes(o.status))
    const returned  = period.filter(o => RETURNED.includes(o.status))

    const grossRevenue  = delivered.reduce((s, o) => s + o.total, 0)
    const deliveryFees  = delivered.reduce((s, o) => s + o.delivery_fee, 0)
    const returnCosts   = returned.reduce((s, o) => s + o.total * 0.15, 0) // est. 15% of returned order
    const productCost   = items
      .filter(i => delivered.find(o => o.id === i.order_id))
      .reduce((s, i) => s + (i.cost_price ?? 0) * i.quantity, 0)
    const netProfit     = grossRevenue - productCost - adSpend - deliveryFees - returnCosts

    const totalOrders   = period.length
    const returnRate    = totalOrders ? Math.round((returned.length / totalOrders) * 100) : 0
    const codRate       = delivered.length
      ? Math.round((delivered.filter(() => true).length / delivered.length) * 100) : 0

    return { grossRevenue, netProfit, totalOrders, returnRate, codRate, deliveryFees, productCost, returnCosts }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, items, adSpend])

  // ── Chart data — Revenue/Orders/Profit per day ────────
  const dailyData = useMemo(() => {
    const map: Record<string, { date: string; revenue: number; orders: number; profit: number }> = {}
    orders
      .filter(o => new Date(o.created_at) >= thirtyDaysAgo)
      .forEach(o => {
        const d = dayKey(o.created_at)
        if (!map[d]) map[d] = { date: d, revenue: 0, orders: 0, profit: 0 }
        map[d].orders++
        if (DELIVERED.includes(o.status)) {
          map[d].revenue += o.total
          const cost = items.filter(i => i.order_id === o.id).reduce((s, i) => s + (i.cost_price ?? 0) * i.quantity, 0)
          map[d].profit  += o.total - cost - o.delivery_fee
        }
      })
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, items])

  // ── Compare: this week vs last week ──────────────────────
  const comparisonData = useMemo(() => {
    const thisW = orders.filter(o => inRange(o, thisWeek.start, thisWeek.end))
    const lastW = orders.filter(o => inRange(o, lastWeek.start, lastWeek.end))
    const days  = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
    return Array.from({ length: 7 }, (_, i) => {
      const thisDay = new Date(thisWeek.start); thisDay.setDate(thisDay.getDate() + i)
      const lastDay = new Date(lastWeek.start); lastDay.setDate(lastDay.getDate() + i)
      const thisRev = thisW.filter(o => dayKey(o.created_at) === dayKey(thisDay.toISOString()))
        .filter(o => DELIVERED.includes(o.status)).reduce((s, o) => s + o.total, 0)
      const lastRev = lastW.filter(o => dayKey(o.created_at) === dayKey(lastDay.toISOString()))
        .filter(o => DELIVERED.includes(o.status)).reduce((s, o) => s + o.total, 0)
      return { day: days[thisDay.getDay()], thisWeek: thisRev, lastWeek: lastRev }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders])

  // ── Top wilayas ───────────────────────────────────────────
  const wilayaData = useMemo(() => {
    const map: Record<number, { name: string; orders: number; revenue: number }> = {}
    orders
      .filter(o => new Date(o.created_at) >= thirtyDaysAgo && DELIVERED.includes(o.status))
      .forEach(o => {
        const id   = o.wilaya_id
        const name = o.wilaya?.name_ar ?? `ولاية ${id}`
        if (!map[id]) map[id] = { name, orders: 0, revenue: 0 }
        map[id].orders++
        map[id].revenue += o.total
      })
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders])

  // ── Return rate by product ────────────────────────────────
  const returnData = useMemo(() => {
    const returnedIds = new Set(orders.filter(o => RETURNED.includes(o.status)).map(o => o.id))
    const map: Record<string, { name: string; returned: number; total: number }> = {}
    items.forEach(i => {
      if (!map[i.product_name]) map[i.product_name] = { name: i.product_name.slice(0, 20), returned: 0, total: 0 }
      map[i.product_name].total += i.quantity
      if (returnedIds.has(i.order_id)) map[i.product_name].returned += i.quantity
    })
    return Object.values(map)
      .map(p => ({ ...p, rate: p.total ? Math.round((p.returned / p.total) * 100) : 0 }))
      .filter(p => p.rate > 0)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8)
  }, [orders, items])

  const METRIC_CARDS = [
    {
      label:  'إجمالي الإيرادات',
      value:  formatDZD(metrics.grossRevenue),
      icon:   DollarSign,
      color:  'text-green-400',
      bg:     'bg-green-500/10',
      border: 'border-green-500/20',
    },
    {
      label:  'صافي الربح',
      value:  formatDZD(metrics.netProfit),
      icon:   metrics.netProfit >= 0 ? TrendingUp : TrendingDown,
      color:  metrics.netProfit >= 0 ? 'text-[#60A5FA]' : 'text-red-400',
      bg:     metrics.netProfit >= 0 ? 'bg-[#0D6EFD]/10' : 'bg-red-500/10',
      border: metrics.netProfit >= 0 ? 'border-[#0D6EFD]/20' : 'border-red-500/20',
      note:   'الإيرادات - التكلفة - الإعلانات - التوصيل - المرتجعات',
    },
    {
      label:  'إجمالي الطلبات',
      value:  metrics.totalOrders.toString(),
      icon:   Package,
      color:  'text-blue-400',
      bg:     'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label:  'معدل الإرجاع',
      value:  `${metrics.returnRate}%`,
      icon:   RefreshCw,
      color:  metrics.returnRate > 15 ? 'text-red-400' : 'text-yellow-400',
      bg:     'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    },
    {
      label:  'معدل تحصيل COD',
      value:  `${metrics.codRate}%`,
      icon:   Wallet,
      color:  'text-purple-400',
      bg:     'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
  ]

  const chartConfig = {
    cartesian: <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />,
    xAxis:     (key: string) => <XAxis dataKey={key} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />,
    yAxis:     (fmt?: (v: number) => string) => (
      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={fmt ?? ((v: number) => `${(v / 1000).toFixed(0)}k`)} />
    ),
    tooltip:   <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 8, color: '#e2e8f0' }} />,
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-black text-white">الإحصائيات المتقدمة (30 يوم)</h1>
        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500 flex items-center gap-2">
            إنفاق إعلانات (دج):
            <input
              type="number"
              value={adSpend || ''}
              onChange={e => setAdSpend(parseFloat(e.target.value) || 0)}
              placeholder="0"
              className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-200 w-28 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
            />
          </label>
          <button
            onClick={() => setCompare(c => !c)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition ${compare ? 'bg-[#0D6EFD]/20 text-[#60A5FA] border-[#0D6EFD]/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}
          >
            مقارنة الأسابيع
          </button>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {METRIC_CARDS.map(m => (
          <div key={m.label} className={`bg-gray-900 border ${m.border} rounded-xl p-4 space-y-2`}>
            <div className={`w-9 h-9 ${m.bg} rounded-lg flex items-center justify-center`}>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
            <p className="text-xs text-gray-500">{m.label}</p>
            {m.note && <p className="text-xs text-gray-700">{m.note}</p>}
          </div>
        ))}
      </div>

      {/* Profit breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">تفصيل الربح</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center text-xs">
          {[
            { label: 'إيرادات',   value: metrics.grossRevenue, cls: 'text-green-400' },
            { label: 'تكلفة',     value: -metrics.productCost, cls: 'text-red-400' },
            { label: 'إعلانات',  value: -adSpend,              cls: 'text-orange-400' },
            { label: 'توصيل',    value: -metrics.deliveryFees, cls: 'text-yellow-400' },
            { label: 'مرتجعات', value: -metrics.returnCosts,  cls: 'text-red-400' },
          ].map(row => (
            <div key={row.label} className="bg-gray-800 rounded-xl p-3">
              <p className={`text-base font-black ${row.cls}`}>{formatDZD(Math.abs(row.value))}</p>
              <p className="text-gray-500 mt-0.5">{row.label}</p>
              <p className={`text-xs font-bold ${row.value >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {row.value >= 0 ? '+' : '−'}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-3 text-center">
          <span className={`text-xl font-black ${metrics.netProfit >= 0 ? 'text-[#60A5FA]' : 'text-red-400'}`}>
            صافي الربح: {formatDZD(metrics.netProfit)}
          </span>
        </div>
      </div>

      {/* Week comparison */}
      {compare && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-4">هذا الأسبوع مقارنة بالأسبوع الماضي</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={comparisonData}>
              {chartConfig.cartesian}
              <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} />
              {chartConfig.yAxis()}
              {chartConfig.tooltip}
              <Legend formatter={(v: string) => v === 'thisWeek' ? 'هذا الأسبوع' : 'الأسبوع الماضي'} />
              <Bar dataKey="thisWeek" fill="#0D6EFD" radius={[4, 4, 0, 0]} name="thisWeek" />
              <Bar dataKey="lastWeek" fill="#64748b" radius={[4, 4, 0, 0]} name="lastWeek" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Three charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Revenue line */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-4">الإيرادات اليومية</h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={dailyData}>
              {chartConfig.cartesian}
              {chartConfig.xAxis('date')}
              {chartConfig.yAxis()}
              {chartConfig.tooltip}
              <Line type="monotone" dataKey="revenue" stroke="#0D6EFD" strokeWidth={2} dot={false} name="الإيرادات" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Orders bar */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-4">الطلبات اليومية</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dailyData}>
              {chartConfig.cartesian}
              {chartConfig.xAxis('date')}
              {chartConfig.yAxis((v) => String(v))}
              {chartConfig.tooltip}
              <Bar dataKey="orders" fill="#3b82f6" radius={[3, 3, 0, 0]} name="الطلبات" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Net profit area */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-4">الربح اليومي</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={dailyData}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              {chartConfig.cartesian}
              {chartConfig.xAxis('date')}
              {chartConfig.yAxis()}
              {chartConfig.tooltip}
              <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#profitGrad)" name="الربح" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Wilayas + Return rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-4">أكثر الولايات طلباً (TOP 10)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={wilayaData} layout="vertical">
              {chartConfig.cartesian}
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={80} />
              {chartConfig.tooltip}
              <Bar dataKey="revenue" fill="#0D6EFD" radius={[0, 4, 4, 0]} name="الإيرادات" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-bold text-gray-300 mb-4">معدل إرجاع المنتجات</h3>
          {returnData.length === 0 ? (
            <div className="flex items-center justify-center h-56 text-gray-600 text-sm">لا توجد مرتجعات 🎉</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={returnData} layout="vertical">
                {chartConfig.cartesian}
                <XAxis type="number" tick={{ fill: '#64748b', fontSize: 9 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={100} />
                {chartConfig.tooltip}
                <Bar dataKey="rate" fill="#ef4444" radius={[0, 4, 4, 0]} name="معدل الإرجاع %" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
