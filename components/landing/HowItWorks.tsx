'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

const STEPS = [
  {
    number: '01',
    icon: '✍️',
    title: 'سجّل مجاناً',
    desc: 'أنشئ حسابك في 30 ثانية بدون بطاقة بنكية. اختر اسم متجرك وابدأ مباشرة.',
    color: '#4F46E5',
    bg: '#EEF2FF',
  },
  {
    number: '02',
    icon: '📦',
    title: 'أضف منتجاتك',
    desc: 'أضف صور منتجاتك وأسعارها ومخزونها. يمكنك الاستيراد من ملف Excel أو إضافتها يدوياً.',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    number: '03',
    icon: '💰',
    title: 'ابدأ البيع',
    desc: 'شارك رابط متجرك على وسائل التواصل الاجتماعي واستلم طلباتك من 48 ولاية.',
    color: '#059669',
    bg: '#ECFDF5',
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section id="how-it-works" ref={ref} style={{
      background: '#FFFFFF', padding: '100px 0',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', borderRadius: 100, padding: '6px 16px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>
              ✦ كيف يعمل
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px,4vw,44px)', color: '#0F172A',
            lineHeight: 1.3, margin: 0,
          }}>
            3 خطوات فقط للبدء
          </h2>
        </motion.div>

        {/* Steps */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 24,
          position: 'relative',
        }}>
          {/* SVG connecting line — desktop only */}
          <div style={{
            position: 'absolute',
            top: 60, right: '16.67%', left: '16.67%',
            height: 2, zIndex: 0,
            overflow: 'hidden',
          }}
            className="steps-line"
          >
            <svg width="100%" height="2" style={{ overflow: 'visible' }}>
              <motion.path
                d="M 0 1 Q 50% 1 100% 1"
                fill="none"
                stroke="#C7D2FE"
                strokeWidth={2}
                strokeDasharray="6 4"
                initial={{ pathLength: 0 }}
                animate={inView ? { pathLength: 1 } : {}}
                transition={{ duration: 1.5, delay: 0.3, ease: 'easeInOut' }}
              />
            </svg>
          </div>

          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15 + 0.2, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: 'relative', zIndex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                textAlign: 'center',
              }}>
              {/* Number badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={inView ? { scale: 1 } : {}}
                transition={{ delay: i * 0.15 + 0.4, duration: 0.4, type: 'spring', stiffness: 300 }}
                style={{
                  width: 72, height: 72,
                  borderRadius: '50%',
                  background: step.bg,
                  border: `2px solid ${step.color}22`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, marginBottom: 20,
                  boxShadow: `0 8px 24px ${step.color}20`,
                  position: 'relative',
                }}>
                {step.icon}

                {/* Step number */}
                <div style={{
                  position: 'absolute', top: -8, right: -8,
                  width: 24, height: 24, borderRadius: '50%',
                  background: step.color, color: '#fff',
                  fontFamily: 'var(--font-inter)', fontWeight: 700, fontSize: 11,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>{step.number}</div>
              </motion.div>

              {/* Card */}
              <div style={{
                background: '#F8FAFC', borderRadius: 20, padding: '28px 24px',
                border: '1px solid #E2E8F0', width: '100%',
                transition: 'box-shadow 0.2s',
              }}
                onMouseEnter={e => !prefersReduced && ((e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${step.color}15`)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.boxShadow = 'none')}
              >
                <h3 style={{
                  fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 20,
                  color: '#0F172A', margin: '0 0 10px',
                }}>{step.title}</h3>
                <p style={{
                  fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#475569',
                  lineHeight: 1.8, margin: 0,
                }}>{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA below steps */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.8, duration: 0.5 }}
          style={{ textAlign: 'center', marginTop: 56 }}>
          <motion.a
            href="/auth/register"
            whileHover={{ scale: 1.04, boxShadow: '0 12px 32px rgba(79,70,229,0.35)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
              color: '#fff', fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 15,
              padding: '14px 32px', borderRadius: 14, textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(79,70,229,0.25)',
            }}>
            ابدأ الآن مجاناً
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l7-7m-7 7l7 7" />
            </svg>
          </motion.a>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .steps-line { display: none !important; }
        }
      `}</style>
    </section>
  )
}
