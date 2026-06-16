'use client'
import Link from 'next/link'
import { ShoppingBag, ArrowLeft } from 'lucide-react'
import type { Store } from '@/types'

interface HeroSettings { headline?: string; subheadline?: string; cta_label?: string; image_url?: string }

export default function HeroSection({ store, settings }: { store: Store & { store_settings?: any }; settings?: HeroSettings }) {
  const storeUrl = `/store/${store.slug}`
  const headline = settings?.headline?.trim()
  const subheadline = settings?.subheadline?.trim() || (store as any).description_ar || 'ادفع عند الاستلام · فتح قبل الدفع · توصيل لكل الجزائر'
  const cta = settings?.cta_label?.trim() || 'تسوق الآن'
  const img = settings?.image_url?.trim()

  // Theme-aware hero: a dark overlay over the merchant image, or over the
  // theme accent when no image is set — white text reads on every theme.
  const bg = img
    ? `linear-gradient(135deg, rgba(0,0,0,0.78), rgba(0,0,0,0.5)), url(${img}) center/cover`
    : `linear-gradient(135deg, rgba(0,0,0,0.82), rgba(0,0,0,0.5)), var(--pt-accent, #0D6EFD)`

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden" style={{ background: bg }}>
      {/* Grid overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center page-enter" dir="rtl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-8 text-white"
          style={{ background: 'var(--pt-accent-soft,rgba(255,255,255,0.15))', border: '1px solid rgba(255,255,255,0.25)' }}>
          <span className="w-2 h-2 rounded-full dot-blink" style={{ background: 'var(--pt-accent,#fff)' }} />
          {store.name_ar ?? store.name}
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'var(--pt-font-heading)' }}>
          {headline ? headline : <>تسوق الآن<span className="block gradient-text-gold mt-1">بكل ثقة</span></>}
        </h1>

        <p className="text-white/75 text-xl md:text-2xl font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
          {subheadline}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link
            href={`${storeUrl}/products`}
            className="flex items-center gap-3 font-black px-8 py-4 text-lg transition-all hover:-translate-y-1 hover:scale-[1.03] active:scale-95"
            style={{ background: 'var(--pt-btn-primary-bg,#0D6EFD)', color: 'var(--pt-btn-primary-text,#fff)', borderRadius: 'var(--pt-btn-radius,16px)', boxShadow: 'var(--pt-shadow-lg)' }}
          >
            <ShoppingBag className="w-6 h-6" />
            {cta}
          </Link>
          <Link
            href={`${storeUrl}/products`}
            className="flex items-center gap-2 glass text-white font-semibold px-8 py-4 rounded-2xl text-base transition-all hover:bg-white/15 active:scale-95"
          >
            عرض المنتجات
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Trust badges */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {[
            { icon: '💳', text: 'الدفع عند الاستلام' },
            { icon: '📦', text: 'فتح قبل الدفع' },
            { icon: '🚚', text: 'توصيل لكل الجزائر' },
            { icon: '↩️', text: 'ضمان الاسترجاع' },
          ].map(badge => (
            <div key={badge.text} className="flex items-center gap-2 glass px-4 py-2.5 rounded-full text-white text-sm font-semibold">
              <span className="text-base">{badge.icon}</span>
              {badge.text}
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center pt-2">
          <div className="w-1.5 h-1.5 bg-white/60 rounded-full float-anim" />
        </div>
      </div>
    </section>
  )
}
