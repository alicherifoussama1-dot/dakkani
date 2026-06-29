'use client'
import { useEffect, useMemo, useState, useRef } from 'react'
import { formatDZD } from '@/lib/utils/format'
import ProductOrderForm from './ProductOrderForm'
import { Shield, Truck, Package, ChevronLeft, ChevronRight, ZoomIn, X, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getProductTheme, themeToCSSVars } from '@/lib/product-themes'
import ProductVariants, { type VariantGroup } from '@/components/discover/product/ProductVariants'
import '@/components/discover/product/product-theme.css'
import { translateStorefront, type Locale } from '@/lib/utils/translations'

interface Props {
  product: any; store: any; wilayas: any[]
  totalStock: number; reviewCount: number; avgRating: string | null
  stockMap?: Record<string, number>
  // Merchant section_visibility flags (default true → backward compatible).
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

export default function ProductPageClient({ product, store, wilayas, totalStock, reviewCount, avgRating, stockMap = {}, showTrust = true, showDescription = true }: Props) {
  const router = useRouter()
  const [activeImg, setActiveImg] = useState(0)
  const [lightbox,  setLightbox]  = useState(false)
  const [selected,  setSelected]  = useState<Record<string, string>>({})
  const [showSticky, setShowSticky] = useState(true)

  useEffect(() => {
    let observer: IntersectionObserver | null = null
    
    const initObserver = () => {
      const target = document.getElementById('original-submit-btn')
      if (target) {
        observer = new IntersectionObserver(([entry]) => {
          setShowSticky(!entry.isIntersecting)
        }, {
          root: null,
          threshold: 0,
        })
        observer.observe(target)
        return true
      }
      return false
    }

    if (!initObserver()) {
      const timer = setTimeout(() => {
        if (!initObserver()) {
          const formEl = document.getElementById('order-form')
          if (formEl) {
            observer = new IntersectionObserver(([entry]) => {
              setShowSticky(!entry.isIntersecting)
            }, {
              root: null,
              threshold: 0,
            })
            observer.observe(formEl)
          }
        }
      }, 100)
      return () => {
        clearTimeout(timer)
        if (observer) observer.disconnect()
      }
    }

    return () => {
      if (observer) observer.disconnect()
    }
  }, [])

  // Load checkout settings and language defaults
  const settings = Array.isArray(store.store_settings) ? store.store_settings[0] : store.store_settings
  const enabledLanguages: Locale[] = settings?.languages ?? ['ar']
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

  // ── Dakkani design system — ONE premium system for every store. Only the
  // accent (var(--pt-accent)) varies per store; everything else is fixed.
  const A = 'var(--pt-accent)'
  const ASOFT = 'color-mix(in srgb, var(--pt-accent) 12%, transparent)'
  const PAPER = '#FAF8F5', SURFACE = '#FFFFFF', INK = '#1B1B1F', MUTED = '#71716E', LINE = '#EBE8E1', IMG = '#EFEBE4', OK = '#1D9E75'
  const isRtl = lang === 'ar'

  // Collapse the 7-theme palette to ONE system: keep ONLY the per-store accent
  // (and fonts) from the theme; pin every other --pt-* token to fixed Dakkani
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

  return (
    <div data-pt-root dir={isRtl ? 'rtl' : 'ltr'} style={{ ...dkVars, background: PAPER, color: INK }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 lg:py-8">

        {/* Language switcher */}
        {enabledLanguages.length > 1 && (
          <div className={`flex ${isRtl ? 'justify-start' : 'justify-end'} mb-4`}>
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

        {/* ── HERO ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.35fr_1fr] gap-6 lg:gap-10 items-start">

          {/* Gallery */}
          <div>
            {/* Main image */}
            <div className="relative group w-full aspect-[4/5] overflow-hidden rounded-3xl" style={{ background: IMG, border: `0.5px solid ${LINE}` }}>
              <div ref={galleryRef} onScroll={handleScroll}
                className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide" style={{ scrollBehavior: 'smooth' }}>
                {images.length > 0 ? images.map((img: any, idx: number) => (
                  <div key={idx} data-gallery-item className="w-full h-full flex-shrink-0 snap-center relative">
                    {img?.url ? (
                      <Image src={img.url} alt={`${displayName} - ${idx + 1}`} fill priority={idx === 0}
                        sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover select-none" draggable="false" />
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
                    {img?.url && <Image src={img.url} alt="" fill sizes="68px" className="object-cover" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Buy box — sticky on desktop */}
          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="rounded-3xl p-6 sm:p-7" style={{ background: SURFACE, border: `0.5px solid ${LINE}`, borderTop: `3px solid ${A}` }}>

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

              {/* Price */}
              <div className="flex items-end gap-3 flex-wrap mt-1">
                <span className="font-bold tabular-nums leading-none" style={{ color: A, fontSize: 46, letterSpacing: '-1.5px' }}>{formatDZD(product.price)}</span>
                {hasDisc && (
                  <>
                    <span className="text-base line-through pb-1.5" style={{ color: MUTED }}>{formatDZD(product.compare_price)}</span>
                    <span className="text-xs font-bold text-white px-2.5 py-1 rounded-lg mb-1.5" style={{ background: INK }}>
                      {lang === 'ar' ? 'وفّر ' : lang === 'fr' ? 'Économisez ' : 'Save '}{formatDZD(product.compare_price - product.price)}
                    </span>
                  </>
                )}
              </div>
              <p className="text-sm mt-3 mb-6" style={{ color: MUTED }}>
                {lang === 'ar' ? '+ سعر التوصيل حسب ولايتك' : lang === 'fr' ? '+ Frais de livraison selon la wilaya' : '+ Delivery fee depends on your wilaya'}
              </p>

              {/* Trust */}
              {showTrust && (
                <div className="grid grid-cols-3 gap-2 py-4" style={{ borderTop: `0.5px solid ${LINE}`, borderBottom: `0.5px solid ${LINE}` }}>
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
              )}

              {showDescription && displayDescription && (
                <p className="text-sm leading-relaxed mt-5" style={{ color: MUTED }}>{displayDescription}</p>
              )}

              {/* Variants */}
              {variantGroups.length > 0 && (
                <div className="mt-5">
                  <ProductVariants
                    groups={variantGroups}
                    selected={selected}
                    onSelect={(g, o) => setSelected(prev => ({ ...prev, [g]: o }))}
                    isOptionAvailable={isOptionAvailable}
                  />
                </div>
              )}

              {/* Desktop CTA (mobile uses the sticky bar) */}
              <div className="hidden lg:flex gap-3 mt-6">
                <button type="button" onClick={scrollToForm}
                  className="flex-1 flex items-center justify-center gap-2.5 h-14 rounded-2xl text-white font-bold text-[15px] transition-transform active:scale-95"
                  style={{ background: A }}>
                  <ShoppingBag className="w-5 h-5" />{translateStorefront('order_now', lang).replace(' 🛒', '').replace(' اضغط هنا للطلب', 'اطلب')}
                </button>
                {waUrl && (
                  <a href={waUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                    className="w-14 h-14 flex items-center justify-center rounded-2xl shrink-0" style={{ background: '#1FAE54' }}>
                    <WhatsAppIcon size={26} />
                  </a>
                )}
              </div>
              <p className="hidden lg:block text-[11px] text-center mt-3" style={{ color: MUTED }}>
                {lang === 'ar' ? 'الدفع عند الاستلام · نتصل بك لتأكيد الطلب' : lang === 'fr' ? 'Paiement à la livraison · Appel de confirmation' : 'Cash on delivery · We call to confirm'}
              </p>
            </div>
          </div>
        </div>

        {/* ── Order form (one-page inline) ── */}
        <div id="order-form" className="max-w-2xl mx-auto mt-8 lg:mt-12" style={{ scrollMarginTop: 24 }}>
          <ProductOrderForm
            product={product}
            store={store}
            wilayas={wilayas}
            variantKey={variantKey}
            variantLabel={variantLabel}
            lang={lang}
            maxQty={(product.track_inventory === false || product.attributes?.track_inventory === false) ? undefined : (currentStock > 0 ? currentStock : undefined)}
          />
        </div>

        {/* ── Product details image ── */}
        {showDescription && (product.description_image_url || product.attributes?.description_image_url) && (
          <div className="max-w-3xl mx-auto mt-10">
            <h2 className="text-lg font-bold mb-4" style={{ color: INK }}>
              {lang === 'ar' ? 'تفاصيل المنتج' : lang === 'fr' ? 'Détails du produit' : 'Product details'}
            </h2>
            <Image
              src={product.description_image_url ?? product.attributes?.description_image_url}
              alt={lang === 'ar' ? 'وصف المنتج' : 'Description du produit'}
              width={1200} height={1200} sizes="(max-width: 768px) 100vw, 800px"
              className="w-full h-auto rounded-3xl object-contain" style={{ border: `0.5px solid ${LINE}` }} loading="lazy" />
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && images[activeImg]?.url && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(20,18,15,0.92)' }} onClick={() => setLightbox(false)}>
          <img src={images[activeImg].url} alt={displayName} className="max-w-full max-h-full object-contain rounded-2xl" loading="lazy" decoding="async" onClick={e => e.stopPropagation()} />
          <button onClick={() => setLightbox(false)} aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
            className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center text-white" style={{ background: 'rgba(255,255,255,0.14)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Universal premium sticky buy bar */}
      <div 
        className={`fixed bottom-0 inset-x-0 z-40 flex justify-center p-3.5 transition-all duration-300 ease-in-out ${showSticky ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`} 
        style={{ 
          background: 'rgba(250,248,245,0.97)', 
          borderTop: `0.5px solid ${LINE}`, 
          backdropFilter: 'blur(8px)' 
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

      {/* Spacer so the sticky bar never covers the last content on mobile */}
      <div className="h-20 lg:hidden" />
    </div>
  )
}
