'use client'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatDZD } from '@/lib/utils/format'

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد', confirmed: 'مؤكد', processing: 'يُعالج',
  shipped: 'شُحن', delivered: 'سُلّم', returned: 'مُرجع', cancelled: 'ملغى',
}
const COLORS = ['#0D6EFD','#28A745','#FD7E14','#6F42C1','#DC3545','#2BBFAD','#6C757D']

function dayKey(iso: string) {
  return iso.slice(5, 10) // MM-DD
}

export default function AnalyticsCharts({ storeId }: { storeId: string }) {
  const [byStatus,    setByStatus]    = useState<{ name: string; value: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number }[]>([])
  const [revenueByDay, setRevenueByDay] = useState<{ day: string; revenue: number }[]>([])

  useEffect(() => {
    const supabase = createClient()
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Status pie
    supabase.from('orders').select('status').eq('store_id', storeId).gte('created_at', from)
      .then(({ data }) => {
        const map: Record<string, number> = {}
        data?.forEach(o => { map[o.status] = (map[o.status] ?? 0) + 1 })
        setByStatus(Object.entries(map).map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v })))
      })

    // Top products
    supabase.from('order_items').select('product_name, quantity').eq('store_id', storeId).gte('created_at', from)
      .then(({ data }) => {
        const map: Record<string, number> = {}
        data?.forEach(i => { map[i.product_name] = (map[i.product_name] ?? 0) + i.quantity })
        setTopProducts(
          Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8)
            .map(([name, qty]) => ({ name: name.slice(0, 18), qty }))
        )
      })

    // Revenue by day (delivered orders)
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
      {/* Revenue line chart */}
      <div className="card p-4" style={{fontFamily:'var(--font-arabic)'}}>
        <h3 className="font-semibold text-sm mb-4" style={{color:'var(--color-text-primary)'}}>الإيرادات اليومية (مُسلَّم)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={revenueByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="day" tick={{fontSize:10,fill:'var(--color-text-muted)'}} />
            <YAxis tick={{fontSize:10,fill:'var(--color-text-muted)'}} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => [formatDZD(v), 'إيرادات']} />
            <Line type="monotone" dataKey="revenue" stroke="#0D6EFD" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Status pie */}
        <div className="card p-4" style={{fontFamily:'var(--font-arabic)'}}>
          <h3 className="font-semibold text-sm mb-4" style={{color:'var(--color-text-primary)'}}>الطلبات حسب الحالة</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name,percent}) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top products bar */}
        <div className="card p-4" style={{fontFamily:'var(--font-arabic)'}}>
          <h3 className="font-semibold text-sm mb-4" style={{color:'var(--color-text-primary)'}}>أكثر المنتجات مبيعاً</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topProducts} layout="vertical" margin={{right:16}}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
              <XAxis type="number" tick={{fontSize:10,fill:'var(--color-text-muted)'}} />
              <YAxis type="category" dataKey="name" tick={{fontSize:10,fill:'var(--color-text-muted)'}} width={90} />
              <Tooltip />
              <Bar dataKey="qty" fill="#0D6EFD" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
