'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Category { id: string; name: string; name_ar?: string; image_url?: string; slug: string }

// Bento gradients — kept as a diverse palette (category tiles are decorative,
// each category benefits from its own colour to be scannable). Not a brand
// hue commitment; the accent still owns actions.
const BENTO_GRADIENTS = [
  'linear-gradient(135deg, #2952E3, #1F40C7)', // cobalt
  'linear-gradient(135deg, #D97706, #F59E0B)', // amber
  'linear-gradient(135deg, #1E293B, #334155)', // slate
  'linear-gradient(135deg, #7C3AED, #A78BFA)', // violet
  'linear-gradient(135deg, #DC2626, #EF4444)', // red
  'linear-gradient(135deg, #0891B2, #22D3EE)', // teal
  'linear-gradient(135deg, #059669, #34D399)', // emerald
  'linear-gradient(135deg, #DB2777, #F472B6)', // rose
]

export default function CategoriesBento({ categories, storeSlug }: { categories: Category[]; storeSlug: string }) {
  return (
    <section className="py-14 px-4" style={{ background: 'var(--pt-surface-soft,#111827)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10" dir="rtl">
          <h2 className="text-3xl mb-2" style={{ color: 'var(--pt-text,#fff)', fontFamily: 'var(--pt-font-heading)', fontWeight: 'var(--pt-heading-weight,800)' as any }}>تسوق حسب الفئة</h2>
          <p style={{ color: 'var(--pt-text-soft,rgba(255,255,255,0.5))' }}>اكتشف مجموعتنا الكاملة من المنتجات</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] gap-3" dir="rtl">
          {categories.slice(0, 8).map((cat, i) => {
            const isLarge = i === 0 || i === 5
            return (
              <Link
                key={cat.id}
                href={`/store/${storeSlug}/products?category=${cat.id}`}
                className={`group relative overflow-hidden rounded-2xl ${isLarge ? 'col-span-2' : ''}`}
              >
                {cat.image_url ? (
                  <div className="absolute inset-0">
                    <img src={cat.image_url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  </div>
                ) : (
                  <div className="absolute inset-0" style={{ background: BENTO_GRADIENTS[i % BENTO_GRADIENTS.length] }} />
                )}

                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <p className="font-black text-white text-base mb-1 transition-transform duration-200 group-hover:-translate-y-0.5">
                    {cat.name_ar ?? cat.name}
                  </p>
                  <div className="flex items-center gap-1 text-white/70 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>تسوق الآن</span>
                    <ArrowLeft className="w-3 h-3" />
                  </div>
                </div>

                {/* Hover ring */}
                <div className="absolute inset-0 ring-2 ring-white/0 group-hover:ring-white/20 rounded-2xl transition-all duration-300" />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
