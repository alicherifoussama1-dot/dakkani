'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ShoppingCart, Star, Loader2, ArrowRight } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'
import { useCart } from '@/lib/store/cart'
import { cdnImage } from '@/lib/image-url'

export default function DiscoverStorePage() {
  const { storeSlug } = useParams<{ storeSlug: string }>()
  const { add: addToCart } = useCart()
  const [store, setStore] = useState<any>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const sb = createClient()
      const { data: s } = await sb.from('stores').select('*').eq('slug', storeSlug).single()
      if (!s) { setLoading(false); return }
      setStore(s)
      const { data: p } = await sb.from('products')
        .select('id,name,name_ar,slug,price,compare_price,images')
        .eq('store_id', s.id).eq('is_active', true)
        .order('created_at', { ascending: false }).limit(12)
      setProducts(p ?? [])
      setLoading(false)
    }
    load()
  }, [storeSlug])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin" style={{color:'var(--color-accent)'}}/>
    </div>
  )

  if (!store) return (
    <div className="min-h-screen flex items-center justify-center text-center p-4" dir="rtl">
      <div>
        <p className="text-4xl mb-3">🏪</p>
        <p className="font-semibold mb-2" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>المتجر غير موجود</p>
        <Link href="/discover" className="btn btn-primary btn-sm mt-3">العودة للاكتشاف</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'var(--color-bg-soft)'}} dir="rtl">
      {/* Header */}
      <header className="bg-white border-b" style={{borderColor:'var(--color-border)'}}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/discover" style={{color:'var(--color-text-muted)'}}><ArrowRight size={20}/></Link>
          {store.logo_url
            ? <img src={cdnImage(store.logo_url, 128)} alt={store.name} className="w-12 h-12 rounded-xl object-cover"/>
            : <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-black" style={{background:'var(--color-accent)'}}>{store.name[0]}</div>
          }
          <div>
            <h1 className="font-black text-lg" style={{color:'var(--color-text-primary)'}}>{store.name_ar ?? store.name}</h1>
            {store.description_ar && <p className="text-xs" style={{color:'var(--color-text-muted)'}}>{store.description_ar}</p>}
          </div>
          <div className="mr-auto">
            <a href={`/store/${storeSlug}`} target="_blank" rel="noopener noreferrer"
              className="btn btn-sm btn-primary gap-1.5" style={{fontFamily:'var(--font-arabic)'}}>
              <ShoppingCart size={14}/>زيارة المتجر
            </a>
          </div>
        </div>
      </header>

      {/* Products */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h2 className="font-bold text-base mb-4" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>
          منتجات المتجر ({products.length})
        </h2>
        {products.length === 0 ? (
          <div className="text-center py-16" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
            <p className="text-4xl mb-3">📦</p>
            <p>لا توجد منتجات بعد</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {products.map(p => {
              const img = (p.images as any[])?.[0]?.url
              const hasDisc = p.compare_price && p.compare_price > p.price
              return (
                <Link key={p.id} href={`/discover/${storeSlug}/${p.slug}`}
                  className="group block bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md"
                  style={{borderColor:'var(--color-border)'}}>
                  <div className="aspect-square" style={{background:'var(--color-bg-soft)'}}>
                    {img
                      ? <img src={cdnImage(img, 640)} alt={p.name_ar??p.name} className="w-full h-full object-cover"/>
                      : <div className="w-full h-full flex items-center justify-center text-4xl">{(p.name_ar??p.name)[0]}</div>
                    }
                  </div>
                  <div className="p-2.5">
                    <p className="font-medium text-xs line-clamp-2 mb-1" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>{p.name_ar??p.name}</p>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{formatDZD(p.price)}</span>
                      {hasDisc && <span className="text-[10px] line-through" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-primary)'}}>{formatDZD(p.compare_price)}</span>}
                    </div>
                    <button
                      onClick={e => {
                        e.preventDefault()
                        addToCart({ productId:p.id, storeSlug, productSlug:p.slug, name:p.name_ar??p.name, price:p.price, image:img })
                      }}
                      className="w-full mt-1.5 h-7 rounded-lg text-[11px] font-medium text-white flex items-center justify-center gap-1"
                      style={{background:'var(--color-accent)',fontFamily:'var(--font-arabic)'}}>
                      <ShoppingCart size={10}/>أضف للسلة
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
