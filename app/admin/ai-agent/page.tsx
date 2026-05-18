export const dynamic = 'force-dynamic'
export const metadata = { title: 'AI Agent — دكاني' }

import { createServerClient } from '@/lib/supabase/server'
import AIAgentChat from '@/components/admin/AIAgentChat'

export default async function AIAgentPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id, name, slug').eq('owner_id', user!.id).single()
  if (!store) return null

  // Load store context for AI
  const today = new Date().toISOString().split('T')[0]
  const [ordersRes, productsRes, revenueRes] = await Promise.all([
    supabase.from('orders').select('status', { count: 'exact' }).eq('store_id', store.id).gte('created_at', today),
    supabase.from('products').select('id', { count: 'exact' }).eq('store_id', store.id).eq('is_active', true),
    supabase.from('orders').select('total').eq('store_id', store.id).eq('status', 'delivered').gte('created_at', today),
  ])

  const storeContext = {
    storeName:       store.name,
    storeId:         store.id,
    todayOrders:     ordersRes.count ?? 0,
    todayRevenue:    (revenueRes.data ?? []).reduce((s, o) => s + o.total, 0),
    activeProducts:  productsRes.count ?? 0,
    pendingOrders:   (ordersRes.data ?? []).filter(o => o.status === 'new').length,
  }

  return <AIAgentChat storeContext={storeContext} />
}
