import { createServerClient } from '@/lib/supabase/server'
import { formatDZD } from '@/lib/utils/format'
import AnalyticsCharts from '@/components/dashboard/AnalyticsCharts'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'الإحصائيات' }

export default async function AnalyticsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user!.id).single()
  if (!store) return null

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [ordersRes, topProductsRes] = await Promise.all([
    supabase.from('orders')
      .select('total, status, created_at, wilaya_id, delivery_fee, discount_amount')
      .eq('store_id', store.id)
      .gte('created_at', thirtyDaysAgo),
    supabase.from('order_items')
      .select('product_name, quantity, total_price')
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
    { label: 'إجمالي الإيرادات (30 يوم)', value: formatDZD(revenue) },
    { label: 'متوسط قيمة الطلب', value: formatDZD(avgOrder) },
    { label: 'معدل التسليم', value: `${convRate}%` },
    { label: 'إيرادات التوصيل', value: formatDZD(deliveryRevenue) },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold text-gray-900">الإحصائيات (آخر 30 يوم)</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-2xl font-black text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-500 mt-1">{k.label}</p>
          </div>
        ))}
      </div>
      <AnalyticsCharts storeId={store.id} />
    </div>
  )
}
