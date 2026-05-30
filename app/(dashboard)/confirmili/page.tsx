export const dynamic = 'force-dynamic'
export const metadata = { title: 'Confirmili' }

import { createServerClient } from '@/lib/supabase/server'
import ConfirmiliClient from '@/components/dashboard/ConfirmiliClient'

const PLAN_LIMITS: Record<string, number> = {
  free: 100, starter: 500, pro: 5000, enterprise: 50000,
}

export default async function ConfirmiliPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('id, name, slug, plan').eq('owner_id', user.id).single()
  if (!store) return null

  // Fetch ALL orders (not just 30-day) for confirmili — sorted newest first
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,order_number,customer_name,customer_phone,customer_phone2,
      total,status,delivery_fee,declared_delivery_fee,real_delivery_fee,
      delivery_type,delivery_company_id,tracking_number,
      created_at,source,utm_source,
      wilaya:wilayas(name_ar),
      commune:communes(name_ar),
      items:order_items(product_name,quantity,unit_price,product_id)
    `)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(1000)

  const { data: products } = await supabase
    .from('products')
    .select('id,name,name_ar,sku,price,cost_price,images,min_stock_alert')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('name')

  // Count this billing cycle orders for quota (9.9)
  const firstOfMonth = new Date()
  firstOfMonth.setDate(1); firstOfMonth.setHours(0,0,0,0)
  const { count: ordersUsed } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('store_id', store.id)
    .gte('created_at', firstOfMonth.toISOString())

  const planKey = store.plan ?? 'free'
  const planLimit = PLAN_LIMITS[planKey] ?? 100

  return (
    <ConfirmiliClient
      storeId={store.id}
      storeName={store.name}
      plan={planKey}
      planOrderLimit={planLimit}
      planOrdersUsed={ordersUsed ?? 0}
      initialOrders={(orders ?? []) as any[]}
      initialProducts={(products ?? []) as any[]}
    />
  )
}
