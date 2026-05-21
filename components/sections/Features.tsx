'use client'
import { Truck, Bot, BarChart3, Shield, Store, Zap } from 'lucide-react'
import { useStaggerAnimation } from '@/hooks/useScrollAnimation'

const FEATURES = [
  {
    Icon: Truck,
    title: 'توصيل لكل الولايات',
    desc: 'نصلك لكل الـ 48 ولاية في الجزائر مع شركاء التوصيل المعتمدين.',
  },
  {
    Icon: Bot,
    title: 'ردود AI بالدارجة',
    desc: 'مساعد ذكي يرد على عملائك بالدارجة الجزائرية 24/7 بدلاً منك.',
  },
  {
    Icon: BarChart3,
    title: 'إحصائيات مباشرة',
    desc: 'تابع مبيعاتك، طلباتك، وأرباحك لحظة بلحظة من لوحة تحكم واضحة.',
  },
  {
    Icon: Shield,
    title: 'دفع آمن ومضمون',
    desc: 'الدفع عند الاستلام + بطاقات CIB و Edahabia. مالك محمي دائماً.',
  },
  {
    Icon: Store,
    title: 'متجر احترافي',
    desc: 'صمم متجرك بصور ووصف منتجاتك في دقائق — بدون خبرة تقنية.',
  },
  {
    Icon: Zap,
    title: 'سريع وسهل الاستخدام',
    desc: 'واجهة عربية سلسة على موبايل ولابتوب. ابدأ البيع في أقل من 5 دقائق.',
  },
]

export default function Features() {
  const gridRef = useStaggerAnimation({ staggerDelay: 80 })

  return (
    <section
      className="section-soft py-16 md:py-20 px-4"
      id="features"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="section-title">لماذا دكاني؟</h2>
          <p className="section-subtitle mx-auto" style={{ maxWidth: '480px' }}>
            كل ما تحتاجه لتبدأ تبيع أونلاين في الجزائر في مكان واحد
          </p>
        </div>

        {/* Features grid */}
        <div
          ref={gridRef as any}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {FEATURES.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="card p-6 group"
              style={{ borderRadius: '16px' }}
            >
              {/* Icon */}
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4 transition-colors"
                style={{ backgroundColor: '#EBF5FF' }}
              >
                <Icon
                  size={22}
                  style={{ color: '#0D6EFD' }}
                  strokeWidth={1.8}
                />
              </div>

              {/* Text */}
              <h3
                className="font-bold text-base mb-2"
                style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
              >
                {title}
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: '#444444', fontFamily: 'var(--font-tajawal)' }}
              >
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
