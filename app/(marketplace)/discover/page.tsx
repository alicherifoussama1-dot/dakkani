'use client'
import { useState, useEffect } from 'react'
import Navbar           from '@/components/layout/Navbar'
import Footer           from '@/components/layout/Footer'
import MobileBottomNav  from '@/components/layout/MobileBottomNav'
import SearchBar        from '@/components/ui/SearchBar'
import WilayaSelector   from '@/components/ui/WilayaSelector'
import ProductCard      from '@/components/ui/ProductCard'
import { SkeletonGrid } from '@/components/ui/SkeletonCard'
import { createClient } from '@/lib/supabase/client'

const CATEGORIES = [
  { label: 'الكل',          slug: '' },
  { label: '🧕 حجابات',    slug: 'hijab' },
  { label: '👗 ملابس',     slug: 'clothing' },
  { label: '📱 إلكترونيات', slug: 'electronics' },
  { label: '🏠 المنزل',    slug: 'home' },
  { label: '💄 جمال',      slug: 'beauty' },
  { label: '👟 أحذية',     slug: 'shoes' },
]

const SORTS = [
  { value: 'newest',   label: 'الأحدث' },
  { value: 'cheapest', label: 'الأرخص' },
  { value: 'rating',   label: 'الأعلى تقييماً' },
]

export default function DiscoverPage() {
  const [products,  setProducts]  = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)
  const [query,     setQuery]     = useState('')
  const [category,  setCategory]  = useState('')
  const [wilaya,    setWilaya]    = useState<number | null>(null)
  const [sort,      setSort]      = useState('newest')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      let q = supabase
        .from('products')
        .select('id, name, name_ar, slug, price, compare_price, images, store_id, stores(slug)')
        .eq('is_active', true)
        .limit(24)

      if (query) q = q.or(`name.ilike.%${query}%,name_ar.ilike.%${query}%`)
      if (sort === 'cheapest') q = q.order('price', { ascending: true })
      else q = q.order('created_at', { ascending: false })

      const { data } = await q
      setProducts(data ?? [])
      setLoading(false)
    }
    load()
  }, [query, category, sort])

  return (
    <>
      <Navbar />
      <main className="min-h-screen pb-20" style={{ backgroundColor: '#FFFFFF' }} dir="rtl">
        {/* Header */}
        <div
          className="pt-24 pb-8 px-4"
          style={{ backgroundColor: '#F9F9F9', borderBottom: '1px solid #EBEBEB' }}
        >
          <div className="max-w-6xl mx-auto">
            <h1
              className="font-black mb-1"
              style={{ fontSize: 'clamp(22px, 4vw, 32px)', color: '#111111', fontFamily: 'var(--font-tajawal)' }}
            >
              اكتشف المنتجات
            </h1>
            <p style={{ color: '#999999', fontSize: '14px', fontFamily: 'var(--font-tajawal)' }}>
              تسوق من أفضل المتاجر الجزائرية
            </p>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <SearchBar onSearch={setQuery} onClear={() => setQuery('')} className="flex-1" />
            <WilayaSelector value={wilaya} onChange={w => setWilaya(w?.id ?? null)} className="sm:w-52" />
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className="input h-12 sm:w-44 text-sm"
              style={{ fontFamily: 'var(--font-tajawal)' }}
            >
              {SORTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>

          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
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
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Products */}
          {loading ? (
            <SkeletonGrid count={8} />
          ) : products.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard
                  key={p.id}
                  name={p.name_ar ?? p.name}
                  price={p.price}
                  originalPrice={p.compare_price}
                  rating={4.7}
                  reviewCount={Math.floor(Math.random() * 100) + 10}
                  image={p.images?.[0]?.url}
                  slug={`${(p.stores as any)?.slug ?? 'store'}/${p.slug}`}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-5xl mb-4">🔍</p>
              <p className="font-semibold text-lg mb-2" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                ما لقيناش منتجات
              </p>
              <p className="text-sm" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
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
