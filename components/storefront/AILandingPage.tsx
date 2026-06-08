'use client'
// ============================================================
// AI-generated landing page renderer
// Takes the structured Gemini JSON (ai_content) + AI Photo Studio
// images (ai_images) stored on a landing_pages row and renders a
// polished, animated, mobile-first RTL page using the existing
// product-page theme system + the proven order-form/checkout flow.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Star, ShieldCheck, Truck, RefreshCw, Clock, ChevronDown, Flame } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'
import { getProductTheme, themeToCSSVars } from '@/lib/product-themes'
import ProductOrderForm from './ProductOrderForm'
import { FadeUp, StaggerContainer, StaggerItem } from '@/components/ui/animations'
import '@/components/discover/product/product-theme.css'

interface AIContent {
  category_detected?: string
  framework_used?: string
  hero?: {
    headline: string; subheadline?: string; cta_text?: string
    variations?: { headline: string; cta_text?: string }[]
  }
  benefits?: { icon?: string; title: string; text: string }[]
  product_details?: { intro?: string; specs?: string[]; use_cases?: string[] }
  social_proof?: { name: string; wilaya?: string; rating?: number; quote: string }[]
  trust_badges?: string[]
  urgency?: { type?: string; text?: string }
  faq?: { q: string; a: string }[]
  final_cta?: { headline?: string; cta_text?: string }
}

interface Props {
  page: { id: string; ai_content: AIContent | null; ai_images: { url: string; key?: string; label_ar?: string }[]; theme_key: string; hero_variant: number }
  product: any
  store: any
  wilayas: any[]
}

