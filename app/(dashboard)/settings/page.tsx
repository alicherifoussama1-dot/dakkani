export const dynamic = 'force-dynamic'
export const metadata = { title: 'الإعدادات' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import SettingsPageClient from '@/components/dashboard/SettingsPageClient'
import { pickStoreHostname } from '@/lib/domains/url'

export default async function SettingsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore } = await getActiveStore(supabase, user.id)
  if (!activeStore) return null
  const { data: store } = await supabase.from('stores').select('*,store_settings(*)').eq('id', activeStore.id).single()
  if (!store) return null
  const [{ data: wilayas }, { data: domains }] = await Promise.all([
    supabase.from('wilayas').select('id,name_ar').eq('is_active', true).order('id'),
    supabase.from('domains').select('id,hostname,status,is_default').eq('store_id', activeStore.id),
  ])
  const storeHostname = pickStoreHostname((domains ?? []) as any[])
  return <SettingsPageClient store={store as any} user={user} wilayas={wilayas ?? []} storeHostname={storeHostname} />
}
