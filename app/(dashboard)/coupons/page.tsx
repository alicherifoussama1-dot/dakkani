export const dynamic = 'force-dynamic'
export const metadata = { title: 'الكوبونات' }

import { createServerClient } from '@/lib/supabase/server'
import CouponsManager from '@/components/dashboard/CouponsManager'

export default async function CouponsPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', session!.user.id).single()
  if (!store) return null

  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4 animate-fade-in max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">الكوبونات</h1>
      <CouponsManager storeId={store.id} initialCoupons={coupons ?? []} />
    </div>
  )
}
