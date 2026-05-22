'use client'
import Link from 'next/link'
import { formatDZD } from '@/lib/utils/format'
import { Heart, ShoppingCart, Star } from 'lucide-react'

interface Product { id: string; name: string; name_ar?: string; slug: string; price: number; compare_price?: number; images: { url: string }[] }
interface Props { products: Product[]; storeSlug: string; title: string; subtitle?: string; dark?: boolean }

function ProductCard({ product, storeSlug }: { product: Product; storeSlug: string }) {
  const img     = product.images?.[0]?.url
  const hasDisc = product.compare_price && product.compare_price > product.price
  const discPct = hasDisc ? Math.round(((product.compare_price! - product.price) / product.compare_price!) * 100) : 0
  return (
    <Link href={`/store/${storeSlug}/product/${product.slug}`} className="group block">
      <div className="bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1.5">
        <div className="relative product-img aspect-[4/5] bg-[#F3F4F6]">
          {img
            ? <img src={img} alt={product.name_ar ?? product.name} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-5xl text-gray-200">{(product.name_ar ?? product.name)[0]}</div>
          }
          {hasDisc && (
            <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-black px-2.5 py-1.5 rounded-xl shadow-md">-{discPct}%</span>
          )}
          <button onClick={e => e.preventDefault()}
            className="absolute top-3 left-3 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-50">
            <Heart className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
          </button>
          <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out p-3">
            <button onClick={e => e.preventDefault()}
              className="w-full flex items-center justify-center gap-2 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-bold py-2.5 rounded-xl text-sm transition-colors shadow-green">
              <ShoppingCart className="w-4 h-4" /> اطلب الآن
            </button>
          </div>
        </div>
        <div className="p-4">
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-accent text-accent" />)}
            <span className="text-xs text-gray-400 mr-1">(4.8)</span>
          </div>
          <p className="font-bold text-[#111827] text-sm line-clamp-2 mb-2">{product.name_ar ?? product.name}</p>
          <div className="flex items-center gap-2">
            <span className="font-black text-accent text-lg">{formatDZD(product.price)}</span>
            {hasDisc && <span className="text-xs text-gray-400 line-through">{formatDZD(product.compare_price!)}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function ProductsGrid({ products, storeSlug, title, subtitle, dark = false }: Props) {
  if (!products?.length) return null
  return (
    <section className={`py-14 px-4 ${dark ? 'bg-[#111827]' : 'bg-[#FAFAF8]'}`}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10" dir="rtl">
          <h2 className={`text-3xl font-black mb-2 ${dark ? 'text-white' : 'text-[#111827]'}`}>{title}</h2>
          {subtitle && <p className={dark ? 'text-white/50' : 'text-gray-500'}>{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" dir="rtl">
          {products.map(p => <ProductCard key={p.id} product={p} storeSlug={storeSlug} />)}
        </div>
      </div>
    </section>
  )
}
