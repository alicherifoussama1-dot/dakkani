'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShoppingCart, Truck, Shield, RefreshCw, Minus, Plus, Star, ChevronRight, Loader2, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import WilayaSelector from '@/components/ui/WilayaSelector'
import { formatDZD } from '@/lib/utils/format'
import { useCart } from '@/lib/store/cart'

export default function DiscoverProductPage() {
  const { storeSlug, slug } = useParams<{ storeSlug: string; slug: string }>()
  const router = useRouter()
  const { add: addToCart, count: cartCount } = useCart()
  const [product,setProduct]=useState<any>(null),[store,setStore]=useState<any>(null)
  const [loading,setLoading]=useState(true),[qty,setQty]=useState(1)
  const [wilaya,setWilaya]=useState<number|null>(null),[activeImg,setActiveImg]=useState(0)
  const [added,setAdded]=useState(false)

  const goToCheckout = () => {
    // Navigate to the storefront checkout for this product
    router.push(`/store/${storeSlug}/product/${slug}`)
  }

  const handleAddToCart = () => {
    if (!product) return
    addToCart({
      productId: product.id,
      storeSlug: storeSlug as string,
      productSlug: slug as string,
      name: product.name_ar ?? product.name,
      price: product.price,
      image: (product.images as any[])?.[0]?.url,
      qty,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  useEffect(()=>{
    const load=async()=>{
      setLoading(true)
      const sb=createClient()
      const {data:s}=await sb.from('stores').select('*').eq('slug',storeSlug).single()
      if(!s){setLoading(false);return}
      setStore(s)
      const {data:p}=await sb.from('products').select('*').eq('store_id',s.id).eq('slug',slug).single()
      setProduct(p);setLoading(false)
    }
    load()
  },[storeSlug,slug])

  if(loading) return(
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={28} className="animate-spin" style={{color:'var(--color-accent)'}}/>
    </div>
  )
  if(!product||!store) return(
    <div className="min-h-screen flex items-center justify-center text-center p-4" dir="rtl">
      <div><p className="text-4xl mb-3">😕</p>
      <p className="font-semibold" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>المنتج غير موجود</p>
      <Link href="/discover" className="btn btn-primary btn-sm mt-4" style={{fontFamily:'var(--font-arabic)'}}>العودة للمنتجات</Link>
      </div>
    </div>
  )

  const images=(product.images as any[])??[]
  const hasDisc=product.compare_price&&product.compare_price>product.price
  const discPct=hasDisc?Math.round(((product.compare_price-product.price)/product.compare_price)*100):0
  const storePhone=store.whatsapp??store.phone
  const waUrl=storePhone?`https://wa.me/${storePhone.replace(/\D/g,'').replace(/^0/,'213')}?text=${encodeURIComponent(`أريد طلب: ${product.name_ar??product.name} — ${formatDZD(product.price)}`)}`:null

  return(
    <div className="min-h-screen bg-white" dir="rtl">
      {/* Header */}
      <header className="border-b sticky top-0 z-40 bg-white" style={{borderColor:'var(--color-border)'}}>
        <div className="max-w-6xl mx-auto px-4 h-12 flex items-center gap-2">
          <Link href="/discover" className="text-xs flex items-center gap-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>اكتشف</Link>
          <ChevronRight size={11} style={{color:'var(--color-text-muted)'}}/>
          <Link href={`/discover/${storeSlug}`} className="text-xs flex items-center gap-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
            {store.name_ar ?? store.name}
          </Link>
          <ChevronRight size={11} style={{color:'var(--color-text-muted)'}}/>
          <span className="text-xs font-medium truncate max-w-[150px]" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>
            {product.name_ar??product.name}
          </span>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Gallery */}
          <div className="space-y-2">
            <div className="aspect-square rounded-xl overflow-hidden border" style={{borderColor:'var(--color-border)',background:'var(--color-bg-soft)'}}>
              {images[activeImg]?.url
                ?<img src={images[activeImg].url} alt={product.name_ar??product.name} className="w-full h-full object-cover"/>
                :<div className="w-full h-full flex items-center justify-center text-6xl">{(product.name_ar??product.name)?.[0]??'📦'}</div>
              }
            </div>
            {images.length>1&&(
              <div className="flex gap-2 overflow-x-auto scrollbar-none">
                {images.map((img:any,i:number)=>(
                  <button key={i} onClick={()=>setActiveImg(i)}
                    className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all"
                    style={{borderColor:i===activeImg?'var(--color-accent)':'transparent',background:'var(--color-bg-soft)'}}>
                    <img src={img.url} alt="" className="w-full h-full object-cover"/>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                {[1,2,3,4,5].map(s=><Star key={s} size={13} style={{color:'#FFC107',fill:'#FFC107'}}/>)}
                <span className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-primary)'}}>(4.8)</span>
              </div>
              <h1 className="font-bold text-xl leading-snug" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>{product.name_ar??product.name}</h1>
            </div>

            <div className="flex items-end gap-3">
              <span className="font-black text-3xl" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{formatDZD(product.price)}</span>
              {hasDisc&&<>
                <span className="text-base line-through" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-primary)'}}>{formatDZD(product.compare_price)}</span>
                <span className="badge badge-red">-{discPct}%</span>
              </>}
            </div>

            {product.description_ar&&(
              <p className="text-sm leading-relaxed" style={{color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>{product.description_ar}</p>
            )}

            {/* Wilaya */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>اختر ولاية التوصيل</label>
              <WilayaSelector value={wilaya} onChange={w=>setWilaya(w?.id??null)}/>
              {wilaya&&<p className="text-xs mt-1 flex items-center gap-1" style={{color:'var(--color-success)',fontFamily:'var(--font-arabic)'}}>
                <Truck size={11}/>يصلك خلال 24-72 ساعة
              </p>}
            </div>

            {/* Qty */}
            <div className="flex items-center gap-3">
              <button onClick={()=>setQty(q=>Math.max(1,q-1))} className="w-9 h-9 rounded-lg border flex items-center justify-center transition-colors hover:bg-[#F8F9FA]" style={{borderColor:'var(--color-border)'}}>
                <Minus size={14}/>
              </button>
              <span className="font-bold text-lg w-8 text-center" style={{fontFamily:'var(--font-primary)'}}>{qty}</span>
              <button onClick={()=>setQty(q=>q+1)} className="w-9 h-9 rounded-lg border flex items-center justify-center transition-colors hover:bg-[#F8F9FA]" style={{borderColor:'var(--color-border)'}}>
                <Plus size={14}/>
              </button>
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-2">
              {[{Icon:Truck,text:'توصيل لكل الجزائر'},{Icon:Shield,text:'دفع عند الاستلام'},{Icon:RefreshCw,text:'إرجاع 7 أيام'}].map(b=>(
                <div key={b.text} className="text-center p-2 rounded-lg border" style={{borderColor:'var(--color-border)',background:'var(--color-bg-soft)'}}>
                  <b.Icon size={16} className="mx-auto mb-1" style={{color:'var(--color-accent)'}}/>
                  <p className="text-[10px]" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>{b.text}</p>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex gap-2 flex-col sm:flex-row">
              {waUrl&&(
                <a href={waUrl} target="_blank" rel="noopener noreferrer"
                  className="btn flex-1 gap-2 font-bold" style={{background:'#25D366',color:'#fff',fontFamily:'var(--font-arabic)'}}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884"/></svg>
                  واتساب
                </a>
              )}
              <button
                onClick={handleAddToCart}
                className="btn flex-1 gap-2 transition-all"
                style={{
                  background: added ? '#198754' : 'var(--color-accent)',
                  color:'#fff',
                  fontFamily:'var(--font-arabic)',
                }}>
                {added
                  ? <><Check size={15}/>أُضيف للسلة ✓</>
                  : <><ShoppingCart size={15}/>أضف للسلة — {formatDZD(product.price*qty)}</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile sticky bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t p-3 flex gap-2 md:hidden z-40" style={{borderColor:'var(--color-border)'}}>
        {waUrl&&<a href={waUrl} target="_blank" className="flex-1 btn font-bold text-sm" style={{background:'#25D366',color:'#fff',fontFamily:'var(--font-arabic)'}}>📱 واتساب</a>}
        <button className="flex-1 btn text-sm" style={{
          background: added ? '#198754' : 'var(--color-accent)',
          color:'#fff',
          fontFamily:'var(--font-arabic)',
        }} onClick={handleAddToCart}>
          {added ? '✓ أُضيف للسلة' : `🛒 أضف للسلة — ${formatDZD(product.price*qty)}`}
        </button>
        {cartCount() > 0 && (
          <button onClick={goToCheckout} className="flex-1 btn btn-primary text-sm" style={{fontFamily:'var(--font-arabic)'}}>
            🚀 اطلب الآن ({cartCount()})
          </button>
        )}
      </div>
    </div>
  )
}
