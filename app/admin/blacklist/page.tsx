export const dynamic = 'force-dynamic'
export const metadata = { title: 'القائمة السوداء' }

import { createServerClient } from '@/lib/supabase/server'
import BlacklistManager from '@/components/admin/BlacklistManager'

export default async function BlacklistPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', session!.user.id).single()
  if (!store) return null

  const { data: list } = await supabase
    .from('blacklisted_customers')
    .select('*')
    .or(`store_id.eq.${store.id},store_id.is.null`)
    .order('created_at', { ascending: false })

  // Auto-flag candidates (3+ cancelled orders)
  const { data: candidates } = await supabase
    .from('orders')
    .select('customer_name, customer_phone, count:id.count()')
    .eq('store_id', store.id)
    .in('status', ['cancelled', 'returned'])
    .not('customer_phone', 'in', `(${(list ?? []).map(b => `"${b.phone}"`).join(',') || '"__none__"'})`)

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-black text-white">القائمة السوداء</h1>
      <BlacklistManager
        storeId={store.id}
        blacklist={(list ?? []) as any[]}
        candidates={(candidates ?? []) as any[]}
      />
    </div>
  )
}
