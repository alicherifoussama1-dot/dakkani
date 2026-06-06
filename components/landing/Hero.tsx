'use client'

import dynamic from 'next/dynamic'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useState } from 'react'

// Lazy-load 3D canvas — never blocks first paint
const Hero3D = dynamic(() => import('./Hero3D'), {
  ssr: false,
  loading: () => null,
})

const HEADLINE_WORDS = ['متجرك', 'الإلكتروني،', 'جاهز', 'في', 'دقائق']

const TRUST_ITEMS = [
  { icon: '✓', text: 'بدون بطاقة بنكية' },
  { icon: '✓', text: '48 ولاية' },
  { icon: '✓', text: 'إلغاء في أي وقت' },
]

export default function Hero() {
  const [isMobile, setIsMobile] = useState(false)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    const mo = new ResizeObserver(() => check())
    mo.observe(document.documentElement)
    return () => mo.disconnect()
  }, [])

  const show3D = !isMobile && !prefersReduced

  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      overflow: 'hidden',
    }}>
      {/* Multi-layer background */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
        {/* Base gradient */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(160deg, #F8FAFF 0%, #EEF2FF 35%, #F5F3FF 65%, #F8FAFC 100%)',
        }} />
        {/* Blob 1 */}
        <motion.div
          animate={prefersReduced ? {} : {
            scale: [1, 1.15, 1],
            opacity: [0.12, 0.2, 0.12],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '-25%', right: '-8%',
            width: '60%', height: '110%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,70,229,1) 0%, transparent 70%)',
            opacity: 0.12, pointerEvents: 'none',
          }}
        />
        {/* Blob 2 */}
        <motion.div
          animate={prefersReduced ? {} : {
            scale: [1, 1.2, 1],
            opacity: [0.06, 0.12, 0.06],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          style={{
            position: 'absolute', bottom: '-20%', left: '-8%',
            width: '55%', height: '100%', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,58,237,1) 0%, transparent 70%)',
            opacity: 0.07, pointerEvents: 'none',
          }}
        />
        {/* Grid pattern */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.025,
          backgroundImage: `
            linear-gradient(rgba(79,70,229,1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(79,70,229,1) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
          pointerEvents: 'none',
        }} />
      </div>

      {/* 3D canvas — desktop only, behind content */}
      {show3D && (
        <div style={{
          position: 'absolute',
          top: '50%', right: '2%',
          transform: 'translateY(-50%)',
          width: '46%', height: '92vh',
          pointerEvents: 'none', zIndex: 1,
        }}>
          <Hero3D />
        </div>
      )}

      {/* Mobile decorative orb */}
      {!show3D && (
        <motion.div
          animate={prefersReduced ? {} : { scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            position: 'absolute', top: '8%', right: '-15%',
            width: '65vw', height: '65vw', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, rgba(129,140,248,0.08) 50%, transparent 70%)',
            pointerEvents: 'none', zIndex: 1,
          }}
        />
      )}

      {/* ─── CONTENT ─── */}
      <div style={{
        position: 'relative', zIndex: 2,
        maxWidth: 1280, margin: '0 auto',
        padding: 'clamp(90px,12vh,120px) 24px clamp(60px,8vh,80px)',
        width: '100%',
      }}>
        <div style={{ maxWidth: isMobile ? '100%' : '54%' }}>

          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ marginBottom: 24 }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(79,70,229,0.09)',
              border: '1px solid rgba(79,70,229,0.18)',
              borderRadius: 100, padding: '7px 18px',
            }}>
              <span style={{ fontSize: 15 }}>🇩🇿</span>
              <span style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 13,
                color: '#4F46E5',
              }}>منصة التجارة الإلكترونية رقم 1 في الجزائر</span>
            </span>
          </motion.div>

          {/* Headline — word-by-word stagger */}
          <h1 style={{
            fontFamily: 'var(--font-tajawal)', fontWeight: 900,
            fontSize: 'clamp(36px, 5.5vw, 64px)',
            color: '#0F172A', lineHeight: 1.18,
            margin: '0 0 12px',
            display: 'flex', flexWrap: 'wrap', gap: '0 10px',
          }}>
            {prefersReduced
              ? HEADLINE_WORDS.join(' ')
              : HEADLINE_WORDS.map((word, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  transition={{
                    delay: 0.3 + i * 0.1,
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  style={{ display: 'inline-block' }}>
                  {word}
                </motion.span>
              ))}
          </h1>

          {/* Gradient accent line */}
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.9, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'inline-block',
              fontFamily: 'var(--font-tajawal)', fontWeight: 900,
              fontSize: 'clamp(24px, 3.5vw, 46px)',
              background: 'linear-gradient(120deg, #4F46E5 20%, #7C3AED 60%, #A78BFA 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.3, marginBottom: 24,
            }}>
            للتجار الجزائريين
          </motion.span>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.05, duration: 0.5 }}
            style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 400, fontSize: 17,
              color: '#475569', lineHeight: 1.85, marginBottom: 36,
              maxWidth: 460,
            }}>
            أنشئ متجرك، أضف منتجاتك، وابدأ البيع لكل الولايات الـ48 — بدون خبرة تقنية
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.15, duration: 0.5 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            <motion.a
              href="/auth/register"
              whileHover={{ scale: 1.04, boxShadow: '0 14px 36px rgba(79,70,229,0.42)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: '#fff', fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 16,
                padding: '14px 28px', borderRadius: 14, textDecoration: 'none',
                boxShadow: '0 6px 20px rgba(79,70,229,0.32)',
                minHeight: 52,
              }}>
              ابدأ مجاناً
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19 12H5m0 0l7-7m-7 7l7 7" />
              </svg>
            </motion.a>

            <motion.a
              href="#showcase"
              whileHover={{ scale: 1.03, background: 'rgba(79,70,229,0.06)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 10,
                background: '#fff', color: '#4F46E5',
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 15,
                padding: '14px 26px', borderRadius: 14, textDecoration: 'none',
                border: '1.5px solid rgba(79,70,229,0.25)',
                boxShadow: '0 2px 8px rgba(79,70,229,0.08)',
                transition: 'background 0.2s',
                minHeight: 52,
              }}>
              <motion.span
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                animate={prefersReduced ? {} : { scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}>
                <svg width="11" height="13" viewBox="0 0 11 13" fill="white">
                  <path d="M0.5 0.5l10 6-10 6V0.5z" />
                </svg>
              </motion.span>
              شاهد العرض
            </motion.a>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.5 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {TRUST_ITEMS.map((t, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.4 + i * 0.08 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#475569',
                }}>
                <span style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: 'rgba(79,70,229,0.1)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#4F46E5" strokeWidth={1.8}
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {t.text}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.2, duration: 0.6 }}
        style={{
          position: 'absolute', bottom: 28, left: '50%',
          transform: 'translateX(-50%)', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
        <span style={{
          fontFamily: 'var(--font-tajawal)', fontSize: 11,
          color: '#94A3B8', letterSpacing: '0.05em',
        }}>تمرر للاستكشاف</span>
        <div style={{
          width: 28, height: 44, borderRadius: 14,
          border: '2px solid rgba(79,70,229,0.25)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '6px 0',
        }}>
          <motion.div
            animate={prefersReduced ? {} : { y: [0, 14, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
            style={{
              width: 4, height: 8, borderRadius: 2,
              background: '#4F46E5', opacity: 0.6,
            }}
          />
        </div>
      </motion.div>
    </section>
  )
}
