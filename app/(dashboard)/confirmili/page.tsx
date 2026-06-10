export const dynamic = 'force-dynamic'
export const metadata = { title: 'Confirmili' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import ConfirmiliClient from '@/components/dashboard/ConfirmiliClient'

const PLAN_LIMITS: Record<string, number> = {
  free: 100, starter: 500, pro: 5000, enterprise: 50000,
}

export default async function ConfirmiliPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  // Fetch ALL orders for Confirmili — all columns needed by ConfirmiliOrders
  const { data: orders } = await supabase
    .from('orders')
    .select(`
      id,order_number,customer_name,customer_phone,customer_phone2,address,
      total,subtotal,status,delivery_fee,declared_delivery_fee,real_delivery_fee,
      delivery_type,delivery_company_id,tracking_number,is_trashed,confirmed_by,
      call_attempts,last_call_at,notes,
      confirmed_at,shipped_at,delivered_at,
      created_at,updated_at,source,utm_source,
      wilaya:wilayas(id,name_ar),
      commune:communes(id,name_ar),
      items:order_items(id,product_name,quantity,unit_price,total_price,product_id,variant_key,variant_sku)
    `)
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .limit(1000)

  const [productsRes, teamRes, companiesRes] = await Promise.all([
    supabase.from('products').select('id,name,name_ar,sku,price,cost_price,images,min_stock_alert').eq('store_id', store.id).eq('is_active', true).order('name'),
    supabase.from('confirmili_team').select('id,name,phone,email,role,is_active').eq('store_id', store.id).eq('is_active', true),
    supabase.from('confirmili_delivery_companies').select('id,name,short_name,is_active,is_automatic').eq('store_id', store.id).eq('is_active', true),
  ])

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
      initialProducts={(productsRes.data ?? []) as any[]}
      initialTeam={(teamRes.data ?? []) as any[]}
      initialCompanies={(companiesRes.data ?? []) as any[]}
    />
  )
}
