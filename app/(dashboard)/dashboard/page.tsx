export const dynamic = 'force-dynamic'
export const metadata = { title: 'الرئيسية — دكاني' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import DashboardHome from '@/components/dashboard/DashboardHome'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { activeStore: store } = await getActiveStore(supabase, user.id)

  const today = new Date().toISOString().split('T')[0]

  const [ordersRes, productsRes] = await Promise.all([
    supabase
      .from('orders')
      .select('id, total, status, utm_source, created_at')
      .eq('store_id', store?.id ?? '')
      .gte('created_at', today),
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('store_id', store?.id ?? '')
      .eq('is_active', true),
  ])

  const o = ordersRes.data ?? []
  const todayStats = {
    total:    o.length,
    facebook: o.filter(x => x.utm_source === 'facebook').length,
    tiktok:   o.filter(x => x.utm_source === 'tiktok').length,
    other:    o.filter(x => !['facebook','tiktok'].includes(x.utm_source ?? '')).length,
    revenue:  o.filter(x => x.status === 'delivered').reduce((s, x) => s + x.total, 0),
    productCount: productsRes.count ?? 0,
  }

  return (
    <DashboardHome
      storeName={store?.name ?? 'متجري'}
      storeId={store?.id ?? ''}
      todayStats={todayStats}
      userName={user.email?.split('@')[0] ?? 'التاجر'}
    />
  )
}
