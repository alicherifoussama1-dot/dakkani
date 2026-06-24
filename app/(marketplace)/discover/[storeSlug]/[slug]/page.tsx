'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/lib/store/cart'
import { getProductTheme, themeToCSSVars, DEFAULT_SECTION_ORDER, type ProductSectionId } from '@/lib/product-themes'

import '@/components/discover/product/product-theme.css'
import ProductGallery     from '@/components/discover/product/ProductGallery'
import ProductInfo        from '@/components/discover/product/ProductInfo'
import ProductVariants, { type VariantGroup } from '@/components/discover/product/ProductVariants'
import ProductBuyBox      from '@/components/discover/product/ProductBuyBox'
import ProductTrust       from '@/components/discover/product/ProductTrust'
import ProductDescription from '@/components/discover/product/ProductDescription'
import ProductReviews, { type Review } from '@/components/discover/product/ProductReviews'
import ProductUpsells, { type UpsellProduct } from '@/components/discover/product/ProductUpsells'

// ── Helpers ──────────────────────────────────────────────────
function buildVariantKey(groups: VariantGroup[], selected: Record<string, string>) {
  if (!groups.length) return 'default'
  const parts = groups.map(g => selected[g.name]).filter(Boolean)
  return parts.length === groups.length ? parts.join('|') : 'default'
}

