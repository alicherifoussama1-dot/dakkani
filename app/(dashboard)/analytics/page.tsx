import { createServerClient } from '@/lib/supabase/server'
import { formatDZD } from '@/lib/utils/format'
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts'
import Link from 'next/link'
import { TrendingUp, ShoppingCart, Percent, Truck, Users, PackageX, BarChart2, DollarSign } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'الإحصائيات' }

export default async function AnalyticsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user!.id).single()
  if (!store) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [ordersRes, customersRes] = await Promise.all([
    supabase.from('orders')
      .select('total, status, created_at, wilaya_id, delivery_fee, discount_amount, customer_phone, wilaya:wilayas(name_ar)')
      .eq('store_id', store.id)
      .gte('created_at', thirtyDaysAgo),
    supabase.from('orders')
      .select('customer_phone', { count: 'exact', head: false })
      .eq('store_id', store.id)
      .gte('created_at', thirtyDaysAgo),
  ])

  const orders    = ordersRes.data ?? []
  const delivered = orders.filter(o => o.status === 'delivered')
  const cancelled = orders.filter(o => o.status === 'cancelled')
  const returned  = orders.filter(o => o.status === 'returned')
  const revenue   = delivered.reduce((s, o) => s + o.total, 0)
  const deliveryRevenue = delivered.reduce((s, o) => s + o.delivery_fee, 0)
  const avgOrder  = delivered.length ? revenue / delivered.length : 0
  const convRate  = orders.length ? Math.round((delivered.length / orders.length) * 100) : 0
  const cancelRate = orders.length ? Math.round(((cancelled.length + returned.length) / orders.length) * 100) : 0
  const uniqueCustomers = new Set(orders.map(o => o.customer_phone)).size
  const grossProfit = revenue - deliveryRevenue

  const kpis = [
    { label: 'إجمالي الإيرادات',   sub: 'آخر 30 يوم',          value: formatDZD(revenue),          Icon: TrendingUp,  color: '#0D6EFD' },
    { label: 'صافي الربح',          sub: 'بعد رسوم التوصيل',     value: formatDZD(grossProfit),       Icon: DollarSign,  color: '#28A745' },
    { label: 'متوسط قيمة الطلب',   sub: 'المُسلَّمة فقط',       value: formatDZD(avgOrder),          Icon: ShoppingCart, color: '#2BBFAD' },
    { label: 'معدل التسليم',        sub: 'من إجمالي الطلبات',   value: `${convRate}%`,               Icon: Percent,      color: '#6F42C1' },
    { label: 'معدل الإلغاء',        sub: 'ملغى + مُرجَع',        value: `${cancelRate}%`,             Icon: PackageX,     color: '#DC3545' },
    { label: 'إيرادات التوصيل',     sub: 'آخر 30 يوم',          value: formatDZD(deliveryRevenue),   Icon: Truck,        color: '#FFC107' },
    { label: 'إجمالي الطلبات',      sub: `آخر 30 يوم`,          value: String(orders.length),        Icon: BarChart2,    color: '#17A2B8' },
    { label: 'الزبائن الفريدون',    sub: 'آخر 30 يوم',          value: String(uniqueCustomers),      Icon: Users,        color: '#6F42C1' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">الإحصائيات</h1>
          <p className="text-sm mt-1" style={{color:'var(--color-text-muted)'}}>آخر 30 يوم — {orders.length.toLocaleString('ar-DZ')} طلب</p>
        </div>
        <div className="flex gap-2">
          <Link href="/orders" className="btn btn-sm btn-outline" style={{fontFamily:'var(--font-arabic)'}}>عرض الطلبات</Link>
          <Link href="/confirmili" className="btn btn-sm btn-primary" style={{fontFamily:'var(--font-arabic)'}}>Confirmili</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${k.color}18`}}>
                <k.Icon size={16} style={{color:k.color}} />
              </div>
            </div>
            <p className="font-black text-xl" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-primary)'}}>{k.value}</p>
            <p className="text-xs font-medium mt-0.5" style={{color:'var(--color-text-primary)'}}>{k.label}</p>
            <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{k.sub}</p>
          </div>
        ))}
      </div>

      <AnalyticsCharts storeId={store.id} />

      {/* Wilaya breakdown */}
      {orders.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b font-semibold text-sm flex items-center justify-between" style={{borderColor:'var(--color-border)',color:'var(--color-text-primary)'}}>
            <span>أكثر الولايات مبيعاً</span>
            <span className="text-xs font-normal" style={{color:'var(--color-text-muted)'}}>آخر 30 يوم</span>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table" style={{fontFamily:'var(--font-arabic)'}}>
              <thead>
                <tr>{['الولاية','الطلبات','نسبة التسليم','الإيرادات'].map(h=><th key={h}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {(() => {
                  const byWilaya: Record<string, {total:number;delivered:number;revenue:number}> = {}
                  orders.forEach((o: any) => {
                    const w = o.wilaya_id ?? 0
                    if (!byWilaya[w]) byWilaya[w] = {total:0,delivered:0,revenue:0}
                    byWilaya[w].total++
                    if (o.status === 'delivered') { byWilaya[w].delivered++; byWilaya[w].revenue += o.total }
                  })
                  return Object.entries(byWilaya)
                    .sort(([,a],[,b]) => b.total - a.total)
                    .slice(0,10)
                    .map(([w, s]) => {
                      const rate = s.total > 0 ? Math.round(s.delivered/s.total*100) : 0
                      return (
                        <tr key={w}>
                          <td className="font-medium">ولاية {w}</td>
                          <td className="font-semibold" style={{fontFamily:'var(--font-primary)'}}>{s.total}</td>
                          <td>
                            <span className="text-xs font-semibold" style={{color: rate >= 70 ? '#198754' : rate >= 40 ? '#FFA500' : '#DC3545'}}>
                              {rate}%
                            </span>
                          </td>
                          <td className="font-semibold" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{formatDZD(s.revenue)}</td>
                        </tr>
                      )
                    })
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
