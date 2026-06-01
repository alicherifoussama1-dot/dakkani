'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ShoppingCart, Minus, Plus, Trash2, ArrowRight, ChevronRight } from 'lucide-react'
import { useCart } from '@/lib/store/cart'
import { formatDZD } from '@/lib/utils/format'

export default function CartPage() {
  const router = useRouter()
  const { items, update, remove, total, count, storeSlug } = useCart()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (items.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--color-bg-soft)'}} dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{background:'var(--color-bg-muted)'}}>
            <ShoppingCart size={32} style={{color:'var(--color-text-muted)'}}/>
          </div>
          <h1 className="font-black text-xl" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>السلة فارغة</h1>
          <p className="text-sm" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>تصفح المنتجات وأضف ما يعجبك</p>
          <Link href="/discover" className="btn btn-primary gap-2" style={{fontFamily:'var(--font-arabic)'}}>
            <ShoppingCart size={15}/>تصفح المنتجات
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{background:'var(--color-bg-soft)'}} dir="rtl">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40" style={{borderColor:'var(--color-border)'}}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/discover" style={{color:'var(--color-text-muted)'}}>
            <ArrowRight size={20}/>
          </Link>
          <h1 className="font-black text-lg flex-1" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>
            سلة التسوق ({count()} منتج)
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Items */}
        <div className="space-y-3">
          {items.map(item => (
            <div key={`${item.productId}-${item.variantKey}`}
              className="card p-4 flex items-center gap-3">
              {/* Image */}
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0" style={{background:'var(--color-bg-soft)'}}>
                {item.image
                  ? <img src={item.image} alt={item.name} className="w-full h-full object-cover"/>
                  : <div className="w-full h-full flex items-center justify-center text-xl">{item.name[0]}</div>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>{item.name}</p>
                <p className="font-black text-base mt-0.5" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>
                  {formatDZD(item.price * item.qty)}
                </p>
                <p className="text-xs" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-primary)'}}>
                  {formatDZD(item.price)} × {item.qty}
                </p>
              </div>

              {/* Qty controls */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => update(item.productId, item.qty - 1, item.variantKey)}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors hover:bg-[#F8F9FA]"
                  style={{borderColor:'var(--color-border)'}}>
                  <Minus size={12}/>
                </button>
                <span className="w-6 text-center font-bold text-sm" style={{fontFamily:'var(--font-primary)'}}>{item.qty}</span>
                <button onClick={() => update(item.productId, item.qty + 1, item.variantKey)}
                  className="w-7 h-7 rounded-lg border flex items-center justify-center transition-colors hover:bg-[#F8F9FA]"
                  style={{borderColor:'var(--color-border)'}}>
                  <Plus size={12}/>
                </button>
                <button onClick={() => remove(item.productId, item.variantKey)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-50 transition-colors ml-1">
                  <Trash2 size={13} style={{color:'#DC3545'}}/>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card p-4 space-y-3">
          <div className="flex justify-between text-sm" style={{color:'var(--color-text-secondary)'}}>
            <span>المجموع الفرعي</span>
            <span style={{fontFamily:'var(--font-primary)'}}>{formatDZD(total())}</span>
          </div>
          <div className="flex justify-between text-sm" style={{color:'var(--color-text-secondary)'}}>
            <span>رسوم التوصيل</span>
            <span className="font-semibold" style={{color:'#198754'}}>تحدد عند الطلب</span>
          </div>
          <div className="flex justify-between font-black text-base border-t pt-2" style={{borderColor:'var(--color-border)',color:'var(--color-accent)'}}>
            <span>المجموع</span>
            <span style={{fontFamily:'var(--font-primary)'}}>{formatDZD(total())}</span>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {['💳 دفع عند الاستلام','📦 فتح قبل الدفع','🚚 توصيل سريع'].map(b=>(
              <div key={b} className="text-center text-[10px] p-1.5 rounded-lg" style={{background:'var(--color-bg-soft)',color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
                {b}
              </div>
            ))}
          </div>

          {/* Checkout button */}
          {storeSlug && (
            <button
              onClick={() => router.push(`/store/${storeSlug}/checkout`)}
              className="btn btn-primary w-full gap-2 mt-2" style={{fontFamily:'var(--font-arabic)'}}>
              <ShoppingCart size={16}/>
              متابعة الطلب
              <ChevronRight size={14}/>
            </button>
          )}
        </div>

        <p className="text-xs text-center" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
          بالمتابعة توافق على سياسة الاسترجاع والتوصيل
        </p>
      </div>
    </div>
  )
}