export default function DiscoverProductPage() {
  const { storeSlug, slug } = useParams<{ storeSlug: string; slug: string }>()
  const router = useRouter()
  const { add: addToCart, count: cartCount } = useCart()

  const [product, setProduct] = useState<any>(null)
  const [store, setStore]     = useState<any>(null)
  const [reviews, setReviews] = useState<Review[]>([])
  const [related, setRelated] = useState<UpsellProduct[]>([])
  const [stockMap, setStockMap] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Buy-box state
  const [qty, setQty]           = useState(1)
  const [wilayaId, setWilayaId] = useState<number | null>(null)
  const [baladia, setBaladia]   = useState('')
  const [added, setAdded]       = useState(false)
  const [selected, setSelected] = useState<Record<string, string>>({})

  // ── Load data ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const sb = createClient()

      const { data: s } = await sb.from('stores').select('*').eq('slug', storeSlug).single()
      if (!s) { setLoading(false); return }
      if (cancelled) return
      setStore(s)

      const { data: p } = await sb.from('products').select('*').eq('store_id', s.id).eq('slug', slug).single()
      if (!p) { setLoading(false); return }
      if (cancelled) return
      setProduct(p)

      // Reviews (approved only)
      const { data: rv } = await sb
        .from('reviews')
        .select('id, customer_name, rating, comment, images, is_verified, created_at')
        .eq('product_id', p.id)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(40)
      if (!cancelled) setReviews((rv as any[]) ?? [])

      // Stock per variant
      const { data: stock } = await sb
        .from('warehouse_stock')
        .select('variant_key, quantity, reserved')
        .eq('product_id', p.id)
      if (!cancelled && stock) {
        const map: Record<string, number> = {}
        stock.forEach((row: any) => {
          const avail = Math.max(0, (row.quantity ?? 0) - (row.reserved ?? 0))
          map[row.variant_key] = (map[row.variant_key] ?? 0) + avail
        })
        setStockMap(map)
      }

      // Related products — same category, fallback to same store
      let relQuery = sb.from('products')
        .select('id, name, name_ar, slug, price, compare_price, images')
        .eq('store_id', s.id)
        .eq('is_active', true)
        .neq('id', p.id)
        .limit(4)
      if (p.category_id) relQuery = relQuery.eq('category_id', p.category_id)
      let { data: rel } = await relQuery

      if (!cancelled && (!rel || rel.length < 4)) {
        const currentRelIds = (rel ?? []).map((r: any) => r.id)
        const excludeIds = [p.id, ...currentRelIds]
        const { data: fallbackRel } = await sb.from('products')
          .select('id, name, name_ar, slug, price, compare_price, images')
          .eq('store_id', s.id)
          .eq('is_active', true)
          .not('id', 'in', `(${excludeIds.join(',')})`)
          .limit(4 - (rel?.length ?? 0))
        if (fallbackRel) {
          rel = [...(rel ?? []), ...fallbackRel]
        }
      }

      if (!cancelled) {
        setRelated((rel ?? []).map((r: any) => ({
          id: r.id, name: r.name_ar ?? r.name, slug: r.slug,
          price: r.price, comparePrice: r.compare_price,
          image: (r.images as any[])?.[0]?.url ?? null,
        })))
      }

      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [storeSlug, slug])

  // ── Derived: variant groups + selection defaults ──────────
  const variantGroups: VariantGroup[] = useMemo(() => {
    const raw = product?.variants
    if (!Array.isArray(raw)) return []
    return raw.filter((g: any) => g?.name && Array.isArray(g.options) && g.options.length)
  }, [product])

  useEffect(() => {
    if (!variantGroups.length) return
    setSelected(prev => {
      const next = { ...prev }
      let changed = false
      variantGroups.forEach(g => {
        if (!next[g.name]) { next[g.name] = g.options[0]; changed = true }
      })
      return changed ? next : prev
    })
  }, [variantGroups])

  const variantKey = useMemo(() => buildVariantKey(variantGroups, selected), [variantGroups, selected])

  const isOptionAvailable = (groupName: string, option: string) => {
    if (!Object.keys(stockMap).length) return true
    const trial = { ...selected, [groupName]: option }
    const key = buildVariantKey(variantGroups, trial)
    if (key === 'default') return true
    return (stockMap[key] ?? 0) > 0 || !(key in stockMap)
  }

  const currentStock: number | null = useMemo(() => {
    if (!Object.keys(stockMap).length) return null
    return stockMap[variantKey] ?? stockMap['default'] ?? null
  }, [stockMap, variantKey])

  // ── Theme & layout ─────────────────────────────────────────
  const theme = getProductTheme(product?.theme_key)
  const cssVars = themeToCSSVars(theme)

  const sectionOrder: ProductSectionId[] = useMemo(() => {
    const raw = product?.section_order
    if (Array.isArray(raw) && raw.length) return raw as ProductSectionId[]
    return [...DEFAULT_SECTION_ORDER]
  }, [product])

  const sectionVisibility: Record<string, boolean> = product?.section_visibility ?? {}
  const isVisible = (id: ProductSectionId) => sectionVisibility[id] !== false

  // ── Actions ────────────────────────────────────────────────
  const variantLabel = variantGroups.length
    ? variantGroups.map(g => selected[g.name]).filter(Boolean).join(' / ')
    : undefined

  const handleAddToCart = () => {
    if (!product) return
    addToCart({
      productId: product.id,
      storeSlug: storeSlug as string,
      productSlug: slug as string,
      name: product.name_ar ?? product.name,
      price: product.price,
      image: (product.images as any[])?.[0]?.url,
      qty,
      variantKey: variantKey !== 'default' ? variantKey : undefined,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    if (!product) return
    const params = new URLSearchParams({
      product_id: product.id,
      qty: String(qty),
      variant: variantKey,
    })
    router.push(`/${storeSlug}/checkout?${params.toString()}`)
  }

  // ── Loading / not found ────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-accent)' }} />
    </div>
  )
  if (!product || !store) return (
    <div className="min-h-screen flex items-center justify-center text-center p-4" dir="rtl">
      <div>
        <p className="text-4xl mb-3">😕</p>
        <p className="font-semibold" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-arabic)' }}>المنتج غير موجود</p>
        <Link href="/discover" className="btn btn-primary btn-sm mt-4" style={{ fontFamily: 'var(--font-arabic)' }}>العودة للمنتجات</Link>
      </div>
    </div>
  )

  const images = (product.images as any[]) ?? []
  const storePhone = store.whatsapp ?? store.phone
  const waUrl = storePhone
    ? `https://wa.me/${storePhone.replace(/\D/g, '').replace(/^0/, '213')}?text=${encodeURIComponent(`أريد طلب: ${product.name_ar ?? product.name} — ${variantLabel ? `(${variantLabel}) — ` : ''}${product.price} دج`)}`
    : null

  const avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 4.8
  const reviewCount = reviews.length || 0

  // ── Section renderer ───────────────────────────────────────
  const sections: Partial<Record<ProductSectionId, React.ReactNode>> = {
    gallery: (
      <ProductGallery images={images} videoUrl={product.video_url} alt={product.name_ar ?? product.name} />
    ),
    info: (
      <ProductInfo
        name={product.name_ar ?? product.name}
        rating={avgRating}
        reviewCount={reviewCount}
        price={product.price}
        comparePrice={product.compare_price}
        stock={currentStock}
        recentBuyers={Math.max(8, Math.floor((reviewCount + 1) * 7.3))}
      />
    ),
    variants: variantGroups.length ? (
      <ProductVariants
        groups={variantGroups}
        selected={selected}
        onSelect={(g, o) => setSelected(prev => ({ ...prev, [g]: o }))}
        isOptionAvailable={isOptionAvailable}
      />
    ) : null,
    buybox: (
      <ProductBuyBox
        price={product.price}
        qty={qty} setQty={setQty}
        maxQty={currentStock}
        wilayaId={wilayaId} setWilayaId={setWilayaId}
        baladia={baladia} setBaladia={setBaladia}
        added={added}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
        whatsappUrl={waUrl}
      />
    ),
    trust: <ProductTrust />,
    description: (
      <ProductDescription
        description={product.description_ar ?? product.description}
        descriptionImageUrl={product.description_image_url ?? product.attributes?.description_image_url}
        specs={[
          ...(product.sku ? [{ label: 'رمز المنتج (SKU)', value: product.sku }] : []),
          ...(product.weight ? [{ label: 'الوزن', value: `${product.weight} كغ` }] : []),
          ...(Object.entries(product.attributes ?? {}).map(([k, v]) => ({ label: k, value: String(v) }))),
        ]}
      />
    ),
    reviews: <ProductReviews reviews={reviews} averageRating={avgRating} />,
    upsells: related.length >= 2 ? (
      <ProductUpsells title="يُشترى عادة مع" subtitle="أضف هذه المنتجات لتجربة أفضل" products={related.slice(0, 4)} storeSlug={storeSlug as string} />
    ) : null,
    related: related.length ? (
      <ProductUpsells title="منتجات مشابهة" products={related} storeSlug={storeSlug as string} />
    ) : null,
  }

  // Layout: gallery+info+variants+buybox form a 2-col grid on desktop;
  // remaining sections stack full-width below.
  const TOP_IDS: ProductSectionId[] = ['gallery', 'info', 'variants', 'buybox']
  const orderedTop = sectionOrder.filter(id => TOP_IDS.includes(id) && isVisible(id) && sections[id])
  const orderedBottom = sectionOrder.filter(id => !TOP_IDS.includes(id) && isVisible(id) && sections[id])

  const galleryIds: ProductSectionId[] = ['gallery']
  const infoIds: ProductSectionId[] = ['info', 'variants', 'buybox']
  const leftCol = orderedTop.filter(id => galleryIds.includes(id))
  const rightCol = orderedTop.filter(id => infoIds.includes(id))

  return (
    <div data-pt-root style={{ ...cssVars, minHeight: '100vh' }} dir="rtl">
      {/* Header / breadcrumb */}
      <header style={{
        borderBottom: '1px solid var(--pt-border)', position: 'sticky', top: 0, zIndex: 40,
        background: 'var(--pt-bg)', backdropFilter: 'blur(8px)',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 16px', height: 50, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link href="/discover" className="pt-text-muted" style={{ fontSize: 12, textDecoration: 'none', fontFamily: 'var(--font-tajawal)' }}>اكتشف</Link>
          <ChevronRight size={11} className="pt-text-muted" />
          <Link href={`/discover/${storeSlug}`} className="pt-text-muted" style={{ fontSize: 12, textDecoration: 'none', fontFamily: 'var(--font-tajawal)' }}>
            {store.name_ar ?? store.name}
          </Link>
          <ChevronRight size={11} className="pt-text-muted" />
          <span className="pt-text" style={{ fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-tajawal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
            {product.name_ar ?? product.name}
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 16px 100px' }}>
        {/* Top grid: gallery | info+variants+buybox */}
        {(leftCol.length > 0 || rightCol.length > 0) && (
          <div className="pdp-top-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 32, marginBottom: 'var(--pt-section-gap)' }}>
            {leftCol.length > 0 && (
              <div>
                {leftCol.map(id => <div key={id}>{sections[id]}</div>)}
              </div>
            )}
            {rightCol.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
                {rightCol.map(id => <div key={id}>{sections[id]}</div>)}
              </div>
            )}
          </div>
        )}

        {/* Remaining sections, stacked */}
        <div className="pt-section-gap">
          {orderedBottom.map(id => <div key={id}>{sections[id]}</div>)}
        </div>
      </div>

      {/* Mobile sticky buy bar */}
      {isVisible('buybox') && (
        <ProductBuyBox
          sticky
          price={product.price}
          qty={qty} setQty={setQty}
          maxQty={currentStock}
          wilayaId={wilayaId} setWilayaId={setWilayaId}
          baladia={baladia} setBaladia={setBaladia}
          added={added}
          onAddToCart={handleAddToCart}
          onBuyNow={handleBuyNow}
          whatsappUrl={waUrl}
        />
      )}

      <style>{`
        @media (min-width: 900px) {
          .pdp-top-grid { grid-template-columns: 1.1fr 1fr !important; align-items: start; }
        }
      `}</style>
    </div>
  )
}
