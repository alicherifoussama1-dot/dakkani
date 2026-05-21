export const dynamic = 'force-dynamic'
export const metadata = { title: 'طلب جديد' }

import { createServerClient } from '@/lib/supabase/server'
import NewOrderClient from '@/components/dashboard/NewOrderClient'

export default async function NewOrderPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase.from('stores').select('id, slug').eq('owner_id', user.id).single()
  if (!store) return null

  const [productsRes, wilayasRes] = await Promise.all([
    supabase.from('products').select('id, name, name_ar, price, sku').eq('store_id', store.id).eq('is_active', true).order('name'),
    supabase.from('wilayas').select('id, name_ar, delivery_fee_home, delivery_fee_stopdesk').eq('is_active', true).order('id'),
  ])

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <h1 className="page-title mb-5">إنشاء طلب يدوي</h1>
      <NewOrderClient
        storeId={store.id}
        products={productsRes.data ?? []}
        wilayas={wilayasRes.data ?? []}
      />
    </div>
  )
}
