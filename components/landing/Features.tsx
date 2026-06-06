'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

const FEATURES = [
  {
    id: 'store',
    size: 'large', // 2x2
    icon: '🏪',
    title: 'متجر احترافي في دقائق',
    desc: 'اختر قالبًا جاهزًا، خصّصه بألوانك ولوجوك، وأنشر متجرك فوراً — بدون أي خبرة تقنية أو برمجة.',
    color: '#4F46E5',
    bg: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
    preview: true,
  },
  {
    id: 'delivery',
    size: 'medium',
    icon: '🚚',
    title: 'توصيل لـ 48 ولاية',
    desc: 'تغطية شاملة لكل الجزائر مع شركات الشحن المعتمدة.',
    color: '#059669',
    bg: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
  },
  {
    id: 'ai',
    size: 'medium',
    icon: '🤖',
    title: 'ردود AI بالدارجة',
    desc: 'مساعد ذكي يرد على عملائك بالدارجة الجزائرية تلقائياً.',
    color: '#7C3AED',
    bg: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
  },
  {
    id: 'analytics',
    size: 'small',
    icon: '📊',
    title: 'إحصائيات مباشرة',
    desc: 'تتبّع مبيعاتك وزوارك في الوقت الفعلي.',
    color: '#0EA5E9',
    bg: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
  },
  {
    id: 'cod',
    size: 'small',
    icon: '💵',
    title: 'دفع عند الاستلام',
    desc: 'الطريقة المفضلة للجزائريين — الدفع عند الاستلام.',
    color: '#D97706',
    bg: 'linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)',
  },
  {
    id: 'tracking',
    size: 'small',
    icon: '📍',
    title: 'تتبع الطلبات',
    desc: 'صفحة تتبع للعميل مع إشعارات واتساب تلقائية.',
    color: '#EC4899',
    bg: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
  },
  {
    id: 'inventory',
    size: 'small',
    icon: '📦',
    title: 'إدارة المخزون',
    desc: 'تنبيهات نقص المخزون وإدارة المنتجات بسهولة.',
    color: '#14B8A6',
    bg: 'linear-gradient(135deg, #F0FDFA 0%, #CCFBF1 100%)',
  },
]

function MiniStorePreview() {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(79,70,229,0.12)', marginTop: 16,
      border: '1px solid rgba(79,70,229,0.1)',
    }}>
      {/* Fake browser bar */}
      <div style={{
        background: '#F8FAFC', padding: '8px 12px',
        display: 'flex', alignItems: 'center', gap: 6,
        borderBottom: '1px solid #E2E8F0',
      }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#FF5F57','#FEBC2E','#28C840'].map(c => (
            <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <div style={{
          flex: 1, background: '#fff', borderRadius: 4,
          height: 18, display: 'flex', alignItems: 'center', padding: '0 8px',
          border: '1px solid #E2E8F0',
        }}>
          <span style={{ fontSize: 9, color: '#94A3B8', fontFamily: 'var(--font-inter)' }}>
            متجري.دكاني.دز
          </span>
        </div>
      </div>
      {/* Product grid mockup */}
      <div style={{ padding: 12, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { bg: '#EEF2FF', h: 44 }, { bg: '#FDF2F8', h: 44 }, { bg: '#ECFDF5', h: 44 },
          { bg: '#FFFBEB', h: 28 }, { bg: '#F0F9FF', h: 28 }, { bg: '#F5F3FF', h: 28 },
        ].map((item, i) => (
          <div key={i} style={{
            background: item.bg, borderRadius: 6, height: item.h,
          }} />
        ))}
      </div>
      {/* Add to cart bar */}
      <div style={{
        padding: '8px 12px', borderTop: '1px solid #E2E8F0',
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <div style={{
          flex: 1, height: 24, background: '#EEF2FF', borderRadius: 6,
        }} />
        <div style={{
          width: 60, height: 24, borderRadius: 6,
          background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
        }} />
      </div>
    </div>
  )
}

export default function Features() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section id="features" ref={ref} style={{
      background: '#F8FAFC', padding: '100px 0',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          style={{ textAlign: 'center', marginBottom: 60 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#EEF2FF', borderRadius: 100, padding: '6px 16px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600, color: '#4F46E5' }}>
              ✦ المميزات
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px,4vw,44px)', color: '#0F172A',
            lineHeight: 1.3, margin: '0 0 16px',
          }}>
            كل ما تحتاجه لتنجح في التجارة الإلكترونية
          </h2>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 16, color: '#475569',
            lineHeight: 1.8, maxWidth: 520, margin: '0 auto',
          }}>
            منصة متكاملة صُممت خصيصاً للتاجر الجزائري
          </p>
        </motion.div>

        {/* Bento Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'auto',
          gap: 16,
        }}
          className="bento-grid"
        >
          {/* Large card — 2x2 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            whileHover={prefersReduced ? {} : { y: -4, boxShadow: '0 20px 48px rgba(79,70,229,0.18)' }}
            style={{
              gridColumn: 'span 2',
              gridRow: 'span 2',
              background: FEATURES[0].bg,
              borderRadius: 24, padding: 32,
              border: `1px solid rgba(79,70,229,0.12)`,
              cursor: 'default',
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 26, marginBottom: 16,
              boxShadow: '0 2px 8px rgba(79,70,229,0.1)',
            }}>{FEATURES[0].icon}</div>
            <h3 style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 22,
              color: '#0F172A', margin: '0 0 10px',
            }}>{FEATURES[0].title}</h3>
            <p style={{
              fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#475569',
              lineHeight: 1.8, margin: 0,
            }}>{FEATURES[0].desc}</p>
            <MiniStorePreview />
          </motion.div>

          {/* Medium cards */}
          {FEATURES.slice(1, 3).map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: (i + 1) * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={prefersReduced ? {} : { y: -4, boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
              style={{
                background: f.bg, borderRadius: 24, padding: 28,
                border: '1px solid rgba(0,0,0,0.05)',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 22, marginBottom: 14,
                boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
              }}>{f.icon}</div>
              <h3 style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 17,
                color: '#0F172A', margin: '0 0 8px',
              }}>{f.title}</h3>
              <p style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#475569',
                lineHeight: 1.7, margin: 0,
              }}>{f.desc}</p>
            </motion.div>
          ))}

          {/* Small cards */}
          {FEATURES.slice(3).map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: (i + 3) * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              whileHover={prefersReduced ? {} : { y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.07)' }}
              style={{
                background: f.bg, borderRadius: 24, padding: 24,
                border: '1px solid rgba(0,0,0,0.05)',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, marginBottom: 12,
              }}>{f.icon}</div>
              <h3 style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 15,
                color: '#0F172A', margin: '0 0 6px',
              }}>{f.title}</h3>
              <p style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 12, color: '#475569',
                lineHeight: 1.6, margin: 0,
              }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .bento-grid {
            grid-template-columns: 1fr 1fr !important;
          }
          .bento-grid > *:first-child {
            grid-column: span 2 !important;
            grid-row: span 1 !important;
          }
        }
        @media (max-width: 480px) {
          .bento-grid {
            grid-template-columns: 1fr !important;
          }
          .bento-grid > *:first-child {
            grid-column: span 1 !important;
          }
        }
      `}</style>
    </section>
  )
}
