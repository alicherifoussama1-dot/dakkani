'use client'
import Link from 'next/link'
import { useCountUp } from '@/hooks/useCountUp'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'

const STATS = [
  { end: 12000, prefix: '+',  suffix: '',  label: 'تاجر نشط',   format: 'K' },
  { end: 48,    prefix: '',   suffix: '',  label: 'ولاية',       format: 'num' },
  { end: 98,    prefix: '',   suffix: '%', label: 'رضا العملاء', format: 'num' },
]

function StatItem({ end, prefix, suffix, label, format }: typeof STATS[0]) {
  const displayEnd = format === 'K' ? 12 : end
  const displaySuffix = format === 'K' ? 'K+' : suffix
  const { formatted, ref } = useCountUp({
    end: displayEnd, prefix, suffix: displaySuffix, duration: 1800
  })

  return (
    <div
      className="flex flex-col items-center text-center px-4 md:px-6"
      ref={ref as any}
    >
      <span
        className="font-black leading-none"
        style={{
          fontSize: 'clamp(28px, 6vw, 42px)',
          color: '#E8431A',
          fontFamily: 'var(--font-inter)',
        }}
      >
        {formatted}
      </span>
      <span
        className="text-sm mt-1"
        style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
      >
        {label}
      </span>
    </div>
  )
}

export default function Hero() {
  const textRef  = useScrollAnimation()
  const statsRef = useScrollAnimation({ rootMargin: '-40px' })

  return (
    <section
      className="relative overflow-hidden pt-28 md:pt-32 pb-16 md:pb-24 px-4"
      style={{ backgroundColor: '#FFFFFF' }}
      dir="rtl"
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none overflow-hidden"
      >
        <div
          className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.04]"
          style={{ backgroundColor: '#E8431A', filter: 'blur(80px)' }}
        />
        <div
          className="absolute top-1/2 -right-40 w-[400px] h-[400px] rounded-full opacity-[0.03]"
          style={{ backgroundColor: '#E8431A', filter: 'blur(100px)' }}
        />
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* ── Text column ──────────────────────────── */}
          <div ref={textRef as any}>
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1.5 mb-6"
              style={{
                backgroundColor: '#FFF0ED',
                color: '#E8431A',
                border: '1px solid rgba(232,67,26,0.2)',
                fontFamily: 'var(--font-tajawal)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ backgroundColor: '#E8431A' }}
              />
              🇩🇿 منصة البيع الأولى في الجزائر
            </div>

            {/* Headline */}
            <h1
              className="font-black leading-tight mb-5"
              style={{
                fontSize: 'clamp(34px, 6vw, 56px)',
                color: '#111111',
                fontFamily: 'var(--font-tajawal)',
                lineHeight: '1.2',
              }}
            >
              بيع أونلاين،
              <br />
              <span style={{ color: '#E8431A' }}>بكل سهولة</span>
            </h1>

            {/* Subheadline */}
            <p
              className="mb-8 max-w-md"
              style={{
                fontSize: 'clamp(14px, 2.5vw, 16px)',
                color: '#444444',
                fontFamily: 'var(--font-tajawal)',
                lineHeight: '1.8',
              }}
            >
              أنشئ متجرك الإلكتروني الجزائري في دقائق. توصيل لكل الولايات، دفع آمن، وردود AI بالدارجة.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <Link
                href="/auth/register"
                className="btn btn-accent text-base h-12 px-7 rounded-xl"
                style={{ fontFamily: 'var(--font-tajawal)' }}
              >
                ابدأ مجاناً ←
              </Link>
              <a
                href="#how-it-works"
                className="btn btn-white text-base h-12 px-7 rounded-xl"
                style={{ fontFamily: 'var(--font-tajawal)' }}
              >
                شوف كيف يشتغل
              </a>
            </div>

            {/* Trust line */}
            <p
              className="text-xs"
              style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
            >
              ✓ بدون بطاقة بنكية &nbsp;&nbsp; ✓ إلغاء في أي وقت &nbsp;&nbsp; ✓ مجاناً للأبد للخطة الأساسية
            </p>
          </div>

          {/* ── Hero Visual ──────────────────────────── */}
          <div className="flex items-center justify-center lg:justify-end order-first lg:order-last">
            <div className="animate-float relative w-full max-w-[360px]">
              {/* Main product card mockup */}
              <div
                className="rounded-3xl overflow-hidden shadow-xl border"
                style={{
                  backgroundColor: '#FFFFFF',
                  borderColor: '#EBEBEB',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)',
                }}
              >
                {/* Card header */}
                <div
                  className="h-48 flex items-center justify-center text-5xl"
                  style={{ backgroundColor: '#F3F3F3' }}
                >
                  👗
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p
                        className="font-bold text-base"
                        style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
                      >
                        قنادر تقليدية
                      </p>
                      <p className="text-xs" style={{ color: '#999999' }}>وهران، الجزائر</p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#FFF0ED', color: '#E8431A' }}
                    >
                      جديد
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      className="font-black text-lg"
                      style={{ color: '#E8431A', fontFamily: 'var(--font-inter)' }}
                    >
                      3,500 دج
                    </span>
                    <div className="flex items-center gap-1 text-xs" style={{ color: '#999999' }}>
                      <span>★★★★★</span>
                      <span>(24)</span>
                    </div>
                  </div>
                  <button
                    className="w-full mt-3 h-11 rounded-xl text-sm font-bold text-white"
                    style={{ backgroundColor: '#E8431A', fontFamily: 'var(--font-tajawal)' }}
                  >
                    أضف للسلة
                  </button>
                </div>
              </div>

              {/* Floating badge — sales */}
              <div
                className="absolute -bottom-3 -right-3 rounded-2xl shadow-lg px-4 py-2.5 text-sm font-bold"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EBEBEB',
                  color: '#111111',
                  fontFamily: 'var(--font-tajawal)',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
                }}
              >
                📦 12 طلب اليوم
              </div>

              {/* Floating badge — online */}
              <div
                className="absolute -top-3 -left-3 rounded-full shadow-lg px-3 py-2 text-xs font-bold flex items-center gap-1.5"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #EBEBEB',
                  color: '#111111',
                  fontFamily: 'var(--font-tajawal)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                }}
              >
                <span
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: '#10b981' }}
                />
                متجر مباشر
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Row ────────────────────────────────── */}
        <div
          ref={statsRef as any}
          className="mt-16 md:mt-20 flex items-center justify-center flex-wrap gap-0"
        >
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center">
              <StatItem {...stat} />
              {i < STATS.length - 1 && (
                <div
                  className="hidden sm:block w-px h-10 opacity-20"
                  style={{ backgroundColor: '#111111' }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
