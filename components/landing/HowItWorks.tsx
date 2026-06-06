'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

const STEPS = [
  {
    number: '01',
    icon: '✍️',
    title: 'سجّل مجاناً',
    desc: 'أنشئ حسابك في 30 ثانية بدون بطاقة بنكية. اختر اسم متجرك وابدأ مباشرة.',
    color: '#4F46E5', bg: '#EEF2FF', border: 'rgba(79,70,229,0.15)',
    detail: '30 ثانية فقط',
  },
  {
    number: '02',
    icon: '📦',
    title: 'أضف منتجاتك',
    desc: 'أضف صور منتجاتك وأسعارها ومخزونها. يمكنك الاستيراد من Excel أو إضافتها يدوياً.',
    color: '#7C3AED', bg: '#F5F3FF', border: 'rgba(124,58,237,0.15)',
    detail: 'استيراد Excel',
  },
  {
    number: '03',
    icon: '💰',
    title: 'ابدأ البيع',
    desc: 'شارك رابط متجرك على وسائل التواصل واستلم طلباتك من 48 ولاية.',
    color: '#059669', bg: '#ECFDF5', border: 'rgba(5,150,105,0.15)',
    detail: '48 ولاية',
  },
]

export default function HowItWorks() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section id="how-it-works" ref={ref} style={{ background: '#FFFFFF', padding: '100px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 72 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', borderRadius: 100, padding: '7px 18px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>
              ✦ كيف يعمل
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 44px)', color: '#0F172A',
            lineHeight: 1.3, margin: '0 0 14px',
          }}>3 خطوات فقط للبدء</h2>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 15, color: '#94A3B8',
          }}>أسرع بداية في منصات التجارة الإلكترونية بالجزائر</p>
        </motion.div>

        {/* Desktop: horizontal steps + connecting SVG line */}
        <div style={{ position: 'relative' }}>
          {/* SVG connecting line — desktop only */}
          <div className="hiw-line" style={{
            position: 'absolute', top: 56,
            right: '16.67%', left: '16.67%',
            height: 2, zIndex: 0, overflow: 'visible',
            pointerEvents: 'none',
          }}>
            <svg width="100%" height="2" overflow="visible">
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6"
                  refX="3" refY="3" orient="auto">
                  <circle cx="3" cy="3" r="2" fill="#C7D2FE" />
                </marker>
              </defs>
              <motion.line
                x1="0" y1="1" x2="100%" y2="1"
                stroke="#C7D2FE" strokeWidth={2} strokeDasharray="8 5"
                initial={{ pathLength: 0 }}
                animate={inView ? { pathLength: 1 } : {}}
                transition={{ duration: 1.8, delay: 0.4, ease: 'easeInOut' }}
              />
            </svg>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 24, position: 'relative', zIndex: 1,
          }}
            className="hiw-grid">
            {STEPS.map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: i * 0.18 + 0.2, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  textAlign: 'center',
                }}>
                {/* Icon circle */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={inView ? { scale: 1 } : {}}
                  transition={{ delay: i * 0.18 + 0.4, type: 'spring', stiffness: 280, damping: 20 }}
                  style={{
                    width: 76, height: 76, borderRadius: '50%',
                    background: step.bg,
                    border: `2px solid ${step.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 32, marginBottom: 24,
                    boxShadow: `0 8px 28px ${step.color}20`,
                    position: 'relative',
                  }}>
                  {step.icon}
                  {/* Step badge */}
                  <div style={{
                    position: 'absolute', top: -8, left: -8,
                    width: 26, height: 26, borderRadius: '50%',
                    background: step.color, color: '#fff',
                    fontFamily: 'var(--font-inter)', fontWeight: 800, fontSize: 11,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 2px 8px ${step.color}40`,
                  }}>{step.number}</div>
                </motion.div>

                {/* Card */}
                <div style={{
                  background: '#F8FAFC', borderRadius: 20, padding: '28px 22px',
                  border: '1px solid #E2E8F0', width: '100%',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                }}
                  onMouseEnter={e => {
                    if (prefersReduced) return
                    const el = e.currentTarget as HTMLElement
                    el.style.boxShadow = `0 12px 32px ${step.color}12`
                    el.style.transform = 'translateY(-3px)'
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.boxShadow = 'none'
                    el.style.transform = 'none'
                  }}>
                  {/* Detail pill */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center',
                    background: step.bg, borderRadius: 100,
                    padding: '3px 10px', marginBottom: 10,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-tajawal)', fontSize: 11, fontWeight: 700,
                      color: step.color,
                    }}>{step.detail}</span>
                  </div>

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
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.9, duration: 0.5 }}
          style={{ textAlign: 'center', marginTop: 56 }}>
          <motion.a
            href="/auth/register"
            whileHover={{ scale: 1.04, boxShadow: '0 12px 32px rgba(79,70,229,0.35)' }}
            whileTap={{ scale: 0.97 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
              color: '#fff', fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 15,
              padding: '14px 32px', borderRadius: 14, textDecoration: 'none',
              boxShadow: '0 6px 20px rgba(79,70,229,0.25)',
            }}>
            ابدأ الآن مجاناً
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24"
              stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l7-7m-7 7l7 7" />
            </svg>
          </motion.a>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .hiw-line { display: none !important; }
          .hiw-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  )
}
