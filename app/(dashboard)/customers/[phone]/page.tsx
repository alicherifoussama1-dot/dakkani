export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDZD, formatDateShort } from '@/lib/utils/format'
import StatusBadge from '@/components/ui/StatusBadge'
import { ArrowRight, Phone, MapPin, ShoppingCart } from 'lucide-react'

export async function generateMetadata({ params }: { params: { phone: string } }) {
  return { title: `الزبون ${decodeURIComponent(params.phone)}` }
}

export default async function CustomerDetailPage({ params }: { params: { phone: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).single()
  if (!store) return null

  const phone = decodeURIComponent(params.phone)
  const { data: orders } = await supabase
    .from('orders')
    .select('*, wilaya:wilayas(name_ar)')
    .eq('store_id', store.id)
    .eq('customer_phone', phone)
    .order('created_at', { ascending: false })

  if (!orders?.length) return (
    <div className="p-6 text-center" dir="rtl">
      <p style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>لا توجد طلبات لهذا الزبون</p>
      <Link href="/customers" className="btn btn-primary btn-sm mt-4" style={{fontFamily:'var(--font-arabic)'}}>العودة</Link>
    </div>
  )

  const customer = orders[0]
  const totalSpent = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center gap-3 mb-5">
        <Link href="/customers" className="p-1.5 rounded hover:bg-[#F8F9FA] transition-colors">
          <ArrowRight size={16} style={{color:'var(--color-text-muted)'}} />
        </Link>
        <div>
          <h1 className="page-title">{customer.customer_name}</h1>
          <p className="text-xs flex items-center gap-1 mt-0.5" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-primary)'}}>
            <Phone size={10} />{phone}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          {label:'إجمالي الطلبات', value: String(orders.length), color: 'var(--color-accent)'},
          {label:'إجمالي الإنفاق', value: formatDZD(totalSpent), color: '#198754'},
          {label:'آخر ولاية', value: (customer.wilaya as any)?.name_ar ?? '—', color: 'var(--color-text-primary)'},
        ].map(k => (
          <div key={k.label} className="card p-4 text-center">
            <p className="font-black text-lg" style={{color:k.color,fontFamily:'var(--font-primary)'}}>{k.value}</p>
            <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Orders table */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm flex items-center gap-2" style={{borderColor:'var(--color-border)',color:'var(--color-text-primary)'}}>
          <ShoppingCart size={14} style={{color:'var(--color-accent)'}} />
          سجل الطلبات ({orders.length})
        </div>
        <table className="data-table">
          <thead>
            <tr>{['رقم الطلب','التاريخ','المبلغ','الولاية','الحالة','عرض'].map(h => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id}>
                <td className="font-mono text-xs font-semibold" style={{color:'var(--color-accent)'}}>#{o.order_number}</td>
                <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{formatDateShort(o.created_at)}</td>
                <td className="font-semibold text-sm" style={{fontFamily:'var(--font-primary)'}}>{formatDZD(o.total)}</td>
                <td className="text-xs" style={{color:'var(--color-text-secondary)'}}>{(o.wilaya as any)?.name_ar ?? '—'}</td>
                <td><StatusBadge status={o.status} /></td>
                <td>
                  <Link href={`/orders/${o.id}`} className="btn btn-sm" style={{background:'#EBF5FF',color:'var(--color-accent)'}}>عرض</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
