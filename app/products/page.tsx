'use client'
import { useState, Suspense } from 'react'
import Navbar          from '@/components/layout/Navbar'
import Footer          from '@/components/layout/Footer'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import SearchBar       from '@/components/ui/SearchBar'
import WilayaSelector  from '@/components/ui/WilayaSelector'
import ProductCard     from '@/components/ui/ProductCard'
import { SkeletonGrid } from '@/components/ui/SkeletonCard'

const CATEGORIES = [
  { label: 'الكل',         slug: '' },
  { label: 'حجابات',      slug: 'hijab' },
  { label: 'ملابس',       slug: 'clothing' },
  { label: 'إلكترونيات', slug: 'electronics' },
  { label: 'المنزل',     slug: 'home' },
  { label: 'جمال',       slug: 'beauty' },
  { label: 'أحذية',      slug: 'shoes' },
]

const SORT_OPTIONS = [
  { value: 'newest',  label: 'الأحدث' },
  { value: 'cheapest', label: 'الأرخص' },
  { value: 'rating',  label: 'الأعلى تقييماً' },
]

// Demo products
const DEMO_PRODUCTS = [
  { name: 'قنادر تقليدية أنيقة', price: 3500, originalPrice: 4500, rating: 4.8, reviewCount: 124, badge: 'bestseller' as const, emoji: '👗', slug: '1' },
  { name: 'عطر أورينتال فاخر', price: 1800, rating: 4.9, reviewCount: 89, badge: 'new' as const, emoji: '🌹', slug: '2' },
  { name: 'حذاء رياضي أصلي', price: 4200, originalPrice: 5500, rating: 4.7, reviewCount: 203, badge: 'sale' as const, emoji: '👟', slug: '3' },
  { name: 'سماعة بلوتوث لاسلكية', price: 2900, rating: 4.6, reviewCount: 67, emoji: '🎧', slug: '4' },
  { name: 'عباية مطرزة فاخرة', price: 5500, originalPrice: 7000, rating: 4.9, reviewCount: 156, badge: 'sale' as const, emoji: '🧕', slug: '5' },
  { name: 'ساعة ذكية واترغريد', price: 3800, rating: 4.5, reviewCount: 42, badge: 'new' as const, emoji: '⌚', slug: '6' },
  { name: 'شامبو بالأرغان المغربي', price: 650, originalPrice: 900, rating: 4.7, reviewCount: 88, emoji: '💆', slug: '7' },
  { name: 'طاجين سيراميك مزخرف', price: 2200, rating: 4.8, reviewCount: 35, emoji: '🏺', slug: '8' },
]

export default function ProductsPage() {
  const [query,       setQuery]       = useState('')
  const [category,    setCategory]    = useState('')
  const [wilaya,      setWilaya]      = useState<number | null>(null)
  const [sort,        setSort]        = useState('newest')
  const [loading,     setLoading]     = useState(false)

  const filtered = DEMO_PRODUCTS.filter(p => {
    const matchSearch = !query || p.name.includes(query)
    return matchSearch
  })

  return (
    <>
      <Navbar />
      <main
        className="min-h-screen"
        style={{ backgroundColor: '#FFFFFF', paddingBottom: '80px' }}
        dir="rtl"
      >
        {/* Page header */}
        <div
          className="pt-24 pb-6 px-4 border-b"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB' }}
        >
          <div className="max-w-6xl mx-auto">
            <h1
              className="font-black mb-1"
              style={{ fontSize: 'clamp(22px, 4vw, 32px)', color: '#111111', fontFamily: 'var(--font-tajawal)' }}
            >
              المنتجات
            </h1>
            <p style={{ color: '#999999', fontSize: '14px', fontFamily: 'var(--font-tajawal)' }}>
              {filtered.length} منتج متوفر
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Search + filters row */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <SearchBar
              onSearch={setQuery}
              onClear={() => setQuery('')}
              className="flex-1"
            />
            <WilayaSelector
              value={wilaya}
              onChange={w => setWilaya(w?.id ?? null)}
              className="sm:w-52"
            />
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="input h-12 sm:w-44 text-sm"
              style={{ fontFamily: 'var(--font-tajawal)' }}
              aria-label="ترتيب النتائج"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Category pills */}
          <div
            className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none"
            role="group"
            aria-label="فلترة حسب الفئة"
          >
            {CATEGORIES.map(cat => (
              <button
                key={cat.slug}
                onClick={() => setCategory(cat.slug)}
                className="flex-shrink-0 text-sm font-medium rounded-full px-4 py-2 transition-all"
                style={{
                  backgroundColor: category === cat.slug ? '#E8431A' : '#F3F3F3',
                  color:           category === cat.slug ? '#FFFFFF'  : '#444444',
                  fontFamily: 'var(--font-tajawal)',
                  border: 'none',
                  minHeight: '36px',
                }}
                aria-pressed={category === cat.slug}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Products grid */}
          {loading ? (
            <SkeletonGrid count={8} />
          ) : filtered.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => (
                <ProductCard key={p.slug} {...p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🔍</p>
              <p
                className="font-semibold text-lg mb-2"
                style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
              >
                ما لقيناش منتجات
              </p>
              <p
                className="text-sm"
                style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
              >
                حاول بكلمة أخرى أو اختر فئة مختلفة
              </p>
              <button
                onClick={() => { setQuery(''); setCategory('') }}
                className="btn btn-outline-accent text-sm h-10 px-5 mt-4"
                style={{ fontFamily: 'var(--font-tajawal)' }}
              >
                مسح الفلاتر
              </button>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </>
  )
}
