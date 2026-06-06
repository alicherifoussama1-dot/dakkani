'use client'

import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence, useReducedMotion } from 'framer-motion'

const PLANS = [
  {
    id: 'free',
    name: 'مجاني',
    nameEn: 'Free',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'دج',
    period: 'شهر',
    desc: 'ابدأ مجاناً وجرّب المنصة',
    highlight: false,
    badge: null,
    color: '#475569',
    features: [
      '100 طلب/شهر',
      '10 منتجات',
      'متجر احترافي',
      'توصيل لـ48 ولاية',
      'تتبع الطلبات',
      'دعم بالبريد الإلكتروني',
    ],
    missing: ['ردود AI بالدارجة', 'تقارير متقدمة', 'Confirmili', 'API'],
    cta: 'ابدأ مجاناً',
    ctaStyle: 'outline',
  },
  {
    id: 'pro',
    name: 'Pro',
    nameEn: 'Pro',
    priceMonthly: 2500,
    priceAnnual: 2000,
    currency: 'دج',
    period: 'شهر',
    desc: 'للتاجر الجاد الذي يريد النمو',
    highlight: true,
    badge: 'الأشهر',
    color: '#4F46E5',
    features: [
      '5,000 طلب/شهر',
      'منتجات غير محدودة',
      'ردود AI بالدارجة',
      'Confirmili كاملة',
      'إحصائيات متقدمة',
      'دعم أولوية 24/7',
      'اسم نطاق مخصص',
    ],
    missing: ['API متقدم'],
    cta: 'ابدأ تجربة Pro',
    ctaStyle: 'solid',
  },
  {
    id: 'business',
    name: 'Business',
    nameEn: 'Business',
    priceMonthly: 6000,
    priceAnnual: 4800,
    currency: 'دج',
    period: 'شهر',
    desc: 'للشركات والمتاجر الكبيرة',
    highlight: false,
    badge: null,
    color: '#0F172A',
    features: [
      '50,000 طلب/شهر',
      'كل ميزات Pro',
      'API كامل',
      'تكاملات متقدمة',
      'تقارير مخصصة',
      'مدير حساب مخصص',
      'SLA 99.9% uptime',
    ],
    missing: [],
    cta: 'تواصل معنا',
    ctaStyle: 'dark',
  },
]

function PriceDisplay({ plan, annual }: { plan: typeof PLANS[0]; annual: boolean }) {
  const price = annual ? plan.priceAnnual : plan.priceMonthly

  return (
    <div style={{ marginBottom: 24 }}>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${plan.id}-${annual}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          {price === 0 ? (
            <span style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 900,
              fontSize: 40, color: plan.highlight ? '#4F46E5' : '#0F172A',
            }}>مجاني</span>
          ) : (
            <>
              <span style={{
                fontFamily: 'var(--font-inter)', fontWeight: 800,
                fontSize: 40, color: plan.highlight ? '#4F46E5' : '#0F172A',
              }}>{price.toLocaleString('ar-DZ')}</span>
              <span style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#94A3B8',
              }}>{plan.currency}/{plan.period}</span>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      {annual && price > 0 && (
        <div style={{
          fontFamily: 'var(--font-tajawal)', fontSize: 12, color: '#059669',
          marginTop: 4,
        }}>
          توفر {((plan.priceMonthly - plan.priceAnnual) * 12).toLocaleString('ar-DZ')} دج/سنة
        </div>
      )}
    </div>
  )
}

export default function Pricing() {
  const [annual, setAnnual] = useState(false)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section id="pricing" ref={ref} style={{
      background: '#F8FAFC', padding: '100px 0',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', borderRadius: 100, padding: '6px 16px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>
              ✦ الأسعار
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px,4vw,44px)', color: '#0F172A',
            lineHeight: 1.3, margin: '0 0 32px',
          }}>
            أسعار بسيطة وشفافة
          </h2>

          {/* Toggle */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 12,
            background: '#fff', borderRadius: 50, padding: '6px',
            border: '1.5px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <button
              onClick={() => setAnnual(false)}
              style={{
                padding: '8px 20px', borderRadius: 50, border: 'none',
                background: !annual ? '#4F46E5' : 'transparent',
                color: !annual ? '#fff' : '#475569',
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s',
              }}>شهري</button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                padding: '8px 20px', borderRadius: 50, border: 'none',
                background: annual ? '#4F46E5' : 'transparent',
                color: annual ? '#fff' : '#475569',
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              سنوي
              <span style={{
                background: '#ECFDF5', color: '#059669',
                fontSize: 10, fontWeight: 700,
                padding: '2px 8px', borderRadius: 10,
                fontFamily: 'var(--font-tajawal)',
              }}>خصم 20%</span>
            </button>
          </div>
        </motion.div>

        {/* Plans */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 20,
          alignItems: 'start',
        }}>
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: '#fff',
                borderRadius: 24,
                padding: 32,
                border: plan.highlight ? '2px solid #4F46E5' : '1.5px solid #E2E8F0',
                position: 'relative',
                boxShadow: plan.highlight
                  ? '0 16px 48px rgba(79,70,229,0.15)'
                  : '0 2px 8px rgba(0,0,0,0.04)',
                transform: plan.highlight ? 'scale(1.02)' : 'scale(1)',
                transition: 'box-shadow 0.2s',
              }}
              whileHover={prefersReduced ? {} : {
                boxShadow: plan.highlight
                  ? '0 24px 64px rgba(79,70,229,0.2)'
                  : '0 8px 24px rgba(0,0,0,0.08)',
              }}>
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: -14, right: 24,
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  color: '#fff', fontFamily: 'var(--font-tajawal)',
                  fontWeight: 700, fontSize: 12,
                  padding: '4px 16px', borderRadius: 50,
                  boxShadow: '0 4px 12px rgba(79,70,229,0.3)',
                }}>{plan.badge}</div>
              )}

              <div style={{ marginBottom: 8 }}>
                <span style={{
                  fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 20,
                  color: plan.highlight ? '#4F46E5' : '#0F172A',
                }}>{plan.name}</span>
              </div>

              <p style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#94A3B8',
                marginBottom: 20, lineHeight: 1.6,
              }}>{plan.desc}</p>

              <PriceDisplay plan={plan} annual={annual} />

              <a href="/auth/register" style={{
                display: 'block', textAlign: 'center',
                padding: '12px', borderRadius: 12, textDecoration: 'none',
                fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 14,
                marginBottom: 28, transition: 'all 0.2s',
                ...(plan.ctaStyle === 'solid' ? {
                  background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
                } : plan.ctaStyle === 'dark' ? {
                  background: '#0F172A', color: '#fff',
                } : {
                  background: 'transparent', color: '#475569',
                  border: '1.5px solid #E2E8F0',
                }),
              }}>{plan.cta}</a>

              <div style={{
                height: 1, background: '#E2E8F0', marginBottom: 24,
              }} />

              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map((f, j) => (
                  <li key={j} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#0F172A',
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#EEF2FF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#4F46E5" strokeWidth={1.8} strokeLinecap="round" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
                {plan.missing.map((f, j) => (
                  <li key={j} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#94A3B8',
                  }}>
                    <span style={{
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#F8FAFC',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
                        <path d="M1 1H9" stroke="#94A3B8" strokeWidth={1.8} strokeLinecap="round" />
                      </svg>
                    </span>
                    <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Bottom note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          style={{
            textAlign: 'center', marginTop: 32,
            fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#94A3B8',
          }}>
          جميع الأسعار بالدينار الجزائري · بدون رسوم خفية · إلغاء في أي وقت
        </motion.p>
      </div>
    </section>
  )
}
