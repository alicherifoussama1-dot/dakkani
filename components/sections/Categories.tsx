'use client'
import Link from 'next/link'
import { useStaggerAnimation } from '@/hooks/useScrollAnimation'
import { useCallback } from 'react'

const CATS = [
  { emoji: '🧕', name: 'حجابات',       slug: 'hijab' },
  { emoji: '👗', name: 'ملابس',        slug: 'clothing' },
  { emoji: '📱', name: 'إلكترونيات',  slug: 'electronics' },
  { emoji: '🏠', name: 'المنزل',      slug: 'home' },
  { emoji: '💄', name: 'جمال',        slug: 'beauty' },
  { emoji: '👟', name: 'أحذية',       slug: 'shoes' },
]

// Ripple effect handler
function addRipple(e: React.MouseEvent<HTMLElement>) {
  const el   = e.currentTarget
  const rect = el.getBoundingClientRect()
  const size = Math.max(rect.width, rect.height)
  const x    = e.clientX - rect.left - size / 2
  const y    = e.clientY - rect.top  - size / 2

  const ripple = document.createElement('span')
  ripple.className = 'ripple-effect'
  ripple.style.cssText = `width:${size}px;height:${size}px;top:${y}px;left:${x}px;`
  el.appendChild(ripple)
  ripple.addEventListener('animationend', () => ripple.remove())
}

export default function Categories() {
  const gridRef = useStaggerAnimation({ staggerDelay: 60 })

  return (
    <section
      className="section-soft py-16 md:py-20 px-4"
      id="categories"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="section-title">تسوق حسب الفئة</h2>
          <p className="section-subtitle">اكتشف آلاف المنتجات من تجار جزائريين معتمدين</p>
        </div>

        <div
          ref={gridRef as any}
          className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4"
        >
          {CATS.map(({ emoji, name, slug }) => (
            <Link
              key={slug}
              href={`/products?category=${slug}`}
              className="ripple-container group flex flex-col items-center justify-center gap-2
                         py-5 px-2 rounded-2xl border text-center transition-all duration-200
                         cursor-pointer select-none"
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#EBEBEB',
              }}
              onClick={addRipple}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#0D6EFD'
                el.style.backgroundColor = '#EBF5FF'
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement
                el.style.borderColor = '#EBEBEB'
                el.style.backgroundColor = '#FFFFFF'
              }}
            >
              <span
                className="text-3xl md:text-4xl transition-transform group-hover:scale-110 duration-200"
                aria-hidden="true"
              >
                {emoji}
              </span>
              <span
                className="text-xs md:text-sm font-semibold leading-tight"
                style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
              >
                {name}
              </span>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            href="/products"
            className="text-sm font-semibold transition-colors"
            style={{ color: '#0D6EFD' }}
          >
            عرض كل الفئات ←
          </Link>
        </div>
      </div>
    </section>
  )
}
