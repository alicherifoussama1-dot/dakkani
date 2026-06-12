'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { formatDZD } from '@/lib/utils/format'
import { Zap } from 'lucide-react'

interface Product { id: string; name: string; name_ar?: string; slug: string; price: number; compare_price?: number; images: { url: string }[] }

function useCountdown() {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })
  useEffect(() => {
    const end = new Date(); end.setHours(23, 59, 59, 0)
    const tick = () => {
      const diff = Math.max(0, end.getTime() - Date.now())
      setTime({ h: Math.floor(diff / 3600000), m: Math.floor((diff % 3600000) / 60000), s: Math.floor((diff % 60000) / 1000) })
    }
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id)
  }, [])
  return time
}
const pad = (n: number) => String(n).padStart(2, '0')

export default function FlashSaleSection({ products, storeSlug }: { products: Product[]; storeSlug: string }) {
  const { h, m, s } = useCountdown()

  return (
    <section className="py-14 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-[#111827]">عروض حصرية 🔥</h2>
              <p className="text-sm text-gray-500">فقط لفترة محدودة</p>
            </div>
          </div>
          {/* Countdown */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500 font-medium">ينتهي في:</span>
            {[pad(h), pad(m), pad(s)].map((v, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="bg-[#0D6EFD] text-white font-black text-lg px-3 py-1.5 rounded-xl min-w-[2.5rem] text-center tabular-nums transition-all">
                  {v}
                </span>
                {i < 2 && <span className="text-[#0D6EFD] font-black text-lg">:</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" dir="rtl">
          {products.slice(0, 4).map((p, i) => {
            const img     = p.images?.[0]?.url
            const hasDisc = p.compare_price && p.compare_price > p.price
            const discPct = hasDisc ? Math.round(((p.compare_price! - p.price) / p.compare_price!) * 100) : 0
            return (
              <Link
                key={p.id}
                href={`/store/${storeSlug}/product/${p.slug}`}
                className="group block card-premium overflow-hidden"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="relative product-img aspect-square bg-gray-50">
                  {img
                    ? <Image src={img} alt={p.name_ar ?? p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-5xl">{(p.name_ar ?? p.name)[0]}</div>
                  }
                  {hasDisc && (
                    <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-black px-2 py-1 rounded-xl shadow-md">
                      -{discPct}%
                    </span>
                  )}
                  {/* Quick buy on hover */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 p-2">
                    <span className="block w-full text-center bg-[#0D6EFD] text-white font-bold py-2 rounded-xl text-xs shadow-green">
                      اطلب الآن
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-bold text-[#111827] text-sm line-clamp-2 mb-1.5">{p.name_ar ?? p.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-accent text-base">{formatDZD(p.price)}</span>
                    {hasDisc && <span className="text-xs text-gray-400 line-through">{formatDZD(p.compare_price!)}</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
