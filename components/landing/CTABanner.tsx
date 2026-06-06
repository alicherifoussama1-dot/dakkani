'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

const FLOATING_ITEMS = [
  { emoji: '🛒', x: '8%',  y: '15%', delay: 0,    size: 40 },
  { emoji: '📦', x: '88%', y: '20%', delay: 0.5,  size: 36 },
  { emoji: '💰', x: '15%', y: '75%', delay: 1,    size: 44 },
  { emoji: '🚚', x: '80%', y: '70%', delay: 1.5,  size: 38 },
  { emoji: '⭐', x: '48%', y: '8%',  delay: 0.8,  size: 32 },
  { emoji: '🇩🇿', x: '35%', y: '82%', delay: 1.2, size: 34 },
]

export default function CTABanner() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-80px' })
  const prefersReduced = useReducedMotion()

  return (
    <section ref={ref} style={{ padding: '0 24px 80px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{
          position: 'relative', overflow: 'hidden', borderRadius: 32,
          background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 40%, #3730A3 70%, #312E81 100%)',
          padding: 'clamp(60px, 8vw, 96px) 40px',
          textAlign: 'center',
          boxShadow: '0 32px 80px rgba(79,70,229,0.35), 0 0 0 1px rgba(255,255,255,0.05)',
          minHeight: 360,
        }}>
          {/* Background layers */}
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
            {/* Animated blobs */}
            <motion.div
              animate={prefersReduced ? {} : {
                scale: [1, 1.25, 1], opacity: [0.12, 0.22, 0.12],
              }}
              transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', top: '-30%', right: '-10%',
                width: '55%', height: '130%', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, transparent 70%)',
              }}
            />
            <motion.div
              animate={prefersReduced ? {} : {
                scale: [1, 1.3, 1], opacity: [0.08, 0.16, 0.08],
              }}
              transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
              style={{
                position: 'absolute', bottom: '-40%', left: '-10%',
                width: '50%', height: '140%', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, transparent 70%)',
              }}
            />
            {/* Dot grid */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07 }}>
              <defs>
                <pattern id="ctaDots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
                  <circle cx="1" cy="1" r="1" fill="white" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#ctaDots)" />
            </svg>
          </div>

          {/* Floating emoji — desktop only, reduced-motion disabled */}
          {!prefersReduced && FLOATING_ITEMS.map((item, i) => (
            <motion.div
              key={i}
              className="hidden md:flex"
              initial={{ opacity: 0, scale: 0 }}
              animate={inView ? {
                opacity: 0.35, scale: 1,
                y: [0, -12, 0],
              } : { opacity: 0, scale: 0 }}
              transition={{
                opacity: { delay: item.delay + 0.3, duration: 0.4 },
                scale:   { delay: item.delay + 0.3, duration: 0.4, type: 'spring' },
                y: { delay: item.delay + 0.8, duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' },
              }}
              style={{
                position: 'absolute',
                left: item.x, top: item.y,
                width: item.size, height: item.size,
                alignItems: 'center', justifyContent: 'center',
                fontSize: item.size * 0.6,
                filter: 'blur(0.5px)',
                pointerEvents: 'none',
              }}>
              {item.emoji}
            </motion.div>
          ))}

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 100, padding: '7px 20px', marginBottom: 20,
                color: 'rgba(255,255,255,0.92)',
                fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600,
              }}>
                🚀 انضم لـ 12,000+ تاجر جزائري
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1, duration: 0.5 }}
              style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 900,
                fontSize: 'clamp(32px, 5vw, 60px)',
                color: '#fff', lineHeight: 1.2, margin: '0 0 16px',
              }}>
              جاهز تبدأ تبيع؟
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2, duration: 0.5 }}
              style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 17,
                color: 'rgba(255,255,255,0.8)', lineHeight: 1.75,
                maxWidth: 480, margin: '0 auto 40px',
              }}>
              ابدأ مجاناً اليوم. لا بطاقة بنكية مطلوبة. لا خبرة تقنية.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3, duration: 0.5 }}
              style={{
                display: 'flex', justifyContent: 'center',
                flexWrap: 'wrap', gap: 12,
              }}>
              <motion.a
                href="/auth/register"
                whileHover={prefersReduced ? {} : {
                  scale: 1.06,
                  boxShadow: '0 16px 48px rgba(255,255,255,0.2)',
                }}
                whileTap={{ scale: 0.97 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: '#fff', color: '#4F46E5',
                  fontFamily: 'var(--font-tajawal)', fontWeight: 800, fontSize: 16,
                  padding: '16px 36px', borderRadius: 16, textDecoration: 'none',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  minHeight: 54,
                }}>
                ابدأ مجاناً الآن
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M19 12H5m0 0l7-7m-7 7l7 7" />
                </svg>
              </motion.a>

              <motion.a
                href="#features"
                whileHover={prefersReduced ? {} : { scale: 1.03 }}
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: 'rgba(255,255,255,0.12)',
                  border: '1.5px solid rgba(255,255,255,0.28)',
                  color: '#fff',
                  fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 15,
                  padding: '16px 30px', borderRadius: 16, textDecoration: 'none',
                  minHeight: 54,
                }}>
                اكتشف المميزات
              </motion.a>
            </motion.div>

            {/* Trust row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 }}
              style={{
                display: 'flex', justifyContent: 'center',
                gap: 24, marginTop: 32, flexWrap: 'wrap',
              }}>
              {[
                '✓ مجاني للأبد في الخطة الأساسية',
                '✓ تجربة 14 يوم مجاناً للـ Pro',
                '✓ إلغاء في أي وقت',
              ].map((t, i) => (
                <span key={i} style={{
                  fontFamily: 'var(--font-tajawal)', fontSize: 12,
                  color: 'rgba(255,255,255,0.7)',
                }}>{t}</span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
