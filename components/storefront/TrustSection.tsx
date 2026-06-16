export default function TrustSection() {
  const TRUST = [
    { icon: '💳', title: 'الدفع عند الاستلام',  desc: '95% من عملائنا يفضلون الدفع عند الاستلام — نظام آمن ومريح' },
    { icon: '📦', title: 'فتح قبل الدفع',       desc: 'افتح طردك وتأكد من المحتوى قبل أن تدفع أي مبلغ' },
    { icon: '🚚', title: 'توصيل لكل الجزائر',  desc: 'نوصل لجميع الولايات الـ 58 خلال 24 إلى 72 ساعة' },
    { icon: '↩️', title: 'ضمان الاسترجاع',      desc: 'غير راضٍ عن المنتج؟ نضمن لك الاسترجاع خلال 7 أيام' },
  ]
  return (
    <section className="py-14 px-4" style={{ background: 'var(--pt-surface,#fff)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10" dir="rtl">
          <h2 className="text-3xl mb-2" style={{ color: 'var(--pt-text,#111827)', fontFamily: 'var(--pt-font-heading)', fontWeight: 'var(--pt-heading-weight,800)' as any }}>لماذا تثق بنا؟</h2>
          <p style={{ color: 'var(--pt-text-soft,#6B7280)' }}>نضع ثقتك في المقام الأول دائماً</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" dir="rtl">
          {TRUST.map(item => (
            <div key={item.title} className="p-6 text-center border transition-all hover:-translate-y-1 group"
              style={{ background: 'var(--pt-surface-soft,#FAFAF8)', borderColor: 'var(--pt-border,#eee)', borderRadius: 'var(--pt-radius-lg,16px)' }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition-transform"
                style={{ background: 'var(--pt-accent-soft,#EEF2FF)' }}>
                {item.icon}
              </div>
              <h3 className="font-black mb-2" style={{ color: 'var(--pt-text,#111827)' }}>{item.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--pt-text-soft,#6B7280)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
