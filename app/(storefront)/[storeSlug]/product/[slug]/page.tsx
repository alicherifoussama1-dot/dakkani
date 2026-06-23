export const dynamic = 'force-dynamic'

import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import StorefrontLayout    from '@/components/storefront/StorefrontLayout'
import WhatsAppFloat       from '@/components/storefront/WhatsAppFloat'
import ProductPageClient   from '@/components/storefront/ProductPageClient'
import ProductPagePixels   from '@/components/storefront/ProductPagePixels'
import ReviewForm          from '@/components/storefront/ReviewForm'
import Image               from 'next/image'
import { formatDZD } from '@/lib/utils/format'
import { applyStoreDeliveryPrices } from '@/lib/delivery/pricing'
import Link from 'next/link'

interface Props { params: { storeSlug: string; slug: string } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createPublicClient()
  const { data: store } = await supabase.from('stores').select('id,name').eq('slug', params.storeSlug).single()
  if (!store) return { title: 'منتج' }
  const { data: p } = await supabase.from('products').select('name,name_ar,description_ar,meta_title,meta_description,images').eq('store_id', store.id).eq('slug', params.slug).single()
  if (!p) return { title: 'منتج غير موجود' }
  return {
    title: p.meta_title ?? `${p.name_ar ?? p.name} | ${store.name}`,
    description: p.meta_description ?? p.description_ar ?? `اشتري ${p.name_ar ?? p.name} بالدفع عند الاستلام`,
    openGraph: { title: p.name_ar ?? p.name, images: (p.images as any[])?.[0]?.url ? [(p.images as any[])[0].url] : [] },
  }
}

