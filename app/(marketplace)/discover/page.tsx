'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, ShoppingCart, Star, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCart } from '@/lib/store/cart'
import { createClient } from '@/lib/supabase/client'
import WilayaSelector from '@/components/ui/WilayaSelector'
import { SkeletonGrid } from '@/components/ui/SkeletonCard'
import { formatDZD } from '@/lib/utils/format'
import { useDebounce } from '@/hooks/useDebounce'

const CATEGORIES = [
  {label:'الكل',slug:''},{label:'🧕 حجابات',slug:'hijab'},{label:'👗 ملابس',slug:'clothing'},
  {label:'📱 إلكترونيات',slug:'electronics'},{label:'🏠 المنزل',slug:'home'},
  {label:'💄 جمال',slug:'beauty'},{label:'👟 أحذية',slug:'shoes'},
]

export default function DiscoverPage() {
  const router = useRouter()
  const { add: addToCart, count: cartCount } = useCart()
  const [addedId, setAddedId] = useState<string|null>(null)
  const [products,setProducts]=useState<any[]>([]),[loading,setLoading]=useState(true)
  const [search,setSearch]=useState(''),[wilaya,setWilaya]=useState<number|null>(null)
  const [sort,setSort]=useState('newest'),[category,setCategory]=useState('')
  const debouncedSearch = useDebounce(search, 400)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const sb = createClient()
      let q = sb.from('products').select('id,name,name_ar,slug,price,compare_price,images,stores(slug),categories:category_id(slug)').eq('is_active',true).limit(24)
      if (debouncedSearch) q = q.or(`name.ilike.%${debouncedSearch}%,name_ar.ilike.%${debouncedSearch}%`)
      if (sort==='cheapest') q = q.order('price',{ascending:true})
      else q = q.order('created_at',{ascending:false})
      const {data: rawData}=await q
      // Client-side category filter (since category slugs are in related table)
      const data = category
        ? rawData?.filter((p: any) => (p.categories as any)?.slug === category)
        : rawData
      setProducts(data??[]); setLoading(false)
    }
    load()
  },[debouncedSearch,sort,category])

  return (
    <div className="min-h-screen" style={{background:'var(--color-bg-soft)'}}>
      {/* Top bar */}
      <header className="bg-white border-b sticky top-0 z-40" style={{borderColor:'var(--color-border)'}}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3" dir="rtl">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white" style={{background:'var(--color-accent)'}}>C</div>
            <span className="font-black text-base" style={{color:'var(--color-text-primary)'}}>Commerco</span>
          </Link>
          <div className="flex-1 relative max-w-lg mx-auto">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن منتجاتك..." className="input pr-9 text-sm h-9 w-full"/>
          </div>
          {cartCount() > 0 && (
            <Link href="/discover/cart" className="btn btn-sm gap-1.5 relative" style={{background:'var(--color-accent)',color:'#fff',fontFamily:'var(--font-arabic)'}}>
              <ShoppingCart size={14}/>
              <span className="w-5 h-5 rounded-full bg-white text-xs font-black flex items-center justify-center" style={{color:'var(--color-accent)'}}>{cartCount()}</span>
            </Link>
          )}
          <Link href="/dashboard" className="btn btn-sm btn-outline hidden sm:flex" style={{fontFamily:'var(--font-arabic)'}}>لوحة التحكم</Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-5" dir="rtl">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-5 items-center">
          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none flex-1">
            {CATEGORIES.map(cat=>(
              <button key={cat.slug} onClick={()=>setCategory(cat.slug)}
                className="flex-shrink-0 text-xs font-medium rounded-full px-3 h-8 transition-all border"
                style={{
                  background:category===cat.slug?'var(--color-accent)':'#fff',
                  color:category===cat.slug?'#fff':'var(--color-text-secondary)',
                  borderColor:category===cat.slug?'var(--color-accent)':'var(--color-border)',
                  fontFamily:'var(--font-arabic)',
                }}>
                {cat.label}
              </button>
            ))}
          </div>
          <WilayaSelector value={wilaya} onChange={w=>setWilaya(w?.id??null)} className="w-44"/>
          <select value={sort} onChange={e=>setSort(e.target.value)} className="input text-sm h-8 w-36" style={{fontFamily:'var(--font-arabic)'}}>
            <option value="newest">الأحدث</option>
            <option value="cheapest">الأرخص</option>
          </select>
        </div>

        {/* Products grid */}
        {loading ? (
          <SkeletonGrid count={12}/>
        ) : products.length===0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-semibold text-base mb-1" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>ما لقيناش منتجات</p>
            <p className="text-sm" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>حاول بكلمة أخرى أو اختر فئة مختلفة</p>
            <button onClick={()=>{setSearch('');setCategory('')}} className="btn btn-outline btn-sm mt-4" style={{fontFamily:'var(--font-arabic)'}}>مسح الفلاتر</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {products.map(p=>{
              const img=(p.images as any[])?.[0]?.url
              const hasDisc=p.compare_price&&p.compare_price>p.price
              const discPct=hasDisc?Math.round(((p.compare_price-p.price)/p.compare_price)*100):0
              const storeSlug=(p.stores as any)?.slug
              return (
                <Link key={p.id} href={storeSlug?`/discover/${storeSlug}/${p.slug}`:`#`}
                  className="group block bg-white border rounded-xl overflow-hidden transition-all hover:shadow-md"
                  style={{borderColor:'var(--color-border)'}}>
                  <div className="aspect-square overflow-hidden" style={{background:'var(--color-bg-soft)'}}>
                    {img
                      ?<img src={img} alt={p.name_ar??p.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"/>
                      :<div className="w-full h-full flex items-center justify-center text-4xl">{(p.name_ar??p.name)?.[0]??'📦'}</div>
                    }
                    {hasDisc&&<span className="absolute top-2 right-2 badge badge-red text-[10px]">-{discPct}%</span>}
                  </div>
                  <div className="p-2.5">
                    <p className="font-medium text-xs leading-tight line-clamp-2 mb-1.5" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>{p.name_ar??p.name}</p>
                    <div className="flex items-center gap-1">
                      <Star size={10} style={{color:'#FFC107',fill:'#FFC107'}}/>
                      <span className="text-[10px]" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-primary)'}}>4.7</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="font-bold text-xs" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{p.price.toLocaleString('ar-DZ')} دج</span>
                      {hasDisc&&<span className="text-[10px] line-through" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-primary)'}}>{p.compare_price.toLocaleString('ar-DZ')}</span>}
                    </div>
                    <button
                      onClick={e => {
                        e.preventDefault()
                        if (storeSlug && p.slug) {
                          addToCart({
                            productId: p.id,
                            storeSlug,
                            productSlug: p.slug,
                            name: p.name_ar ?? p.name,
                            price: p.price,
                            image: (p.images as any[])?.[0]?.url,
                          })
                          setAddedId(p.id)
                          setTimeout(() => setAddedId(null), 1500)
                        }
                      }}
                      className="w-full mt-2 h-7 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1 transition-all"
                      style={{
                        background: addedId === p.id ? '#198754' : 'var(--color-accent)',
                        fontFamily:'var(--font-arabic)',
                      }}>
                      {addedId === p.id ? <><Check size={11}/>أُضيف!</> : <><ShoppingCart size={11}/>أضف للسلة</>}
                    </button>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Floating cart button */}
      {cartCount() > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => {
              // Navigate to store checkout - use items[0] storeSlug
              const { items } = useCart.getState()
              if (items.length > 0) {
                router.push(`/store/${items[0].storeSlug}/checkout`)
              }
            }}
            className="flex items-center gap-3 px-6 py-3 rounded-full shadow-xl font-bold text-white transition-all hover:scale-105"
            style={{background:'var(--color-accent)',boxShadow:'0 8px 24px rgba(13,110,253,0.4)',fontFamily:'var(--font-arabic)'}}>
            <ShoppingCart size={18}/>
            <span>عرض السلة</span>
            <span className="w-6 h-6 rounded-full bg-white text-xs font-black flex items-center justify-center" style={{color:'var(--color-accent)'}}>
              {cartCount()}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
