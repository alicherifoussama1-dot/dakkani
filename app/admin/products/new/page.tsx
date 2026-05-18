export const dynamic = 'force-dynamic'
export const metadata = { title: 'منتج جديد — Admin' }

import { createServerClient } from '@/lib/supabase/server'
import AdminProductEditor from '@/components/admin/AdminProductEditor'

export default async function AdminNewProductPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: store } = await supabase
    .from('stores')
    .select('id, meta_pixel_id, tiktok_pixel_id')
    .eq('owner_id', session!.user.id)
    .single()
  if (!store) return null

  const [categoriesRes, warehousesRes] = await Promise.all([
    supabase.from('categories').select('id, name, name_ar').eq('store_id', store.id).eq('is_active', true).order('name'),
    supabase.from('warehouses').select('id, name').eq('store_id', store.id).eq('is_active', true),
  ])

  return (
    <div className="p-6">
      <h1 className="text-xl font-black text-white mb-6">إضافة منتج جديد</h1>
      <AdminProductEditor
        storeId={store.id}
        storePixels={{ meta: store.meta_pixel_id, tiktok: store.tiktok_pixel_id }}
        categories={categoriesRes.data ?? []}
        warehouses={warehousesRes.data ?? []}
      />
    </div>
  )
}
