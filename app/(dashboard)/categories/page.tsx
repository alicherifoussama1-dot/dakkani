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
      <h1 className="page-title mb-5">الفئات</h1>
      <CategoriesManager storeId={store.id} initialCategories={categories ?? []} />
    </div>
  )
}
