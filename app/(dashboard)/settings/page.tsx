export const dynamic = 'force-dynamic'
export const metadata = { title: 'الإعدادات' }

import { createServerClient } from '@/lib/supabase/server'
import SettingsPageClient from '@/components/dashboard/SettingsPageClient'

export default async function SettingsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('*,store_settings(*)').eq('owner_id', user.id).single()
  if (!store) return null
  const { data: wilayas } = await supabase.from('wilayas').select('id,name_ar').eq('is_active', true).order('id')
  return <SettingsPageClient store={store as any} user={user} wilayas={wilayas ?? []} />
}
