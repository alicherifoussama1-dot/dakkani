export const dynamic = 'force-dynamic'
export const metadata = { title: 'الفئات' }

import { createServerClient } from '@/lib/supabase/server'
import CategoriesManager from '@/components/dashboard/CategoriesManager'

export default async function CategoriesPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', session!.user.id).single()
  if (!store) return null

  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('store_id', store.id)
    .order('sort_order')

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">الفئات</h1>
      <CategoriesManager storeId={store.id} initialCategories={categories ?? []} />
    </div>
  )
}
