export const dynamic = 'force-dynamic'
export const metadata = { title: 'قوقل شيت — وجهة الطلبات' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import SheetsServiceAccountClient from '@/components/dashboard/SheetsServiceAccountClient'
import { getServiceAccountEmail, SHEET_HEADERS } from '@/lib/google/service-account'

export default async function GoogleSheetsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  // New service-account model. `sheets` may not exist until migration 020.
  const [sheetsRes, mapRes, settingsRes] = await Promise.all([
    supabase.from('sheets').select('*').eq('store_id', store.id).order('created_at'),
    supabase.from('sheet_mapping').select('sheet_id,linked_to_type'),
    supabase.from('store_settings').select('order_routing').eq('store_id', store.id).maybeSingle(),
  ])
  const migrationMissing = !!sheetsRes.error
  const defaultSheetId = (mapRes.data ?? []).find((m: any) => m.linked_to_type === 'default')?.sheet_id ?? null
  const sheets = (sheetsRes.data ?? []).map((s: any) => ({ ...s, is_default: s.id === defaultSheetId }))

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <SheetsServiceAccountClient
        storeId={store.id}
        serviceAccountEmail={getServiceAccountEmail()}
        requiredHeaders={[...SHEET_HEADERS]}
        initialSheets={sheets}
        initialRouting={(settingsRes.data as any)?.order_routing ?? 'confirmili_only'}
        migrationMissing={migrationMissing}
      />
    </div>
  )
}
