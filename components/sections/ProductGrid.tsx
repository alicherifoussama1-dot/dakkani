'use client'
import { useStaggerAnimation } from '@/hooks/useScrollAnimation'
import ProductCard from '@/components/ui/ProductCard'

const PRODUCTS = [
  {
    name: 'قنادر تقليدية أنيقة',
    price: 3500,
    originalPrice: 4500,
    rating: 4.8,
    reviewCount: 124,
    badge: 'bestseller' as const,
    image: '',
    emoji: '👗',
  },
  {
    name: 'عطر أورينتال فاخر',
    price: 1800,
    rating: 4.9,
    reviewCount: 89,
    badge: 'new' as const,
    image: '',
    emoji: '🌹',
  },
  {
    name: 'حذاء رياضي أديداس',
    price: 4200,
    originalPrice: 5500,
    rating: 4.7,
    reviewCount: 203,
    badge: 'sale' as const,
    image: '',
    emoji: '👟',
  },
  {
    name: 'سماعة بلوتوث لاسلكية',
    price: 2900,
    rating: 4.6,
    reviewCount: 67,
    image: '',
    emoji: '🎧',
  },
]

export default function ProductGrid() {
  const gridRef = useStaggerAnimation({ staggerDelay: 80 })

  return (
    <section
      className="py-16 md:py-20 px-4"
      style={{ backgroundColor: '#FFFFFF' }}
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="section-title">منتجات مميزة</h2>
            <p className="section-subtitle">الأكثر مبيعاً هذا الأسبوع</p>
          </div>
          <a
            href="/products"
            className="text-sm font-semibold hidden sm:block"
            style={{ color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}
          >
            عرض الكل ←
          </a>
        </div>

        {/* Products grid */}
        <div
          ref={gridRef as any}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5"
        >
          {PRODUCTS.map(product => (
            <ProductCard key={product.name} {...product} />
          ))}
        </div>

        {/* Mobile "see all" */}
        <div className="text-center mt-8 sm:hidden">
          <a
            href="/products"
            className="btn btn-outline-accent text-sm h-11 px-6"
            style={{ fontFamily: 'var(--font-tajawal)' }}
          >
            عرض كل المنتجات ←
          </a>
        </div>
      </div>
    </section>
  )
}
