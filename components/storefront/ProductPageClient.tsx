'use client'
import { useEffect, useMemo, useState, useRef, useCallback, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import { formatDZD } from '@/lib/utils/format'
// Code-split the order form into its own JS chunk. ssr:true keeps it
// server-rendered (identical HTML, no layout shift, no visual change); it
// simply loads/parses in parallel instead of inside the hero chunk, so the
// gallery + variants hydrate sooner. All props + behavior are unchanged.
const ProductOrderForm = dynamic(() => import('./ProductOrderForm'), { ssr: true })
import { Shield, Truck, Package, ChevronLeft, ChevronRight, ZoomIn, X, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getProductTheme, themeToCSSVars, normalizeProductOrder } from '@/lib/product-themes'
import ProductVariants, { type VariantGroup } from '@/components/discover/product/ProductVariants'
import '@/components/discover/product/product-theme.css'
import { translateStorefront, type Locale } from '@/lib/utils/translations'
import { cdnImage } from '@/lib/image-url'

interface Props {
  product: any; store: any; wilayas: any[]
  totalStock: number; reviewCount: number; avgRating: string | null
  stockMap?: Record<string, number>
  // Merchant Product-Page-Builder config — the SINGLE source of truth. Every
  // section is rendered strictly in `sectionOrder`, gated by `sectionVisibility`.
  sectionOrder?: string[]
  sectionVisibility?: Record<string, boolean>
  // Below-hero section nodes (reviews / faq / upsells / related), pre-built on the
  // server and placed into the SAME ordered loop as the hero sections.
  extraSections?: Record<string, ReactNode>
  // Legacy visibility props (still accepted; superseded by sectionVisibility).
  showTrust?: boolean; showDescription?: boolean
}

// Builds the warehouse_stock variant_key from the user's current selections —
// mirrors the exact helper already used (and proven) on the /discover product page,
// so order submission, stock lookup and availability checks all stay consistent.
function buildVariantKey(groups: VariantGroup[], selected: Record<string, string>) {
  if (!groups.length) return 'default'
  const parts = groups.map(g => selected[g.name]).filter(Boolean)
  return parts.length === groups.length ? parts.join('|') : 'default'
}

export default function ProductPageClient({ product, store, wilayas, totalStock, reviewCount, avgRating, stockMap = {}, sectionOrder, sectionVisibility, extraSections, showTrust = true, showDescription = true }: Props) {
  // Builder config → ordering + visibility helpers (mirrors the /discover engine).
  // section_order is the SINGLE source of truth (normalized against the canonical list).
  const order = normalizeProductOrder(sectionOrder)
  const vis = (id: string): boolean => {
    if (sectionVisibility && id in sectionVisibility) return sectionVisibility[id] !== false
    if (id === 'trust') return showTrust
    if (id === 'description') return showDescription
    return true
  }
  const router = useRouter()
  const [activeImg, setActiveImg] = useState(0)
  const [lightbox,  setLightbox]  = useState(false)
  const [selected,  setSelected]  = useState<Record<string, string>>({})
  const [showSticky, setShowSticky] = useState(true)

  // Sticky buy bar visibility, driven by whether the order-form section is in
  // view. Uses a CALLBACK REF so the IntersectionObserver RE-ATTACHES every time
  // React (re)mounts the section node — a one-time useEffect observer silently
  // died whenever the node was re-created on a re-render, leaving the bar stuck
  // visible. Bar hides while the order section is on screen, reappears when it
  // scrolls out of view.
  const stickyObserverRef = useRef<IntersectionObserver | null>(null)
  const orderFormRef = useCallback((node: HTMLElement | null) => {
    stickyObserverRef.current?.disconnect()
    stickyObserverRef.current = null
    if (!node) return
    const io = new IntersectionObserver(
      ([entry]) => setShowSticky(!entry.isIntersecting),
      { root: null, rootMargin: '0px 0px -84px 0px', threshold: 0 },
    )
    io.observe(node)
    stickyObserverRef.current = io
  }, [])

  // Load checkout settings and language defaults
  const settings = Array.isArray(store.store_settings) ? store.store_settings[0] : store.store_settings
  const enabledLanguages: Locale[] = useMemo(() => settings?.languages ?? ['ar'], [settings?.languages])
  const defaultLang: Locale = settings?.default_language ?? 'ar'
  const [lang, setLang] = useState<Locale>('ar')

  // Load language from cookie on mount
  useEffect(() => {
    const cookieVal = document.cookie
      .split('; ')
      .find(row => row.startsWith(`dakkani_store_lang_${store.id}=`))
      ?.split('=')[1] as Locale | undefined

    if (cookieVal && enabledLanguages.includes(cookieVal)) {
      setLang(cookieVal)
    } else {
      setLang(defaultLang)
    }
  }, [store.id, enabledLanguages, defaultLang])

  const handleLanguageChange = (newLang: Locale) => {
    setLang(newLang)
    document.cookie = `dakkani_store_lang_${store.id}=${newLang}; path=/; max-age=31536000`
    router.refresh()
  }

  const displayName = useMemo(() => {
    if (lang === 'ar') {
      return product.name_ar || product.name || ''
    }
    return product.name || product.name_ar || ''
  }, [lang, product.name, product.name_ar])

  const displayDescription = useMemo(() => {
    if (lang === 'ar') {
      return product.description_ar || product.description || ''
    }
    return product.description || product.description_ar || ''
  }, [lang, product.description, product.description_ar])

  // ── Variant groups (color/size/etc.) — were completely missing from this
  // page even though products carry a `variants` jsonb column and the order
  // form always submitted variant_key:'default'. This wires the SAME
  // ProductVariants component & selection logic already proven on /discover.
  const variantGroups: VariantGroup[] = useMemo(() => {
    const raw = product?.variants
    if (!Array.isArray(raw)) return []
    return raw.filter((g: any) => g?.name && Array.isArray(g.options) && g.options.length)
  }, [product])

  // Default-select the first option of every group once groups are known
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
  const variantLabel = variantGroups.length
    ? variantGroups.map(g => selected[g.name]).filter(Boolean).join(' / ')
    : undefined

  const isOptionAvailable = (groupName: string, option: string) => {
    if (product.track_inventory === false || product.attributes?.track_inventory === false) return true
    if (!Object.keys(stockMap).length) return true
    const trial = { ...selected, [groupName]: option }
    const key = buildVariantKey(variantGroups, trial)
    if (key === 'default') return true
    return (stockMap[key] ?? 0) > 0 || !(key in stockMap)
  }

  // Stock for the currently-selected combination (falls back to the product total)
  const currentStock: number = Object.keys(stockMap).length
    ? (stockMap[variantKey] ?? stockMap['default'] ?? totalStock)
    : totalStock

  // Apply the merchant-selected product-page theme (same system already used
  // by the /discover product page) — CSS custom properties set on the root
  // cascade down through ProductOrderForm and every section below, so the
  // whole page (including the order form's buttons/accents) restyles together.
  const theme = getProductTheme(product?.theme_key)
  const cssVars = themeToCSSVars(theme)

  const images   = (product.images as any[]) ?? []
  const hasDisc  = product.compare_price && product.compare_price > product.price
  const discPct  = hasDisc ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0
  const storePhone = (store as any).whatsapp ?? store.phone

  const waText = useMemo(() => {
    if (lang === 'fr') {
      return `Bonjour, je souhaite commander: ${displayName}${variantLabel ? ` (${variantLabel})` : ''} — ${formatDZD(product.price)}`
    }
    if (lang === 'en') {
      return `Hello, I would like to order: ${displayName}${variantLabel ? ` (${variantLabel})` : ''} — ${formatDZD(product.price)}`
    }
    return `السلام عليكم، أريد طلب: ${displayName}${variantLabel ? ` (${variantLabel})` : ''} — ${formatDZD(product.price)}`
  }, [lang, displayName, variantLabel, product.price])

  const waUrl  = storePhone
    ? `https://wa.me/${storePhone.replace(/\D/g,'').replace(/^0/,'213')}?text=${encodeURIComponent(waText)}`
    : null

  const galleryRef = useRef<HTMLDivElement>(null)

  const scrollToIdx = (idx: number) => {
    if (!galleryRef.current) return
    const container = galleryRef.current
    const items = container.querySelectorAll('[data-gallery-item]')
    const target = items[idx]
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }
  }

  const handleScroll = () => {
    if (!galleryRef.current) return
    const container = galleryRef.current
    const containerRect = container.getBoundingClientRect()
    const containerCenter = containerRect.left + containerRect.width / 2

    const items = container.querySelectorAll('[data-gallery-item]')
    let closestIdx = 0
    let minDistance = Infinity

    items.forEach((item, idx) => {
      const rect = item.getBoundingClientRect()
      const itemCenter = rect.left + rect.width / 2
      const distance = Math.abs(itemCenter - containerCenter)
      if (distance < minDistance) {
        minDistance = distance
        closestIdx = idx
      }
    })

    setActiveImg(curr => {
      if (closestIdx !== curr) {
        return closestIdx
      }
      return curr
    })
  }

  const prev = () => {
    if (images.length <= 1) return
    const nextIdx = (activeImg - 1 + images.length) % images.length
    setActiveImg(nextIdx)
    scrollToIdx(nextIdx)
  }
  const next = () => {
    if (images.length <= 1) return
    const nextIdx = (activeImg + 1) % images.length
    setActiveImg(nextIdx)
    scrollToIdx(nextIdx)
  }

  // ── Commerco design system — ONE premium system for every store. Only the
  // accent (var(--pt-accent)) varies per store; everything else is fixed.
  const A = 'var(--pt-accent)'
  const ASOFT = 'color-mix(in srgb, var(--pt-accent) 12%, transparent)'
  const PAPER = '#FAF8F5', SURFACE = '#FFFFFF', INK = '#1B1B1F', MUTED = '#71716E', LINE = '#EBE8E1', IMG = '#EFEBE4', OK = '#1D9E75'
  const isRtl = lang === 'ar'

  // Collapse the 7-theme palette to ONE system: keep ONLY the per-store accent
  // (and fonts) from the theme; pin every other --pt-* token to fixed Commerco
  // values so ProductVariants and any --pt-* consumer share one design language.
  const dkVars = {
    ...cssVars,
    '--pt-accent-soft': ASOFT,
    '--pt-surface': SURFACE, '--pt-surface-soft': PAPER, '--pt-bg': PAPER,
    '--pt-border': LINE, '--pt-text': INK, '--pt-text-soft': '#3A3A38', '--pt-text-muted': MUTED,
    '--pt-star': '#EF9F27', '--pt-success': OK, '--pt-danger': '#A32D2D',
    '--pt-btn-primary-bg': A, '--pt-btn-primary-text': '#FFFFFF',
    '--pt-radius-sm': '10px', '--pt-radius-md': '14px', '--pt-radius-lg': '20px', '--pt-radius-pill': '999px',
    '--pt-shadow-sm': 'none', '--pt-shadow-md': '0 1px 3px rgba(20,18,15,0.05)', '--pt-shadow-lg': '0 12px 32px rgba(20,18,15,0.12)',
  } as any

  const scrollToForm = () =>
    document.getElementById('order-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const reviewsWord = lang === 'ar' ? 'تقييم' : lang === 'fr' ? 'avis' : 'reviews'

  const WhatsAppIcon = ({ size = 24 }: { size?: number }) => (
    <svg width={size} height={size} className="fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
  )

  // ── Hero sections, keyed by builder section id. Rendered in `order` and gated
  // by `vis(id)` so the Product-Page-Builder's ordering + hide/show apply live. ──
  const heroNodes: Record<string, any> = {
    gallery: (
      <div>
        {/* Main image */}
        <div className="relative group w-full aspect-[2/3] overflow-hidden rounded-3xl" style={{ background: IMG, border: `0.5px solid ${LINE}` }}>
          <div ref={galleryRef} onScroll={handleScroll}
            className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
            {images.length > 0 ? images.map((img: any, idx: number) => (
              <div key={idx} data-gallery-item className="w-full h-full flex-shrink-0 snap-center relative">
                {img?.url ? (
                  <Image src={img.url} alt={`${displayName} - ${idx + 1}`} fill priority={idx === 0}
                    loading={idx === 0 ? undefined : 'lazy'} sizes="(min-width: 1024px) 42vw, 100vw"
                    className="object-cover select-none" draggable="false" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-7xl select-none" style={{ color: LINE }}>{displayName[0] || ''}</div>
                )}
              </div>
            )) : (
              <div className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center text-7xl select-none" style={{ color: LINE }}>{displayName[0] || ''}</div>
            )}
          </div>

          {images.length > 1 && (
            <>
              <button onClick={prev} aria-label={lang === 'ar' ? 'السابق' : 'Previous'}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex" style={{ background: SURFACE, border: `0.5px solid ${LINE}` }}>
                <ChevronRight className="w-5 h-5" style={{ color: INK }} />
              </button>
              <button onClick={next} aria-label={lang === 'ar' ? 'التالي' : 'Next'}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden lg:flex" style={{ background: SURFACE, border: `0.5px solid ${LINE}` }}>
                <ChevronLeft className="w-5 h-5" style={{ color: INK }} />
              </button>
            </>
          )}

          <button onClick={() => setLightbox(true)} aria-label={lang === 'ar' ? 'تكبير' : 'Zoom'}
            className="absolute bottom-3 left-3 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: SURFACE, border: `0.5px solid ${LINE}` }}>
            <ZoomIn className="w-4.5 h-4.5" style={{ color: INK }} />
          </button>

          {hasDisc && (
            <span className="absolute top-4 right-4 text-white text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: INK }}>‏{discPct}%‏-</span>
          )}

          {/* Mobile dots */}
          {images.length > 1 && (
            <div className="lg:hidden absolute bottom-4 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
              {images.map((_: any, i: number) => (
                <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === activeImg ? 24 : 6, background: i === activeImg ? A : 'rgba(255,255,255,0.8)', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
              ))}
            </div>
          )}
        </div>

        {/* Thumbnail strip below the main image */}
        {images.length > 1 && (
          <div className="flex gap-2.5 overflow-x-auto scrollbar-hide mt-3 pb-1">
            {images.map((img: any, i: number) => (
              <button key={i} onClick={() => { setActiveImg(i); scrollToIdx(i) }}
                aria-label={`${lang === 'ar' ? 'صورة' : 'Image'} ${i + 1}`} aria-current={i === activeImg}
                className="w-[68px] h-[68px] shrink-0 rounded-2xl overflow-hidden relative transition-all"
                style={{ background: IMG, boxShadow: i === activeImg ? `0 0 0 2px ${A}` : `0 0 0 0.5px ${LINE}` }}>
                {img?.url && <Image src={img.url} alt="" fill sizes="68px" loading="lazy" className="object-cover" />}
              </button>
            ))}
          </div>
        )}
      </div>
    ),
    info: (
      <div>
        {currentStock <= 0 ? null : currentStock <= 5 ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: '#FAECE7', color: '#993C1D' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D85A30' }} />
            {translateStorefront('only_left', lang, currentStock)}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: '#E1F5EE', color: '#0F6E56' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: OK }} />
            {translateStorefront('available', lang)}
          </span>
        )}

        <h1 className="text-2xl lg:text-[26px] font-bold leading-snug mt-3 mb-2" style={{ color: INK, letterSpacing: '-0.3px' }}>{displayName}</h1>

        {avgRating && (
          <div className="flex items-center gap-2 mb-5" aria-label={`${avgRating} / 5 — ${reviewCount} ${reviewsWord}`}>
            <span aria-hidden="true" style={{ color: '#EF9F27', fontSize: 16, letterSpacing: 2 }}>★★★★★</span>
            <span className="text-sm font-bold" style={{ color: INK }}>{avgRating}</span>
            <span className="text-sm" style={{ color: MUTED }}>· {reviewCount} {reviewsWord}</span>
          </div>
        )}

        {/* Price — current price is the visual hero; old price + discount are secondary */}
        <div className="mt-1">
          <div className="flex items-end gap-2.5 flex-wrap">
            <span className="font-bold tabular-nums leading-none" style={{ color: A, fontSize: 46, letterSpacing: '-1.5px' }}>{formatDZD(product.price)}</span>
            {hasDisc && (
              <div className="flex items-center gap-2 pb-1.5">
                <span className="text-sm sm:text-base line-through tabular-nums leading-none" style={{ color: MUTED }}>{formatDZD(product.compare_price)}</span>
                <span className="text-[13px] font-extrabold text-white px-2 py-0.5 rounded-md tabular-nums leading-none" style={{ background: '#E0492E' }}>-{discPct}%</span>
              </div>
            )}
          </div>
          {hasDisc && (
            <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-lg mt-2 tabular-nums" style={{ background: 'color-mix(in srgb, var(--pt-accent) 12%, transparent)', color: A }}>
              {lang === 'ar' ? 'وفّري ' : lang === 'fr' ? 'Économisez ' : 'Save '}{formatDZD(product.compare_price - product.price)}
            </span>
          )}
        </div>
        <p className="text-sm mt-3" style={{ color: MUTED }}>
          {lang === 'ar' ? '+ سعر التوصيل حسب ولايتك' : lang === 'fr' ? '+ Frais de livraison selon la wilaya' : '+ Delivery fee depends on your wilaya'}
        </p>
      </div>
    ),
    trust: (
      <div className="grid grid-cols-3 gap-2 py-4 mt-5" style={{ borderTop: `0.5px solid ${LINE}`, borderBottom: `0.5px solid ${LINE}` }}>
        {[
          { icon: <Truck className="w-5 h-5" />, text: translateStorefront('delivery_dz', lang) },
          { icon: <Package className="w-5 h-5" />, text: translateStorefront('open_before_pay', lang) },
          { icon: <Shield className="w-5 h-5" />, text: translateStorefront('quality_guarantee', lang) },
        ].map((b, i) => (
          <div key={b.text} className="flex flex-col items-center gap-2 text-center px-1" style={i === 1 ? { borderRight: `0.5px solid ${LINE}`, borderLeft: `0.5px solid ${LINE}` } : undefined}>
            <span style={{ color: A }}>{b.icon}</span>
            <p className="text-[11px] font-semibold leading-tight" style={{ color: INK }}>{b.text}</p>
          </div>
        ))}
      </div>
    ),
    description: (displayDescription || product.description_image_url || product.attributes?.description_image_url) ? (
      <>
        {displayDescription && (
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <p className="text-sm leading-relaxed" style={{ color: MUTED }}>{displayDescription}</p>
          </div>
        )}
        {(product.description_image_url || product.attributes?.description_image_url) && (
          // Full-bleed, edge-to-edge description banner. The ORIGINAL upload stays
          // full-quality in storage; here we let Next/Image serve a light,
          // responsive WebP resized to the viewport (quality 90 keeps banner text
          // crisp). It sits below the fold → lazy-loaded, so it never blocks LCP or
          // the initial product-page load on slow 3G/4G devices.
          <div className={displayDescription ? 'mt-6' : ''}>
            <Image
              src={product.description_image_url ?? product.attributes?.description_image_url}
              alt={lang === 'ar' ? 'وصف المنتج' : 'Description du produit'}
              width={1200} height={1200} sizes="100vw"
              quality={90}
              className="block w-full h-auto m-0 p-0" style={{ borderRadius: 0, border: 'none', boxShadow: 'none' }} loading="lazy" />
          </div>
        )}
      </>
    ) : null,
    variants: variantGroups.length > 0
      ? (
        <div className="mt-5">
          <ProductVariants
            groups={variantGroups}
            selected={selected}
            onSelect={(g, o) => setSelected(prev => ({ ...prev, [g]: o }))}
            isOptionAvailable={isOptionAvailable}
          />
        </div>
      )
      : null,
    buybox: (
      <ProductOrderForm
        product={product}
        store={store}
        wilayas={wilayas}
        variantKey={variantKey}
        variantLabel={variantLabel}
        lang={lang}
        maxQty={(product.track_inventory === false || product.attributes?.track_inventory === false) ? undefined : (currentStock > 0 ? currentStock : undefined)}
      />
    ),
  }

  const wrapCls = 'max-w-2xl mx-auto px-4 sm:px-6 pt-6'
  // Every section — hero AND below — keyed by its builder id. There is NO fixed
  // JSX ordering: the render loop below walks `order` (section_order) and outputs
  // each section EXACTLY where the merchant placed it.
  const nodes: Record<string, ReactNode> = {
    gallery:     <section key="gallery" className={wrapCls}>{heroNodes.gallery}</section>,
    info:        <section key="info" className={wrapCls}>{heroNodes.info}</section>,
    variants:    heroNodes.variants ? <section key="variants" className={wrapCls}>{heroNodes.variants}</section> : null,
    buybox:      <section key="buybox" id="order-form" ref={orderFormRef} className={wrapCls} style={{ scrollMarginTop: 24 }}>{heroNodes.buybox}</section>,
    trust:       <section key="trust" className={wrapCls}>{heroNodes.trust}</section>,
    description: heroNodes.description ? <section key="description" className="pt-6">{heroNodes.description}</section> : null,
    ...(extraSections ?? {}),
  }

  return (
    <div data-pt-root dir={isRtl ? 'rtl' : 'ltr'} style={{ ...dkVars, background: PAPER, color: INK }}>
      {/* Language switcher */}
      {enabledLanguages.length > 1 && (
        <div className={`max-w-2xl mx-auto px-4 sm:px-6 pt-4 flex ${isRtl ? 'justify-start' : 'justify-end'}`}>
          <div className="inline-flex items-center gap-1 p-1 rounded-full" style={{ background: SURFACE, border: `0.5px solid ${LINE}` }}>
            {enabledLanguages.map((l) => (
              <button key={l} onClick={() => handleLanguageChange(l)}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide transition-colors"
                style={lang === l ? { background: A, color: '#fff' } : { color: MUTED, background: 'transparent' }}>
                {l === 'ar' ? 'العربية' : l === 'fr' ? 'Français' : 'English'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sections rendered STRICTLY in section_order (single source of truth).
          No section has a hardcoded position; each shows only when visible. ── */}
      <div className="pb-6">
        {order.map(id => (vis(id) ? (nodes[id] ?? null) : null))}
      </div>

      {/* Lightbox */}
      {lightbox && images[activeImg]?.url && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(20,18,15,0.92)' }} onClick={() => setLightbox(false)}>
          <img src={cdnImage(images[activeImg].url, 1920)} alt={displayName} className="max-w-full max-h-full object-contain rounded-2xl" loading="lazy" decoding="async" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(false)} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Universal premium sticky buy bar — hidden when the merchant hides the
          `buybox` section (the inline order form below is always available). */}
      {vis('buybox') && (<>
      <div
        className={`fixed bottom-0 inset-x-0 z-40 flex justify-center px-3.5 pt-3.5 transition-all duration-300 ease-in-out ${showSticky ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}
        style={{
          background: 'rgba(250,248,245,0.97)',
          borderTop: `0.5px solid ${LINE}`,
          backdropFilter: 'blur(8px)',
          // Comfortable breathing space above the home indicator / gesture bar
          // on notched phones, on top of the existing 14px base padding.
          paddingBottom: 'calc(0.875rem + env(safe-area-inset-bottom, 0px))',
        }}
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <button 
          type="button" 
          onClick={scrollToForm} 
          className="w-full max-w-lg flex items-center justify-center h-14 rounded-2xl text-white font-bold text-[16px] transition-transform active:scale-95 shadow-lg cursor-pointer hover:opacity-90" 
          style={{ background: A }}
        >
          اطلب الآن
        </button>
      </div>

      {/* Spacer so the sticky bar never covers the last content on mobile —
          matches the bar's own safe-area-aware height so it never falls short
          on notched devices. */}
      <div className="lg:hidden" style={{ height: 'calc(5rem + env(safe-area-inset-bottom, 0px))' }} />
      </>)}
    </div>
  )
}
