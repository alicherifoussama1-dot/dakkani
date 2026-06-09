'use client'
// ============================================================
// AI Landing Page Renderer — Professional Rich Version
// Renders Gemini-generated copy + AI Photo Studio images into a
// high-converting, animated, mobile-first RTL landing page.
// Sections: Hero · Urgency · Story · Benefits · Gallery · Specs
//           How-to-Order · Variants · Social Proof · Guarantee
//           Order Form · Trust · FAQ · Final CTA · Sticky Bar
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { Star, ShieldCheck, Truck, RefreshCw, Clock, ChevronDown, Flame, ZoomIn, X, CheckCircle2, Package, Phone } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'
import { getProductTheme, themeToCSSVars } from '@/lib/product-themes'
import ProductOrderForm from './ProductOrderForm'
import { FadeUp, StaggerContainer, StaggerItem } from '@/components/ui/animations'
import '@/components/discover/product/product-theme.css'

// ── Types ────────────────────────────────────────────────────
interface HowToStep { step: number; icon: string; title: string; text: string }
interface AIContent {
  category_detected?: string
  framework_used?: string
  hero?: {
    headline: string; subheadline?: string; cta_text?: string; badge_text?: string
    variations?: { headline: string; cta_text?: string }[]
  }
  product_story?: { hook?: string; body?: string; payoff?: string }
  benefits?: { icon?: string; title: string; text: string }[]
  product_details?: { intro?: string; specs?: string[]; use_cases?: string[] }
  how_to_order?: HowToStep[]
  social_proof?: { name: string; wilaya?: string; rating?: number; quote: string }[]
  trust_badges?: string[]
  urgency?: { type?: string; text?: string }
  guarantee?: string
  faq?: { q: string; a: string }[]
  final_cta?: { headline?: string; cta_text?: string }
}

interface AIImage { url: string; key?: string; label_ar?: string }

interface Props {
  page: {
    id: string
    ai_content: AIContent | null
    ai_images: AIImage[]
    theme_key: string
    hero_variant: number
  }
  product: any
  store: any
  wilayas: any[]
}

// ── Countdown ─────────────────────────────────────────────────
function useRollingCountdown(hours = 6) {
  const [msLeft, setMsLeft] = useState<number | null>(null)
  useEffect(() => {
    const windowMs = hours * 3600 * 1000
    const tick = () => setMsLeft(windowMs - (Date.now() % windowMs))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [hours])
  if (msLeft === null) return null
  return {
    h: Math.floor(msLeft / 3_600_000),
    m: Math.floor((msLeft % 3_600_000) / 60_000),
    s: Math.floor((msLeft % 60_000) / 1000),
  }
}

// ── FAQ Accordion ─────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-right"
      >
        <span className="font-bold text-sm leading-snug" style={{ color: 'var(--pt-text)' }}>{q}</span>
        <ChevronDown
          size={18}
          style={{
            color: 'var(--pt-accent)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform .25s',
            flexShrink: 0,
          }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--pt-text-soft)', borderTop: '1px solid var(--pt-border)', paddingTop: 12 }}>
          {a}
        </div>
      )}
    </div>
  )
}

