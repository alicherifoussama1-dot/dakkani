export const dynamic = 'force-dynamic'
export const metadata = { title: 'منتج جديد' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import AdminProductEditor from '@/components/admin/AdminProductEditor'

export default async function NewProductPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { activeStore: store } = await getActiveStore(supabase, user!.id)
  if (!store) return null

  const [categoriesRes, warehousesRes, sheetsRes] = await Promise.all([
    supabase.from('categories').select('id, name, name_ar').eq('store_id', store.id).eq('is_active', true).order('name'),
    supabase.from('warehouses').select('id, name').eq('store_id', store.id).eq('is_active', true),
    supabase.from('google_sheets').select('id, spreadsheet_name, worksheet_name, is_default').eq('store_id', store.id).eq('status', true),
  ])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <h1 className="page-title mb-5">إضافة منتج جديد</h1>
      <AdminProductEditor
        storeId={store.id}
        storePixels={{ meta: store.meta_pixel_id, tiktok: store.tiktok_pixel_id }}
        categories={categoriesRes.data ?? []}
        warehouses={warehousesRes.data ?? []}
        googleSheets={sheetsRes.data ?? []}
      />
    </div>
  )
}
