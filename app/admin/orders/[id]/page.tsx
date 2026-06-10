export const dynamic = 'force-dynamic'

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AdminOrderDetail from '@/components/admin/AdminOrderDetail'

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user!.id)
  if (!store) return null

  const { data: order } = await supabase
    .from('orders')
    .select(`
      *,
      wilaya:wilayas(*),
      commune:communes(name_ar, name_fr),
      items:order_items(*),
      logs:delivery_logs(* )
    `)
    .eq('id', params.id)
    .eq('store_id', store.id)
    .single()

  if (!order) notFound()

  const { data: wilayas } = await supabase.from('wilayas').select('id, name_ar').order('id')

  return <AdminOrderDetail order={order as any} store={store as any} wilayas={wilayas ?? []} />
}
