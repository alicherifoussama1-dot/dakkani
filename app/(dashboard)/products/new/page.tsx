export const dynamic = 'force-dynamic'
export const metadata = { title: 'منتج جديد' }

import { createServerClient } from '@/lib/supabase/server'
import AdminProductEditor from '@/components/admin/AdminProductEditor'

export default async function NewProductPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase
    .from('stores')
    .select('id, meta_pixel_id, tiktok_pixel_id')
    .eq('owner_id', user!.id)
    .single()
  if (!store) return null

  const [categoriesRes, warehousesRes] = await Promise.all([
    supabase.from('categories').select('id, name, name_ar').eq('store_id', store.id).eq('is_active', true).order('name'),
    supabase.from('warehouses').select('id, name').eq('store_id', store.id).eq('is_active', true),
  ])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <h1 className="page-title mb-5">إضافة منتج جديد</h1>
      <AdminProductEditor
        storeId={store.id}
        storePixels={{ meta: store.meta_pixel_id, tiktok: store.tiktok_pixel_id }}
        categories={categoriesRes.data ?? []}
        warehouses={warehousesRes.data ?? []}
      />
    </div>
  )
}
