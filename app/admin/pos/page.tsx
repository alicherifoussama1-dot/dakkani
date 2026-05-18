export const dynamic = 'force-dynamic'
export const metadata = { title: 'نقطة البيع — POS' }

import { createServerClient } from '@/lib/supabase/server'
import POSTerminal from '@/components/admin/POSTerminal'

export default async function POSPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: store } = await supabase.from('stores').select('id, name, name_ar').eq('owner_id', session!.user.id).single()
  if (!store) return null

  const { data: products } = await supabase
    .from('products')
    .select('id, name, name_ar, price, images, sku, warehouse_stock(quantity, reserved)')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('name')

  return (
    <POSTerminal
      storeId={store.id}
      storeName={store.name_ar ?? store.name}
      cashierId={session!.user.id}
      products={(products ?? []) as any[]}
    />
  )
}
