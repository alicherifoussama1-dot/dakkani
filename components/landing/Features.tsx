'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useT, useRaw } from '@/lib/i18n/react'

const FEATURES = [
  {
    id: 'store',
    size: 'large',
    icon: '🏪',
            color: '#4F46E5', bg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
    borderColor: 'rgba(79,70,229,0.12)',
  },
  {
    id: 'delivery',
    size: 'medium',
    icon: '🚚',
            color: '#059669', bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
    borderColor: 'rgba(5,150,105,0.1)',
  },
  {
    id: 'ai',
    size: 'medium',
    icon: '🤖',
            color: '#7C3AED', bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
    borderColor: 'rgba(124,58,237,0.1)',
  },
  {
    id: 'analytics',
    size: 'small',
    icon: '📊',
            color: '#0EA5E9', bg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
    borderColor: 'rgba(14,165,233,0.1)',
  },
  {
    id: 'cod',
    size: 'small',
    icon: '💵',
            color: '#D97706', bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
    borderColor: 'rgba(217,119,6,0.1)',
  },
  {
    id: 'tracking',
    size: 'small',
    icon: '📍',
            color: '#EC4899', bg: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
    borderColor: 'rgba(236,72,153,0.1)',
  },
  {
    id: 'inventory',
    size: 'small',
    icon: '📦',
            color: '#14B8A6', bg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
    borderColor: 'rgba(20,184,166,0.1)',
  },
]

function MiniStorePreview() {
  return (
    <div style={{
      background: '#fff', borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(79,70,229,0.12)', marginTop: 20,
      border: '1px solid rgba(79,70,229,0.08)',
    }}>
      {/* Fake browser */}
      <div style={{
        background: '#F8FAFC', padding: '7px 12px',
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: '1px solid #E2E8F0',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => (
            <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1, background: '#fff', borderRadius: 4, height: 17,
          display: 'flex', alignItems: 'center', padding: '0 8px',
          border: '1px solid #E2E8F0',
        }}>
          <span style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'var(--font-inter)' }}>
            متجري.Commerco.دز
          </span>
        </div>
      </div>
      {/* Product grid */}
      <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 7 }}>
        {[
          '#EEF2FF','#FDF2F8','#ECFDF5',
          '#FFFBEB','#F0F9FF','#F5F3FF',
        ].map((bg, i) => (
          <div key={i} style={{
            background: bg, borderRadius: 8,
            height: i < 3 ? 48 : 28,
          }} />
        ))}
      </div>
      {/* Cart bar */}
      <div style={{
        padding: '7px 12px', borderTop: '1px solid #E2E8F0',
        display: 'flex', gap: 8,
      }}>
        <div style={{ flex: 1, height: 22, background: '#EEF2FF', borderRadius: 5 }} />
        <div style={{
          width: 60, height: 22, borderRadius: 5,
          background: 'linear-gradient(135deg,#4F46E5,#4338CA)',
        }} />
      </div>
    </div>
  )
}

export default function Features() {
  const t = useT()
  const FT = FEATURES.map((f, i) => ({ ...f, title: t(`landing.features.items.${i}.title`), desc: t(`landing.features.items.${i}.desc`) }))
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  const cardHover = (color: string) => ({
    y: prefersReduced ? 0 : -4,
    boxShadow: `0 16px 48px ${color}20`,
    transition: { duration: 0.2 },
  })

  return (
    <section id="features" ref={ref} style={{ background: '#F8FAFC', padding: '100px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', borderRadius: 100, padding: '7px 18px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 700, color: '#4F46E5' }}>
              {t('landing.features.eyebrow')}
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 44px)', color: '#0F172A',
            lineHeight: 1.3, margin: '0 0 14px',
          }}>
            {t('landing.features.title')}
          </h2>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 16, color: '#475569',
            lineHeight: 1.8, maxWidth: 520, margin: '0 auto',
          }}>{t('landing.features.sub')}</p>
        </motion.div>

        {/* Bento Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridAutoRows: 'auto',
          gap: 16,
        }}
          className="features-bento">

          {/* Large card — col-span 2, row-span 2 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            whileHover={cardHover(FT[0].color)}
            style={{
              gridColumn: 'span 2', gridRow: 'span 2',
              background: FT[0].bg, borderRadius: 24, padding: 32,
              border: `1px solid ${FT[0].borderColor}`,
              cursor: 'default', transition: 'box-shadow 0.2s, transform 0.2s',
            }}>
            <div style={{
              width: 54, height: 54, borderRadius: 14, background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, marginBottom: 16,
              boxShadow: '0 2px 10px rgba(79,70,229,0.1)',
            }}>{FT[0].icon}</div>
            <h3 style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 22,
              color: '#0F172A', margin: '0 0 10px',
            }}>{FT[0].title}</h3>
            <p style={{
              fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#475569',
              lineHeight: 1.8, margin: 0, maxWidth: 320,
            }}>{FT[0].desc}</p>
            <MiniStorePreview />
          </motion.div>

          {/* Medium cards (col-span 1 each, filling right 2 cols × 2 rows) */}
          {FT.slice(1, 3).map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: (i + 1) * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={cardHover(f.color)}
              style={{
                background: f.bg, borderRadius: 24, padding: 28,
                border: `1px solid ${f.borderColor}`,
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}>
              <div style={{
                width: 46, height: 46, borderRadius: 12, background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 14,
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}>{f.icon}</div>
              <h3 style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 17,
                color: '#0F172A', margin: '0 0 8px',
              }}>{f.title}</h3>
              <p style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#475569',
                lineHeight: 1.75, margin: 0,
              }}>{f.desc}</p>
            </motion.div>
          ))}

          {/* Small cards — span 1 each */}
          {FT.slice(3).map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: (i + 3) * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={cardHover(f.color)}
              style={{
                background: f.bg, borderRadius: 24, padding: 24,
                border: `1px solid ${f.borderColor}`,
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}>
              <div style={{
                width: 42, height: 42, borderRadius: 11, background: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, marginBottom: 12,
              }}>{f.icon}</div>
              <h3 style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 15,
                color: '#0F172A', margin: '0 0 6px',
              }}>{f.title}</h3>
              <p style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 12, color: '#475569',
                lineHeight: 1.65, margin: 0,
              }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .features-bento { grid-template-columns: 1fr 1fr !important; }
          .features-bento > div:first-child { grid-column: span 2 !important; grid-row: span 1 !important; }
        }
        @media (max-width: 520px) {
          .features-bento { grid-template-columns: 1fr !important; }
          .features-bento > div:first-child { grid-column: span 1 !important; }
        }
      `}</style>
    </section>
  )
}
