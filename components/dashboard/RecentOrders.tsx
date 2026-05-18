'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDZD } from '@/lib/utils/format'
import type { Order } from '@/types'

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  new:        { label: 'جديد',    color: 'bg-blue-100 text-blue-700' },
  confirmed:  { label: 'مؤكد',   color: 'bg-green-100 text-green-700' },
  processing: { label: 'يُعالج', color: 'bg-yellow-100 text-yellow-700' },
  shipped:    { label: 'شُحن',   color: 'bg-purple-100 text-purple-700' },
  delivered:  { label: 'سُلّم',  color: 'bg-emerald-100 text-emerald-700' },
  returned:   { label: 'مُرجع',  color: 'bg-red-100 text-red-700' },
  cancelled:  { label: 'ملغى',   color: 'bg-gray-100 text-gray-600' },
  failed:     { label: 'فاشل',   color: 'bg-red-100 text-red-700' },
}

export default function RecentOrders({ storeId }: { storeId: string }) {
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('orders')
      .select('id, order_number, customer_name, total, status, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => setOrders((data ?? []) as unknown as Order[]))
  }, [storeId])

  return (
    <div className="space-y-2">
      {orders.map(o => {
        const s = STATUS_LABELS[o.status] ?? { label: o.status, color: 'bg-gray-100 text-gray-600' }
        return (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg transition group"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900 group-hover:text-dakkani-600">
                {o.order_number}
              </p>
              <p className="text-xs text-gray-500">{o.customer_name}</p>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">{formatDZD(o.total)}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>
            </div>
          </Link>
        )
      })}
      {orders.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-6">لا توجد طلبات بعد</p>
      )}
    </div>
  )
}
