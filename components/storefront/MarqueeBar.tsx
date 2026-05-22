'use client'
const ITEMS = [
  '🚚 توصيل لكل ولايات الجزائر',
  '💳 الدفع عند الاستلام',
  '📦 فتح الطرد قبل الدفع',
  '↩️ ضمان الاسترجاع 7 أيام',
  '⚡ توصيل سريع 24-72 ساعة',
  '🛡️ منتجات أصلية ومضمونة',
  '🎁 هدايا وعروض حصرية',
  '💬 دعم على مدار الساعة',
]

export default function MarqueeBar() {
  const doubled = [...ITEMS, ...ITEMS]
  return (
    <div className="bg-[#0D6EFD] py-3 overflow-hidden">
      <div className="marquee-rtl">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-6 px-8 text-white/90 text-sm font-semibold whitespace-nowrap">
            {item}
            <span className="text-accent">✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
