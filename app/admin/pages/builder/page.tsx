export const dynamic = 'force-dynamic'
export const metadata = { title: 'منشئ الصفحات — EcoBuilder' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import PageBuilder from '@/components/admin/PageBuilder'

export default async function PageBuilderPage({
  searchParams,
}: { searchParams: { page_id?: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { activeStore: store } = await getActiveStore(supabase, user!.id)
  if (!store) return null

  let page = null
  if (searchParams.page_id) {
    const { data } = await supabase.from('landing_pages').select('*').eq('id', searchParams.page_id).eq('store_id', store.id).single()
    page = data
  }

  const { data: products } = await supabase
    .from('products')
    .select('id, name, name_ar, price, images')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('name')

  const { data: wilayas } = await supabase.from('wilayas').select('id, name_ar, delivery_fee_home, delivery_fee_stopdesk, delivery_days_home').eq('is_active', true).order('id')

  return (
    <PageBuilder
      storeId={store.id}
      storeMeta={{ pixel: store.meta_pixel_id, tiktok: store.tiktok_pixel_id }}
      existingPage={page as any}
      products={(products ?? []) as any[]}
      wilayas={(wilayas ?? []) as any[]}
    />
  )
}
