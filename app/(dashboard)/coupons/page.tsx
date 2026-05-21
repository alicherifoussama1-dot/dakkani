export const dynamic = 'force-dynamic'
export const metadata = { title: 'الكوبونات' }

import { createServerClient } from '@/lib/supabase/server'
import CouponsManager from '@/components/dashboard/CouponsManager'

export default async function CouponsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user!.id).single()
  if (!store) return null

  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <h1 className="page-title mb-5">الكوبونات</h1>
      <CouponsManager storeId={store.id} initialCoupons={coupons ?? []} />
    </div>
  )
}
