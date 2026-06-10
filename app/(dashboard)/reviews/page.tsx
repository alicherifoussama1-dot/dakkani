export const dynamic = 'force-dynamic'
export const metadata = { title: 'التقييمات' }

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import ReviewsManager from '@/components/dashboard/ReviewsManager'

export default async function ReviewsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  const { data: reviews } = await supabase
    .from('reviews')
    .select('*, product:products(name,name_ar)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="page-title">التقييمات</h1>
          <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>
            {(reviews ?? []).filter(r => !r.is_approved).length} تقييم ينتظر المراجعة
          </p>
        </div>
      </div>
      <ReviewsManager storeId={store.id} initialReviews={(reviews ?? []) as any[]} />
    </div>
  )
}
