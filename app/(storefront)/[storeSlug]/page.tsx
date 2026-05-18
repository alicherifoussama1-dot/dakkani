export const dynamic = 'force-dynamic'

import { createServerClient } from '@/lib/supabase/server'
import { notFound }           from 'next/navigation'
import type { Metadata }      from 'next'
import StorefrontLayout       from '@/components/storefront/StorefrontLayout'
import HeroSection            from '@/components/storefront/HeroSection'
import MarqueeBar             from '@/components/storefront/MarqueeBar'
import CategoriesBento        from '@/components/storefront/CategoriesBento'
import ProductsGrid           from '@/components/storefront/ProductsGrid'
import FlashSaleSection       from '@/components/storefront/FlashSaleSection'
import ReviewsSection         from '@/components/storefront/ReviewsSection'
import TrustSection           from '@/components/storefront/TrustSection'
import WhatsAppFloat          from '@/components/storefront/WhatsAppFloat'

interface Props { params: { storeSlug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createServerClient()
  const { data: store } = await supabase.from('stores').select('name, description_ar, logo_url').eq('slug', params.storeSlug).single()
  if (!store) return { title: 'متجر' }
  return {
    title: store.name,
    description: store.description_ar ?? `تسوق من ${store.name} — الدفع عند الاستلام لكل الجزائر`,
    openGraph: { title: store.name, images: store.logo_url ? [store.logo_url] : [] },
  }
}

export default async function StorefrontHome({ params }: Props) {
  const supabase = createServerClient()

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

  return (
    <StorefrontLayout store={store as any}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBiz) }} />

      {/* HERO */}
      <HeroSection store={store as any} />

      {/* MARQUEE */}
      <MarqueeBar />

      {/* FLASH SALE */}
      {(featuredRes.data?.length ?? 0) > 0 && (
        <FlashSaleSection
          products={featuredRes.data as any[]}
          storeSlug={store.slug}
        />
      )}

      {/* CATEGORIES BENTO */}
      {(categoriesRes.data?.length ?? 0) > 0 && (
        <CategoriesBento
          categories={categoriesRes.data as any[]}
          storeSlug={store.slug}
        />
      )}

      {/* BESTSELLERS */}
      <ProductsGrid
        products={bestsellersRes.data as any[]}
        storeSlug={store.slug}
        title="الأكثر مبيعاً"
        subtitle="منتجات مختارة بعناية لك"
        dark={false}
      />

      {/* TRUST */}
      <TrustSection />

      {/* REVIEWS */}
      {(reviewsRes.data?.length ?? 0) > 0 && (
        <ReviewsSection reviews={reviewsRes.data as any[]} />
      )}

      {/* WHATSAPP FLOAT */}
      {storePhone && (
        <WhatsAppFloat phone={storePhone} storeName={store.name_ar ?? store.name} />
      )}
    </StorefrontLayout>
  )
}
