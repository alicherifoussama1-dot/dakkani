export const dynamic = 'force-dynamic'
export const metadata = { title: 'الطلبات' }

import { createServerClient } from '@/lib/supabase/server'
import OrdersPageClient from '@/components/dashboard/OrdersPageClient'

export default async function OrdersPage({
  searchParams,
}: { searchParams: { status?: string; search?: string; page?: string; per_page?: string; from?: string; to?: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).single()
  if (!store) return null

  const page    = parseInt(searchParams.page ?? '1')
  const perPage = parseInt(searchParams.per_page ?? '10')
  const from    = (page - 1) * perPage

  let q = supabase
    .from('orders')
    .select('*, wilaya:wilayas(name_ar), commune:communes(name_ar), items:order_items(product_name,quantity)', { count: 'exact' })
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .range(from, from + perPage - 1)

  if (searchParams.status)  q = q.eq('status', searchParams.status)
  if (searchParams.from)    q = q.gte('created_at', searchParams.from)
  if (searchParams.to)      q = q.lte('created_at', searchParams.to + 'T23:59:59')
  if (searchParams.search) {
    q = q.or(`customer_name.ilike.%${searchParams.search}%,customer_phone.ilike.%${searchParams.search}%,order_number.ilike.%${searchParams.search}%`)
  }

  const { data: orders, count } = await q
  const { data: products } = await supabase
    .from('products').select('id,name,name_ar,sku').eq('store_id', store.id).eq('is_active', true)

  return (
    <OrdersPageClient
      initialOrders={(orders ?? []) as any[]}
      total={count ?? 0}
      page={page}
      perPage={perPage}
      storeId={store.id}
      products={products ?? []}
      filters={searchParams}
    />
  )
}
