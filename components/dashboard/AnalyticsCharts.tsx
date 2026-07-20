'use client'
// COMMERCO ANALYTICS — design-system rebuild: fixed-order chart
// token palette (a metric keeps its color everywhere), skeleton
// loading per chart, empty-data states, themed tooltips.
// Queries and data shaping unchanged.
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatDZD } from '@/lib/utils/format'

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد', confirmed: 'مؤكد', processing: 'يُعالج',
  shipped: 'شُحن', delivered: 'سُلّم', returned: 'مُرجع', cancelled: 'ملغى',
}
// Design-system categorical order: cobalt, teal, amber, deep cobalt, light teal, slate
const COLORS = ['var(--chart-1)','var(--chart-2)','var(--chart-3)','var(--chart-4)','var(--chart-5)','var(--chart-6)']

const TOOLTIP_STYLE = {
  borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
  background: 'var(--surface-raised)', color: 'var(--text-primary)',
  fontSize: 12, boxShadow: 'var(--shadow-md)',
} as const

function dayKey(iso: string) { return iso.slice(5, 10) } // MM-DD

function ChartCard({ title, loading, empty, children }: {
  title: string; loading: boolean; empty: boolean; children: React.ReactNode
}) {
  return (
    <div className="c-card" style={{ fontFamily: 'var(--font-arabic)' }}>
      <h3 className="font-bold mb-4" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}>{title}</h3>
      {loading ? (
        <div className="c-skeleton" style={{ blockSize: 200 }} aria-busy="true">.</div>
      ) : empty ? (
        <div className="flex items-center justify-center text-sm" style={{ blockSize: 200, color: 'var(--text-muted)' }}>
          لا توجد بيانات بعد
        </div>
      ) : children}
    </div>
  )
}

export default function AnalyticsCharts({ storeId }: { storeId: string }) {
  const [byStatus, setByStatus] = useState<{ name: string; value: number }[] | null>(null)
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number }[] | null>(null)
  const [revenueByDay, setRevenueByDay] = useState<{ day: string; revenue: number }[] | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    supabase.from('orders').select('status').eq('store_id', storeId).gte('created_at', from)
      .then(({ data }) => {
        const map: Record<string, number> = {}
        data?.forEach(o => { map[o.status] = (map[o.status] ?? 0) + 1 })
        setByStatus(Object.entries(map).map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v })))
      })

    supabase.from('order_items').select('product_name, quantity').eq('store_id', storeId).gte('created_at', from)
      .then(({ data }) => {
        const map: Record<string, number> = {}
        data?.forEach(i => { map[i.product_name] = (map[i.product_name] ?? 0) + i.quantity })
        setTopProducts(
          Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([name, qty]) => ({ name: name.slice(0, 18), qty }))
        )
      })

    supabase.from('orders').select('total, created_at, status').eq('store_id', storeId).eq('status','delivered').gte('created_at', from)
      .then(({ data }) => {
        const map: Record<string, number> = {}
        data?.forEach(o => {
          const d = dayKey(o.created_at)
          map[d] = (map[d] ?? 0) + o.total
        })
        const sorted = Object.entries(map).sort(([a],[b]) => a.localeCompare(b))
        setRevenueByDay(sorted.map(([day, revenue]) => ({ day, revenue })))
      })
  }, [storeId])

  return (
    <div className="space-y-4">
      <ChartCard title="الإيرادات اليومية (مُسلَّم)" loading={revenueByDay === null} empty={revenueByDay?.length === 0}>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueByDay ?? []} margin={{ top: 4, left: 0, right: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} tickLine={false} axisLine={false} width={34} />
            <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v: number) => [formatDZD(v), 'إيرادات']} />
            <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="الطلبات حسب الحالة" loading={byStatus === null} empty={byStatus?.length === 0}>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byStatus ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                {(byStatus ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="أكثر المنتجات مبيعاً" loading={topProducts === null} empty={topProducts?.length === 0}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts ?? []} layout="vertical" margin={{ right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--chart-grid)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} width={90} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="qty" fill="var(--chart-1)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
