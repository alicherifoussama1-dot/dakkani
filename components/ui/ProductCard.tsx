'use client'
import Link from 'next/link'
import { ShoppingCart, Star } from 'lucide-react'
import Badge from './Badge'

export interface ProductCardProps {
  name:           string
  price:          number
  originalPrice?: number
  rating:         number
  reviewCount:    number
  badge?:         'new' | 'bestseller' | 'sale'
  image?:         string
  emoji?:         string
  slug?:          string
  onAddToCart?:   () => void
}

export default function ProductCard({
  name,
  price,
  originalPrice,
  rating,
  reviewCount,
  badge,
  image,
  emoji = '📦',
  slug,
  onAddToCart,
}: ProductCardProps) {
  const discount = originalPrice
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : 0

  const CardWrapper = slug ? Link : 'div' as any
  const cardProps   = slug ? { href: `/products/${slug}` } : {}

  return (
    <CardWrapper
      {...cardProps}
      className="group block rounded-2xl overflow-hidden border transition-all duration-200 cursor-pointer"
      style={{
        backgroundColor: '#FFFFFF',
        borderColor: '#EBEBEB',
        boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLElement>) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform     = 'translateY(-4px)'
        el.style.boxShadow     = '0 8px 24px rgba(0,0,0,0.10)'
        el.style.borderColor   = '#EBEBEB'
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLElement>) => {
        const el = e.currentTarget as HTMLElement
        el.style.transform   = 'translateY(0)'
        el.style.boxShadow   = '0 2px 12px rgba(0,0,0,0.05)'
        el.style.borderColor = '#EBEBEB'
      }}
    >
      {/* Image area */}
      <div
        className="relative aspect-square flex items-center justify-center overflow-hidden"
        style={{ backgroundColor: '#F3F3F3' }}
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-5xl select-none" aria-hidden="true">{emoji}</span>
        )}

        {/* Badge */}
        {badge && (
          <div className="absolute top-2.5 right-2.5">
            <Badge variant={badge} />
          </div>
        )}

        {/* Discount badge */}
        {discount > 0 && !badge && (
          <div className="absolute top-2.5 right-2.5">
            <Badge variant="sale" label={`-${discount}%`} />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        {/* Product name */}
        <h3
          className="font-bold text-sm leading-snug mb-2 line-clamp-2"
          style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
        >
          {name}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-2.5">
          <div className="flex gap-0.5">
            {[1,2,3,4,5].map(s => (
              <Star
                key={s}
                size={11}
                style={{
                  color: s <= Math.round(rating) ? '#0D6EFD' : '#EBEBEB',
                  fill: s <= Math.round(rating) ? '#0D6EFD' : '#EBEBEB',
                }}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: '#999999', fontFamily: 'var(--font-inter)' }}>
            ({reviewCount})
          </span>
        </div>

        {/* Price */}
        <div className="flex items-end gap-1.5 mb-3">
          <span
            className="font-black text-base leading-none"
            style={{ color: '#0D6EFD', fontFamily: 'var(--font-inter)' }}
          >
            {price.toLocaleString('ar-DZ')} دج
          </span>
          {originalPrice && (
            <span
              className="text-xs line-through leading-none"
              style={{ color: '#CCCCCC', fontFamily: 'var(--font-inter)' }}
            >
              {originalPrice.toLocaleString('ar-DZ')}
            </span>
          )}
        </div>

        {/* Add to cart button */}
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onAddToCart?.()
          }}
          className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
          style={{
            backgroundColor: '#0D6EFD',
            color: '#FFFFFF',
            fontFamily: 'var(--font-tajawal)',
          }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0B5ED7'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0D6EFD'
          }}
          onMouseDown={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'
          }}
          onMouseUp={e => {
            ;(e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
          }}
          aria-label={`أضف ${name} للسلة`}
        >
          <ShoppingCart size={13} strokeWidth={2} />
          أضف للسلة
        </button>
      </div>
    </CardWrapper>
  )
}
