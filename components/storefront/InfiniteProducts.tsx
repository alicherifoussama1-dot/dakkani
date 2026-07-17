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

  // Skeleton on first load — content-shaped, not a spinner
  if (loading && products.length === 0) {
    return (
      <div>
        <div className="h-4 w-16 mb-3 rounded" style={{ background: 'var(--pt-surface-soft)' }} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden" style={{ background: 'var(--pt-surface)', borderRadius: 16, border: '1px solid var(--pt-border)' }}>
              <div className="aspect-square" style={{ background: 'var(--pt-surface-soft)' }} />
              <div className="p-3">
                <div className="h-3 w-full mb-2 rounded" style={{ background: 'var(--pt-surface-soft)' }} />
                <div className="h-3 w-2/3 rounded" style={{ background: 'var(--pt-surface-soft)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!loading && products.length === 0) {
    return (
      <div className="text-center py-20" style={{ color: 'var(--pt-text-muted)' }}>
        <div className="mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ inlineSize: 56, blockSize: 56, background: 'var(--pt-surface-soft)' }}>
          <span style={{ fontSize: 22 }}>🔍</span>
        </div>
        <p className="font-bold text-base" style={{ color: 'var(--pt-text)' }}>لا توجد منتجات مطابقة</p>
        <p className="text-sm mt-1" style={{ color: 'var(--pt-text-muted)' }}>غيّر البحث أو الفلاتر ثم أعد المحاولة</p>
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm mb-3 tabular-nums" style={{ color: 'var(--pt-text-muted)' }}>{total} منتج</p>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map(p => {
          const img     = p.images?.[0]?.url
          const hasDisc = p.compare_price && p.compare_price > p.price
          const discPct = hasDisc ? Math.round(((p.compare_price! - p.price) / p.compare_price!) * 100) : 0

          return (
            <Link
              key={p.id}
              href={`/store/${storeSlug}/product/${p.slug}`}
              className="group overflow-hidden border hover:-translate-y-1"
              style={{ background: 'var(--pt-surface,#fff)', borderColor: 'var(--pt-border,#eee)', borderRadius: 'var(--pt-radius-lg,16px)', boxShadow: 'var(--pt-shadow-sm)', transition: 'transform .4s var(--pt-ease,ease-out), box-shadow .4s var(--pt-ease,ease-out)' }}
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
                <p className="font-semibold text-sm line-clamp-2" style={{ color: 'var(--pt-text)' }}>{p.name_ar ?? p.name}</p>
                <div className="flex items-baseline gap-2 mt-1.5">
                  <span className="font-black tabular-nums" style={{ color: 'var(--pt-accent)' }}>{formatDZD(p.price)}</span>
                  {hasDisc && <span className="text-xs line-through tabular-nums" style={{ color: 'var(--pt-text-muted)' }}>{formatDZD(p.compare_price!)}</span>}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Infinite scroll sentinel */}
      <div ref={bottomRef} className="h-10 flex items-center justify-center mt-6">
        {loading && <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--pt-accent)' }} />}
        {!hasMore && products.length > 0 && (
          <p className="text-sm" style={{ color: 'var(--pt-text-muted)' }}>تم عرض جميع المنتجات</p>
        )}
      </div>
    </div>
  )
}
