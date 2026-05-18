export const dynamic = 'force-dynamic'
export const metadata = { title: 'الإحصائيات المتقدمة' }

import { createServerClient } from '@/lib/supabase/server'
import AdvancedAnalytics from '@/components/admin/AdvancedAnalytics'

export default async function AdminAnalyticsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase
    .from('stores')
    .select('id, name')
    .eq('owner_id', user!.id)
    .single()
  if (!store) return null

  // Last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000).toISOString()
  const sixtyDaysAgo  = new Date(Date.now() - 60 * 24 * 3600000).toISOString()

  const [ordersRes, itemsRes, wilayaRes] = await Promise.all([
    supabase.from('orders')
      .select('id, total, subtotal, delivery_fee, status, created_at, wilaya_id, wilaya:wilayas(name_ar)')
      .eq('store_id', store.id)
      .gte('created_at', sixtyDaysAgo)
      .order('created_at'),
    supabase.from('order_items')
      .select('product_name, quantity, total_price, cost_price, order_id')
      .eq('store_id', store.id)
      .gte('created_at', sixtyDaysAgo),
    supabase.from('orders')
      .select('wilaya_id, total, status, wilaya:wilayas(name_ar)')
      .eq('store_id', store.id)
      .gte('created_at', thirtyDaysAgo),
  ])

  return (
    <AdvancedAnalytics
      storeId={store.id}
      orders={(ordersRes.data ?? []) as any[]}
      items={(itemsRes.data ?? []) as any[]}
      wilayaOrders={(wilayaRes.data ?? []) as any[]}
    />
  )
}
