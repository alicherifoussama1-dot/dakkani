'use client'
import { useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { createClient } from '@/lib/supabase/client'

const STATUS_LABELS: Record<string, string> = {
  new: 'جديد', confirmed: 'مؤكد', processing: 'يُعالج',
  shipped: 'شُحن', delivered: 'سُلّم', returned: 'مُرجع', cancelled: 'ملغى',
}
const COLORS = ['#f97316', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#6b7280']

export default function AnalyticsCharts({ storeId }: { storeId: string }) {
  const [byStatus, setByStatus] = useState<{ name: string; value: number }[]>([])
  const [topProducts, setTopProducts] = useState<{ name: string; qty: number }[]>([])

  useEffect(() => {
    const supabase = createClient()
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    supabase.from('orders').select('status').eq('store_id', storeId).gte('created_at', from)
      .then(({ data }: { data: { status: string }[] | null }) => {
        const map: Record<string, number> = {}
        data?.forEach((o) => { map[o.status] = (map[o.status] ?? 0) + 1 })
        setByStatus(Object.entries(map).map(([k, v]) => ({ name: STATUS_LABELS[k] ?? k, value: v })))
      })

    supabase.from('order_items').select('product_name, quantity').eq('store_id', storeId).gte('created_at', from)
      .then(({ data }: { data: { product_name: string; quantity: number }[] | null }) => {
        const map: Record<string, number> = {}
        data?.forEach((i) => { map[i.product_name] = (map[i.product_name] ?? 0) + i.quantity })
        setTopProducts(
          Object.entries(map)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([name, qty]) => ({ name: name.slice(0, 20), qty }))
        )
      })
  }, [storeId])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">الطلبات حسب الحالة</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
              {byStatus.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-4">أكثر المنتجات مبيعاً</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={topProducts} layout="vertical" margin={{ right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 10 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
            <Tooltip />
            <Bar dataKey="qty" fill="#f97316" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
