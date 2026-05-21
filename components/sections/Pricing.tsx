'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useStaggerAnimation } from '@/hooks/useScrollAnimation'

const PLANS = [
  {
    key: 'free',
    name: 'مجاني',
    monthlyPrice: 0,
    annualPrice: 0,
    desc: 'ابدأ بدون مصاريف',
    badge: null,
    featured: false,
    cta: 'ابدأ مجاناً',
    features: [
      'متجر واحد',
      'حتى 20 منتج',
      'توصيل لكل الولايات',
      'دعم عبر البريد',
      '—',
      '—',
    ],
  },
  {
    key: 'pro',
    name: 'Pro',
    monthlyPrice: 2500,
    annualPrice: 2000,
    desc: 'للتجار الجادين',
    badge: 'الأشهر',
    featured: true,
    cta: 'ابدأ تجربة مجانية',
    features: [
      '3 متاجر',
      'منتجات غير محدودة',
      'توصيل لكل الولايات',
      'دعم ذو أولوية',
      'ردود AI بالدارجة',
      'إحصائيات متقدمة',
    ],
  },
  {
    key: 'business',
    name: 'Business',
    monthlyPrice: 6000,
    annualPrice: 4800,
    desc: 'للشركات والمتاجر الكبيرة',
    badge: null,
    featured: false,
    cta: 'تواصل معنا',
    features: [
      'متاجر غير محدودة',
      'منتجات غير محدودة',
      'توصيل + أولوية',
      'مدير حساب مخصص',
      'AI متقدم + API',
      'تقارير مخصصة',
    ],
  },
]

export default function Pricing() {
  const [annual, setAnnual] = useState(false)
  const gridRef = useStaggerAnimation({ staggerDelay: 80 })

  return (
    <section
      className="py-16 md:py-20 px-4"
      id="pricing"
      style={{ backgroundColor: '#FFFFFF' }}
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="section-title">الأسعار</h2>
          <p className="section-subtitle">ابدأ مجاناً، ادفع فقط لما تنمو</p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span
              className="text-sm font-medium"
              style={{ color: !annual ? '#111111' : '#999999', fontFamily: 'var(--font-tajawal)' }}
            >
              شهري
            </span>
            <button
              onClick={() => setAnnual(a => !a)}
              className="relative w-12 h-6 rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-accent"
              style={{ backgroundColor: annual ? '#0D6EFD' : '#EBEBEB' }}
              role="switch"
              aria-checked={annual}
              aria-label="تحويل للاشتراك السنوي"
            >
              <span
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                style={{ right: annual ? '4px' : 'calc(100% - 20px)' }}
              />
            </button>
            <span
              className="text-sm font-medium flex items-center gap-1.5"
              style={{ color: annual ? '#111111' : '#999999', fontFamily: 'var(--font-tajawal)' }}
            >
              سنوي
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: '#EBF5FF', color: '#0D6EFD' }}
              >
                -20%
              </span>
            </span>
          </div>
        </div>

        {/* Plans */}
        <div
          ref={gridRef as any}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6 items-start"
        >
          {PLANS.map(({ key, name, monthlyPrice, annualPrice, desc, badge, featured, cta, features }) => {
            const price = annual ? annualPrice : monthlyPrice
            return (
              <div
                key={key}
                className={`relative rounded-2xl p-6 transition-all ${
                  featured ? 'shadow-lg' : ''
                }`}
                style={{
                  border: featured ? '2px solid #0D6EFD' : '1px solid #EBEBEB',
                  backgroundColor: '#FFFFFF',
                  marginTop: featured ? '0' : '0',
                }}
              >
                {/* Popular badge */}
                {badge && (
                  <div
                    className="absolute -top-3 right-1/2 translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#0D6EFD', color: '#FFFFFF', fontFamily: 'var(--font-tajawal)' }}
                  >
                    {badge}
                  </div>
                )}

                {/* Plan name */}
                <p
                  className="text-sm font-semibold mb-1"
                  style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
                >
                  {name}
                </p>

                {/* Price */}
                <div className="flex items-end gap-1 mb-1">
                  <span
                    className="font-black leading-none"
                    style={{
                      fontSize: 'clamp(32px, 5vw, 40px)',
                      color: '#111111',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    {price.toLocaleString('ar-DZ')}
                  </span>
                  <span style={{ color: '#999999', fontFamily: 'var(--font-tajawal)', paddingBottom: '4px' }}>
                    دج
                  </span>
                  {price > 0 && (
                    <span
                      style={{ color: '#999999', fontFamily: 'var(--font-tajawal)', paddingBottom: '4px' }}
                      className="text-sm"
                    >
                      /شهر
                    </span>
                  )}
                </div>

                <p
                  className="text-xs mb-5"
                  style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
                >
                  {desc}
                </p>

                {/* Features */}
                <ul className="space-y-2.5 mb-6">
                  {features.map((feat, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm"
                      style={{
                        color: feat === '—' ? '#CCCCCC' : '#444444',
                        fontFamily: 'var(--font-tajawal)',
                      }}
                    >
                      {feat !== '—' ? (
                        <Check size={14} style={{ color: '#0D6EFD', flexShrink: 0 }} />
                      ) : (
                        <span className="w-3.5 h-3.5 flex-shrink-0" />
                      )}
                      {feat === '—' ? <span>—</span> : feat}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link
                  href={key === 'business' ? '#contact' : '/auth/register'}
                  className={`btn w-full text-sm h-11 rounded-xl ${
                    featured ? 'btn-accent' : 'btn-outline-accent'
                  }`}
                  style={{ fontFamily: 'var(--font-tajawal)' }}
                >
                  {cta}
                </Link>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
