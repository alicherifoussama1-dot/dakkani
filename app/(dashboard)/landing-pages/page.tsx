export const dynamic = 'force-dynamic'
export const metadata = { title: 'صفحات الهبوط' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import LandingPagesClient from '@/components/dashboard/LandingPagesClient'

export default async function LandingPagesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  const { data: pages } = await supabase
    .from('landing_pages')
    .select('*, product:products(name, name_ar)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <LandingPagesClient
      initialPages={(pages ?? []) as any[]}
      storeSlug={store.slug ?? ''}
      storeId={store.id}
    />
  )
}
