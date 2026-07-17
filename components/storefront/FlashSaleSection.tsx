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
    <section className="py-14 px-4" style={{ background: 'var(--pt-bg)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4" dir="rtl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'var(--pt-danger, #EF4444)' }}>
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black" style={{ color: 'var(--pt-text)', letterSpacing: '-0.015em' }}>عروض حصرية</h2>
              <p className="text-sm" style={{ color: 'var(--pt-text-muted)' }}>ينتهي اليوم في منتصف الليل</p>
            </div>
          </div>
          {/* Countdown — accent-tinted, tabular */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium hidden sm:inline" style={{ color: 'var(--pt-text-muted)' }}>ينتهي في</span>
            {[pad(h), pad(m), pad(s)].map((v, i) => (
              <span key={i} className="flex items-center gap-1">
                <span className="font-black text-lg px-3 py-1.5 rounded-xl text-center tabular-nums"
                  style={{ background: 'var(--pt-accent)', color: 'var(--pt-accent-text-on,#fff)', minInlineSize: 44 }}>
                  {v}
                </span>
                {i < 2 && <span className="font-black text-lg" style={{ color: 'var(--pt-accent)' }}>:</span>}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4" dir="rtl">
          {products.slice(0, 4).map((p, i) => {
            const img     = p.images?.[0]?.url
            const hasDisc = p.compare_price && p.compare_price > p.price
            const discPct = hasDisc ? Math.round(((p.compare_price! - p.price) / p.compare_price!) * 100) : 0
            return (
              <Link
                key={p.id}
                href={`/store/${storeSlug}/product/${p.slug}`}
                className="group block overflow-hidden transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  background: 'var(--pt-surface)',
                  border: '1px solid var(--pt-border)',
                  borderRadius: 16,
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div className="relative aspect-square" style={{ background: 'var(--pt-surface-soft)' }}>
                  {img
                    ? <Image src={img} alt={p.name_ar ?? p.name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    : <div className="w-full h-full flex items-center justify-center text-5xl" style={{ color: 'var(--pt-text-muted)' }}>{(p.name_ar ?? p.name)[0]}</div>
                  }
                  {hasDisc && (
                    <span className="absolute top-3 text-white text-xs font-black px-2 py-1 rounded-lg"
                      style={{ insetInlineEnd: 12, background: 'var(--pt-danger, #EF4444)' }}>
                      −{discPct}%
                    </span>
                  )}
                  {/* Quick-buy CTA on hover */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 p-2">
                    <span className="block w-full text-center font-bold py-2 rounded-xl text-xs"
                      style={{ background: 'var(--pt-accent)', color: 'var(--pt-accent-text-on,#fff)' }}>
                      اطلب الآن
                    </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="font-bold text-sm line-clamp-2 mb-1.5" style={{ color: 'var(--pt-text)' }}>{p.name_ar ?? p.name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-black text-base tabular-nums" style={{ color: 'var(--pt-accent)' }}>{formatDZD(p.price)}</span>
                    {hasDisc && <span className="text-xs line-through tabular-nums" style={{ color: 'var(--pt-text-muted)' }}>{formatDZD(p.compare_price!)}</span>}
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
