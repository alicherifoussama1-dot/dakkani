'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Navbar          from '@/components/layout/Navbar'
import Footer          from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import WilayaSelector  from '@/components/ui/WilayaSelector'
import PriceTag        from '@/components/ui/PriceTag'
import { createClient } from '@/lib/supabase/client'
import { Star, Truck, ShieldCheck, RefreshCw, Minus, Plus, ShoppingCart, ChevronRight, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

export default function MarketplaceProductPage() {
  const { storeSlug, slug } = useParams<{ storeSlug: string; slug: string }>()
  const [product, setProduct] = useState<any>(null)
  const [store,   setStore]   = useState<any>(null)
  const [qty,     setQty]     = useState(1)
  const [wilaya,  setWilaya]  = useState<number | null>(null)
  const [activeImg, setActiveImg] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data: s } = await supabase.from('stores').select('*').eq('slug', storeSlug).single()
      if (!s) { setLoading(false); return }
      setStore(s)
      const { data: p } = await supabase.from('products').select('*').eq('store_id', s.id).eq('slug', slug).single()
      setProduct(p)
      setLoading(false)
    }
    load()
  }, [storeSlug, slug])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="w-8 h-8 border-2 border-[#E8431A] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!product || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFFFF' }} dir="rtl">
        <div className="text-center">
          <p className="text-4xl mb-3">😕</p>
          <p className="font-bold" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>المنتج غير موجود</p>
          <Link href="/discover" className="text-sm mt-3 block" style={{ color: '#E8431A' }}>العودة للمنتجات</Link>
        </div>
      </div>
    )
  }

  const images    = product.images ?? []
  const hasDisc   = product.compare_price && product.compare_price > product.price
  const storePhone = store.whatsapp ?? store.phone

  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-24" style={{ backgroundColor: '#FFFFFF' }} dir="rtl">
        {/* Breadcrumb */}
        <div className="pt-24 px-4 pb-3 border-b" style={{ borderColor: '#EBEBEB' }}>
          <div className="max-w-6xl mx-auto flex items-center gap-1.5 text-xs flex-wrap" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
            <Link href="/discover" style={{ color: '#999999' }}>اكتشف</Link>
            <ChevronRight size={11} />
            <span style={{ color: '#111111' }}>{product.name_ar ?? product.name}</span>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
            {/* Gallery */}
            <div className="space-y-3">
              <div
                className="aspect-square rounded-2xl flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: '#F3F3F3', fontSize: '80px' }}
              >
                {images[activeImg]?.url
                  ? <img src={images[activeImg].url} alt={product.name_ar ?? product.name} className="w-full h-full object-cover" />
                  : '📦'
                }
              </div>
              {images.length > 1 && (
                <div className="flex gap-2">
                  {images.map((img: any, i: number) => (
                    <button
                      key={i}
                      onClick={() => setActiveImg(i)}
                      className="w-16 h-16 rounded-xl overflow-hidden border-2 transition-all"
                      style={{ borderColor: i === activeImg ? '#E8431A' : 'transparent', backgroundColor: '#F3F3F3' }}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-5">
              <h1 className="font-black" style={{ fontSize: 'clamp(22px, 4vw, 30px)', color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                {product.name_ar ?? product.name}
              </h1>

              <div className="flex items-center gap-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14} style={{ color: '#E8431A', fill: '#E8431A' }} />
                ))}
                <span className="text-sm" style={{ color: '#999999' }}>({Math.floor(Math.random() * 100) + 20})</span>
              </div>

              <PriceTag price={product.price} originalPrice={product.compare_price} size="lg" />

              {product.description_ar && (
                <p className="text-sm leading-relaxed" style={{ color: '#444444', fontFamily: 'var(--font-tajawal)' }}>
                  {product.description_ar}
                </p>
              )}

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                  ولاية التوصيل
                </label>
                <WilayaSelector value={wilaya} onChange={w => setWilaya(w?.id ?? null)} />
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setQty(q => Math.max(1, q - 1))} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: '#EBEBEB', backgroundColor: '#F3F3F3' }}>
                  <Minus size={16} style={{ color: qty <= 1 ? '#CCCCCC' : '#111111' }} />
                </button>
                <span className="font-bold text-lg w-8 text-center" style={{ fontFamily: 'var(--font-inter)', color: '#111111' }}>{qty}</span>
                <button onClick={() => setQty(q => q + 1)} className="w-10 h-10 rounded-xl border flex items-center justify-center" style={{ borderColor: '#EBEBEB', backgroundColor: '#F3F3F3' }}>
                  <Plus size={16} style={{ color: '#111111' }} />
                </button>
              </div>

              {storePhone && (
                <a
                  href={`https://wa.me/${storePhone.replace(/\D/g,'').replace(/^0/,'213')}?text=${encodeURIComponent(`أريد طلب: ${product.name_ar ?? product.name} — ${product.price.toLocaleString('ar-DZ')} دج`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl font-bold text-white transition-all"
                  style={{ backgroundColor: '#25D366', fontFamily: 'var(--font-tajawal)' }}
                >
                  📱 اطلب عبر واتساب
                </a>
              )}

              <Link
                href={`/${store.slug}/checkout?product_id=${product.id}`}
                className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl font-black text-white transition-all"
                style={{ background: 'linear-gradient(135deg,#E8431A,#C73615)', fontFamily: 'var(--font-tajawal)' }}
              >
                <ShoppingCart size={18} />
                اطلب الآن — {(product.price * qty).toLocaleString('ar-DZ')} دج
              </Link>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { Icon: Truck,       text: 'توصيل لكل الجزائر' },
                  { Icon: ShieldCheck, text: 'دفع عند الاستلام' },
                  { Icon: RefreshCw,   text: 'إرجاع 7 أيام' },
                ].map(({ Icon, text }) => (
                  <div key={text} className="flex flex-col items-center text-center gap-1.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFF0ED' }}>
                      <Icon size={16} style={{ color: '#E8431A' }} />
                    </div>
                    <span className="text-xs" style={{ color: '#444444', fontFamily: 'var(--font-tajawal)' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile sticky */}
      <div className="fixed bottom-[60px] right-0 left-0 p-3 lg:hidden z-30" style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #EBEBEB' }}>
        <Link
          href={`/${store.slug}/checkout?product_id=${product.id}`}
          className="flex items-center justify-center gap-2 w-full h-12 rounded-2xl font-black text-white"
          style={{ background: 'linear-gradient(135deg,#E8431A,#C73615)', fontFamily: 'var(--font-tajawal)' }}
        >
          🛒 اطلب — {(product.price * qty).toLocaleString('ar-DZ')} دج
        </Link>
      </div>

      <Footer />
      <MobileBottomNav />
    </>
  )
}
