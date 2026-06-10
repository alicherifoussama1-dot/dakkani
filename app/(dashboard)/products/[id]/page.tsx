export const dynamic = 'force-dynamic'

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AdminProductEditor from '@/components/admin/AdminProductEditor'

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: p } = await supabase.from('products').select('name_ar, name').eq('id', params.id).single()
  return { title: `تعديل: ${p?.name_ar ?? p?.name ?? 'منتج'}` }
}

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  const [productRes, categoriesRes, warehousesRes, stockRes] = await Promise.all([
    supabase.from('products').select('*').eq('id', params.id).eq('store_id', store.id).single(),
    supabase.from('categories').select('id, name, name_ar').eq('store_id', store.id).eq('is_active', true).order('name'),
    supabase.from('warehouses').select('id, name').eq('store_id', store.id).eq('is_active', true),
    supabase.from('warehouse_stock').select('warehouse_id, quantity, reserved, variant_key').eq('product_id', params.id),
  ])

  if (!productRes.data) notFound()

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <h1 className="page-title mb-5">
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
