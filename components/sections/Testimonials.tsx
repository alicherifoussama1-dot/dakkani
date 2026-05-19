'use client'
import { useStaggerAnimation } from '@/hooks/useScrollAnimation'

const TESTIMONIALS = [
  {
    quote: 'دكاني غيّر حياتي! كنت نبيع من صفحة فيسبوك وكانت الفوضى كبيرة. دلوقتي عندي متجر احترافي والطلبات تيجي لوحدها.',
    name: 'سارة م.',
    wilaya: 'وهران',
    stars: 5,
    avatar: 'س',
  },
  {
    quote: 'في أسبوع واحد من إطلاق متجري على دكاني عندي 40 طلب! الأداة سهلة وفريق الدعم متوفر دائماً للمساعدة.',
    name: 'محمد ب.',
    wilaya: 'قسنطينة',
    stars: 5,
    avatar: 'م',
  },
  {
    quote: 'الذكاء الاصطناعي اللي يرد على العملاء بالدارجة — ده أهم ميزة! العملاء يحسوا إنك قريب منهم حتى وأنت مشغول.',
    name: 'أمينة ك.',
    wilaya: 'تيزي وزو',
    stars: 5,
    avatar: 'أ',
  },
]

export default function Testimonials() {
  const desktopRef = useStaggerAnimation({ staggerDelay: 100 })

  return (
    <section
      className="section-soft py-16 md:py-20 px-4"
      id="testimonials"
      dir="rtl"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="section-title">قالوا عن دكاني</h2>
          <p className="section-subtitle">آلاف التجار يثقون فينا كل يوم</p>
        </div>

        {/* Mobile: horizontal scroll snap carousel */}
        <div className="md:hidden">
          <div className="snap-carousel pb-4" style={{ gap: '12px' }}>
            {TESTIMONIALS.map(({ quote, name, wilaya, stars, avatar }) => (
              <div
                key={name}
                className="snap-start flex-shrink-0 rounded-2xl p-5 border"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#EBEBEB',
                  width: 'min(80vw, 300px)',
                }}
              >
                <div className="flex gap-0.5 mb-3" style={{ color: '#E8431A' }}>
                  {'★'.repeat(stars)}
                </div>
                <p
                  className="text-sm leading-relaxed mb-4"
                  style={{ color: '#444444', fontFamily: 'var(--font-tajawal)' }}
                >
                  "{quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
                    style={{ backgroundColor: '#E8431A' }}
                  >
                    {avatar}
                  </div>
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}>
                      {name}
                    </p>
                    <p className="text-xs" style={{ color: '#999999' }}>{wilaya}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop: 3 col grid with scroll animation */}
        <div
          ref={desktopRef as any}
          className="hidden md:grid grid-cols-3 gap-5"
        >
          {TESTIMONIALS.map(({ quote, name, wilaya, stars, avatar }) => (
            <div
              key={name}
              className="card p-6"
              style={{ borderRadius: '16px' }}
            >
              {/* Stars */}
              <div className="text-lg mb-4" style={{ color: '#E8431A' }}>
                {'★'.repeat(stars)}
              </div>

              {/* Quote */}
              <p
                className="text-sm leading-relaxed mb-5"
                style={{
                  color: '#444444',
                  fontFamily: 'var(--font-tajawal)',
                  lineHeight: '1.8',
                }}
              >
                &ldquo;{quote}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: '#EBEBEB' }}>
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: '#E8431A' }}
                >
                  {avatar}
                </div>
                <div>
                  <p
                    className="font-bold text-sm"
                    style={{ color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}
                  >
                    {name}
                  </p>
                  <p className="text-xs" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
                    {wilaya}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
