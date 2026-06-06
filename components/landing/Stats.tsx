'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

const STATS = [
  { value: 12000,   suffix: '+', label: 'تاجر نشط',     icon: '🏪', color: '#4F46E5', bg: '#EEF2FF' },
  { value: 48,      suffix: '',  label: 'ولاية مغطاة',  icon: '🗺️', color: '#7C3AED', bg: '#F5F3FF' },
  { value: 2000000, suffix: '+', label: 'طلب مُعالج',   icon: '📦', color: '#059669', bg: '#ECFDF5' },
  { value: 98,      suffix: '%', label: 'رضا العملاء',  icon: '⭐', color: '#D97706', bg: '#FFFBEB' },
]

function CountUp({ target, suffix, color }: { target: number; suffix: string; color: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-50px' })
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    if (!inView) return
    if (prefersReduced) { setCount(target); return }
    const duration = 1800
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(ease * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, target, prefersReduced])

  const display = target >= 1_000_000
    ? (count / 1_000_000).toFixed(1) + 'M'
    : target >= 1000
    ? (count / 1000).toFixed(0) + 'K'
    : count.toString()

  return (
    <span
      ref={ref}
      style={{
        color,
        fontFamily: 'var(--font-inter)',
        fontWeight: 800,
        fontVariantNumeric: 'tabular-nums',
      }}>
      {display}{suffix}
    </span>
  )
}

export default function Stats() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} style={{ background: '#FFFFFF', padding: '80px 0' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div className="stats-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 0,
        }}>
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="stats-item"
              style={{
                textAlign: 'center',
                padding: '40px 24px',
                position: 'relative',
              }}>
              {/* Divider — right side in LTR visually */}
              {i < STATS.length - 1 && (
                <div className="stats-divider" style={{
                  position: 'absolute',
                  top: '20%', bottom: '20%',
                  left: 0, width: 1,
                  background: 'linear-gradient(to bottom, transparent, #E2E8F0, transparent)',
                }} />
              )}

              {/* Icon badge */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: s.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24, margin: '0 auto 16px',
              }}>{s.icon}</div>

              <div style={{
                fontSize: 'clamp(32px, 3.5vw, 48px)',
                fontWeight: 800, lineHeight: 1.1, marginBottom: 8,
              }}>
                <CountUp target={s.value} suffix={s.suffix} color={s.color} />
              </div>
              <div style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 14,
                color: '#475569', fontWeight: 500,
              }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .stats-item:nth-child(2n) .stats-divider { display: none; }
          .stats-item {
            border-bottom: 1px solid #E2E8F0;
          }
          .stats-item:nth-last-child(-n+2) {
            border-bottom: none;
          }
        }
        @media (min-width: 641px) and (max-width: 1023px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .stats-item:nth-child(2n) .stats-divider { display: none; }
        }
      `}</style>
    </section>
  )
}
