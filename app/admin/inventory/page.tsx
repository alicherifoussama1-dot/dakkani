export const dynamic = 'force-dynamic'
export const metadata = { title: 'المخزون' }

import { createServerClient } from '@/lib/supabase/server'
import InventoryManager from '@/components/admin/InventoryManager'

export default async function InventoryPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: store } = await supabase.from('stores').select('id, store_settings(low_stock_threshold)').eq('owner_id', session!.user.id).single()
  if (!store) return null

  const [stockRes, warehousesRes, productsRes] = await Promise.all([
    supabase.from('warehouse_stock')
      .select('*, product:products(id, name, name_ar, sku, images), warehouse:warehouses(name)')
      .eq('store_id', store.id)
      .order('quantity'),
    supabase.from('warehouses').select('id, name').eq('store_id', store.id).eq('is_active', true),
    supabase.from('products').select('id, name, name_ar, sku').eq('store_id', store.id).eq('is_active', true),
  ])

  const threshold = (store.store_settings as any)?.low_stock_threshold ?? 5

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-black text-white">إدارة المخزون</h1>
      <InventoryManager
        storeId={store.id}
        stock={(stockRes.data ?? []) as any[]}
        warehouses={warehousesRes.data ?? []}
        products={productsRes.data ?? []}
        threshold={threshold}
      />
    </div>
  )
}
