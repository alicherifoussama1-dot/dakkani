'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatDZD } from '@/lib/utils/format'
import { Loader2 } from 'lucide-react'

interface Product {
  id: string; name: string; name_ar?: string; slug: string
  price: number; compare_price?: number; images: { url: string }[]
}
interface Filters {
  categoryId?: string; query?: string; sort?: string
  minPrice?: number; maxPrice?: number
}

const PAGE_SIZE = 12

export default function InfiniteProducts({
  storeId, storeSlug, initialFilters,
}: { storeId: string; storeSlug: string; initialFilters: Filters }) {
  const [products, setProducts] = useState<Product[]>([])
  const [page,    setPage]      = useState(0)
  const [hasMore, setHasMore]   = useState(true)
  const [loading, setLoading]   = useState(false)
  const [total,   setTotal]     = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)
  const observer  = useRef<IntersectionObserver | null>(null)

  const fetchPage = useCallback(async (pageNum: number, reset = false) => {
    if (loading) return
    setLoading(true)
    const supabase = createClient()
    const from = pageNum * PAGE_SIZE

    let query = supabase
      .from('products')
      .select('id, name, name_ar, slug, price, compare_price, images', { count: 'exact' })
      .eq('store_id', storeId)
      .eq('is_active', true)
      .range(from, from + PAGE_SIZE - 1)

    if (initialFilters.categoryId) query = query.eq('category_id', initialFilters.categoryId)
    if (initialFilters.minPrice)   query = query.gte('price', initialFilters.minPrice)
    if (initialFilters.maxPrice)   query = query.lte('price', initialFilters.maxPrice)
    if (initialFilters.query) {
      query = query.or(`name.ilike.%${initialFilters.query}%,name_ar.ilike.%${initialFilters.query}%`)
    }

    const sort = initialFilters.sort ?? 'newest'
    if (sort === 'price_asc')  query = query.order('price', { ascending: true })
    else if (sort === 'price_desc') query = query.order('price', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    const { data, count } = await query
    const items = (data ?? []) as Product[]
    setTotal(count ?? 0)
    setProducts(prev => reset ? items : [...prev, ...items])
    setHasMore(items.length === PAGE_SIZE)
    setLoading(false)
  }, [storeId, initialFilters, loading])

  // Reset on filter change
  useEffect(() => {
    setProducts([])
    setPage(0)
    setHasMore(true)
    fetchPage(0, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, initialFilters.categoryId, initialFilters.query, initialFilters.sort, initialFilters.minPrice, initialFilters.maxPrice])

  // Intersection observer for infinite scroll
  useEffect(() => {
    observer.current = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loading) { const next = page + 1; setPage(next); fetchPage(next) } },
      { threshold: 0.1 }
    )
    if (bottomRef.current) observer.current.observe(bottomRef.current)
    return () => observer.current?.disconnect()
  }, [hasMore, loading, page, fetchPage])

  if (!loading && products.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-semibold">لا توجد منتجات مطابقة</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-3">{total} منتج</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(p => {
          const img     = p.images?.[0]?.url
          const hasDisc = p.compare_price && p.compare_price > p.price
          const discPct = hasDisc ? Math.round(((p.compare_price! - p.price) / p.compare_price!) * 100) : 0

          return (
            <Link
              key={p.id}
              href={`/store/${storeSlug}/product/${p.slug}`}
              className="group overflow-hidden border transition hover:-translate-y-1"
              style={{ background: 'var(--pt-surface,#fff)', borderColor: 'var(--pt-border,#eee)', borderRadius: 'var(--pt-radius-lg,16px)', boxShadow: 'var(--pt-shadow-sm)' }}
            >
              <div className="relative aspect-square overflow-hidden" style={{ background: 'var(--pt-surface-soft,#f5f5f5)' }}>
                {img
                  ? <Image src={img} alt={p.name_ar ?? p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover group-hover:scale-105 transition duration-300" />
                  : <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: 'var(--pt-text-muted,#ddd)' }}>{(p.name_ar ?? p.name)[0]}</div>
                }
                {hasDisc && (
                  <span className="absolute top-2 right-2 text-white text-xs font-bold px-1.5 py-0.5 rounded-lg" style={{ background: 'var(--pt-danger,#EF4444)' }}>
                    -{discPct}%
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm line-clamp-2" style={{ color: 'var(--pt-text,#111827)' }}>{p.name_ar ?? p.name}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="font-black" style={{ color: 'var(--pt-accent,#0D6EFD)' }}>{formatDZD(p.price)}</span>
                  {hasDisc && <span className="text-xs line-through" style={{ color: 'var(--pt-text-muted,#9CA3AF)' }}>{formatDZD(p.compare_price!)}</span>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={bottomRef} className="h-8 flex items-center justify-center mt-6">
        {loading && <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--pt-accent,#0D6EFD)' }} />}
        {!hasMore && products.length > 0 && (
          <p className="text-sm text-gray-400">تم عرض جميع المنتجات</p>
        )}
      </div>
    </div>
  )
}
