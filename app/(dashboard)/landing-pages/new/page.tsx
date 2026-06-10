export const dynamic = 'force-dynamic'
export const metadata = { title: 'صفحة هبوط جديدة بالذكاء الاصطناعي' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AILandingWizard from '@/components/admin/AILandingWizard'

export default async function NewLandingPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  const { data: products } = await supabase
    .from('products')
    .select('id, name, name_ar, price, compare_price, category:categories(name_ar), images')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (!products || products.length === 0) {
    redirect('/products/new')
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <AILandingWizard storeId={store.id} storeSlug={store.slug} products={products as any[]} />
    </div>
  )
}
