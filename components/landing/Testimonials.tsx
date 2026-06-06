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
    quote: 'كنت خايفة من الإنترنت والبيع أونلاين، بس دكاني خلاها سهلة. الآن عندي متجر احترافي وأبيع لكل الولايات. شكراً دكاني!',
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
    quote: 'مقارنة بالمنصات الأخرى، دكاني الأفضل للسوق الجزائري. الدفع عند الاستلام والتوصيل لـ48 ولاية ميزة لا تتوفر في غيره.',
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
    quote: 'الردود الذكية بالدارجة حلت مشكلة التواصل مع العملاء تماماً. متجري نما 300% في أقل من 6 أشهر مع دكاني.',
    rating: 5,
    avatar: '💄',
    bg: '#F5F3FF',
    accent: '#7C3AED',
  },
]

function Stars({ count }: { count: number }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} style={{ color: '#FBBF24', fontSize: 13 }}>★</span>
      ))}
    </div>
  )
}

function TiltCard({ r, i, inView, prefersReduced }: { r: typeof REVIEWS[0]; i: number; inView: boolean; prefersReduced: boolean | null }) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (prefersReduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 10
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * -10
    setTilt({ x, y })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      style={{
        background: r.bg, borderRadius: 24, padding: 28,
        border: `1px solid ${r.accent}18`,
        transform: prefersReduced ? 'none' : `perspective(800px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        transition: 'transform 0.15s ease, box-shadow 0.2s',
        cursor: 'default',
        boxShadow: tilt.x !== 0 ? `0 16px 40px ${r.accent}15` : '0 2px 8px rgba(0,0,0,0.04)',
      }}>
      {/* Quote mark */}
      <div style={{
        fontSize: 36, color: r.accent, opacity: 0.3, lineHeight: 1,
        fontFamily: 'Georgia, serif', marginBottom: 8, direction: 'ltr',
      }}>"</div>

      <p style={{
        fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#475569',
        lineHeight: 1.8, margin: '0 0 20px',
      }}>{r.quote}</p>

      <Stars count={r.rating} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: r.accent + '20',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22,
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
  const [scrollIndex, setScrollIndex] = useState(0)

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
            background: '#FFFBEB', borderRadius: 100, padding: '6px 16px', marginBottom: 16,
          }}>
            <span style={{ fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600, color: '#D97706' }}>
              ⭐ آراء التجار
            </span>
          </div>
          <h2 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(28px,4vw,44px)', color: '#0F172A',
            lineHeight: 1.3, margin: '0 0 12px',
          }}>
            ماذا يقول تجارنا
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginBottom: 8 }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} style={{ color: '#FBBF24', fontSize: 20 }}>★</span>
            ))}
          </div>
          <p style={{
            fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#94A3B8',
          }}>4.9/5 من أكثر من 2,000 تقييم</p>
        </motion.div>

        {/* Desktop grid */}
        <div className="testimonials-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 20,
        }}>
          {REVIEWS.slice(0, 3).map((r, i) => (
            <TiltCard key={i} r={r} i={i} inView={inView} prefersReduced={prefersReduced} />
          ))}
        </div>

        {/* Mobile scroll */}
        <div className="testimonials-mobile" style={{ display: 'none' }}>
          <div style={{
            display: 'flex', gap: 16,
            overflowX: 'auto', scrollSnapType: 'x mandatory',
            paddingBottom: 16,
            scrollbarWidth: 'none',
          }}>
            {REVIEWS.map((r, i) => (
              <div key={i} style={{
                minWidth: '85vw', scrollSnapAlign: 'center',
              }}>
                <TiltCard r={r} i={i} inView={inView} prefersReduced={prefersReduced} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .testimonials-grid { display: none !important; }
          .testimonials-mobile { display: block !important; }
        }
      `}</style>
    </section>
  )
}
