'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, SlidersHorizontal, Grid3X3, List, ShoppingCart, Star } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import WilayaSelector from '@/components/ui/WilayaSelector'
import { SkeletonGrid } from '@/components/ui/SkeletonCard'
import { formatDZD } from '@/lib/utils/format'

const CATEGORIES = [
  {label:'الكل',slug:''},{label:'🧕 حجابات',slug:'hijab'},{label:'👗 ملابس',slug:'clothing'},
  {label:'📱 إلكترونيات',slug:'electronics'},{label:'🏠 المنزل',slug:'home'},
  {label:'💄 جمال',slug:'beauty'},{label:'👟 أحذية',slug:'shoes'},
]

export default function DiscoverPage() {
  const [products,setProducts]=useState<any[]>([]),[loading,setLoading]=useState(true)
  const [search,setSearch]=useState(''),[wilaya,setWilaya]=useState<number|null>(null)
  const [sort,setSort]=useState('newest'),[category,setCategory]=useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const sb = createClient()
      let q = sb.from('products').select('id,name,name_ar,slug,price,compare_price,images,stores(slug)').eq('is_active',true).limit(24)
      if (search) q = q.or(`name.ilike.%${search}%,name_ar.ilike.%${search}%`)
      if (sort==='cheapest') q = q.order('price',{ascending:true})
      else q = q.order('created_at',{ascending:false})
      const {data}=await q
      setProducts(data??[]); setLoading(false)
    }
    load()
  },[search,sort,category])

  return (
    <div className="min-h-screen" style={{background:'var(--color-bg-soft)'}}>
      {/* Top bar */}
      <header className="bg-white border-b sticky top-0 z-40" style={{borderColor:'var(--color-border)'}}>
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3" dir="rtl">
          <Link href="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-white" style={{background:'var(--color-accent)'}}>د</div>
            <span className="font-black text-base" style={{color:'var(--color-text-primary)'}}>دكاني</span>
          </Link>
          <div className="flex-1 relative max-w-lg mx-auto">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="ابحث عن منتجاتك..." className="input pr-9 text-sm h-9 w-full"/>
          </div>
          <Link href="/dashboard" className="btn btn-primary btn-sm hidden sm:flex" style={{fontFamily:'var(--font-arabic)'}}>لوحة التحكم</Link>
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
                    <button className="w-full mt-2 h-7 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1 transition-colors"
                      style={{background:'var(--color-accent)',fontFamily:'var(--font-arabic)'}}>
                      <ShoppingCart size={11}/>أضف للسلة
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
