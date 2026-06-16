export const dynamic = 'force-dynamic'
export const metadata = { title: 'مُنشئ المتجر' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import StoreBuilder from '@/components/dashboard/StoreBuilder'
import { normalizeLayout } from '@/lib/storefront/sections'

export default async function StoreBuilderPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  return (
    <StoreBuilder
      storeId={store.id}
      storeSlug={store.slug}
      storeName={store.name_ar ?? store.name}
      initialLayout={normalizeLayout(store.layout)}
      initialTheme={store.theme_key ?? 'classic'}
    />
  )
}
