'use client'
import { useState } from 'react'
import { formatDZD } from '@/lib/utils/format'
import ProductOrderForm from './ProductOrderForm'
import { Star, Shield, Truck, Package, ChevronLeft, ChevronRight, ZoomIn, X } from 'lucide-react'
import Link from 'next/link'

interface Props {
  product: any; store: any; wilayas: any[]
  totalStock: number; reviewCount: number; avgRating: string | null
}

export default function ProductPageClient({ product, store, wilayas, totalStock, reviewCount, avgRating }: Props) {
  const [activeImg, setActiveImg] = useState(0)
  const [lightbox,  setLightbox]  = useState(false)

  const images   = (product.images as any[]) ?? []
  const hasDisc  = product.compare_price && product.compare_price > product.price
  const discPct  = hasDisc ? Math.round(((product.compare_price - product.price) / product.compare_price) * 100) : 0
  const storePhone = (store as any).whatsapp ?? store.phone

  const waText = `السلام عليكم، أريد طلب: ${product.name_ar ?? product.name} — ${formatDZD(product.price)}`
  const waUrl  = storePhone
    ? `https://wa.me/${storePhone.replace(/\D/g,'').replace(/^0/,'213')}?text=${encodeURIComponent(waText)}`
    : null

  const prev = () => setActiveImg(i => (i - 1 + images.length) % images.length)
  const next = () => setActiveImg(i => (i + 1) % images.length)

  return (
    <>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Gallery */}
          <div className="space-y-3">
            <div className="relative group aspect-square bg-white rounded-3xl overflow-hidden shadow-card">
              {images[activeImg]?.url ? (
                <img
                  key={activeImg}
                  src={images[activeImg].url}
                  alt={product.name_ar ?? product.name}
                  className="w-full h-full object-cover transition-opacity duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-7xl text-gray-100 bg-gray-50">
                  {(product.name_ar ?? product.name)[0]}
                </div>
              )}

              {images.length > 1 && (
                <>
                  <button onClick={prev} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-[#0D6EFD]" />
                  </button>
                  <button onClick={next} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronLeft className="w-5 h-5 text-[#0D6EFD]" />
                  </button>
                </>
              )}

              <button onClick={() => setLightbox(true)}
                className="absolute top-3 left-3 w-9 h-9 bg-white/90 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md">
                <ZoomIn className="w-4 h-4 text-gray-600" />
              </button>

              {hasDisc && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-sm font-black px-3 py-1.5 rounded-xl shadow-md">
                  -{discPct}%
                </span>
              )}
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {images.map((img: any, i: number) => (
                  <button key={i} onClick={() => setActiveImg(i)}
                    className={`w-16 h-16 flex-shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                      i === activeImg ? 'border-primary shadow-green' : 'border-transparent hover:border-gray-200'
                    }`}>
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-5" dir="rtl">
            {/* Stock badge */}
            {totalStock <= 0 ? (
              <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-100 text-xs font-bold px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />نفد المخزون
              </span>
            ) : totalStock <= 5 ? (
              <span className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 border border-orange-100 text-xs font-bold px-3 py-1.5 rounded-full dot-blink">
                <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                آخر {totalStock} قطع فقط!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 border border-green-100 text-xs font-bold px-3 py-1.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />متوفر
              </span>
            )}

            <h1 className="text-3xl md:text-4xl font-black text-[#111827] leading-tight">
              {product.name_ar ?? product.name}
            </h1>

            {avgRating && (
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className={`text-base ${i < Math.round(parseFloat(avgRating)) ? 'text-accent' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                <span className="text-sm font-bold text-[#111827]">{avgRating}</span>
                <span className="text-sm text-gray-500">({reviewCount} تقييم)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-end gap-4">
              <span className="text-4xl font-black text-accent">{formatDZD(product.price)}</span>
              {hasDisc && (
                <>
                  <span className="text-xl text-gray-400 line-through">{formatDZD(product.compare_price)}</span>
                  <span className="bg-red-500 text-white text-sm font-black px-2.5 py-1 rounded-xl">
                    وفر {formatDZD(product.compare_price - product.price)}
                  </span>
                </>
              )}
            </div>

            {product.description_ar && (
              <p className="text-gray-600 text-base leading-relaxed border-t border-gray-100 pt-4">
                {product.description_ar}
              </p>
            )}

            {/* Mini trust */}
            <div className="grid grid-cols-3 gap-3 py-3 border-y border-gray-100">
              {[
                { icon: <Truck className="w-4 h-4" />, text: 'توصيل لكل الجزائر' },
                { icon: <Package className="w-4 h-4" />, text: 'فتح قبل الدفع' },
                { icon: <Shield className="w-4 h-4" />, text: 'ضمان الجودة' },
              ].map(b => (
                <div key={b.text} className="flex flex-col items-center gap-1.5 text-center">
                  <div className="w-8 h-8 bg-primary/10 text-primary rounded-xl flex items-center justify-center">{b.icon}</div>
                  <p className="text-xs text-gray-600 font-medium leading-tight">{b.text}</p>
                </div>
              ))}
            </div>

            {waUrl && (
              <a href={waUrl} target="_blank" rel="noopener noreferrer"
                className="hidden md:flex items-center justify-center gap-2.5 w-full py-3.5 bg-[#25D366] hover:bg-[#20BD5C] text-white font-black rounded-2xl text-base transition-colors shadow-md active:scale-95">
                <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                اطلب عبر واتساب
              </a>
            )}

            <ProductOrderForm product={product} store={store} wilayas={wilayas} />
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
            alt={product.name_ar ?? product.name}
            className="max-w-full max-h-full object-contain rounded-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Mobile sticky bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white/95 backdrop-blur-sm border-t border-gray-100 p-3 flex gap-3 md:hidden z-40 shadow-float" dir="rtl">
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#25D366] text-white font-bold rounded-2xl text-sm">
            📱 واتساب
          </a>
        )}
        <Link
          href={`/store/${store.slug}/checkout?product_id=${product.id}`}
          className="flex-1 flex items-center justify-center py-3 font-black text-white rounded-2xl text-sm"
          style={{ background: 'linear-gradient(135deg,#0D6EFD,#0B5ED7)' }}
        >
          🛒 اطلب — {formatDZD(product.price)}
        </Link>
      </div>
    </>
  )
}
