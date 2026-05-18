export const dynamic = 'force-dynamic'
export const metadata = { title: 'إعدادات المتجر' }

import { createServerClient } from '@/lib/supabase/server'
import FullSettingsForm from '@/components/dashboard/FullSettingsForm'

export default async function SettingsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase
    .from('stores')
    .select('*, store_settings(*)')
    .eq('owner_id', user!.id)
    .single()
  if (!store) return null

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">إعدادات المتجر</h1>
        <p className="text-sm text-gray-500 mt-0.5">إدارة معلومات المتجر، البكسل، والإشعارات</p>
      </div>
      <FullSettingsForm store={store as any} />
    </div>
  )
}
