'use client'
import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface DayData { date: string; revenue: number; orders: number }

export default function RevenueChart({ storeId }: { storeId: string }) {
  const [data, setData] = useState<DayData[]>([])

  useEffect(() => {
    const supabase = createClient()
    const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    supabase
      .from('orders')
      .select('total, created_at, status')
      .eq('store_id', storeId)
      .gte('created_at', from)
      .then(({ data: orders }: { data: { total: number; created_at: string; status: string }[] | null }) => {
        if (!orders) return
        const map: Record<string, DayData> = {}
        orders.forEach((o) => {
          const d = o.created_at.split('T')[0]
          if (!map[d]) map[d] = { date: d, revenue: 0, orders: 0 }
          map[d].orders++
          if (o.status === 'delivered') map[d].revenue += o.total
        })
        setData(Object.values(map).sort((a, b) => a.date.localeCompare(b.date)))
      })
  }, [storeId])

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0D6EFD" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#0D6EFD" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
        <Tooltip formatter={(v: number) => [`${v.toLocaleString()} دج`, 'الإيرادات']} />
        <Area type="monotone" dataKey="revenue" stroke="#0D6EFD" strokeWidth={2} fill="url(#revenue)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
