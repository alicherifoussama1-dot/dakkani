export const dynamic = 'force-dynamic'
export const metadata = { title: 'Confirmili' }

import { createServerClient } from '@/lib/supabase/server'
import ConfirmiliClient from '@/components/dashboard/ConfirmiliClient'

export default async function ConfirmiliPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('id, name, slug, plan').eq('owner_id', user.id).single()
  if (!store) return null

  // Fetch recent 30-day orders for Confirmili stats
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: orders } = await supabase
    .from('orders')
    .select('id,order_number,customer_name,customer_phone,total,status,delivery_fee,created_at,source,utm_source,wilaya:wilayas(name_ar),items:order_items(product_name,quantity,unit_price)')
    .eq('store_id', store.id)
    .gte('created_at', thirtyDaysAgo)
    .order('created_at', { ascending: false })
    .limit(500)

  const { data: products } = await supabase
    .from('products')
    .select('id,name,name_ar,sku,price,cost_price,images')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('name')

  return (
    <ConfirmiliClient
      storeId={store.id}
      storeName={store.name}
      plan={store.plan ?? 'free'}
      initialOrders={(orders ?? []) as any[]}
      initialProducts={(products ?? []) as any[]}
    />
  )
}
