export const dynamic = 'force-dynamic'
export const metadata = { title: 'OMS — إدارة الطلبات' }

import { createServerClient } from '@/lib/supabase/server'
import AdminOrdersTable from '@/components/admin/AdminOrdersTable'

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: {
    status?: string; search?: string; wilaya?: string
    provider?: string; fraud?: string; from?: string; to?: string; page?: string
  }
}) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id, name').eq('owner_id', user!.id).single()
  if (!store) return null

  const page     = parseInt(searchParams.page ?? '1')
  const pageSize = 25
  const from     = (page - 1) * pageSize

  let query = supabase
    .from('orders')
    .select(`
      id, order_number, customer_name, customer_phone,
      wilaya_id, total, payment_method, status,
      delivery_partner, tracking_number, fraud_score,
      is_blacklisted, call_attempts, created_at,
      items:order_items(id),
      wilaya:wilayas(name_ar)
    `, { count: 'exact' })
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (searchParams.status)   query = query.eq('status', searchParams.status)
  if (searchParams.wilaya)   query = query.eq('wilaya_id', parseInt(searchParams.wilaya))
  if (searchParams.provider) query = query.eq('delivery_partner', searchParams.provider)
  if (searchParams.from)     query = query.gte('created_at', searchParams.from)
  if (searchParams.to)       query = query.lte('created_at', searchParams.to + 'T23:59:59')
  if (searchParams.fraud === 'high')   query = query.gte('fraud_score', 70)
  if (searchParams.fraud === 'medium') query = query.gte('fraud_score', 40).lt('fraud_score', 70)
  if (searchParams.fraud === 'low')    query = query.lt('fraud_score', 40)
  if (searchParams.search) {
    query = query.or(
      `customer_name.ilike.%${searchParams.search}%,customer_phone.ilike.%${searchParams.search}%,order_number.ilike.%${searchParams.search}%`
    )
  }

  const { data: orders, count } = await query
  const { data: wilayas } = await supabase.from('wilayas').select('id, name_ar').order('id')

  return (
    <AdminOrdersTable
      orders={(orders ?? []) as any[]}
      total={count ?? 0}
      page={page}
      pageSize={pageSize}
      storeId={store.id}
      wilayas={wilayas ?? []}
      filters={searchParams}
    />
  )
}
