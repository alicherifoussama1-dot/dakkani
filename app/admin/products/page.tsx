export const dynamic = 'force-dynamic'
export const metadata = { title: 'المنتجات — Admin' }

import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import AdminProductsTable from '@/components/admin/AdminProductsTable'

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { search?: string; category?: string; page?: string }
}) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user!.id).single()
  if (!store) return null

  const page = parseInt(searchParams.page ?? '1')
  const pageSize = 20
  const from = (page - 1) * pageSize

  let query = supabase
    .from('products')
    .select(`
      id, name, name_ar, slug, price, compare_price, cost_price,
      images, is_active, is_featured, use_store_pixel, meta_pixel_id, tiktok_pixel_id,
      category:categories(name_ar, name),
      stock:warehouse_stock(quantity, reserved)
    `, { count: 'exact' })
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (searchParams.search) {
    query = query.or(`name.ilike.%${searchParams.search}%,name_ar.ilike.%${searchParams.search}%`)
  }
  if (searchParams.category) {
    query = query.eq('category_id', searchParams.category)
  }

  const { data: products, count } = await query
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name, name_ar')
    .eq('store_id', store.id)
    .eq('is_active', true)

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">المنتجات</h1>
          <p className="text-sm text-gray-500 mt-0.5">{count ?? 0} منتج</p>
        </div>
        <Link
          href="/admin/products/new"
          className="flex items-center gap-2 bg-[#E8431A] hover:bg-[#C73615] text-white px-4 py-2 rounded-lg text-sm font-bold transition"
        >
          <Plus className="w-4 h-4" />
          منتج جديد
        </Link>
      </div>
      <AdminProductsTable
        products={(products ?? []) as any[]}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        categories={categories ?? []}
        storeId={store.id}
      />
    </div>
  )
}
