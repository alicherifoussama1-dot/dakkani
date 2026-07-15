'use client'
// Recent orders list — design-system rebuild: token badges, skeleton
// loading (no layout shift), tabular numerals. Data contract unchanged.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDZD } from '@/lib/utils/format'
import type { Order } from '@/types'

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  new:        { label: 'جديد',   cls: 'c-badge--info' },
  confirmed:  { label: 'مؤكد',   cls: 'c-badge--success' },
  processing: { label: 'يُعالج', cls: 'c-badge--warning' },
  shipped:    { label: 'شُحن',   cls: 'c-badge--info' },
  delivered:  { label: 'سُلّم',  cls: 'c-badge--success' },
  returned:   { label: 'مُرجع',  cls: 'c-badge--error' },
  cancelled:  { label: 'ملغى',   cls: 'c-badge--neutral' },
  failed:     { label: 'فاشل',   cls: 'c-badge--error' },
}

export default function RecentOrders({ storeId }: { storeId: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null)

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

  // Skeleton mirrors the final layout — zero shift when data lands
  if (orders === null) {
    return (
      <div className="space-y-2" aria-busy="true">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center justify-between p-2.5">
            <div className="space-y-1.5">
              <div className="c-skeleton" style={{ blockSize: 14, inlineSize: 120 }} />
              <div className="c-skeleton" style={{ blockSize: 11, inlineSize: 80 }} />
            </div>
            <div className="c-skeleton" style={{ blockSize: 16, inlineSize: 72 }} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {orders.map(o => {
        const s = STATUS_BADGE[o.status] ?? { label: o.status, cls: 'c-badge--neutral' }
        return (
          <Link key={o.id} href={`/orders/${o.id}`}
            className="flex items-center justify-between gap-3 p-2.5 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--surface-sunken)]">
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {o.order_number}
              </p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{o.customer_name}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className={`c-badge ${s.cls}`}>{s.label}</span>
              <p className="text-sm font-bold w-24 text-end"
                style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                {formatDZD(o.total)}
              </p>
            </div>
          </Link>
        )
      })}
      {orders.length === 0 && (
        <p className="text-sm text-center py-6" style={{ color: 'var(--text-muted)' }}>لا توجد طلبات بعد</p>
      )}
    </div>
  )
}
