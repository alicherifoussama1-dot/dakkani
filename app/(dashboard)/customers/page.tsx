export const dynamic = 'force-dynamic'
export const metadata = { title: 'الزبائن' }

import { createServerClient } from '@/lib/supabase/server'
import { formatDZD, formatDateShort } from '@/lib/utils/format'
import { Search, Users } from 'lucide-react'

export default async function CustomersPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).single()
  if (!store) return null

  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name,customer_phone,total,status,created_at,order_number,wilaya:wilayas(name_ar),commune:communes(name_ar)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  const map: Record<string, any> = {}
  ;(orders ?? []).forEach((o: any) => {
    const k = o.customer_phone
    if (!map[k]) {
      map[k] = { name: o.customer_name, phone: k, wilaya: o.wilaya?.name_ar, commune: o.commune?.name_ar, orders: 0, lastId: o.order_number, spent: 0, first: o.created_at, last: o.created_at }
    }
    map[k].orders++
    if (o.status === 'delivered') map[k].spent += o.total
    if (new Date(o.created_at) > new Date(map[k].last)) { map[k].last = o.created_at; map[k].lastId = o.order_number }
  })
  const customers = Object.values(map).sort((a: any, b: any) => b.spent - a.spent)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h1 className="page-title">الزبائن</h1>
        <span className="badge badge-gray">{customers.length} زبون</span>
      </div>
      <div className="relative mb-4 max-w-xs">
        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input placeholder="ابحث عن زبائن، هواتف، مدن..." className="input pr-8 text-sm" readOnly />
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>{['الزبون','الموقع','الطلبات','الإنفاق','آخر طلب'].map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {customers.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-14">
                  <Users size={28} className="mx-auto mb-2" style={{ color: 'var(--color-text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>لا توجد بيانات زبائن</p>
                </td></tr>
              ) : customers.map((c: any) => (
                <tr key={c.phone}>
                  <td>
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{c.name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)' }}>{c.phone}</p>
                  </td>
                  <td><p className="text-sm">{c.commune ?? '—'}</p><p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{c.wilaya ?? '—'}</p></td>
                  <td>
                    <p className="font-semibold text-sm" style={{ fontFamily: 'var(--font-primary)' }}>{c.orders}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>#{c.lastId}</p>
                  </td>
                  <td><p className="font-semibold text-sm" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-primary)' }}>{formatDZD(c.spent)}</p></td>
                  <td>
                    <p className="text-sm" style={{ fontFamily: 'var(--font-primary)' }}>{formatDateShort(c.last)}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)' }}>أول: {formatDateShort(c.first)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
