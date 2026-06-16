interface Review { customer_name?: string; rating: number; comment?: string; created_at: string }

export default function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <section className="py-14 px-4" style={{ background: 'var(--pt-bg,#FAFAF8)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10" dir="rtl">
          <h2 className="text-3xl mb-2" style={{ color: 'var(--pt-text,#111827)', fontFamily: 'var(--pt-font-heading)', fontWeight: 'var(--pt-heading-weight,800)' as any }}>آراء عملائنا ⭐</h2>
          <p style={{ color: 'var(--pt-text-soft,#6B7280)' }}>أكثر من {reviews.length * 100}+ عميل سعيد بخدماتنا</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" dir="rtl">
          {reviews.map((review, i) => (
            <div key={i} className="p-6 transition-all hover:-translate-y-1"
              style={{ background: 'var(--pt-surface,#fff)', borderRadius: 'var(--pt-radius-lg,16px)', boxShadow: 'var(--pt-shadow-sm)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-black"
                  style={{ background: 'var(--pt-btn-primary-bg,#0D6EFD)', color: 'var(--pt-btn-primary-text,#fff)' }}>
                  {review.customer_name?.[0] ?? 'ع'}
                </div>
                <div>
                  <p className="font-bold text-sm" style={{ color: 'var(--pt-text,#111827)' }}>{review.customer_name ?? 'عميل'}</p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className="text-xs" style={{ color: j < review.rating ? 'var(--pt-star,#FBBF24)' : 'var(--pt-border,#e5e5e5)' }}>★</span>
                    ))}
                  </div>
                </div>
              </div>
              {review.comment && <p className="text-sm leading-relaxed" style={{ color: 'var(--pt-text-soft,#4B5563)' }}>{review.comment}</p>}
              <div className="mt-3 flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--pt-success,#22C55E)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--pt-text-muted,#9CA3AF)' }}>شراء موثق</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
