export const dynamic = 'force-dynamic'

import { createPublicClient } from '@/lib/supabase/public'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import StorefrontLayout    from '@/components/storefront/StorefrontLayout'
import WhatsAppFloat       from '@/components/storefront/WhatsAppFloat'
import ProductPageClient   from '@/components/storefront/ProductPageClient'
import ProductTracking      from '@/components/storefront/ProductTracking'
import { getProductTracking } from '@/lib/tracking/service'
import ReviewForm          from '@/components/storefront/ReviewForm'
import Image               from 'next/image'
import { formatDZD } from '@/lib/utils/format'
import { applyStoreDeliveryPrices } from '@/lib/delivery/pricing'
import { getProductTheme, themeToCSSVars, normalizeProductOrder } from '@/lib/product-themes'
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

  let relatedQuery = supabase
    .from('products')
    .select('id,name,name_ar,slug,price,compare_price,images')
    .eq('store_id', store.id)
    .eq('is_active', true)
    .neq('id', product.id)
    .limit(4)

  if (product.category_id) {
    relatedQuery = relatedQuery.eq('category_id', product.category_id)
  }

  const [wilayasRes, reviewsRes, relatedRes, stockRes] = await Promise.all([
    supabase.from('wilayas').select('*').eq('is_active', true).order('id'),
    supabase.from('reviews').select('customer_name,rating,comment,created_at').eq('product_id', product.id).eq('is_approved', true).order('created_at', { ascending: false }).limit(6),
    relatedQuery,
    supabase.from('warehouse_stock').select('quantity,reserved,variant_key').eq('product_id', product.id).eq('store_id', store.id),
  ])

  // Store declared prices override the static wilaya fees. Read server-side
  // via service role (storefront is anon; delivery_declared_prices is RLS),
  // so the customer sees the store's imported courier price per wilaya.
  const wilayas = await applyStoreDeliveryPrices(store.id, (wilayasRes.data ?? []) as any[])

  let relatedData = relatedRes.data ?? []
  if (relatedData.length < 4) {
    const excludeIds = [product.id, ...relatedData.map(p => p.id)]
    const { data: fallbackData } = await supabase
      .from('products')
      .select('id,name,name_ar,slug,price,compare_price,images')
      .eq('store_id', store.id)
      .eq('is_active', true)
      .not('id', 'in', `(${excludeIds.join(',')})`)
      .limit(4 - relatedData.length)
    if (fallbackData) {
      relatedData = [...relatedData, ...fallbackData]
    }
  }

  const totalStock = (stockRes.data ?? []).reduce((s, r) => s + r.quantity - r.reserved, 0)

  // Per-variant available stock (qty - reserved), keyed by variant_key —
  // lets the variant pickers disable/strike-through sold-out combinations
  // exactly like the /discover product page already does.
  const stockMap: Record<string, number> = {}
  for (const r of stockRes.data ?? []) {
    const key = r.variant_key || 'default'
    stockMap[key] = (stockMap[key] ?? 0) + (r.quantity - r.reserved)
  }
  // ── Per-product ISOLATED tracking. Resolves ONLY the pixels assigned to
  // this product (new tracking library) with graceful fallback to the store
  // default. Falls back to the legacy store/product pixel columns only when
  // the tracking library has no config yet. ──
  const trackingBundle = await getProductTracking(supabase, product as any, store.slug)
  const legacyMeta   = product.use_store_pixel ? store.meta_pixel_id   : product.meta_pixel_id
  const legacyTiktok = product.use_store_pixel ? store.tiktok_pixel_id : product.tiktok_pixel_id
  const pixelIds = {
    meta:     trackingBundle.pixelIds.meta     ?? legacyMeta   ?? null,
    tiktok:   trackingBundle.pixelIds.tiktok   ?? legacyTiktok ?? null,
    google:   trackingBundle.pixelIds.google   ?? null,
    snapchat: trackingBundle.pixelIds.snapchat ?? null,
  }
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

  // ONE Commerco design system for every store — keep only the per-store accent
  // (and fonts) from the theme; pin every other --pt-* token to fixed values so
  // the whole page (Hero, reviews, FAQ, related) shares one design language.
  const productTheme = getProductTheme((product as any).theme_key)
  const dkVars = {
    ...themeToCSSVars(productTheme),
    '--pt-accent-soft': 'color-mix(in srgb, var(--pt-accent) 12%, transparent)',
    '--pt-surface': '#FFFFFF', '--pt-surface-soft': '#FAF8F5', '--pt-bg': '#FAF8F5',
    '--pt-border': '#EBE8E1', '--pt-text': '#1B1B1F', '--pt-text-soft': '#3A3A38', '--pt-text-muted': '#71716E',
    '--pt-star': '#EF9F27', '--pt-success': '#1D9E75', '--pt-danger': '#A32D2D',
    '--pt-btn-primary-bg': 'var(--pt-accent)', '--pt-btn-primary-text': '#FFFFFF',
    '--pt-radius-sm': '10px', '--pt-radius-md': '14px', '--pt-radius-lg': '20px', '--pt-radius-pill': '999px',
    '--pt-shadow-sm': 'none', '--pt-shadow-md': '0 1px 3px rgba(20,18,15,0.05)', '--pt-shadow-lg': '0 12px 32px rgba(20,18,15,0.12)',
  } as any

  // ── Product-Page-Builder config — the SINGLE source of truth for what shows
  // and in what order. section_order + section_visibility drive every section;
  // nothing below is hardcoded to always-show or to a fixed position. ──
  const sectionVisibility: Record<string, boolean> = (product as any).section_visibility ?? {}
  const sectionOrder = normalizeProductOrder((product as any).section_order)
  const isVisible = (id: string) => sectionVisibility[id] !== false
  // `upsells` (يُشترى عادة مع) never had a storefront block before, so it is opt-IN
  // (explicit true only) — enabling it never silently appears on existing pages.
  const isUpsellsOn = sectionVisibility['upsells'] === true

  const relatedGrid = (items: typeof relatedData) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
      {items.map((p) => {
        const img = (p.images as any[])?.[0]?.url
        return (
          <Link key={p.id} href={`/store/${store.slug}/product/${p.slug}`}
            className="group block overflow-hidden transition-transform hover:-translate-y-1"
            style={{ background: 'var(--pt-surface)', borderRadius: 'var(--pt-radius-lg)', border: '1px solid var(--pt-border)', boxShadow: 'var(--pt-shadow-sm)' }}>
            <div className="relative aspect-[4/5]" style={{ background: 'var(--pt-surface-soft)' }}>
              {img
                ? <Image src={img} alt={p.name_ar ?? p.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover" loading="lazy" />
                : <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: 'var(--pt-text-muted)' }}>{(p.name_ar ?? p.name)[0]}</div>
              }
            </div>
            <div className="p-4">
              <p className="font-bold text-[15px] line-clamp-2" style={{ color: 'var(--pt-text)' }}>{p.name_ar ?? p.name}</p>
              <p className="font-bold text-base mt-1.5 tabular-nums" style={{ color: 'var(--pt-accent)' }}>{formatDZD(p.price)}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )

  // Bottom (below-hero) section nodes — each gated by its OWN visibility, keyed by
  // its section id, rendered in section_order. The review form is part of the
  // `reviews` section (hiding reviews hides the form too — it was the leak).
  const bottomNodes: Record<string, JSX.Element | null> = {
    reviews: isVisible('reviews') ? (
      <div key="reviews">
        {(reviewsRes.data?.length ?? 0) > 0 && (
          <section className="max-w-4xl mx-auto px-4 py-12">
            <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
              <h2 className="pt-heading text-2xl">آراء العملاء</h2>
              {avgRating && (
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5" aria-hidden="true">
                    {[...Array(5)].map((_, i) => <span key={i} style={{ color: i < Math.round(parseFloat(avgRating)) ? 'var(--pt-star)' : 'var(--pt-border)' }}>★</span>)}
                  </div>
                  <span className="font-bold text-sm" style={{ color: 'var(--pt-text)' }}>{avgRating}</span>
                  <span className="text-sm" style={{ color: 'var(--pt-text-muted)' }}>({reviewsRes.data?.length} تقييم)</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {reviewsRes.data?.map((r, i) => (
                <div key={i} className="p-5" style={{ background: 'var(--pt-surface)', borderRadius: 'var(--pt-radius-lg)', border: '1px solid var(--pt-border)', boxShadow: 'var(--pt-shadow-sm)' }}>
                  <div className="flex items-start gap-3 mb-2.5">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black shrink-0" style={{ background: 'var(--pt-accent-soft)', color: 'var(--pt-accent)' }}>
                      {r.customer_name?.[0] ?? 'ع'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm" style={{ color: 'var(--pt-text)' }}>{r.customer_name ?? 'عميل'}</p>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'color-mix(in srgb, var(--pt-success) 14%, transparent)', color: 'var(--pt-success)' }}>✓ شراء موثّق</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <div className="flex gap-0.5" aria-label={`${r.rating} من 5`}>
                          {[...Array(5)].map((_, j) => <span key={j} className="text-xs" style={{ color: j < r.rating ? 'var(--pt-star)' : 'var(--pt-border)' }}>★</span>)}
                        </div>
                        {r.created_at && <span className="text-[11px]" style={{ color: 'var(--pt-text-muted)' }}>{new Date(r.created_at).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' })}</span>}
                      </div>
                    </div>
                  </div>
                  {r.comment && <p className="text-sm leading-relaxed" style={{ color: 'var(--pt-text-soft)' }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="max-w-3xl mx-auto px-4 py-12 border-t" style={{ borderColor: 'var(--pt-border)' }}>
          <div className="max-w-lg mx-auto p-8" style={{ background: 'var(--pt-surface)', borderRadius: 'var(--pt-radius-lg)', border: '1px solid var(--pt-border)', boxShadow: 'var(--pt-shadow-sm)' }}>
            <ReviewForm storeId={store.id} productId={product.id} />
          </div>
        </section>
      </div>
    ) : null,
    faq: isVisible('faq') ? (
      <section key="faq" className="max-w-3xl mx-auto px-4 py-12 border-t" style={{ borderColor: 'var(--pt-border)' }}>
        <h2 className="pt-heading text-2xl mb-6">الأسئلة الشائعة</h2>
        <div className="space-y-2.5">
          {[
            { q: 'كيف أدفع؟', a: 'الدفع عند الاستلام (COD): تدفع نقداً لموصّل التوصيل عند استلام طردك — بلا بطاقة ولا دفع مسبق.' },
            { q: 'هل يمكنني فتح الطرد قبل الدفع؟', a: 'نعم، يمكنك معاينة المنتج والتأكد منه قبل أن تدفع.' },
            { q: 'كم يستغرق التوصيل؟', a: 'عادةً بين 24 و72 ساعة حسب ولايتك.' },
            { q: 'هل تُوصّلون إلى كل الولايات؟', a: 'نعم، نوصّل إلى جميع الولايات الـ58.' },
            { q: 'كيف أطلب؟', a: 'اختر خياراتك، أدخل اسمك ورقم هاتفك وولايتك ثم اضغط «اطلب» — يتصل بك المتجر لتأكيد الطلب.' },
          ].map((f, i) => (
            <details key={i} className="faq-item" style={{ background: 'var(--pt-surface)', borderRadius: 'var(--pt-radius-lg)', border: '1px solid var(--pt-border)' }}>
              <summary className="flex items-center justify-between gap-3 cursor-pointer select-none px-4 py-4 font-bold text-sm" style={{ color: 'var(--pt-text)' }}>
                <span>{f.q}</span>
                <svg className="faq-chev shrink-0 transition-transform" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: 'var(--pt-accent)' }} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
              </summary>
              <p className="px-4 pb-4 -mt-1 text-sm leading-relaxed" style={{ color: 'var(--pt-text-soft)' }}>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    ) : null,
    upsells: isUpsellsOn && relatedData.length > 0 ? (
      <section key="upsells" className="max-w-6xl mx-auto px-4 py-12 border-t" style={{ borderColor: 'var(--pt-border)' }}>
        <h2 className="pt-heading text-2xl mb-7">يُشترى عادة مع</h2>
        {relatedGrid(relatedData.slice(0, 4))}
      </section>
    ) : null,
    related: isVisible('related') && relatedData.length > 0 ? (
      <section key="related" className="max-w-6xl mx-auto px-4 py-12 border-t" style={{ borderColor: 'var(--pt-border)' }}>
        <h2 className="pt-heading text-2xl mb-7">منتجات مشابهة</h2>
        {relatedGrid(relatedData)}
      </section>
    ) : null,
  }

  return (
    <StorefrontLayout store={store as any}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <ProductTracking
        pixelIds={pixelIds}
        product={{ id: product.id, name: product.name_ar ?? product.name, price: product.price }}
      />

      <div className="pt-16 min-h-screen" dir="rtl"
        data-theme={productTheme.key}
        style={{ ...dkVars, background: '#FAF8F5', color: '#1B1B1F' }}>
        {/* Breadcrumb */}
        <div className="max-w-6xl mx-auto px-4 pt-6 pb-2">
          <nav className="flex text-sm gap-2 items-center" style={{ color: 'var(--pt-text-muted)' }}>
            <Link href={`/store/${store.slug}`} className="hover:opacity-70 transition-opacity">الرئيسية</Link>
            <span style={{ color: 'var(--pt-border)' }}>/</span>
            <Link href={`/store/${store.slug}/products`} className="hover:opacity-70 transition-opacity">المنتجات</Link>
            <span style={{ color: 'var(--pt-border)' }}>/</span>
            <span className="font-semibold truncate max-w-[200px]" style={{ color: 'var(--pt-text)' }}>{product.name_ar ?? product.name}</span>
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
          sectionOrder={sectionOrder}
          sectionVisibility={sectionVisibility}
          extraSections={bottomNodes}
        />
      </div>

      {/* Desktop only: on mobile this fixed float overlaps the sticky buy bar
          and duplicates its WhatsApp button. */}
      {storePhone && (
        <div className="hidden md:block">
          <WhatsAppFloat
            phone={storePhone}
            storeName={store.name_ar ?? store.name}
            productName={product.name_ar ?? product.name}
            price={product.price}
          />
        </div>
      )}
    </StorefrontLayout>
  )
}
