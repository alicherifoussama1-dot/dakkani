'use client'

import { useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

const REVIEWS = [
  {
    name: 'سارة بن عمر',
    role: 'صاحبة متجر أزياء',
    wilaya: 'وهران',
    flag: '🏙️',
    quote: 'دكاني غيّر حياتي! فتحت متجري في أقل من ساعة وصلتلي أول طلبية من قسنطينة. الآن عندي أكثر من 200 عميل من كل الجزائر.',
    rating: 5,
    avatar: '👩',
    bg: '#FDF2F8',
    accent: '#EC4899',
  },
  {
    name: 'محمد لعموري',
    role: 'تاجر إلكترونيات',
    wilaya: 'قسنطينة',
    flag: '🕌',
    quote: 'المنصة سهلة جداً واحترافية. إدارة المخزون والطلبات صارت أسهل بكثير. وخدمة العملاء تجاوبت معايا في 5 دقائق!',
    rating: 5,
    avatar: '👨',
    bg: '#EEF2FF',
    accent: '#4F46E5',
  },
  {
    name: 'أمينة بوغازي',
    role: 'صاحبة متجر حلويات',
    wilaya: 'تيزي وزو',
    flag: '🌄',
    quote: 'كنت خايفة من البيع أونلاين، بس دكاني خلاها سهلة. الآن عندي متجر احترافي وأبيع لكل الولايات. شكراً دكاني!',
    rating: 5,
    avatar: '👩‍🍳',
    bg: '#FFFBEB',
    accent: '#D97706',
  },
  {
    name: 'عبد الرحمن قاسمي',
    role: 'تاجر رياضة',
    wilaya: 'الجزائر العاصمة',
    flag: '🏟️',
    quote: 'دكاني الأفضل للسوق الجزائري. الدفع عند الاستلام والتوصيل لـ48 ولاية ميزة لا تتوفر في غيره.',
    rating: 5,
    avatar: '👨‍💼',
    bg: '#ECFDF5',
    accent: '#059669',
  },
  {
    name: 'نور الهدى تومي',
    role: 'صاحبة متجر مستحضرات',
    wilaya: 'بجاية',
    flag: '🌊',
    quote: 'الردود الذكية بالدارجة حلت مشكلة التواصل مع العملاء تماماً. متجري نما 300% في أقل من 6 أشهر.',
    rating: 5,
    avatar: '💄',
    bg: '#F5F3FF',
    accent: '#7C3AED',
  },
  {
    name: 'كمال زروق',
    role: 'صاحب متجر أثاث',
    wilaya: 'سطيف',
    flag: '🏛️',
    quote: 'ما كنتش نتوقع يجي عندي طلبيات من 12 ولاية مختلفة! دكاني وسّع مبيعاتي بشكل ما تخيلتوش قبل.',
    rating: 5,
    avatar: '🛋️',
    bg: '#F0F9FF',
    accent: '#0EA5E9',
  },
]

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: '#FBBF24', fontSize: 14 }}>★</span>
      ))}
    </div>
  )
}

function ReviewCard({
  r, i, inView, prefersReduced,
}: {
  r: typeof REVIEWS[0]; i: number; inView: boolean; prefersReduced: boolean | null
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false })

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={e => {
        if (prefersReduced) return
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 10
        const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -10
        setTilt({ x, y, active: true })
      }}
      onMouseLeave={() => setTilt({ x: 0, y: 0, active: false })}
      style={{
        background: r.bg, borderRadius: 24, padding: 28,
        border: `1px solid ${r.accent}18`,
        transform: !prefersReduced
          ? `perspective(900px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`
          : 'none',
        transition: tilt.active
          ? 'transform 0.1s ease, box-shadow 0.15s'
          : 'transform 0.4s ease, box-shadow 0.2s',
        boxShadow: tilt.active
          ? `0 20px 48px ${r.accent}18`
          : '0 2px 8px rgba(0,0,0,0.04)',
        cursor: 'default',
        height: '100%',
        display: 'flex', flexDirection: 'column',
      }}>
      {/* Opening quote */}
      <div style={{
        fontSize: 40, color: r.accent, opacity: 0.25,
        lineHeight: 1, marginBottom: 6,
        fontFamily: 'Georgia, serif', direction: 'ltr',
      }}>&ldquo;</div>

      <p style={{
        fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#475569',
        lineHeight: 1.85, margin: '0 0 20px', flex: 1,
      }}>{r.quote}</p>

      <Stars count={r.rating} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%',
          background: `${r.accent}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, flexShrink: 0,
        }}>{r.avatar}</div>
        <div>
          <div style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 14,
            color: '#0F172A',
          }}>{r.name}</div>
          <div style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 12, color: '#94A3B8',
          }}>{r.role} · {r.flag} {r.wilaya}</div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Testimonials() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()
  const [mobileIndex, setMobileIndex] = useState(0)

  return (
    <section id="testimonials" ref={ref} style={{
      background: '#FFFFFF', padding: '100px 0', overflow: 'hidden',
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
            background: '#FFFBEB', borderRadius: 100, padding: '7px 18px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 700, color: '#D97706' }}>
              ⭐ آراء التجار
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px, 4vw, 44px)', color: '#0F172A',
            lineHeight: 1.3, margin: '0 0 12px',
          }}>ماذا يقول تجارنا</h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 6 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ color: '#FBBF24', fontSize: 20 }}>★</span>
            ))}
          </div>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#94A3B8',
          }}>4.9/5 من أكثر من 2,000 تقييم</p>
        </motion.div>

        {/* Desktop 3-col grid */}
        <div className="testimonials-desktop" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
        }}>
          {REVIEWS.slice(0, 3).map((r, i) => (
            <ReviewCard key={i} r={r} i={i} inView={inView} prefersReduced={prefersReduced} />
          ))}
        </div>

        {/* Second row — only on large screens */}
        <div className="testimonials-row2" style={{
          display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginTop: 20,
        }}>
          {REVIEWS.slice(3).map((r, i) => (
            <ReviewCard key={i} r={r} i={i + 3} inView={inView} prefersReduced={prefersReduced} />
          ))}
        </div>

        {/* Mobile scroll carousel */}
        <div className="testimonials-mobile" style={{ display: 'none' }}>
          <div
            style={{
              display: 'flex', gap: 16,
              overflowX: 'auto', scrollSnapType: 'x mandatory',
              paddingBottom: 12, cursor: 'grab',
            }}
            className="scrollbar-none">
            {REVIEWS.map((r, i) => (
              <div key={i} style={{
                minWidth: 'calc(90vw - 48px)', maxWidth: 360,
                scrollSnapAlign: 'center', flexShrink: 0,
              }}>
                <ReviewCard r={r} i={i} inView={inView} prefersReduced={prefersReduced} />
              </div>
            ))}
          </div>

          {/* Dot indicators */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
            {REVIEWS.map((_, i) => (
              <div key={i} style={{
                width: i === mobileIndex ? 20 : 6,
                height: 6, borderRadius: 3,
                background: i === mobileIndex ? '#4F46E5' : '#E2E8F0',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .testimonials-desktop { display: none !important; }
          .testimonials-row2    { display: none !important; }
          .testimonials-mobile  { display: block !important; }
        }
        @media (min-width: 901px) and (max-width: 1100px) {
          .testimonials-row2 { display: none !important; }
        }
      `}</style>
    </section>
  )
}
