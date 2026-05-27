export const dynamic = 'force-dynamic'
export const metadata = { title: 'الفئات' }

import { createServerClient } from '@/lib/supabase/server'
import CategoriesManager from '@/components/dashboard/CategoriesManager'

export default async function CategoriesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user!.id).single()
  if (!store) return null

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('sort_order')

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">الفئات</h1>
          <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{(categories?.length ?? 0)} فئة مسجلة</p>
        </div>
      </div>
      <CategoriesManager storeId={store.id} initialCategories={categories ?? []} />
    </div>
  )
}
