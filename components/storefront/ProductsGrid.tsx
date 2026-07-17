'use client'
import Link from 'next/link'
import Image from 'next/image'
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
      <div className="overflow-hidden hover:-translate-y-1.5"
        style={{ background: 'var(--pt-surface,#fff)', borderRadius: 'var(--pt-radius-lg,16px)', boxShadow: 'var(--pt-shadow-sm)', transition: 'transform .45s var(--pt-ease,ease-out), box-shadow .45s var(--pt-ease,ease-out)' }}>
        <div className="relative product-img aspect-[4/5]" style={{ background: 'var(--pt-surface-soft,#F3F4F6)' }}>
          {img
            ? <Image src={img} alt={product.name_ar ?? product.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: 'var(--pt-text-muted,#ddd)' }}>{(product.name_ar ?? product.name)[0]}</div>
          }
          {hasDisc && (
            <span className="absolute top-3 right-3 text-white text-xs font-black px-2.5 py-1.5 rounded-xl shadow-md" style={{ background: 'var(--pt-danger,#EF4444)' }}>-{discPct}%</span>
          )}
          <button onClick={e => { e.preventDefault(); e.stopPropagation() }} aria-label="المفضلة"
            className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'var(--pt-surface,#fff)' }}>
            <Heart className="w-4 h-4" style={{ color: 'var(--pt-text-muted,#9CA3AF)' }} />
          </button>
          <div className="absolute bottom-0 inset-x-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out p-3">
            <div className="w-full flex items-center justify-center gap-2 font-bold py-2.5 text-sm cursor-pointer"
              style={{ background: 'var(--pt-accent)', color: 'var(--pt-accent-text-on,#fff)', borderRadius: 12 }}>
              <ShoppingCart className="w-4 h-4" /> اطلب الآن
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex gap-0.5 mb-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3" style={{ fill: 'var(--pt-star,#FBBF24)', color: 'var(--pt-star,#FBBF24)' }} />)}
            <span className="text-xs mr-1" style={{ color: 'var(--pt-text-muted,#9CA3AF)' }}>(4.8)</span>
          </div>
          <p className="font-bold text-sm line-clamp-2 mb-2" style={{ color: 'var(--pt-text,#111827)' }}>{product.name_ar ?? product.name}</p>
          <div className="flex items-center gap-2">
            <span className="font-black text-lg tabular-nums" style={{ color: 'var(--pt-accent)' }}>{formatDZD(product.price)}</span>
            {hasDisc && <span className="text-xs line-through" style={{ color: 'var(--pt-text-muted,#9CA3AF)' }}>{formatDZD(product.compare_price!)}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}

export default function ProductsGrid({ products, storeSlug, title, subtitle, dark = false }: Props) {
  if (!products?.length) return null
  return (
    <section className="py-14 px-4" style={{ background: dark ? 'var(--pt-surface-soft,#111827)' : 'var(--pt-bg,#FAFAF8)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10" dir="rtl">
          <h2 className="text-3xl mb-2" style={{ color: 'var(--pt-text,#111827)', fontFamily: 'var(--pt-font-heading)', fontWeight: 'var(--pt-heading-weight,800)' as any }}>{title}</h2>
          {subtitle && <p style={{ color: 'var(--pt-text-soft,#6B7280)' }}>{subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" dir="rtl">
          {products.map(p => <ProductCard key={p.id} product={p} storeSlug={storeSlug} />)}
        </div>
      </div>
    </section>
  )
}
