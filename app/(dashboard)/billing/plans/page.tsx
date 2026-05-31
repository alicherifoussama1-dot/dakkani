export const dynamic = 'force-dynamic'
export const metadata = { title: 'الخطط والاشتراك' }

import { createServerClient } from '@/lib/supabase/server'
import BillingPlansClient from '@/components/dashboard/BillingPlansClient'

export default async function BillingPlansPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('id,name,plan').eq('owner_id', user.id).single()
  if (!store) return null

  const firstOfMonth = new Date()
  firstOfMonth.setDate(1); firstOfMonth.setHours(0,0,0,0)

  const [ordersRes, productsRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true })
      .eq('store_id', store.id).gte('created_at', firstOfMonth.toISOString()),
    supabase.from('products').select('id', { count: 'exact', head: true })
      .eq('store_id', store.id),
  ])

  return (
    <BillingPlansClient
      storeName={store.name ?? ''}
      currentPlan={store.plan ?? 'free'}
      ordersThisMonth={ordersRes.count ?? 0}
      productCount={productsRes.count ?? 0}
    />
  )
}