// 6-hour rolling countdown — gives every visitor a "fresh" urgency window
// without needing a real scheduled-offer system behind it.
function useRollingCountdown(hours = 6) {
  const [msLeft, setMsLeft] = useState<number | null>(null)
  useEffect(() => {
    const windowMs = hours * 3600 * 1000
    const tick = () => {
      const now = Date.now()
      setMsLeft(windowMs - (now % windowMs))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [hours])
  if (msLeft === null) return null
  const h = Math.floor(msLeft / 3_600_000)
  const m = Math.floor((msLeft % 3_600_000) / 60_000)
  const s = Math.floor((msLeft % 60_000) / 1000)
  return { h, m, s }
}

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="pt-card" style={{ borderRadius: 'var(--pt-radius-lg)', overflow: 'hidden' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 p-4 text-right"
      >
        <span className="font-bold pt-text" style={{ color: 'var(--pt-text)' }}>{q}</span>
        <ChevronDown size={18} style={{ color: 'var(--pt-accent)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0 }} />
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--pt-text-soft)' }}>{a}</div>
      )}
    </div>
  )
}

export default function AILandingPage({ page, product, store, wilayas }: Props) {
  const theme = getProductTheme(page.theme_key)
  const cssVars = themeToCSSVars(theme)
  const content = page.ai_content ?? {}

  const hero = content.hero
  const heroVariant = page.hero_variant > 0 ? content.hero?.variations?.[page.hero_variant - 1] : undefined
  const headline = heroVariant?.headline ?? hero?.headline ?? (product.name_ar ?? product.name)
  const subheadline = hero?.subheadline
  const ctaText = heroVariant?.cta_text ?? hero?.cta_text ?? '🛒 اطلب الآن'

  const heroImage = page.ai_images?.[0]?.url ?? (product.images as any[])?.[0]?.url
  const galleryImages = (page.ai_images?.length ? page.ai_images.map(i => i.url) : (product.images as any[])?.map((i: any) => i.url)) ?? []

  const hasDiscount = product.compare_price && product.compare_price > product.price
  const discountPct = hasDiscount ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0

  const isTimeUrgency = content.urgency?.type === 'time'
  const countdown = useRollingCountdown(6)

  const [showStickyBar, setShowStickyBar] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 480)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToOrder = () => document.getElementById('ai-landing-order')?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <div data-pt-root style={{ ...cssVars, background: 'var(--pt-bg)', minHeight: '100vh' }} dir="rtl">
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'var(--pt-surface-soft)' }}>
        <div className="max-w-5xl mx-auto px-4 pt-8 pb-10 md:pt-14 md:pb-16 grid md:grid-cols-2 gap-8 items-center">
          <FadeUp className="order-2 md:order-1 text-center md:text-right">
            {content.category_detected && (
              <span className="pt-badge inline-block mb-3 text-xs font-bold px-3 py-1" style={{ background: 'var(--pt-accent-soft)', color: 'var(--pt-accent)', borderRadius: 'var(--pt-radius-pill)' }}>
                {content.category_detected}
              </span>
            )}
            <h1 className="pt-heading font-black leading-snug" style={{ fontSize: 'clamp(1.5rem, 4.2vw, 2.5rem)', color: 'var(--pt-text)' }}>
              {headline}
            </h1>
            {subheadline && (
              <p className="mt-3 text-base md:text-lg" style={{ color: 'var(--pt-text-soft)' }}>{subheadline}</p>
            )}

            <div className="mt-5 flex items-center justify-center md:justify-start gap-3 flex-wrap">
              <span className="text-2xl md:text-3xl font-black" style={{ color: 'var(--pt-accent)' }}>{formatDZD(product.price)}</span>
              {hasDiscount && (
                <>
                  <span className="text-base line-through" style={{ color: 'var(--pt-text-muted)' }}>{formatDZD(product.compare_price)}</span>
                  <span className="pt-badge-danger text-xs font-bold px-2.5 py-1" style={{ borderRadius: 'var(--pt-radius-pill)' }}>خصم {discountPct}%</span>
                </>
              )}
            </div>

            <button
              onClick={scrollToOrder}
              className="mt-6 w-full md:w-auto font-black px-8 py-4 text-base transition active:scale-[0.98]"
              style={{ background: 'var(--pt-btn-primary-bg)', color: 'var(--pt-btn-primary-text)', borderRadius: 'var(--pt-btn-radius)', boxShadow: 'var(--pt-shadow-md)' }}
            >
              {ctaText}
            </button>

            {content.trust_badges && content.trust_badges.length > 0 && (
              <StaggerContainer className="mt-5 flex flex-wrap gap-2 justify-center md:justify-start">
                {content.trust_badges.slice(0, 4).map((b, i) => (
                  <StaggerItem key={i}>
                    <span className="text-xs font-semibold px-3 py-1.5 inline-block" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-pill)', color: 'var(--pt-text-soft)' }}>
                      {b}
                    </span>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </FadeUp>

          <FadeUp delay={0.1} className="order-1 md:order-2">
            <div className="relative aspect-square rounded-3xl overflow-hidden" style={{ background: 'var(--pt-surface)', boxShadow: 'var(--pt-shadow-lg)', borderRadius: 'var(--pt-radius-lg)' }}>
              {heroImage ? (
                <img src={heroImage} alt={product.name_ar ?? product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: 'var(--pt-text-muted)' }}>
                  {(product.name_ar ?? product.name)?.[0]}
                </div>
              )}
              {hasDiscount && (
                <span className="absolute top-4 right-4 pt-badge-danger text-sm font-black px-3 py-1.5" style={{ borderRadius: 'var(--pt-radius-pill)' }}>
                  -{discountPct}%
                </span>
              )}
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── URGENCY BAR ──────────────────────────────────── */}
      {content.urgency?.text && (
        <FadeUp>
          <div className="max-w-5xl mx-auto px-4 -mt-5 relative z-10">
            <div className="flex items-center gap-3 px-4 py-3 text-sm font-bold" style={{ background: 'var(--pt-accent)', color: 'var(--pt-btn-primary-text)', borderRadius: 'var(--pt-radius-md)', boxShadow: 'var(--pt-shadow-md)' }}>
              {isTimeUrgency && countdown ? <Clock size={18} className="shrink-0" /> : <Flame size={18} className="shrink-0" />}
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

      {/* ── BENEFITS ─────────────────────────────────────── */}
      {content.benefits && content.benefits.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 py-12">
          <FadeUp><h2 className="pt-heading text-2xl md:text-3xl font-black text-center mb-8" style={{ color: 'var(--pt-text)' }}>ليش تختار هذا المنتج؟</h2></FadeUp>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {content.benefits.map((b, i) => (
              <StaggerItem key={i}>
                <div className="pt-card h-full p-5" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}>
                  <div className="text-3xl mb-2">{b.icon ?? '✅'}</div>
                  <h3 className="font-bold mb-1" style={{ color: 'var(--pt-text)' }}>{b.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--pt-text-soft)' }}>{b.text}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}

      {/* ── GALLERY (AI-enhanced images) ─────────────────── */}
      {galleryImages.length > 1 && (
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <FadeUp>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {galleryImages.slice(0, 4).map((url: string, i: number) => (
                <div key={i} className="aspect-square overflow-hidden" style={{ borderRadius: 'var(--pt-radius-md)', background: 'var(--pt-surface-soft)' }}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </FadeUp>
        </section>
      )}

      {/* ── PRODUCT DETAILS ──────────────────────────────── */}
      {content.product_details && (content.product_details.intro || content.product_details.specs?.length) && (
        <section className="max-w-3xl mx-auto px-4 pb-12">
          <FadeUp>
            <div className="pt-card p-6" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}>
              {content.product_details.intro && (
                <p className="leading-relaxed mb-4" style={{ color: 'var(--pt-text)' }}>{content.product_details.intro}</p>
              )}
              {content.product_details.specs && content.product_details.specs.length > 0 && (
                <ul className="space-y-2">
                  {content.product_details.specs.map((s, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--pt-text-soft)' }}>
                      <span style={{ color: 'var(--pt-success)' }}>✓</span>{s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FadeUp>
        </section>
      )}

      {/* ── SOCIAL PROOF ─────────────────────────────────── */}
      {content.social_proof && content.social_proof.length > 0 && (
        <section className="max-w-5xl mx-auto px-4 pb-12">
          <FadeUp><h2 className="pt-heading text-2xl md:text-3xl font-black text-center mb-8" style={{ color: 'var(--pt-text)' }}>ماذا قال عملاؤنا؟</h2></FadeUp>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {content.social_proof.map((r, i) => (
              <StaggerItem key={i}>
                <div className="pt-card p-5" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black" style={{ background: 'var(--pt-accent-soft)', color: 'var(--pt-accent)' }}>
                      {r.name?.[0] ?? 'ع'}
                    </div>
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--pt-text)' }}>{r.name}{r.wilaya ? ` — ${r.wilaya}` : ''}</p>
                      <div className="flex gap-0.5">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} size={12} fill={j < (r.rating ?? 5) ? 'var(--pt-star)' : 'transparent'} style={{ color: 'var(--pt-star)' }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--pt-text-soft)' }}>{r.quote}</p>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}

      {/* ── ORDER FORM ───────────────────────────────────── */}
      <section id="ai-landing-order" className="max-w-2xl mx-auto px-4 pb-12 scroll-mt-20">
        <FadeUp>
          <h2 className="pt-heading text-2xl font-black text-center mb-2" style={{ color: 'var(--pt-text)' }}>
            {content.final_cta?.headline ?? 'اطلب الآن قبل نفاد الكمية'}
          </h2>
          <p className="text-center text-sm mb-6" style={{ color: 'var(--pt-text-soft)' }}>
            الدفع عند الاستلام · توصيل لكل ولايات الجزائر
          </p>
          <ProductOrderForm product={product} store={store} wilayas={wilayas} />
        </FadeUp>
      </section>

      {/* ── TRUST STRIP ──────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 pb-12">
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: ShieldCheck, label: 'دفع آمن عند الاستلام' },
            { icon: Truck,       label: 'توصيل لـ58 ولاية' },
            { icon: RefreshCw,   label: 'ضمان الاسترجاع' },
            { icon: Star,        label: 'جودة موثوقة' },
          ].map((t, i) => (
            <StaggerItem key={i}>
              <div className="flex flex-col items-center text-center gap-2 p-4" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}>
                <t.icon size={22} style={{ color: 'var(--pt-accent)' }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--pt-text-soft)' }}>{t.label}</span>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      {/* ── FAQ ──────────────────────────────────────────── */}
      {content.faq && content.faq.length > 0 && (
        <section className="max-w-2xl mx-auto px-4 pb-16">
          <FadeUp><h2 className="pt-heading text-2xl font-black text-center mb-6" style={{ color: 'var(--pt-text)' }}>أسئلة شائعة</h2></FadeUp>
          <div className="space-y-3">
            {content.faq.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} />)}
          </div>
        </section>
      )}

      {/* ── FINAL CTA ────────────────────────────────────── */}
      <section className="px-4 pb-20">
        <FadeUp>
          <div className="max-w-2xl mx-auto text-center p-8" style={{ background: 'var(--pt-accent)', borderRadius: 'var(--pt-radius-lg)' }}>
            <h2 className="text-xl md:text-2xl font-black mb-4" style={{ color: 'var(--pt-btn-primary-text)' }}>
              {content.final_cta?.headline ?? `لا تفوّت ${product.name_ar ?? product.name}`}
            </h2>
            <button
              onClick={scrollToOrder}
              className="font-black px-8 py-4 text-base transition active:scale-[0.98]"
              style={{ background: 'var(--pt-btn-primary-text)', color: 'var(--pt-accent)', borderRadius: 'var(--pt-btn-radius)' }}
            >
              {content.final_cta?.cta_text ?? ctaText}
            </button>
          </div>
        </FadeUp>
      </section>

      {/* ── STICKY MOBILE CTA ────────────────────────────── */}
      <div
        className="md:hidden fixed bottom-0 inset-x-0 z-40 p-3 transition-transform duration-300"
        style={{
          background: 'var(--pt-surface)', borderTop: '1px solid var(--pt-border)', boxShadow: 'var(--pt-shadow-lg)',
          transform: showStickyBar ? 'translateY(0)' : 'translateY(100%)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs truncate" style={{ color: 'var(--pt-text-muted)' }}>{product.name_ar ?? product.name}</p>
            <p className="font-black" style={{ color: 'var(--pt-accent)' }}>{formatDZD(product.price)}</p>
          </div>
          <button
            onClick={scrollToOrder}
            className="font-black px-6 py-3 text-sm shrink-0"
            style={{ background: 'var(--pt-btn-primary-bg)', color: 'var(--pt-btn-primary-text)', borderRadius: 'var(--pt-btn-radius)' }}
          >
            {ctaText}
          </button>
        </div>
      </div>
    </div>
  )
}
