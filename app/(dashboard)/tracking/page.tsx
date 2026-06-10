export const dynamic = 'force-dynamic'
export const metadata = { title: 'التتبع' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import TrackingPageClient from '@/components/dashboard/TrackingPageClient'

export default async function TrackingPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null
  const { data: pixels } = await supabase.from('stores').select('meta_pixel_id,tiktok_pixel_id,google_tag_id,snapchat_pixel_id').eq('id', store.id).single()
  return <TrackingPageClient storeId={store.id} pixels={pixels ?? {}} />
}
