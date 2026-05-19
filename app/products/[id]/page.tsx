'use client'
import { useState } from 'react'
import Navbar          from '@/components/layout/Navbar'
import Footer          from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import WilayaSelector  from '@/components/ui/WilayaSelector'
import PriceTag        from '@/components/ui/PriceTag'
import Badge           from '@/components/ui/Badge'
import ProductCard     from '@/components/ui/ProductCard'
import { Star, Truck, ShieldCheck, RefreshCw, Minus, Plus, ShoppingCart, ChevronRight } from 'lucide-react'
import Link from 'next/link'

const PRODUCT = {
  name: 'قنادر تقليدية أنيقة',
  price: 3500,
  originalPrice: 4500,
  rating: 4.8,
  reviewCount: 124,
  badge: 'bestseller' as const,
  desc: 'قندورة تقليدية جزائرية مطرزة يدوياً بأجود الخيوط. مناسبة للمناسبات والأعراس. متوفرة بأحجام مختلفة.',
  emoji: '👗',
}

const RELATED = [
  { name: 'عباية مطرزة', price: 5500, rating: 4.9, reviewCount: 56, emoji: '🧕', slug: '2' },
  { name: 'شال فاخر', price: 1200, rating: 4.7, reviewCount: 34, emoji: '🧣', slug: '3' },
  { name: 'عطر نسائي', price: 2200, rating: 4.8, reviewCount: 91, emoji: '🌹', slug: '4' },
  { name: 'حقيبة جلد', price: 3800, rating: 4.6, reviewCount: 23, emoji: '👜', slug: '5' },
]

export default function ProductDetailPage() {
  const [qty,    setQty]    = useState(1)
  const [wilaya, setWilaya] = useState<number | null>(null)
  const [activeImg, setActiveImg] = useState(0)

  const IMAGES = ['👗', '🎀', '✨']

  return (
    <>
      <Navbar />
      <main
        className="min-h-screen"
        style={{ backgroundColor: '#FFFFFF', paddingBottom: '80px' }}
        dir="rtl"
      >
        {/* Breadcrumb */}
        <div
          className="pt-24 px-4 pb-3 border-b"
          style={{ borderColor: '#EBEBEB' }}
        >
          <div className="max-w-6xl mx-auto flex items-center gap-2 text-xs" style={{ color: '#999999' }}>
            <Link href="/" style={{ color: '#999999' }}>الرئيسية</Link>
            <ChevronRight size={12} />
            <Link href="/products" style={{ color: '#999999' }}>المنتجات</Link>
            <ChevronRight size={12} />
            <span style={{ color: '#111111' }}>{PRODUCT.name}</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Gallery */}
            <div>
              {/* Main image */}
              <div
                className="aspect-square rounded-2xl flex items-center justify-center mb-3 overflow-hidden"
                style={{ backgroundColor: '#F3F3F3', fontSize: '100px' }}
              >
                {IMAGES[activeImg]}
              </div>
              {/* Thumbs */}
              <div className="flex gap-2">
                {IMAGES.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl transition-all"
                    style={{
                      backgroundColor: '#F3F3F3',
                      border: i === activeImg ? '2px solid #E8431A' : '2px solid transparent',
                    }}
                  >
                    {img}
                  </button>
                ))}
              </div>
            </div>

            {/* Product info */}
            <div className="space-y-5">
              {/* Badge + name */}
              <div>
                <div className="mb-2">
                  <Badge variant={PRODUCT.badge} />
                </div>
                <h1
                  className="font-black mb-2"
                  style={{ fontSize: 'clamp(22px, 4vw, 30px)', color: '#111111', fontFamily: 'var(--font-tajawal)' }}
                >
                  {PRODUCT.name}
                </h1>
                {/* Rating */}
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={14} style={{ color: '#E8431A', fill: '#E8431A' }} />
                    ))}
                  </div>
                  <span className="text-sm" style={{ color: '#999999', fontFamily: 'var(--font-inter)' }}>
                    {PRODUCT.rating} ({PRODUCT.reviewCount} تقييم)
                  </span>
                </div>
              </div>

              {/* Price */}
              <PriceTag price={PRODUCT.price} originalPrice={PRODUCT.originalPrice} size="lg" />

              {/* Description */}
              <p style={{ color: '#444444', fontSize: '14px', fontFamily: 'var(--font-tajawal)', lineHeight: '1.8' }}>
                {PRODUCT.desc}
              </p>

              {/* Delivery wilaya */}
              <div>
                <label
                  className="block text-sm font-semibold mb-2"
                  style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
                >
                  اختر ولاية التوصيل
                </label>
                <WilayaSelector value={wilaya} onChange={w => setWilaya(w?.id ?? null)} />
                {wilaya && (
                  <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: '#10b981' }}>
                    <Truck size={12} />
                    يصلك خلال 24-72 ساعة
                  </p>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                  الكمية
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                    style={{ borderColor: '#EBEBEB', backgroundColor: '#F3F3F3' }}
                    disabled={qty <= 1}
                  >
                    <Minus size={16} style={{ color: qty <= 1 ? '#CCCCCC' : '#111111' }} />
                  </button>
                  <span className="font-bold text-lg w-8 text-center" style={{ fontFamily: 'var(--font-inter)', color: '#111111' }}>
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(q => q + 1)}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center transition-colors"
                    style={{ borderColor: '#EBEBEB', backgroundColor: '#F3F3F3' }}
                  >
                    <Plus size={16} style={{ color: '#111111' }} />
                  </button>
                  <span className="text-sm" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
                    المجموع: {(PRODUCT.price * qty).toLocaleString('ar-DZ')} دج
                  </span>
                </div>
              </div>

              {/* Add to cart — full width on mobile */}
              <button
                className="btn btn-accent w-full h-13 text-base rounded-xl flex items-center justify-center gap-2"
                style={{ fontFamily: 'var(--font-tajawal)', height: '52px' }}
              >
                <ShoppingCart size={18} />
                أضف للسلة ({qty})
              </button>

              {/* Trust indicators */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { Icon: Truck,       text: 'توصيل لكل الولايات' },
                  { Icon: ShieldCheck, text: 'دفع آمن ومضمون' },
                  { Icon: RefreshCw,   text: 'إرجاع مجاني 7 أيام' },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex flex-col items-center text-center gap-1.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: '#FFF0ED' }}
                    >
                      <Icon size={16} style={{ color: '#E8431A' }} />
                    </div>
                    <span className="text-xs" style={{ color: '#444444', fontFamily: 'var(--font-tajawal)', lineHeight: '1.4' }}>
                      {text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Related products */}
          <div className="mt-16">
            <h2
              className="font-black mb-6"
              style={{ fontSize: '22px', color: '#111111', fontFamily: 'var(--font-tajawal)' }}
            >
              منتجات مشابهة
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {RELATED.map(p => <ProductCard key={p.slug} {...p} />)}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky buy button */}
      <div
        className="fixed bottom-[60px] right-0 left-0 p-3 lg:hidden z-30"
        style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #EBEBEB' }}
      >
        <button
          className="btn btn-accent w-full h-12 text-sm rounded-xl flex items-center justify-center gap-2"
          style={{ fontFamily: 'var(--font-tajawal)' }}
        >
          <ShoppingCart size={16} />
          أضف للسلة — {(PRODUCT.price * qty).toLocaleString('ar-DZ')} دج
        </button>
      </div>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
