export const dynamic = 'force-dynamic'
export const metadata = { title: 'القائمة السوداء' }

import { createServerClient } from '@/lib/supabase/server'
import BlacklistManager from '@/components/dashboard/BlacklistManagerDashboard'

export default async function BlacklistPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user.id).single()
  if (!store) return null

  const { data: blacklist } = await supabase
    .from('blacklisted_customers')
    .select('*')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">القائمة السوداء</h1>
          <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>
            {(blacklist?.length ?? 0)} عميل محظور
          </p>
        </div>
      </div>
      <BlacklistManager storeId={store.id} initialList={(blacklist ?? []) as any[]} />
    </div>
  )
}
