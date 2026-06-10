export const dynamic = 'force-dynamic'
export const metadata = { title: 'المستودعات' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import WarehousesManager from '@/components/dashboard/WarehousesManager'

export default async function WarehousesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { activeStore: store } = await getActiveStore(supabase, user!.id)
  if (!store) return null

  const [warehousesRes, wilayasRes] = await Promise.all([
    supabase.from('warehouses').select('*').eq('store_id', store.id).order('is_default', { ascending: false }),
    supabase.from('wilayas').select('id, name_ar').eq('is_active', true).order('id'),
  ])

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">المستودعات</h1>
          <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{(warehousesRes.data?.length ?? 0)} مستودع</p>
        </div>
      </div>
      <WarehousesManager
        storeId={store.id}
        initialWarehouses={warehousesRes.data ?? []}
        wilayas={wilayasRes.data ?? []}
      />
    </div>
  )
}
