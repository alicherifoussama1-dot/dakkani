export const dynamic = 'force-dynamic'

import { createPublicClient } from '@/lib/supabase/public'
import { notFound }           from 'next/navigation'
import type { Metadata }      from 'next'
import StorefrontLayout       from '@/components/storefront/StorefrontLayout'
import StorefrontSections     from '@/components/storefront/StorefrontSections'
import WhatsAppFloat          from '@/components/storefront/WhatsAppFloat'
import { normalizeLayout }    from '@/lib/storefront/sections'

interface Props { params: { storeSlug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createPublicClient()
  const { data: store } = await supabase.from('stores').select('name, description_ar, logo_url').eq('slug', params.storeSlug).single()
  if (!store) return { title: 'متجر' }
  return {
    title: store.name,
    description: store.description_ar ?? `تسوق من ${store.name} — الدفع عند الاستلام لكل الجزائر`,
    openGraph: { title: store.name, images: store.logo_url ? [store.logo_url] : [] },
  }
}

export default async function StorefrontHome({ params }: Props) {
  const supabase = createPublicClient()

  const { data: store } = await supabase
    .from('stores')
    .select('*, store_settings(*)')
    .eq('slug', params.storeSlug)
    .eq('is_active', true)
    .single()
  if (!store) notFound()

  const [featuredRes, categoriesRes, bestsellersRes, reviewsRes] = await Promise.all([
    supabase.from('products').select('id,name,name_ar,slug,price,compare_price,images')
      .eq('store_id', store.id).eq('is_featured', true).eq('is_active', true).limit(8),
    supabase.from('categories').select('id,name,name_ar,image_url,slug')
      .eq('store_id', store.id).eq('is_active', true).order('sort_order').limit(8),
    supabase.from('products').select('id,name,name_ar,slug,price,compare_price,images')
      .eq('store_id', store.id).eq('is_active', true).order('created_at', { ascending: false }).limit(12),
    supabase.from('reviews').select('customer_name,rating,comment,created_at')
      .eq('store_id', store.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(6),
  ])

  const storePhone = (store as any).whatsapp ?? store.phone

  // LocalBusiness schema
  const localBiz = {
    '@context': 'https://schema.org', '@type': 'Store',
    name: store.name, url: `${process.env.NEXT_PUBLIC_APP_URL}/store/${store.slug}`,
    image: store.logo_url, priceRange: '$$', currenciesAccepted: 'DZD',
    paymentAccepted: 'Cash', areaServed: 'Algeria',
    address: { '@type': 'PostalAddress', addressCountry: 'DZ' },
  }

  // Builder layout (JSON) → ordered sections. NULL falls back to the
  // default layout, which reproduces the original hardcoded home page.
  const layout = normalizeLayout((store as any).layout)
  const data = {
    featured:   (featuredRes.data ?? []) as any[],
    categories: (categoriesRes.data ?? []) as any[],
    products:   (bestsellersRes.data ?? []) as any[],
    reviews:    (reviewsRes.data ?? []) as any[],
  }

  return (
    <StorefrontLayout store={store as any}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBiz) }} />

      <StorefrontSections store={store as any} layout={layout} data={data} />

      {storePhone && (
        <WhatsAppFloat phone={storePhone} storeName={store.name_ar ?? store.name} />
      )}
    </StorefrontLayout>
  )
}
