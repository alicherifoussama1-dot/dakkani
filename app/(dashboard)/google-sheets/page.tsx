export const dynamic = 'force-dynamic'
export const metadata = { title: 'قوقل شيت — وجهة الطلبات' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import GoogleSheetsClient from '@/components/admin/GoogleSheetsClient'

export default async function GoogleSheetsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  // Routing columns may not exist until migration 015 — degrade gracefully
  const [accountsRes, sheetsRes, settingsRes] = await Promise.all([
    supabase.from('google_accounts').select('id,email,status,created_at').eq('store_id', store.id).order('created_at'),
    supabase.from('google_sheets').select('*').eq('store_id', store.id).order('created_at'),
    supabase.from('store_settings').select('order_routing').eq('store_id', store.id).maybeSingle(),
  ])

  const migrationMissing = !!accountsRes.error

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <GoogleSheetsClient
        storeId={store.id}
        initialAccounts={(accountsRes.data ?? []) as any[]}
        initialSheets={(sheetsRes.data ?? []) as any[]}
        initialRouting={(settingsRes.data as any)?.order_routing ?? 'confirmili_only'}
        migrationMissing={migrationMissing}
      />
    </div>
  )
}
