'use client'
import { useEffect, useMemo, useState, useRef } from 'react'
import { formatDZD } from '@/lib/utils/format'
import ProductOrderForm from './ProductOrderForm'
import { Star, Shield, Truck, Package, ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react'
import Link from 'next/link'
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
}

// Builds the warehouse_stock variant_key from the user's current selections —
// mirrors the exact helper already used (and proven) on the /discover product page,
// so order submission, stock lookup and availability checks all stay consistent.
function buildVariantKey(groups: VariantGroup[], selected: Record<string, string>) {
  if (!groups.length) return 'default'
  const parts = groups.map(g => selected[g.name]).filter(Boolean)
  return parts.length === groups.length ? parts.join('|') : 'default'
}

export default function ProductPageClient({ product, store, wilayas, totalStock, reviewCount, avgRating, stockMap = {} }: Props) {
  const router = useRouter()
  const [activeImg, setActiveImg] = useState(0)
  const [lightbox,  setLightbox]  = useState(false)
  const [selected,  setSelected]  = useState<Record<string, string>>({})

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

  return (
    <div data-pt-root style={{ ...cssVars }}>
      <div className="max-w-6xl mx-auto px-4 py-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {/* Language Switcher */}
        {enabledLanguages.length > 1 && (
          <div className={`flex justify-end mb-6 ${lang === 'ar' ? 'pl-2' : 'pr-2'}`}>
            <div className="inline-flex items-center gap-1 bg-white/85 dark:bg-slate-900/80 backdrop-blur-md p-1 border border-gray-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
              {enabledLanguages.map((l) => (
                <button
                  key={l}
                  onClick={() => handleLanguageChange(l)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wide transition-all ${
                    lang === l
                      ? 'bg-[var(--pt-accent,#0D6EFD)] text-white shadow-md'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {l === 'ar' ? 'العربية' : l === 'fr' ? 'Français' : 'English'}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Gallery */}
          <div className="space-y-3">
            <div
              className="relative group aspect-square overflow-hidden"
              style={{ background: 'var(--pt-surface)', borderRadius: 'var(--pt-radius-lg)', boxShadow: 'var(--pt-shadow-md)', border: '1px solid var(--pt-border)' }}
            >
              <div
                ref={galleryRef}
                onScroll={handleScroll}
                className="w-full h-full flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{ scrollBehavior: 'smooth' }}
              >
                {images.length > 0 ? (
                  images.map((img: any, idx: number) => (
                     <div
                      key={idx}
                      data-gallery-item
                      className="w-full h-full flex-shrink-0 snap-center relative"
                    >
                      {img?.url ? (
                        <Image
                          src={img.url}
                          alt={`${displayName} - ${idx + 1}`}
                          fill
                          priority={idx === 0}
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover select-none"
                          draggable="false"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-7xl text-gray-100 bg-gray-50 select-none">
                          {displayName[0] || ''}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="w-full h-full flex-shrink-0 snap-center flex items-center justify-center text-7xl text-gray-100 bg-gray-50 select-none">
                    {displayName[0] || ''}
                  </div>
                )}
              </div>

              {images.length > 1 && (
                <>
                  <button onClick={prev} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5" style={{ color: 'var(--pt-accent)' }} />
                  </button>
                  <button onClick={next} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronLeft className="w-5 h-5" style={{ color: 'var(--pt-accent)' }} />
                  </button>
                </>
              )}

              <button onClick={() => setLightbox(true)}
                className="absolute top-3 left-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>

              {hasDisc && (
                <span className="absolute top-3 right-3 text-white text-sm font-black px-3 py-1.5 shadow-md" style={{ background: 'var(--pt-danger)', borderRadius: 'var(--pt-radius-md)' }}>
                  -{discPct}%
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {images.map((img: any, i: number) => (
                  <button key={i} onClick={() => { setActiveImg(i); scrollToIdx(i); }}
                    className="w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all hover:opacity-90 relative"
                    style={{ borderColor: i === activeImg ? 'var(--pt-accent)' : 'transparent' }}>
                    <Image
                      src={img.url}
                      alt=""
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5">
            {/* Stock badge — reflects the currently-selected variant's stock when the product has variants */}
            {currentStock <= 0 ? null : currentStock <= 5 ? (
              <span className="pt-badge dot-blink" style={{ background: 'color-mix(in srgb, var(--pt-danger) 12%, transparent)', color: 'var(--pt-danger)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--pt-danger)' }} />
                {translateStorefront('only_left', lang, currentStock)}
              </span>
            ) : (
              <span className="pt-badge pt-badge-success">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--pt-success)' }} />
                {translateStorefront('available', lang)}
              </span>
            )}

            <h1 className="pt-heading text-3xl md:text-4xl leading-tight">
              {displayName}
            </h1>

            {avgRating && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-base" style={{ color: i < Math.round(parseFloat(avgRating)) ? 'var(--pt-star)' : 'var(--pt-border)' }}>★</span>
                  ))}
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--pt-text)' }}>{avgRating}</span>
                <span className="text-sm" style={{ color: 'var(--pt-text-muted)' }}>({reviewCount} {lang === 'ar' ? 'تقييم' : lang === 'fr' ? 'avis' : 'reviews'})</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-end gap-4">
              <span className="text-4xl font-black" style={{ color: 'var(--pt-accent)' }}>{formatDZD(product.price)}</span>
              {hasDisc && (
                <>
                  <span className="text-xl line-through" style={{ color: 'var(--pt-text-muted)' }}>{formatDZD(product.compare_price)}</span>
                  <span className="text-white text-sm font-black px-2.5 py-1" style={{ background: 'var(--pt-danger)', borderRadius: 'var(--pt-radius-md)' }}>
                    {lang === 'ar' ? 'وفر ' : lang === 'fr' ? 'Économisez ' : 'Save '}{formatDZD(product.compare_price - product.price)}
                  </span>
                </>
              )}
            </div>

            {displayDescription && (
              <p className="text-base leading-relaxed pt-4" style={{ color: 'var(--pt-text-soft)', borderTop: '1px solid var(--pt-border)' }}>
                {displayDescription}
              </p>
            )}

            {(product.description_image_url || product.attributes?.description_image_url) && (
              <div className="pt-4 w-full" style={{ borderTop: displayDescription ? 'none' : '1px solid var(--pt-border)' }}>
                <Image
                  src={product.description_image_url ?? product.attributes?.description_image_url}
                  alt={lang === 'ar' ? 'وصف المنتج' : 'Description du produit'}
                  width={1200}
                  height={1200}
                  sizes="(max-width: 768px) 100vw, 800px"
                  className="w-full h-auto rounded-2xl object-contain shadow-sm border border-gray-100"
                  loading="lazy"
                />
              </div>
            )}

            {/* Variants (color/size/etc.) — selecting updates the live stock badge,
                the order-form summary & submission, and the WhatsApp message */}
            {variantGroups.length > 0 && (
              <div className="pt-4" style={{ borderTop: '1px solid var(--pt-border)' }}>
                <ProductVariants
                  groups={variantGroups}
                  selected={selected}
                  onSelect={(g, o) => setSelected(prev => ({ ...prev, [g]: o }))}
                  isOptionAvailable={isOptionAvailable}
                />
              </div>
            )}

            {/* Mini trust */}
            <div className="grid grid-cols-3 gap-3 py-3" style={{ borderTop: '1px solid var(--pt-border)', borderBottom: '1px solid var(--pt-border)' }}>
              {[
                { icon: <Truck className="w-4 h-4" />, text: translateStorefront('delivery_dz', lang) },
                { icon: <Package className="w-4 h-4" />, text: translateStorefront('open_before_pay', lang) },
                { icon: <Shield className="w-4 h-4" />, text: translateStorefront('quality_guarantee', lang) },
              ].map(b => (
                <div key={b.text} className="flex flex-col items-center gap-1.5 text-center">
                  <div className="w-8 h-8 flex items-center justify-center" style={{ background: 'var(--pt-accent-soft)', color: 'var(--pt-accent)', borderRadius: 'var(--pt-radius-md)' }}>{b.icon}</div>
                  <p className="text-xs font-medium leading-tight" style={{ color: 'var(--pt-text-soft)' }}>{b.text}</p>
                </div>
              ))}
            </div>

            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#25D366] hover:bg-[#20BD5C] text-white font-black rounded-2xl text-base transition-colors shadow-md active:scale-95">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {translateStorefront('whatsapp_order', lang)}
              </a>
            )}

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
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && images[activeImg]?.url && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={images[activeImg].url}
            alt={displayName}
            className="max-w-full max-h-full object-contain rounded-2xl"
            loading="lazy"
            decoding="async"
            onClick={e => e.stopPropagation()}
          />
          <button onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Mobile sticky bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-3 flex gap-3 md:hidden z-40 shadow-float" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white font-bold rounded-2xl text-sm">
            📱 {translateStorefront('whatsapp_order', lang).replace(' 💬', '')}
          </a>
        )}
        <Link
          href={`/store/${store.slug}/checkout?product_id=${product.id}`}
          className="flex-1 flex items-center justify-center py-3 font-black text-white text-sm"
          style={{ background: 'var(--pt-btn-primary-bg)', color: 'var(--pt-btn-primary-text)', borderRadius: 'var(--pt-btn-radius)' }}
        >
          🛒 {translateStorefront('order_now', lang).replace(' 🛒', '').replace(' اضغط هنا للطلب', 'اطلب')} — {formatDZD(product.price)}
        </Link>
      </div>
    </div>
  )
}
