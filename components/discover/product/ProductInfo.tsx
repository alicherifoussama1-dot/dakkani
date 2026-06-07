'use client'

import { useEffect, useState } from 'react'
import { Star, Flame, Users } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'

interface Props {
  name: string
  rating: number
  reviewCount: number
  price: number
  comparePrice?: number | null
  stock?: number | null
  showStock?: boolean
  saleEndsAt?: string | null     // ISO string — optional countdown
  recentBuyers?: number | null   // social-proof count
}

function useCountdown(target?: string | null) {
  const [left, setLeft] = useState<number | null>(null)
  useEffect(() => {
    if (!target) return
    const end = new Date(target).getTime()
    const tick = () => setLeft(Math.max(0, end - Date.now()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [target])
  if (left === null || !target) return null
  const s = Math.floor(left / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    expired: left <= 0,
  }
}

function Pad(n: number) { return n.toString().padStart(2, '0') }

export default function ProductInfo({
  name, rating, reviewCount, price, comparePrice, stock, showStock = true,
  saleEndsAt, recentBuyers,
}: Props) {
  const hasDiscount = !!comparePrice && comparePrice > price
  const discountPct = hasDiscount ? Math.round(((comparePrice! - price) / comparePrice!) * 100) : 0
  const countdown = useCountdown(saleEndsAt)
  const lowStock = showStock && typeof stock === 'number' && stock > 0 && stock <= 5

  return (
    <div>
      {/* Rating row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <Star key={s} size={14}
              style={{
                color: 'var(--pt-star)',
                fill: s <= Math.round(rating) ? 'var(--pt-star)' : 'transparent',
              }} />
          ))}
        </div>
        <span className="pt-text-soft" style={{ fontSize: 13, fontFamily: 'var(--font-tajawal)' }}>
          {rating.toFixed(1)} ({reviewCount} تقييم)
        </span>
      </div>

      {/* Title */}
      <h1 className="pt-heading" style={{
        fontSize: 'clamp(20px,3vw,28px)', lineHeight: 1.35, margin: '0 0 14px',
      }}>{name}</h1>

      {/* Price row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <span className="pt-heading pt-accent" style={{ fontSize: 'clamp(24px,4vw,34px)' }}>
          {formatDZD(price)}
        </span>
        {hasDiscount && (
          <>
            <span className="pt-text-muted" style={{
              fontSize: 16, textDecoration: 'line-through', fontFamily: 'var(--font-tajawal)',
            }}>{formatDZD(comparePrice!)}</span>
            <span className="pt-badge pt-badge-danger">-{discountPct}%</span>
          </>
        )}
      </div>

      {/* Countdown */}
      {countdown && !countdown.expired && (
        <div className="pt-card-sm" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', marginBottom: 14,
          borderColor: 'var(--pt-danger)',
        }}>
          <Flame size={16} style={{ color: 'var(--pt-danger)' }} />
          <span className="pt-text" style={{ fontSize: 13, fontFamily: 'var(--font-tajawal)', fontWeight: 600 }}>
            ينتهي العرض خلال:
          </span>
          <div style={{ display: 'flex', gap: 4, fontFamily: 'var(--font-inter)', fontWeight: 800, fontSize: 14 }}>
            {countdown.d > 0 && <span>{countdown.d}ي :</span>}
            <span style={{ color: 'var(--pt-danger)' }}>{Pad(countdown.h)}</span>:
            <span style={{ color: 'var(--pt-danger)' }}>{Pad(countdown.m)}</span>:
            <span style={{ color: 'var(--pt-danger)' }}>{Pad(countdown.s)}</span>
          </div>
        </div>
      )}

      {/* Low stock + social proof */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {lowStock && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--pt-danger)',
              display: 'inline-block',
            }} />
            <span style={{ fontSize: 13, fontFamily: 'var(--font-tajawal)', fontWeight: 600, color: 'var(--pt-danger)' }}>
              بقي {stock} فقط في المخزون — اطلب الآن!
            </span>
          </div>
        )}
        {!!recentBuyers && recentBuyers > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={14} className="pt-text-soft" />
            <span className="pt-text-soft" style={{ fontSize: 13, fontFamily: 'var(--font-tajawal)' }}>
              +{recentBuyers} شخص اشترى هذا المنتج مؤخراً
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
