export const dynamic = 'force-dynamic'
export const metadata = { title: 'الكوبونات' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import CouponsManager from '@/components/dashboard/CouponsManager'

export default async function CouponsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { activeStore: store } = await getActiveStore(supabase, user!.id)
  if (!store) return null

  const { data: coupons } = await supabase
    .from('coupons')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">الكوبونات</h1>
          <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{(coupons?.length ?? 0)} كوبون</p>
        </div>
      </div>
      <CouponsManager storeId={store.id} initialCoupons={coupons ?? []} />
    </div>
  )
}
