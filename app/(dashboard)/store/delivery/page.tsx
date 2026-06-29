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
    <div className="w-full max-w-7xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <StoreDeliveryShell storeId={store.id} />
    </div>
  )
}
