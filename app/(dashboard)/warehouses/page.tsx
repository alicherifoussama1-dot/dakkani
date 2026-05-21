export const dynamic = 'force-dynamic'
export const metadata = { title: 'المستودعات' }

import { createServerClient } from '@/lib/supabase/server'
import WarehousesManager from '@/components/dashboard/WarehousesManager'

export default async function WarehousesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user!.id).single()
  if (!store) return null

  const [warehousesRes, wilayasRes] = await Promise.all([
    supabase.from('warehouses').select('*').eq('store_id', store.id).order('is_default', { ascending: false }),
    supabase.from('wilayas').select('id, name_ar').eq('is_active', true).order('id'),
  ])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <h1 className="page-title mb-5">المستودعات</h1>
      <WarehousesManager
        storeId={store.id}
        initialWarehouses={warehousesRes.data ?? []}
        wilayas={wilayasRes.data ?? []}
      />
    </div>
  )
}
