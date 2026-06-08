// ============================================================
// Public AI Landing Page — /store/{storeSlug}/{slug}
// Renders a merchant-generated AI landing page (copy from Gemini +
// AI-enhanced images from the Photo Studio) using the product-page
// theme system. Falls through to notFound() for anything that isn't
// a published landing page (product/products/checkout keep their own
// static routes and always take precedence over this catch-all).
// ============================================================
export const dynamic = 'force-dynamic'

import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import StorefrontLayout from '@/components/storefront/StorefrontLayout'
import AILandingPage from '@/components/storefront/AILandingPage'

interface Props { params: { storeSlug: string; slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createPublicClient()
  const { data: store } = await supabase.from('stores').select('id,name').eq('slug', params.storeSlug).single()
  if (!store) return { title: 'صفحة' }
  const { data: page } = await supabase.from('landing_pages').select('title_ar,title,seo_title,seo_desc,ai_content').eq('store_id', store.id).eq('slug', params.slug).eq('is_active', true).maybeSingle()
  if (!page) return { title: 'الصفحة غير موجودة' }
  const hero = (page.ai_content as any)?.hero
  return {
    title: page.seo_title ?? page.title_ar ?? page.title,
    description: page.seo_desc ?? hero?.subheadline ?? undefined,
  }
}

export default async function AILandingRoute({ params }: Props) {
  const supabase = createPublicClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*,store_settings(*)')
    .eq('slug', params.storeSlug)
    .single()
  if (!store || !store.is_active) notFound()

  const { data: page } = await supabase
    .from('landing_pages')
    .select('*,product:products(*)')
    .eq('store_id', store.id)
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle()
  if (!page || !page.product) notFound()

  const product = page.product as any
  const { data: wilayasRes } = await supabase.from('wilayas').select('*').eq('is_active', true).order('id')

  // Fire-and-forget view counter — best-effort, never blocks the render
  supabase.from('landing_pages').update({ views: (page.views ?? 0) + 1 }).eq('id', page.id).then(() => {})

  return (
    <StorefrontLayout store={store as any}>
      <AILandingPage
        page={page as any}
        product={product}
        store={store as any}
        wilayas={(wilayasRes as any[]) ?? []}
      />
    </StorefrontLayout>
  )
}
