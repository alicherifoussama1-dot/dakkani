'use client'

import dynamic from 'next/dynamic'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const Hero3D = dynamic(() => import('./Hero3D'), { ssr: false })

const WORDS = ['متجرك', 'الإلكتروني،', 'جاهز', 'في', 'دقائق']

function WordReveal({ words }: { words: string[] }) {
  const prefersReduced = useReducedMotion()
  if (prefersReduced) {
    return (
      <h1 style={{
        fontFamily: 'var(--font-tajawal)', fontWeight: 900,
        fontSize: 'clamp(36px,6vw,64px)', color: '#0F172A',
        lineHeight: 1.2, margin: 0,
      }}>{words.join(' ')}</h1>
    )
  }
  return (
    <h1 style={{
      fontFamily: 'var(--font-tajawal)', fontWeight: 900,
      fontSize: 'clamp(36px,6vw,64px)', color: '#0F172A',
      lineHeight: 1.2, margin: 0,
      display: 'flex', flexWrap: 'wrap', gap: '0 12px',
    }}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 + i * 0.1, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          style={{ display: 'inline-block' }}
        >
          {word}
        </motion.span>
      ))}
    </h1>
  )
}

export default function Hero() {
  const [isMobile, setIsMobile] = useState(false)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const show3D = !isMobile && !prefersReduced

  return (
    <section style={{
      position: 'relative', minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      overflow: 'hidden',
      background: 'linear-gradient(160deg, #FAFAFF 0%, #EEF2FF 40%, #F8FAFC 100%)',
    }}>
      {/* Background gradient blobs */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '-20%', right: '-10%',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: '0%', left: '-10%',
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.1) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 800, height: 800,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.04) 0%, transparent 70%)',
        }} />
      </div>

      {/* 3D Canvas — absolute behind content */}
      {show3D && (
        <div style={{
          position: 'absolute',
          top: '50%', right: '3%',
          transform: 'translateY(-50%)',
          width: '48%', height: '90vh',
          pointerEvents: 'none',
          zIndex: 1,
        }}>
          <Hero3D />
        </div>
      )}

      {/* Mobile fallback gradient orb */}
      {!show3D && (
        <div style={{
          position: 'absolute', top: '10%', right: '-5%',
          width: '60vw', height: '60vw', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(79,70,229,0.15) 0%, rgba(129,140,248,0.08) 50%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 1,
        }} />
      )}

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2,
        maxWidth: 1280, margin: '0 auto', padding: '100px 24px 80px',
        width: '100%',
      }}>
        <div style={{ maxWidth: isMobile ? '100%' : '52%' }}>
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(79,70,229,0.08)', borderRadius: 100,
              padding: '6px 16px', marginBottom: 24,
              border: '1px solid rgba(79,70,229,0.15)',
            }}>
            <span style={{ fontSize: 16 }}>🇩🇿</span>
            <span style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 13,
              color: '#4F46E5',
            }}>منصة التجارة الإلكترونية رقم 1 في الجزائر</span>
          </motion.div>

          {/* Headline */}
          <div style={{ marginBottom: 20 }}>
            <WordReveal words={WORDS} />
          </div>

          {/* Gradient word accent */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.5 }}
            style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 900,
              fontSize: 'clamp(28px,4vw,48px)',
              background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              lineHeight: 1.3, marginBottom: 24, display: 'block',
            }}>
            للتجار الجزائريين
          </motion.div>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.5 }}
            style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 400, fontSize: 17,
              color: '#475569', lineHeight: 1.8, marginBottom: 36,
              maxWidth: 480,
            }}>
            أنشئ متجرك، أضف منتجاتك، وابدأ البيع لكل الولايات الـ48 — بدون خبرة تقنية
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.5 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            <motion.a
              href="/auth/register"
              whileHover={{ scale: 1.04, boxShadow: '0 12px 32px rgba(79,70,229,0.4)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: '#fff', fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 16,
                padding: '14px 28px', borderRadius: 14,
                textDecoration: 'none', boxShadow: '0 6px 20px rgba(79,70,229,0.3)',
              }}>
              ابدأ مجاناً
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l7-7m-7 7l7 7" />
              </svg>
            </motion.a>
            <motion.a
              href="#showcase"
              whileHover={{ scale: 1.04, background: 'rgba(79,70,229,0.05)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'transparent', color: '#4F46E5',
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 16,
                padding: '14px 28px', borderRadius: 14,
                textDecoration: 'none', border: '2px solid #4F46E5',
                transition: 'background 0.2s',
              }}>
              <span style={{
                width: 28, height: 28, borderRadius: '50%',
                background: '#4F46E5', display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="12" height="14" viewBox="0 0 12 14" fill="white">
                  <path d="M0 0l12 7L0 14V0z" />
                </svg>
              </span>
              شاهد العرض
            </motion.a>
          </motion.div>

          {/* Trust */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.3, duration: 0.5 }}
            style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
            {['بدون بطاقة بنكية', '48 ولاية', 'إلغاء في أي وقت'].map((t, i) => (
              <span key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#475569',
              }}>
                <span style={{
                  width: 18, height: 18, borderRadius: '50%',
                  background: 'rgba(79,70,229,0.1)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#4F46E5" strokeWidth={1.8} strokeLinecap="round" />
                  </svg>
                </span>
                {t}
              </span>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.5 }}
        style={{
          position: 'absolute', bottom: 32, left: '50%',
          transform: 'translateX(-50%)', zIndex: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        }}>
        <span style={{
          fontFamily: 'var(--font-tajawal)', fontSize: 11, color: '#94A3B8',
        }}>تمرر للأسفل</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          style={{ color: '#94A3B8' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M19 9l-7 7-7-7" strokeLinecap="round" />
          </svg>
        </motion.div>
      </motion.div>
    </section>
  )
}
