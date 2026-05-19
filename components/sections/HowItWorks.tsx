'use client'
import { UserPlus, Package, TrendingUp } from 'lucide-react'
import { useStaggerAnimation } from '@/hooks/useScrollAnimation'

const STEPS = [
  {
    num: '01',
    Icon: UserPlus,
    title: 'سجّل مجاناً',
    desc: 'أنشئ حسابك في ثوانٍ — بدون بطاقة بنكية، بدون عقود. فقط بريدك وكلمة مرور.',
  },
  {
    num: '02',
    Icon: Package,
    title: 'أضف منتجاتك',
    desc: 'أضف صور ووصف منتجاتك بسهولة. الذكاء الاصطناعي يساعدك في الكتابة.',
  },
  {
    num: '03',
    Icon: TrendingUp,
    title: 'ابدأ البيع',
    desc: 'شارك رابط متجرك وابدأ تستقبل الطلبات. كل الجزائر بين يديك.',
  },
]

export default function HowItWorks() {
  const stepsRef = useStaggerAnimation({ staggerDelay: 120 })

  return (
    <section
      className="py-16 md:py-20 px-4"
      id="how-it-works"
      style={{ backgroundColor: '#FFFFFF' }}
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 md:mb-16">
          <h2 className="section-title">كيف يشتغل دكاني؟</h2>
          <p className="section-subtitle mx-auto" style={{ maxWidth: '400px' }}>
            ثلاث خطوات بسيطة تفصلك عن أول بيع
          </p>
        </div>

        {/* Steps */}
        <div
          ref={stepsRef as any}
          className="relative"
        >
          {/* Desktop: horizontal layout with connector line */}
          <div className="hidden md:block">
            {/* Connector dashed line */}
            <div
              className="absolute top-10 right-[calc(16%+40px)] left-[calc(16%+40px)]"
              style={{
                height: '2px',
                borderTop: '2px dashed #EBEBEB',
                zIndex: 0,
              }}
              aria-hidden="true"
            />

            <div className="grid grid-cols-3 gap-8 relative z-10">
              {STEPS.map(({ num, Icon, title, desc }) => (
                <div key={num} className="flex flex-col items-center text-center">
                  {/* Step circle */}
                  <div
                    className="w-20 h-20 rounded-full flex flex-col items-center justify-center mb-6 shadow-sm border-2"
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#EBEBEB',
                    }}
                  >
                    <span
                      className="font-black text-xs mb-0.5"
                      style={{ color: '#E8431A', fontFamily: 'var(--font-inter)' }}
                    >
                      {num}
                    </span>
                    <Icon size={22} style={{ color: '#E8431A' }} strokeWidth={1.8} />
                  </div>
                  <h3
                    className="font-bold text-lg mb-3"
                    style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
                  >
                    {title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: '#444444', fontFamily: 'var(--font-tajawal)', maxWidth: '240px' }}
                  >
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile: vertical layout with RTL connector line on right */}
          <div className="md:hidden space-y-0">
            {STEPS.map(({ num, Icon, title, desc }, i) => (
              <div key={num} className="flex gap-5 relative">
                {/* Connector line on right (RTL) */}
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className="w-14 h-14 rounded-full flex flex-col items-center justify-center border-2 z-10 bg-white"
                    style={{ borderColor: '#EBEBEB' }}
                  >
                    <span
                      className="font-black text-[10px]"
                      style={{ color: '#E8431A', fontFamily: 'var(--font-inter)' }}
                    >
                      {num}
                    </span>
                    <Icon size={16} style={{ color: '#E8431A' }} />
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className="flex-1 w-px my-1"
                      style={{ borderLeft: '2px dashed #EBEBEB', minHeight: '40px' }}
                    />
                  )}
                </div>
                <div className="pb-8 pt-2">
                  <h3
                    className="font-bold text-base mb-1.5"
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
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <a
            href="/auth/register"
            className="btn btn-accent text-base h-12 px-8 rounded-xl inline-flex"
            style={{ fontFamily: 'var(--font-tajawal)' }}
          >
            ابدأ الآن مجاناً ←
          </a>
        </div>
      </div>
    </section>
  )
}
