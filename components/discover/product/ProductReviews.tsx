'use client'

import { useMemo, useState } from 'react'
import { Star, BadgeCheck, ChevronDown } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/format'

export interface Review {
  id: string
  customer_name?: string | null
  wilaya?: string | null
  rating: number
  comment?: string | null
  images?: { url: string }[] | null
  is_verified?: boolean
  created_at: string
}

interface Props {
  reviews: Review[]
  averageRating: number
}

const SORTS = [
  { id: 'recent', label: 'الأحدث' },
  { id: 'highest', label: 'الأعلى تقييماً' },
  { id: 'lowest', label: 'الأقل تقييماً' },
] as const

function Stars({ rating, size = 13 }: { rating: number; size?: number }) {
  return (
    <div style={{ display: 'flex', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size} style={{ color: 'var(--pt-star)', fill: s <= rating ? 'var(--pt-star)' : 'transparent' }} />
      ))}
    </div>
  )
}

export default function ProductReviews({ reviews, averageRating }: Props) {
  const [sort, setSort] = useState<typeof SORTS[number]['id']>('recent')
  const [sortOpen, setSortOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(4)

  const breakdown = useMemo(() => {
    const counts = [0, 0, 0, 0, 0] // index 0 = 5★, index 4 = 1★
    reviews.forEach(r => { if (r.rating >= 1 && r.rating <= 5) counts[5 - r.rating]++ })
    const total = reviews.length || 1
    return counts.map((c, i) => ({ stars: 5 - i, count: c, pct: Math.round((c / total) * 100) }))
  }, [reviews])

  const sorted = useMemo(() => {
    const arr = [...reviews]
    if (sort === 'recent') arr.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    if (sort === 'highest') arr.sort((a, b) => b.rating - a.rating)
    if (sort === 'lowest') arr.sort((a, b) => a.rating - b.rating)
    return arr
  }, [reviews, sort])

  const visible = sorted.slice(0, visibleCount)

  return (
    <div className="pt-card">
      <h2 className="pt-heading" style={{ fontSize: 19, marginBottom: 22 }}>تقييمات الزبائن</h2>

      {reviews.length === 0 ? (
        <p className="pt-text-muted" style={{ fontSize: 13, fontFamily: 'var(--font-tajawal)' }}>
          لا توجد تقييمات بعد. كن أول من يقيّم هذا المنتج!
        </p>
      ) : (
        <>
          {/* Summary + breakdown */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr', gap: 24, marginBottom: 28,
          }}
            className="reviews-summary-grid">
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <span className="pt-heading" style={{ fontSize: 44, lineHeight: 1 }}>{averageRating.toFixed(1)}</span>
              <Stars rating={Math.round(averageRating)} size={16} />
              <span className="pt-text-muted" style={{ fontSize: 12, fontFamily: 'var(--font-tajawal)' }}>{reviews.length} تقييم</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {breakdown.map(b => (
                <div key={b.stars} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span className="pt-text-soft" style={{ fontSize: 12, width: 38, fontFamily: 'var(--font-tajawal)' }}>{b.stars} نجوم</span>
                  <div style={{ flex: 1, height: 7, borderRadius: 4, background: 'var(--pt-surface-soft)', overflow: 'hidden' }}>
                    <div style={{ width: `${b.pct}%`, height: '100%', background: 'var(--pt-star)', borderRadius: 4 }} />
                  </div>
                  <span className="pt-text-muted" style={{ fontSize: 12, width: 32, textAlign: 'left', fontFamily: 'var(--font-tajawal)' }}>{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14, position: 'relative' }}>
            <button onClick={() => setSortOpen(o => !o)} className="pt-btn-secondary" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-tajawal)', fontSize: 12, fontWeight: 600,
              padding: '7px 14px', borderRadius: 'var(--pt-radius-pill)', border: '1px solid var(--pt-border)',
              cursor: 'pointer', background: 'var(--pt-surface)', color: 'var(--pt-text-soft)',
            }}>
              ترتيب: {SORTS.find(s => s.id === sort)?.label}
              <ChevronDown size={13} style={{ transform: sortOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
            </button>
            {sortOpen && (
              <>
                <div onClick={() => setSortOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 39 }} />
                <div className="pt-card-sm" style={{ position: 'absolute', top: '110%', left: 0, zIndex: 40, padding: 6, minWidth: 150 }}>
                  {SORTS.map(s => (
                    <button key={s.id} onClick={() => { setSort(s.id); setSortOpen(false) }}
                      style={{
                        display: 'block', width: '100%', textAlign: 'right', border: 'none', cursor: 'pointer',
                        background: sort === s.id ? 'var(--pt-accent-soft)' : 'transparent',
                        color: sort === s.id ? 'var(--pt-accent-text)' : 'var(--pt-text)',
                        padding: '8px 12px', borderRadius: 'var(--pt-radius-sm)',
                        fontFamily: 'var(--font-tajawal)', fontSize: 13,
                      }}>{s.label}</button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Review list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {visible.map(r => (
              <div key={r.id} style={{ paddingBottom: 18, borderBottom: '1px solid var(--pt-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--pt-accent-soft)', color: 'var(--pt-accent-text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 800, fontFamily: 'var(--font-tajawal)',
                    }}>
                      {(r.customer_name ?? 'ز')[0]}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="pt-text" style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-tajawal)' }}>
                          {r.customer_name ?? 'زبون'}
                        </span>
                        {r.is_verified && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--pt-success)', fontSize: 11, fontFamily: 'var(--font-tajawal)' }}>
                            <BadgeCheck size={13} /> مُشترٍ موثّق
                          </span>
                        )}
                      </div>
                      {r.wilaya && <span className="pt-text-muted" style={{ fontSize: 11, fontFamily: 'var(--font-tajawal)' }}>{r.wilaya}</span>}
                    </div>
                  </div>
                  <span className="pt-text-muted" style={{ fontSize: 11, fontFamily: 'var(--font-tajawal)' }}>{formatDateShort(r.created_at)}</span>
                </div>
                <Stars rating={r.rating} />
                {r.comment && (
                  <p className="pt-text-soft" style={{ fontSize: 13, lineHeight: 1.8, margin: '8px 0 0', fontFamily: 'var(--font-tajawal)' }}>{r.comment}</p>
                )}
                {!!r.images?.length && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    {r.images.map((img, i) => (
                      <img key={i} src={img.url} alt="" style={{ width: 64, height: 64, borderRadius: 'var(--pt-radius-sm)', objectFit: 'cover' }} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {visibleCount < sorted.length && (
            <button onClick={() => setVisibleCount(c => c + 6)} className="pt-btn-secondary pt-btn" style={{ width: '100%', marginTop: 16 }}>
              عرض المزيد من التقييمات
            </button>
          )}
        </>
      )}

      <style>{`
        @media (min-width: 640px) {
          .reviews-summary-grid { grid-template-columns: 200px 1fr !important; }
        }
      `}</style>
    </div>
  )
}
