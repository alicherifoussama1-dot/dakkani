'use client'

import Link from 'next/link'
import { formatDZD } from '@/lib/utils/format'
import { cdnImage } from '@/lib/image-url'

export interface UpsellProduct {
  id: string
  name: string
  slug: string
  price: number
  comparePrice?: number | null
  image?: string | null
}

interface Props {
  title: string
  subtitle?: string
  products: UpsellProduct[]
  storeSlug: string
}

export default function ProductUpsells({ title, subtitle, products, storeSlug }: Props) {
  if (!products?.length) return null

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h2 className="pt-heading" style={{ fontSize: 19, margin: 0 }}>{title}</h2>
        {subtitle && <p className="pt-text-muted" style={{ fontSize: 13, margin: '4px 0 0', fontFamily: 'var(--font-tajawal)' }}>{subtitle}</p>}
      </div>

      <div style={{
        display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 6,
        WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory',
      }}>
        {products.map(p => {
          const hasDiscount = !!p.comparePrice && p.comparePrice > p.price
          return (
            <Link
              key={p.id}
              href={`/discover/${storeSlug}/${p.slug}`}
              className="pt-card-sm"
              style={{
                flex: '0 0 168px', scrollSnapAlign: 'start',
                overflow: 'hidden', textDecoration: 'none', display: 'block',
              }}>
              <div style={{
                aspectRatio: '1/1', background: 'var(--pt-surface-soft)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, overflow: 'hidden',
              }}>
                {p.image ? (
                  <img src={cdnImage(p.image, 384)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : '📦'}
              </div>
              <div style={{ padding: 12 }}>
                <p className="pt-text" style={{
                  fontSize: 12.5, fontWeight: 600, margin: '0 0 6px',
                  fontFamily: 'var(--font-tajawal)', lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                  minHeight: 36,
                }}>{p.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span className="pt-accent" style={{ fontSize: 14, fontWeight: 800, fontFamily: 'var(--font-tajawal)' }}>{formatDZD(p.price)}</span>
                  {hasDiscount && (
                    <span className="pt-text-muted" style={{ fontSize: 11, textDecoration: 'line-through', fontFamily: 'var(--font-tajawal)' }}>
                      {formatDZD(p.comparePrice!)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
