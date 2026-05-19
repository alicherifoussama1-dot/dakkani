export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AdminProductEditor from '@/components/admin/AdminProductEditor'

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase
    .from('stores')
    .select('id, meta_pixel_id, tiktok_pixel_id')
    .eq('owner_id', user!.id)
    .single()
  if (!store) return null

  const [productRes, categoriesRes, warehousesRes, stockRes] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).eq('store_id', store.id).single(),
    supabase.from('categories').select('id, name, name_ar').eq('store_id', store.id).eq('is_active', true).order('name'),
    supabase.from('warehouses').select('id, name').eq('store_id', store.id).eq('is_active', true),
    supabase.from('warehouse_stock').select('warehouse_id, quantity, reserved, variant_key').eq('product_id', params.id),
  ])

  if (!productRes.data) notFound()

  return (
    <div className="p-6">
      <h1 className="text-xl font-black text-white mb-6">
        تعديل: {productRes.data.name_ar ?? productRes.data.name}
      </h1>
      <AdminProductEditor
        storeId={store.id}
        storePixels={{ meta: store.meta_pixel_id, tiktok: store.tiktok_pixel_id }}
        categories={categoriesRes.data ?? []}
        warehouses={warehousesRes.data ?? []}
        product={productRes.data as any}
        stockData={stockRes.data ?? []}
      />
    </div>
  )
}