export default async function ProductPage({ params }: Props) {
  const supabase = createPublicClient()

  // Use service role — bypasses RLS completely
  const { data: store } = await supabase
    .from('stores')
    .select('*,store_settings(*)')
    .eq('slug', params.storeSlug)
    .single()
  if (!store || !store.is_active) notFound()

  // Allow viewing even inactive products (for admin preview)
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', store.id)
    .eq('slug', params.slug)
    .single()
  if (!product) notFound()

  const [wilayasRes, reviewsRes, relatedRes, stockRes] = await Promise.all([
    supabase.from('wilayas').select('*').eq('is_active', true).order('id'),
    supabase.from('reviews').select('customer_name,rating,comment,created_at').eq('product_id', product.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(6),
    supabase.from('products').select('id,name,name_ar,slug,price,compare_price,images').eq('store_id', store.id).eq('category_id', product.category_id ?? '').eq('is_active', true).neq('id', product.id).limit(4),
    supabase.from('warehouse_stock').select('quantity,reserved,variant_key').eq('product_id', product.id).eq('store_id', store.id),
  ])

  // Store declared prices override the static wilaya fees. Read server-side
  // via service role (storefront is anon; delivery_declared_prices is RLS),
  // so the customer sees the store's imported courier price per wilaya.
  const wilayas = await applyStoreDeliveryPrices(store.id, (wilayasRes.data ?? []) as any[])

  const totalStock = (stockRes.data ?? []).reduce((s, r) => s + r.quantity - r.reserved, 0)

  // Per-variant available stock (qty - reserved), keyed by variant_key —
  // lets the variant pickers disable/strike-through sold-out combinations
  // exactly like the /discover product page already does.
  const stockMap: Record<string, number> = {}
  for (const r of stockRes.data ?? []) {
    const key = r.variant_key || 'default'
    stockMap[key] = (stockMap[key] ?? 0) + (r.quantity - r.reserved)
  }
  const metaPixelId  = product.use_store_pixel ? store.meta_pixel_id  : product.meta_pixel_id
  const tiktokPixelId = product.use_store_pixel ? store.tiktok_pixel_id : product.tiktok_pixel_id
  const storePhone = (store as any).whatsapp ?? store.phone

  const avgRating = reviewsRes.data?.length
    ? (reviewsRes.data.reduce((s, r) => s + r.rating, 0) / reviewsRes.data.length).toFixed(1)
    : null

  // Schema.org
  const schema = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: product.name_ar ?? product.name,
    description: product.description_ar,
    image: (product.images as any[])?.[0]?.url,
    sku: product.sku,
    offers: {
      '@type': 'Offer',
      price: product.price, priceCurrency: 'DZD',
      availability: totalStock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: store.name },
    },
    ...(avgRating && (reviewsRes.data?.length ?? 0) >= 2 ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: avgRating, reviewCount: reviewsRes.data?.length, bestRating: 5, worstRating: 1 },
    } : {}),
  }

  return (
    <StorefrontLayout store={store as any}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ProductPagePixels
        metaPixelId={metaPixelId}
        tiktokPixelId={tiktokPixelId}
        product={{ id: product.id, name: product.name_ar ?? product.name, price: product.price }}
      />

      <div className="pt-16 min-h-screen bg-[#FAFAF8]" dir="rtl">
        {/* Breadcrumb */}
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <nav className="flex text-sm text-gray-500 gap-2 items-center">
            <Link href={`/store/${store.slug}`} className="hover:text-primary transition-colors">الرئيسية</Link>
            <span className="text-gray-300">/</span>
            <Link href={`/store/${store.slug}/products`} className="hover:text-primary transition-colors">المنتجات</Link>
            <span className="text-gray-300">/</span>
            <span className="text-[#111827] font-semibold truncate max-w-[200px]">{product.name_ar ?? product.name}</span>
          </nav>
        </div>

        {/* Main product section */}
        <ProductPageClient
          product={product as any}
          store={store as any}
          wilayas={wilayas}
          totalStock={totalStock}
          stockMap={stockMap}
          reviewCount={reviewsRes.data?.length ?? 0}
          avgRating={avgRating}
        />

        {/* Reviews */}
        {(reviewsRes.data?.length ?? 0) > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-12">
            <div className="animate-fade-in">
              <h2 className="text-2xl font-black text-[#111827] mb-6">
                آراء العملاء ({reviewsRes.data?.length}) ⭐ {avgRating}
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviewsRes.data?.map((r, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-card animate-fade-in" style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-black">
                      {r.customer_name?.[0] ?? 'ع'}
                    </div>
                    <div>
                      <p className="font-bold text-[#111827] text-sm">{r.customer_name ?? 'عميل'}</p>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <span key={j} className={`text-xs ${j < r.rating ? 'text-accent' : 'text-gray-200'}`}>★</span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {r.comment && <p className="text-gray-600 text-sm leading-relaxed">{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Review Form */}
        <section className="max-w-6xl mx-auto px-4 py-12 border-t border-gray-100">
          <div className="max-w-lg mx-auto bg-white rounded-3xl shadow-card p-8">
            <ReviewForm storeId={store.id} productId={product.id} />
          </div>
        </section>

        {/* Related */}
        {(relatedRes.data?.length ?? 0) > 0 && (
          <section className="max-w-6xl mx-auto px-4 py-8 border-t border-gray-100">
            <div className="animate-fade-in">
              <h2 className="text-2xl font-black text-[#111827] mb-6">منتجات مشابهة</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {relatedRes.data?.map((p, i) => {
                const img = (p.images as any[])?.[0]?.url
                return (
                  <Link key={p.id} href={`/store/${store.slug}/product/${p.slug}`}
                    className="group block card-premium overflow-hidden animate-fade-in"
                    style={{ animationDelay: `${i * 80}ms` }}>
                    <div className="relative product-img aspect-square bg-gray-50">
                      {img
                        ? <Image src={img} alt={p.name_ar ?? p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" loading="lazy" />
                        : <div className="w-full h-full flex items-center justify-center text-3xl text-gray-200">{(p.name_ar ?? p.name)[0]}</div>
                      }
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-[#111827] text-sm line-clamp-2">{p.name_ar ?? p.name}</p>
                      <p className="font-black text-accent mt-1">{formatDZD(p.price)}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </div>

      {storePhone && (
        <WhatsAppFloat
          phone={storePhone}
          storeName={store.name_ar ?? store.name}
          productName={product.name_ar ?? product.name}
          price={product.price}
        />
      )}
    </StorefrontLayout>
  )
}
