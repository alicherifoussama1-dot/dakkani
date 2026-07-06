'use client'

import { useState, useRef } from 'react'
import { motion, useInView, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useT, useRaw } from '@/lib/i18n/react'

const PLANS = [
  {
    id: 'free',
        priceMonthly: 0,
    priceAnnual: 0,
    currency: 'DZD',
        highlight: false,
    badge: null,
    color: '#475569',
    accentBg: '#F8FAFC',
        ctaVariant: 'outline' as const,
    features: [
      { text: '',          ok: true  },
      { text: '',               ok: true  },
      { text: '',            ok: true  },
      { text: '',       ok: true  },
      { text: '',            ok: true  },
      { text: '',             ok: true  },
      { text: '',        ok: false },
      { text: '',        ok: false },
      { text: '',              ok: false },
      { text: '',           ok: false },
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 2500,
    priceAnnual: 2000,
    currency: 'DZD',
        highlight: true,
        color: '#4F46E5',
    accentBg: '#EEF2FF',
        ctaVariant: 'solid' as const,
    features: [
      { text: '',         ok: true  },
      { text: '',        ok: true  },
      { text: '',             ok: true  },
      { text: '',        ok: true  },
      { text: '',             ok: true  },
      { text: '',          ok: true  },
      { text: '',         ok: true  },
      { text: '',         ok: true  },
      { text: '',               ok: true  },
      { text: '',            ok: false },
    ],
  },
  {
    id: 'business',
    name: 'Business',
    priceMonthly: 6000,
    priceAnnual: 4800,
    currency: 'DZD',
        highlight: false,
    badge: null,
    color: '#0F172A',
    accentBg: '#F8FAFC',
        ctaVariant: 'dark' as const,
    features: [
      { text: '',         ok: true  },
      { text: '',         ok: true  },
      { text: '',              ok: true  },
      { text: '',         ok: true  },
      { text: '',              ok: true  },
      { text: '',           ok: true  },
      { text: '',          ok: true  },
      { text: '',          ok: true  },
      { text: '',                ok: true  },
      { text: '',       ok: true  },
    ],
  },
]

function CheckIcon({ ok, color }: { ok: boolean; color: string }) {
  if (ok) return (
    <span style={{
      width: 20, height: 20, borderRadius: '50%',
      background: color === '#4F46E5' ? '#EEF2FF' : '#F0FFF4',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
        <path d="M1 4.5L3.8 7.5L10 1" stroke={color === '#4F46E5' ? '#4F46E5' : '#059669'}
          strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
  return (
    <span style={{
      width: 20, height: 20, borderRadius: '50%',
      background: '#F1F5F9',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width="10" height="2" viewBox="0 0 10 2" fill="none">
        <path d="M1 1H9" stroke="#CBD5E1" strokeWidth={2} strokeLinecap="round" />
      </svg>
    </span>
  )
}

export default function Pricing() {
  const t = useT()
  const raw = useRaw()
  const PT: any[] = PLANS.map((p: any, i: number) => { const c = ((raw('landing.pricing.plans') as any[]) ?? [])[i] ?? {}; return { ...p, name: c.name ?? p.name, desc: c.desc ?? p.desc, cta: c.cta ?? p.cta, badge: (p as any).badge ? (c.badge || (p as any).badge) : (p as any).badge, currency: c.currency ?? p.currency, features: p.features.map((x: any, j: number) => ({ ...x, text: c.features?.[j] ?? x.text })) } })
  const [annual, setAnnual] = useState(false)
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section id="pricing" ref={ref} style={{ background: '#F8FAFC', padding: '100px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', borderRadius: 100, padding: '7px 18px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>
              {t('landing.pricing.eyebrow')}
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 44px)', color: '#0F172A',
            lineHeight: 1.3, margin: '0 0 32px',
          }}>{t('landing.pricing.title')}</h2>

          {/* Billing toggle */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 0,
            background: '#fff', borderRadius: 50, padding: '5px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          }}>
            <button
              onClick={() => setAnnual(false)}
              style={{
                padding: '9px 22px', borderRadius: 50, border: 'none',
                background: !annual ? '#4F46E5' : 'transparent',
                color: !annual ? '#fff' : '#64748B',
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s',
              }}>{t('landing.pricing.monthly')}</button>
            <button
              onClick={() => setAnnual(true)}
              style={{
                padding: '9px 22px', borderRadius: 50, border: 'none',
                background: annual ? '#4F46E5' : 'transparent',
                color: annual ? '#fff' : '#64748B',
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 13,
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              {t('landing.pricing.annual')}
              <AnimatePresence>
                {annual ? null : (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    style={{
                      background: '#DCFCE7', color: '#16A34A',
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 10,
                      fontFamily: 'var(--font-tajawal)',
                    }}>{t('landing.pricing.save20')}</motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>
        </motion.div>

        {/* Plans grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20, alignItems: 'start',
        }}
          className="pricing-grid">
          {PT.map((plan, i) => {
            const price = annual ? plan.priceAnnual : plan.priceMonthly
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  background: '#fff', borderRadius: 24, padding: 32,
                  border: plan.highlight ? '2px solid #4F46E5' : '1.5px solid #E2E8F0',
                  position: 'relative',
                  boxShadow: plan.highlight
                    ? '0 20px 60px rgba(79,70,229,0.16)'
                    : '0 2px 8px rgba(0,0,0,0.04)',
                  transform: plan.highlight ? 'scale(1.02)' : 'scale(1)',
                  transition: 'box-shadow 0.2s',
                }}
                whileHover={prefersReduced ? {} : {
                  boxShadow: plan.highlight
                    ? '0 28px 72px rgba(79,70,229,0.22)'
                    : '0 8px 28px rgba(0,0,0,0.08)',
                }}>

                {/* Badge */}
                {plan.badge && (
                  <div style={{
                    position: 'absolute', top: -15, right: 24,
                    background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                    color: '#fff', fontFamily: 'var(--font-tajawal)',
                    fontWeight: 700, fontSize: 12,
                    padding: '5px 16px', borderRadius: 50,
                    boxShadow: '0 4px 14px rgba(79,70,229,0.35)',
                  }}>{plan.badge}</div>
                )}

                {/* Plan name */}
                <div style={{ marginBottom: 6 }}>
                  <span style={{
                    fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 20,
                    color: plan.highlight ? '#4F46E5' : '#0F172A',
                  }}>{plan.name}</span>
                </div>
                <p style={{
                  fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#94A3B8',
                  marginBottom: 20, lineHeight: 1.6,
                }}>{plan.desc}</p>

                {/* Price */}
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
                          fontFamily: 'var(--font-tajawal)', fontWeight: 900, fontSize: 38,
                          color: plan.highlight ? '#4F46E5' : '#0F172A',
                        }}>{t('landing.pricing.free_label')}</span>
                      ) : (
                        <>
                          <span style={{
                            fontFamily: 'var(--font-inter)', fontWeight: 800, fontSize: 38,
                            color: plan.highlight ? '#4F46E5' : '#0F172A',
                          }}>{price.toLocaleString()}</span>
                          <span style={{
                            fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#94A3B8',
                          }}>{plan.currency}{t('landing.pricing.per_month')}</span>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                  {annual && price > 0 && (
                    <div style={{
                      fontFamily: 'var(--font-tajawal)', fontSize: 12, color: '#16A34A', marginTop: 4,
                    }}>
                      {t('landing.pricing.save_year', { amount: ((plan.priceMonthly - plan.priceAnnual) * 12).toLocaleString() })}
                    </div>
                  )}
                </div>

                {/* CTA */}
                <a href="/auth/register" style={{
                  display: 'block', textAlign: 'center',
                  padding: '13px', borderRadius: 14, textDecoration: 'none',
                  fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 14,
                  marginBottom: 28, transition: 'all 0.2s',
                  ...(plan.ctaVariant === 'solid' ? {
                    background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
                    color: '#fff', boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
                  } : plan.ctaVariant === 'dark' ? {
                    background: '#0F172A', color: '#fff',
                  } : {
                    background: 'transparent', color: '#475569',
                    border: '1.5px solid #E2E8F0',
                  }),
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    if (plan.ctaVariant === 'solid')
                      el.style.boxShadow = '0 8px 24px rgba(79,70,229,0.4)'
                    else if (plan.ctaVariant === 'outline')
                      el.style.background = '#F8FAFC'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement
                    if (plan.ctaVariant === 'solid')
                      el.style.boxShadow = '0 4px 16px rgba(79,70,229,0.3)'
                    else if (plan.ctaVariant === 'outline')
                      el.style.background = 'transparent'
                  }}
                >{plan.cta}</a>

                {/* Divider */}
                <div style={{ height: 1, background: '#F1F5F9', marginBottom: 24 }} />

                {/* Feature list */}
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 11 }}>
                  {plan.features.map((f: any, j: number) => (
                    <li key={j} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      fontFamily: 'var(--font-tajawal)', fontSize: 13,
                      color: f.ok ? '#0F172A' : '#CBD5E1',
                    }}>
                      <CheckIcon ok={f.ok} color={plan.color} />
                      {f.text}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
          })}
        </div>

        {/* Bottom note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.6 }}
          style={{ textAlign: 'center', marginTop: 36 }}>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#94A3B8',
          }}>
            {t('landing.pricing.note')}
          </p>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 20,
            marginTop: 16, flexWrap: 'wrap',
          }}>
            {[
              { icon: '🔒', text: '' },
              { icon: '🔄', text: '' },
              { icon: '🎁', text: '' },
            ].map((b, i) => (
              <span key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-tajawal)', fontSize: 12, color: '#64748B',
              }}>
                <span>{b.icon}</span>{t(`landing.pricing.badges.${i}`)}
              </span>
            ))}
          </div>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .pricing-grid { grid-template-columns: 1fr !important; }
          .pricing-grid > div { transform: none !important; }
        }
      `}</style>
    </section>
  )
}
