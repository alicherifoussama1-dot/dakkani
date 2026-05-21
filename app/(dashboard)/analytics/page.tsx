import { createServerClient } from '@/lib/supabase/server'
import { formatDZD } from '@/lib/utils/format'
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts'
import { TrendingUp, ShoppingCart, Percent, Truck } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'الإحصائيات' }

export default async function AnalyticsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user!.id).single()
  if (!store) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [ordersRes] = await Promise.all([
    supabase.from('orders')
      .select('total, status, created_at, wilaya_id, delivery_fee, discount_amount')
      .eq('store_id', store.id)
      .gte('created_at', thirtyDaysAgo),
  ])

  const orders = ordersRes.data ?? []
  const delivered = orders.filter(o => o.status === 'delivered')
  const revenue = delivered.reduce((s, o) => s + o.total, 0)
  const deliveryRevenue = delivered.reduce((s, o) => s + o.delivery_fee, 0)
  const avgOrder = delivered.length ? revenue / delivered.length : 0
  const convRate = orders.length ? Math.round((delivered.length / orders.length) * 100) : 0

  const kpis = [
    { label: 'إجمالي الإيرادات', sub: 'آخر 30 يوم', value: formatDZD(revenue),      Icon: TrendingUp, color: '#0D6EFD' },
    { label: 'متوسط قيمة الطلب',  sub: 'المُسلَّمة فقط', value: formatDZD(avgOrder), Icon: ShoppingCart, color: '#2BBFAD' },
    { label: 'معدل التسليم',       sub: 'من إجمالي الطلبات', value: `${convRate}%`,  Icon: Percent,      color: '#28A745' },
    { label: 'إيرادات التوصيل',    sub: 'آخر 30 يوم', value: formatDZD(deliveryRevenue), Icon: Truck, color: '#6F42C1' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div>
        <h1 className="page-title">الإحصائيات</h1>
        <p className="text-sm mt-1" style={{color:'var(--color-text-muted)'}}>آخر 30 يوم</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{background:`${k.color}15`}}>
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
    </div>
  )
}
