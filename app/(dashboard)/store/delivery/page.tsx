export const dynamic = 'force-dynamic'
export const metadata = { title: 'التوصيل' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import StoreDeliveryShell from '@/components/store/StoreDeliveryShell'

// Standalone STORE delivery section — independent of Confirmili.
export default async function StoreDeliveryPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <h1 className="page-title mb-5">شركات التوصيل والأسعار</h1>
      <StoreDeliveryShell storeId={store.id} />
    </div>
  )
}
