export const dynamic = 'force-dynamic'
export const metadata = { title: 'الزبائن' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import CustomersPageClient from '@/components/dashboard/CustomersPageClient'

export default async function CustomersPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  const { data: orders } = await supabase
    .from('orders')
    .select('customer_name,customer_phone,total,status,created_at,order_number,wilaya:wilayas(name_ar),commune:communes(name_ar)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  const map: Record<string, any> = {}
  ;(orders ?? []).forEach((o: any) => {
    const k = o.customer_phone
    if (!map[k]) {
      map[k] = {
        name: o.customer_name, phone: k,
        wilaya: o.wilaya?.name_ar, commune: o.commune?.name_ar,
        orders: 0, lastId: o.order_number, spent: 0,
        first: o.created_at, last: o.created_at
      }
    }
    map[k].orders++
    if (o.status === 'delivered') map[k].spent += o.total
    if (new Date(o.created_at) > new Date(map[k].last)) {
      map[k].last = o.created_at
      map[k].lastId = o.order_number
    }
  })
  const customers = Object.values(map).sort((a: any, b: any) => b.spent - a.spent)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h1 className="page-title">الزبائن</h1>
        <span className="badge badge-gray">{customers.length} زبون</span>
      </div>
      <CustomersPageClient customers={customers as any} />
    </div>
  )
}
