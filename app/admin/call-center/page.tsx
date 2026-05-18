export const dynamic = 'force-dynamic'
export const metadata = { title: 'مركز الاتصال' }

import { createServerClient } from '@/lib/supabase/server'
import CallCenterPage from '@/components/admin/CallCenter'

export default async function CallCenter() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: store } = await supabase.from('stores').select('id, name').eq('owner_id', session!.user.id).single()
  if (!store) return null

  // Load pending + new orders queue
  const { data: queue } = await supabase
    .from('orders')
    .select(`
      id, order_number, customer_name, customer_phone,
      total, status, call_attempts, last_call_at, created_at,
      wilaya:wilayas(name_ar),
      items:order_items(product_name, quantity)
    `)
    .eq('store_id', store.id)
    .in('status', ['new', 'confirmed'])
    .order('created_at', { ascending: true })
    .limit(50)

  // Today's stats
  const today = new Date().toISOString().split('T')[0]
  const { data: todayOrders } = await supabase
    .from('orders')
    .select('status, call_attempts')
    .eq('store_id', store.id)
    .gte('created_at', today)

  const todayCalls     = todayOrders?.reduce((s, o) => s + (o.call_attempts ?? 0), 0) ?? 0
  const todayConfirmed = todayOrders?.filter(o => o.status === 'confirmed' || o.status === 'delivered').length ?? 0
  const todayTotal     = todayOrders?.length ?? 0
  const confirmRate    = todayTotal ? Math.round((todayConfirmed / todayTotal) * 100) : 0

  return (
    <CallCenterPage
      storeId={store.id}
      storeName={store.name}
      initialQueue={(queue ?? []) as any[]}
      stats={{ todayCalls, todayConfirmed, todayTotal, confirmRate }}
    />
  )
}