// ── Image Zoom Lightbox ───────────────────────────────────────
function ImageLightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIndex)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setIdx(i => (i + 1) % images.length)
      if (e.key === 'ArrowRight') setIdx(i => (i - 1 + images.length) % images.length)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [images.length, onClose])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.92)' }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 left-4 p-2 rounded-full"
        style={{ background: 'rgba(255,255,255,.15)', color: '#fff' }}
      >
        <X size={24} />
      </button>
      <img
        src={images[idx]}
        alt=""
        className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl"
        onClick={e => e.stopPropagation()}
      />
      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              className="w-2.5 h-2.5 rounded-full transition"
              style={{ background: i === idx ? '#fff' : 'rgba(255,255,255,.4)' }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Gallery Grid ──────────────────────────────────────────────
function GallerySection({ images }: { images: string[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  if (!images.length) return null
  const shown = images.slice(0, 6)
  return (
    <section className="max-w-5xl mx-auto px-4 pb-12">
      <FadeUp>
        <h2 className="pt-heading text-xl md:text-2xl font-black text-center mb-6" style={{ color: 'var(--pt-text)' }}>
          📸 صور المنتج
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {shown.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setLightboxIdx(i)}
              className="relative group aspect-square overflow-hidden focus:outline-none"
              style={{ borderRadius: 'var(--pt-radius-lg)', background: 'var(--pt-surface-soft)' }}
            >
              <img src={url} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(0,0,0,.35)' }}>
                <ZoomIn size={28} color="#fff" />
              </div>
            </button>
          ))}
        </div>
      </FadeUp>
      {lightboxIdx !== null && (
        <ImageLightbox images={shown} startIndex={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}
    </section>
  )
}

// ── How-to-Order Steps ────────────────────────────────────────
const DEFAULT_HOW_TO: HowToStep[] = [
  { step: 1, icon: '📝', title: 'اكتب اسمك ورقمك', text: 'اmlأ نموذج الطلب — ما تاخذش دقيقتين كاملتين' },
  { step: 2, icon: '📞', title: 'تأكيد الطلب', text: 'نتصلوا بك خلال 24 ساعة نأكدوا معك الطلب والعنوان' },
  { step: 3, icon: '🚚', title: 'التوصيل لبابك', text: 'يوصلك خلال 24-72 ساعة وتدفع كي تشوف المنتج بعينيك' },
]

function HowToOrderSection({ steps }: { steps?: HowToStep[] }) {
  const list = (steps && steps.length > 0) ? steps : DEFAULT_HOW_TO
  return (
    <section className="max-w-4xl mx-auto px-4 pb-14">
      <FadeUp>
        <h2 className="pt-heading text-xl md:text-2xl font-black text-center mb-8" style={{ color: 'var(--pt-text)' }}>
          🛒 كيفاش تطلب؟
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {list.map((step, i) => (
            <div key={i} className="relative flex flex-col items-center text-center p-6"
              style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-xl)' }}>
              <div className="text-4xl mb-3">{step.icon}</div>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black mb-2"
                style={{ background: 'var(--pt-accent)', color: 'var(--pt-btn-primary-text)' }}>
                {step.step}
              </div>
              <h3 className="font-black mb-1.5" style={{ color: 'var(--pt-text)' }}>{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--pt-text-soft)' }}>{step.text}</p>
              {i < list.length - 1 && (
                <div className="hidden md:block absolute -left-2 top-1/2 -translate-y-1/2 text-2xl" style={{ color: 'var(--pt-text-muted)' }}>←</div>
              )}
            </div>
          ))}
        </div>
      </FadeUp>
    </section>
  )
}

// ── Variant Swatches ──────────────────────────────────────────
function VariantsSection({ product }: { product: any }) {
  const variants: any[] = product.variants ?? []

  // Determine option keys — must happen before any return so Hook order is stable
  const rawOptionNames: string[] = product.variant_options ?? []
  if (!rawOptionNames.length) {
    const first = variants[0]
    if (first?.option1) rawOptionNames.push('option1')
    if (first?.option2) rawOptionNames.push('option2')
  }

  // Hook MUST come before conditional returns
  const [selected, setSelected] = useState<Record<string, string>>({})

  if (!variants.length || !rawOptionNames.length) return null

  const optionNames = rawOptionNames

  // Build unique values per option key
  const optionValues: Record<string, string[]> = {}
  for (const v of variants) {
    for (const key of optionNames) {
      const val = v[key]
      if (val) {
        if (!optionValues[key]) optionValues[key] = []
        if (!optionValues[key].includes(val)) optionValues[key].push(val)
      }
    }
  }

  const colorKeywords = ['color', 'couleur', 'لون', 'couleur']
  const isColorKey = (k: string) => colorKeywords.some(c => k.toLowerCase().includes(c))

  return (
    <section className="max-w-3xl mx-auto px-4 pb-10">
      <FadeUp>
        <div className="pt-card p-5" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-xl)' }}>
          <h3 className="font-black mb-4" style={{ color: 'var(--pt-text)' }}>اختر المواصفة</h3>
          {optionNames.map(key => (
            <div key={key} className="mb-5 last:mb-0">
              <p className="text-sm font-bold mb-2" style={{ color: 'var(--pt-text-soft)' }}>{key}</p>
              <div className="flex flex-wrap gap-2">
                {(optionValues[key] ?? []).map(val => {
                  const isSel = selected[key] === val
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSelected(s => ({ ...s, [key]: val }))}
                      className="px-4 py-2 text-sm font-semibold transition"
                      style={{
                        borderRadius: 'var(--pt-btn-radius)',
                        border: isSel ? '2px solid var(--pt-accent)' : '1.5px solid var(--pt-border)',
                        background: isSel ? 'var(--pt-accent-soft)' : 'var(--pt-bg)',
                        color: isSel ? 'var(--pt-accent)' : 'var(--pt-text)',
                        fontWeight: isSel ? 700 : 500,
                      }}
                    >
                      {val}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </FadeUp>
    </section>
  )
}

// ── Main Component ────────────────────────────────────────────
export default function AILandingPage({ page, product, store, wilayas }: Props) {
  const theme = getProductTheme(page.theme_key)
  const cssVars = themeToCSSVars(theme)
  const content = page.ai_content ?? {}

  const hero = content.hero
  const heroVariant = page.hero_variant > 0 ? content.hero?.variations?.[page.hero_variant - 1] : undefined
  const headline  = heroVariant?.headline   ?? hero?.headline   ?? (product.name_ar ?? product.name)
  const subhead   = hero?.subheadline
  const ctaText   = heroVariant?.cta_text   ?? hero?.cta_text   ?? '🛒 اطلب الآن'
  const badgeText = hero?.badge_text

  const heroImage     = page.ai_images?.[0]?.url ?? (product.images as any[])?.[0]?.url
  const galleryImages = (page.ai_images?.length
    ? page.ai_images.map(i => i.url)
    : (product.images as any[])?.map((i: any) => i.url)
  ) ?? []

  const hasDiscount  = product.compare_price && product.compare_price > product.price
  const discountPct  = hasDiscount ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0
  const isTimeUrgency = content.urgency?.type === 'time'
  const countdown    = useRollingCountdown(6)

  const [showStickyBar, setShowStickyBar] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 500)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToOrder = () =>
    document.getElementById('ai-landing-order')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div data-pt-root dir="rtl" style={{ ...cssVars, background: 'var(--pt-bg)', minHeight: '100vh' }}>

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'var(--pt-surface-soft)' }}>
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-10 md:pt-14 md:pb-16 grid md:grid-cols-2 gap-8 items-center">

          {/* Copy side */}
          <FadeUp className="order-2 md:order-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {content.category_detected && (
                <span className="text-xs font-bold px-3 py-1" style={{ background: 'var(--pt-accent-soft)', color: 'var(--pt-accent)', borderRadius: 'var(--pt-radius-pill)' }}>
                  {content.category_detected}
                </span>
              )}
              {badgeText && (
                <span className="text-xs font-bold px-3 py-1" style={{ background: '#fef3c7', color: '#92400e', borderRadius: 'var(--pt-radius-pill)' }}>
                  🔥 {badgeText}
                </span>
              )}
            </div>

            <h1 className="pt-heading font-black leading-snug" style={{ fontSize: 'clamp(1.45rem, 4vw, 2.4rem)', color: 'var(--pt-text)' }}>
              {headline}
            </h1>

            {subhead && (
              <p className="mt-3 text-base md:text-lg leading-relaxed" style={{ color: 'var(--pt-text-soft)' }}>
                {subhead}
              </p>
            )}

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <span className="text-2xl md:text-3xl font-black" style={{ color: 'var(--pt-accent)' }}>
                {formatDZD(product.price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-base line-through" style={{ color: 'var(--pt-text-muted)' }}>
                    {formatDZD(product.compare_price)}
                  </span>
                  <span className="text-xs font-black px-2.5 py-1" style={{ background: '#fee2e2', color: '#b91c1c', borderRadius: 'var(--pt-radius-pill)' }}>
                    خصم {discountPct}%
                  </span>
                </>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={scrollToOrder}
                className="flex-1 md:flex-none font-black px-7 py-4 text-base transition active:scale-[0.97]"
                style={{ background: 'var(--pt-btn-primary-bg)', color: 'var(--pt-btn-primary-text)', borderRadius: 'var(--pt-btn-radius)', boxShadow: 'var(--pt-shadow-md)' }}
              >
                {ctaText}
              </button>
            </div>

            {/* Trust badges */}
            {content.trust_badges && content.trust_badges.length > 0 && (
              <StaggerContainer className="mt-4 flex flex-wrap gap-2">
                {content.trust_badges.slice(0, 4).map((b, i) => (
                  <StaggerItem key={i}>
                    <span className="text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-pill)', color: 'var(--pt-text-soft)' }}>
                      {b}
                    </span>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </FadeUp>

          {/* Image side */}
          <FadeUp delay={0.12} className="order-1 md:order-2">
            <div
              className="relative aspect-square overflow-hidden"
              style={{ background: 'var(--pt-surface)', boxShadow: 'var(--pt-shadow-xl, var(--pt-shadow-lg))', borderRadius: 'var(--pt-radius-xl, var(--pt-radius-lg))' }}
            >
              {heroImage ? (
                <img
                  src={heroImage}
                  alt={product.name_ar ?? product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-6xl" style={{ color: 'var(--pt-text-muted)' }}>
                  📦
                </div>
              )}
              {hasDiscount && (
                <span className="absolute top-4 right-4 text-sm font-black px-3 py-1.5" style={{ background: '#ef4444', color: '#fff', borderRadius: 'var(--pt-radius-pill)' }}>
                  -{discountPct}%
                </span>
              )}
              {/* AI-enhanced badge */}
              {page.ai_images?.length > 0 && (
                <span className="absolute bottom-3 left-3 text-xs font-semibold px-2.5 py-1" style={{ background: 'rgba(0,0,0,.55)', color: '#fff', borderRadius: 'var(--pt-radius-pill)', backdropFilter: 'blur(4px)' }}>
                  ✨ AI Enhanced
                </span>
              )}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── URGENCY BAR ───────────────────────────────────────── */}
      {content.urgency?.text && (
        <FadeUp>
          <div className="max-w-5xl mx-auto px-4 -mt-5 relative z-10">
            <div
              className="flex items-center gap-3 px-4 py-3 text-sm font-bold"
              style={{ background: 'var(--pt-accent)', color: 'var(--pt-btn-primary-text)', borderRadius: 'var(--pt-radius-md)', boxShadow: 'var(--pt-shadow-md)' }}
            >
              {isTimeUrgency && countdown
                ? <Clock size={18} className="shrink-0" />
                : <Flame size={18} className="shrink-0" />}
              <span className="flex-1">{content.urgency.text}</span>
              {isTimeUrgency && countdown && (
                <span className="font-mono text-base tabular-nums shrink-0" dir="ltr">
                  {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}:{String(countdown.s).padStart(2, '0')}
                </span>
              )}
            </div>
          </div>
        </FadeUp>
      )}

      {/* ── PRODUCT STORY ─────────────────────────────────────── */}
      {content.product_story && (content.product_story.hook || content.product_story.body) && (
        <section className="max-w-3xl mx-auto px-4 py-12">
          <FadeUp>
            <div
              className="p-6 md:p-8"
              style={{ background: 'var(--pt-surface-soft)', borderRadius: 'var(--pt-radius-xl)', borderRight: '4px solid var(--pt-accent)' }}
            >
              {content.product_story.hook && (
                <p className="text-lg md:text-xl font-black mb-3 leading-snug" style={{ color: 'var(--pt-text)' }}>
                  &ldquo;{content.product_story.hook}&rdquo;
                </p>
              )}
              {content.product_story.body && (
                <p className="text-base leading-relaxed mb-3" style={{ color: 'var(--pt-text-soft)' }}>
                  {content.product_story.body}
                </p>
              )}
              {content.product_story.payoff && (
                <p className="text-base font-semibold" style={{ color: 'var(--pt-accent)' }}>
                  ✅ {content.product_story.payoff}
                </p>
              )}
            </div>
          </FadeUp>
        </section>
      )}

      {/* ── BENEFITS ──────────────────────────────────────────── */}
      {content.benefits && content.benefits.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-14">
          <FadeUp>
            <h2 className="pt-heading text-xl md:text-2xl font-black text-center mb-8" style={{ color: 'var(--pt-text)' }}>
              ✨ ليش تختار هذا المنتج؟
            </h2>
          </FadeUp>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.benefits.map((b, i) => (
              <StaggerItem key={i}>
                <div
                  className="h-full p-5 flex flex-col gap-2 transition hover:-translate-y-0.5"
                  style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}
                >
                  <div className="text-3xl">{b.icon ?? '✅'}</div>
                  <h3 className="font-black" style={{ color: 'var(--pt-text)' }}>{b.title}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--pt-text-soft)' }}>{b.text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}

      {/* ── GALLERY (zoomable) ────────────────────────────────── */}
      {galleryImages.length > 1 && <GallerySection images={galleryImages} />}

      {/* ── PRODUCT DETAILS ───────────────────────────────────── */}
      {content.product_details && (content.product_details.intro || (content.product_details.specs?.length ?? 0) > 0) && (
        <section className="max-w-4xl mx-auto px-4 pb-14">
          <FadeUp>
            <h2 className="pt-heading text-xl md:text-2xl font-black text-center mb-6" style={{ color: 'var(--pt-text)' }}>
              📋 تفاصيل المنتج
            </h2>
            <div className="grid md:grid-cols-2 gap-5">
              {/* Intro */}
              {content.product_details.intro && (
                <div className="p-5" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}>
                  <p className="leading-relaxed" style={{ color: 'var(--pt-text)' }}>{content.product_details.intro}</p>
                </div>
              )}

              {/* Specs */}
              {content.product_details.specs && content.product_details.specs.length > 0 && (
                <div className="p-5" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}>
                  <h4 className="font-black mb-3 text-sm" style={{ color: 'var(--pt-text)' }}>المواصفات</h4>
                  <ul className="space-y-2">
                    {content.product_details.specs.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--pt-text-soft)' }}>
                        <CheckCircle2 size={15} style={{ color: 'var(--pt-success, #16a34a)', marginTop: 1, flexShrink: 0 }} />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Use cases */}
              {content.product_details.use_cases && content.product_details.use_cases.length > 0 && (
                <div className="p-5 md:col-span-2" style={{ background: 'var(--pt-surface-soft)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}>
                  <h4 className="font-black mb-3 text-sm" style={{ color: 'var(--pt-text)' }}>متى تستعمله؟</h4>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {content.product_details.use_cases.map((uc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--pt-text-soft)' }}>
                        <span style={{ color: 'var(--pt-accent)' }}>→</span>
                        {uc}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </FadeUp>
        </section>
      )}

      {/* ── VARIANTS ──────────────────────────────────────────── */}
      <VariantsSection product={product} />

      {/* ── HOW TO ORDER ──────────────────────────────────────── */}
      <HowToOrderSection steps={content.how_to_order} />

      {/* ── SOCIAL PROOF ──────────────────────────────────────── */}
      {content.social_proof && content.social_proof.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-14">
          <FadeUp>
            <h2 className="pt-heading text-xl md:text-2xl font-black text-center mb-2" style={{ color: 'var(--pt-text)' }}>
              ⭐ ماذا قال عملاؤنا؟
            </h2>
            <p className="text-center text-sm mb-8" style={{ color: 'var(--pt-text-muted)' }}>
              تقييمات حقيقية من مشترين جزائريين
            </p>
          </FadeUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.social_proof.map((r, i) => (
              <StaggerItem key={i}>
                <div
                  className="p-5 flex flex-col h-full"
                  style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-xl)' }}
                >
                  {/* Rating */}
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(5)].map((_, j) => (
                      <Star
                        key={j}
                        size={14}
                        fill={j < (r.rating ?? 5) ? '#f59e0b' : 'transparent'}
                        style={{ color: '#f59e0b' }}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: 'var(--pt-text-soft)' }}>
                    &ldquo;{r.quote}&rdquo;
                  </p>

                  {/* Reviewer */}
                  <div className="flex items-center gap-3 pt-3" style={{ borderTop: '1px solid var(--pt-border)' }}>
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0"
                      style={{ background: 'var(--pt-accent-soft)', color: 'var(--pt-accent)' }}
                    >
                      {r.name?.[0] ?? 'ع'}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--pt-text)' }}>{r.name}</p>
                      {r.wilaya && <p className="text-xs" style={{ color: 'var(--pt-text-muted)' }}>📍 {r.wilaya}</p>}
                    </div>
                    <span className="mr-auto text-xs font-semibold px-2 py-0.5" style={{ background: '#dcfce7', color: '#15803d', borderRadius: 'var(--pt-radius-pill)' }}>
                      ✓ موثوق
                    </span>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}

      {/* ── GUARANTEE BLOCK ───────────────────────────────────── */}
      {content.guarantee && (
        <section className="max-w-3xl mx-auto px-4 pb-12">
          <FadeUp>
            <div
              className="p-6 flex gap-4 items-start"
              style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 'var(--pt-radius-xl)' }}
            >
              <ShieldCheck size={32} style={{ color: '#16a34a', flexShrink: 0, marginTop: 2 }} />
              <div>
                <h3 className="font-black text-base mb-1" style={{ color: '#15803d' }}>ضمان الرضا التام</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#166534' }}>{content.guarantee}</p>
              </div>
            </div>
          </FadeUp>
        </section>
      )}

      {/* ── ORDER FORM ────────────────────────────────────────── */}
      <section id="ai-landing-order" className="max-w-2xl mx-auto px-4 pb-14 scroll-mt-20">
        <FadeUp>
          <div className="text-center mb-6">
            <h2 className="pt-heading text-xl md:text-2xl font-black" style={{ color: 'var(--pt-text)' }}>
              {content.final_cta?.headline ?? '🛒 اطلب الآن قبل نفاد الكمية'}
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--pt-text-soft)' }}>
              الدفع عند الاستلام · توصيل لكل ولايات الجزائر · مجاني في بعض الولايات
            </p>
          </div>
          <ProductOrderForm product={product} store={store} wilayas={wilayas} />
        </FadeUp>
      </section>

      {/* ── TRUST STRIP ───────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <ShieldCheck size={20} />, label: 'دفع آمن عند الاستلام' },
            { icon: <Truck size={20} />,       label: 'توصيل لـ58 ولاية' },
            { icon: <RefreshCw size={20} />,   label: 'ضمان الاسترجاع 7 أيام' },
            { icon: <Package size={20} />,     label: 'تغليف محكم وآمن' },
          ].map((t, i) => (
            <StaggerItem key={i}>
              <div
                className="flex flex-col items-center text-center gap-2 p-4"
                style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}
              >
                <span style={{ color: 'var(--pt-accent)' }}>{t.icon}</span>
                <span className="text-xs font-semibold" style={{ color: 'var(--pt-text-soft)' }}>{t.label}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      {content.faq && content.faq.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 pb-16">
          <FadeUp>
            <h2 className="pt-heading text-xl md:text-2xl font-black text-center mb-6" style={{ color: 'var(--pt-text)' }}>
              ❓ أسئلة شائعة
            </h2>
          </FadeUp>
          <div className="space-y-3">
            {content.faq.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
          </div>
        </section>
      )}

      {/* ── FINAL CTA ─────────────────────────────────────────── */}
      <section className="px-4 pb-24">
        <FadeUp>
          <div
            className="max-w-2xl mx-auto text-center p-8 md:p-10"
            style={{ background: 'var(--pt-accent)', borderRadius: 'var(--pt-radius-xl)' }}
          >
            <div className="text-3xl mb-3">🎉</div>
            <h2 className="text-xl md:text-2xl font-black mb-2" style={{ color: 'var(--pt-btn-primary-text)' }}>
              {content.final_cta?.headline ?? `لا تفوّت ${product.name_ar ?? product.name}`}
            </h2>
            <p className="text-sm mb-5 opacity-90" style={{ color: 'var(--pt-btn-primary-text)' }}>
              الدفع عند الاستلام · توصيل سريع · ضمان الرضا
            </p>
            <button
              onClick={scrollToOrder}
              className="font-black px-8 py-4 text-base transition active:scale-[0.97]"
              style={{ background: 'var(--pt-btn-primary-text)', color: 'var(--pt-accent)', borderRadius: 'var(--pt-btn-radius)', boxShadow: '0 4px 14px rgba(0,0,0,.2)' }}
            >
              {content.final_cta?.cta_text ?? ctaText}
            </button>
          </div>
        </FadeUp>
      </section>

      {/* ── STICKY MOBILE BAR ─────────────────────────────────── */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 transition-transform duration-300"
        style={{
          background: 'var(--pt-surface)',
          borderTop: '1px solid var(--pt-border)',
          boxShadow: '0 -4px 20px rgba(0,0,0,.12)',
          transform: showStickyBar ? 'translateY(0)' : 'translateY(100%)',
          padding: '10px 12px',
          paddingBottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
        }}
      >
        <div className="flex items-center gap-3">
          {heroImage && (
            <img
              src={heroImage}
              alt=""
              className="w-11 h-11 object-cover rounded-lg shrink-0"
              style={{ border: '1px solid var(--pt-border)' }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate font-medium" style={{ color: 'var(--pt-text-muted)' }}>
              {product.name_ar ?? product.name}
            </p>
            <p className="font-black text-sm" style={{ color: 'var(--pt-accent)' }}>
              {formatDZD(product.price)}
            </p>
          </div>
          <button
            onClick={scrollToOrder}
            className="font-black px-5 py-2.5 text-sm shrink-0 transition active:scale-[0.97]"
            style={{ background: 'var(--pt-btn-primary-bg)', color: 'var(--pt-btn-primary-text)', borderRadius: 'var(--pt-btn-radius)', boxShadow: 'var(--pt-shadow-md)' }}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  )
}
