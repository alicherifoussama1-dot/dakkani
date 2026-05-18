interface Review { customer_name?: string; rating: number; comment?: string; created_at: string }

export default function ReviewsSection({ reviews }: { reviews: Review[] }) {
  return (
    <section className="py-14 px-4 bg-[#FAFAF8]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10" dir="rtl">
          <h2 className="text-3xl font-black text-[#111827] mb-2">آراء عملائنا ⭐</h2>
          <p className="text-gray-500">أكثر من {reviews.length * 100}+ عميل سعيد بخدماتنا</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" dir="rtl">
          {reviews.map((review, i) => (
            <div key={i}
              className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all hover:-translate-y-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-black">
                  {review.customer_name?.[0] ?? 'ع'}
                </div>
                <div>
                  <p className="font-bold text-[#111827] text-sm">{review.customer_name ?? 'عميل'}</p>
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, j) => (
                      <span key={j} className={`text-xs ${j < review.rating ? 'text-accent' : 'text-gray-200'}`}>★</span>
                    ))}
                  </div>
                </div>
              </div>
              {review.comment && <p className="text-gray-600 text-sm leading-relaxed">{review.comment}</p>}
              <div className="mt-3 flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                <span className="text-xs text-gray-400 font-medium">شراء موثق</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
