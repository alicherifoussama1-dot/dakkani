'use client'
const DEFAULT_ITEMS = [
  '🚚 توصيل لكل ولايات الجزائر',
  '💳 الدفع عند الاستلام',
  '📦 فتح الطرد قبل الدفع',
  '↩️ ضمان الاسترجاع 7 أيام',
  '⚡ توصيل سريع 24-72 ساعة',
  '🛡️ منتجات أصلية ومضمونة',
  '🎁 هدايا وعروض حصرية',
  '💬 دعم على مدار الساعة',
]

// `text` (from the builder/AI) is split on · ، | newlines into marquee items.
export default function MarqueeBar({ text }: { text?: string } = {}) {
  const items = text?.trim()
    ? text.split(/[·•|\n،]+/).map(s => s.trim()).filter(Boolean)
    : DEFAULT_ITEMS
  const doubled = [...items, ...items]
  return (
    <div className="py-3 overflow-hidden" style={{ background: 'var(--pt-accent, #0D6EFD)' }}>
      <div className="marquee-rtl">
        {doubled.map((item, i) => (
          <span key={i} className="flex items-center gap-6 px-8 text-white/90 text-sm font-semibold whitespace-nowrap">
            {item}
            <span style={{ color: 'var(--pt-accent-text, #fff)' }}>✦</span>
          </span>
        ))}
      </div>
    </div>
  )
}
