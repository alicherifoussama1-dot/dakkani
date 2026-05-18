'use client'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

interface Category { id: string; name: string; name_ar?: string; image_url?: string; slug: string }

const BENTO_COLORS = [
  'from-[#1B4332] to-[#2D6A4F]',
  'from-[#D97706] to-[#F59E0B]',
  'from-[#1e293b] to-[#334155]',
  'from-[#7C3AED] to-[#A78BFA]',
  'from-[#DC2626] to-[#EF4444]',
  'from-[#0891B2] to-[#22D3EE]',
  'from-[#059669] to-[#34D399]',
  'from-[#DB2777] to-[#F472B6]',
]

export default function CategoriesBento({ categories, storeSlug }: { categories: Category[]; storeSlug: string }) {
  return (
    <section className="py-14 px-4 bg-[#111827]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10" dir="rtl">
          <h2 className="text-3xl font-black text-white mb-2">تسوق حسب الفئة</h2>
          <p className="text-white/50">اكتشف مجموعتنا الكاملة من المنتجات</p>
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
                  <div className={`absolute inset-0 bg-gradient-to-br ${BENTO_COLORS[i % BENTO_COLORS.length]}`} />
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
