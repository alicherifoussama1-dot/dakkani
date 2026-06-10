export const dynamic = 'force-dynamic'
export const metadata = { title: 'المنتجات' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import ProductsPageClient from '@/components/dashboard/ProductsPageClient'

export default async function ProductsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null
  const [productsRes, catsRes, warehousesRes] = await Promise.all([
    supabase.from('products').select('*,warehouse_stock(quantity,reserved)').eq('store_id', store.id).order('created_at', { ascending: false }),
    supabase.from('categories').select('id,name,name_ar').eq('store_id', store.id).eq('is_active', true),
    supabase.from('warehouses').select('id,name').eq('store_id', store.id).eq('is_active', true),
  ])
  return (
    <ProductsPageClient
      initialProducts={(productsRes.data ?? []) as any[]}
      storeId={store.id}
      storeSlug={store.slug ?? ''}
      storePixels={{ meta: store.meta_pixel_id, tiktok: store.tiktok_pixel_id }}
      categories={catsRes.data ?? []}
      warehouses={warehousesRes.data ?? []}
    />
  )
}
