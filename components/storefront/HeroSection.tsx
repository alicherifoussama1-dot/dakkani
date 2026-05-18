'use client'
import Link from 'next/link'
import { ShoppingBag, ArrowLeft } from 'lucide-react'
import type { Store } from '@/types'

export default function HeroSection({ store }: { store: Store & { store_settings?: any } }) {
  const storeUrl = `/store/${store.slug}`

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-gradient-hero">
      {/* Ambient blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 rounded-full bg-accent/15 blur-3xl float-anim" />
        <div className="absolute bottom-20 left-20 w-96 h-96 rounded-full bg-white/5 blur-3xl"
          style={{ animation: 'float-y 6s ease-in-out 2s infinite' }} />
      </div>
      {/* Grid overlay */}
      <div className="absolute inset-0" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)',
        backgroundSize: '48px 48px',
      }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 text-center page-enter" dir="rtl">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 text-yellow-200 px-4 py-2 rounded-full text-sm font-bold mb-8">
          <span className="w-2 h-2 bg-accent rounded-full dot-blink" />
          {store.name_ar ?? store.name}
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-4">
          تسوق الآن
          <span className="block gradient-text-gold mt-1">بكل ثقة</span>
        </h1>

        <p className="text-white/70 text-xl md:text-2xl font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
          {(store as any).description_ar ?? 'ادفع عند الاستلام · فتح قبل الدفع · توصيل لكل الجزائر'}
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <Link
            href={`${storeUrl}/products`}
            className="flex items-center gap-3 bg-accent hover:bg-accent-dark text-white font-black px-8 py-4 rounded-2xl text-lg shadow-amber transition-all hover:-translate-y-1 hover:scale-[1.03] active:scale-95"
          >
            <ShoppingBag className="w-6 h-6" />
            تسوق الآن
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
