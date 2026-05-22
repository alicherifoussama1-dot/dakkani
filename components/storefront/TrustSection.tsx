export default function TrustSection() {
  const TRUST = [
    { icon: '💳', title: 'الدفع عند الاستلام',  desc: '95% من عملائنا يفضلون الدفع عند الاستلام — نظام آمن ومريح' },
    { icon: '📦', title: 'فتح قبل الدفع',       desc: 'افتح طردك وتأكد من المحتوى قبل أن تدفع أي مبلغ' },
    { icon: '🚚', title: 'توصيل لكل الجزائر',  desc: 'نوصل لجميع الولايات الـ 58 خلال 24 إلى 72 ساعة' },
    { icon: '↩️', title: 'ضمان الاسترجاع',      desc: 'غير راضٍ عن المنتج؟ نضمن لك الاسترجاع خلال 7 أيام' },
  ]
  return (
    <section className="py-14 px-4 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10" dir="rtl">
          <h2 className="text-3xl font-black text-[#111827] mb-2">لماذا تثق بنا؟</h2>
          <p className="text-gray-500">نضع ثقتك في المقام الأول دائماً</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" dir="rtl">
          {TRUST.map(item => (
            <div key={item.title}
              className="bg-[#FAFAF8] rounded-2xl p-6 text-center border border-gray-100 hover:border-primary/20 transition-all hover:-translate-y-1 hover:shadow-card group">
              <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 group-hover:scale-110 transition-transform">
                {item.icon}
              </div>
              <h3 className="font-black text-[#111827] mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
