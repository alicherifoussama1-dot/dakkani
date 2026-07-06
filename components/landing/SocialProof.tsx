'use client'

import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useT, useRaw } from '@/lib/i18n/react'

const HIGHLIGHTS = [
  { icon: '⚡' },
  { icon: '🔒' },
  { icon: '📞' },
  { icon: '🇩🇿' },
  { icon: '🚀' },
]

export default function SocialProof() {
  const t = useT()
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const prefersReduced = useReducedMotion()

  return (
    <section ref={ref} style={{
      background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 50%, #3730A3 100%)',
      padding: '48px 0', overflow: 'hidden', position: 'relative',
    }}>
      {/* Subtle dot grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'flex', gap: 0,
          overflowX: 'auto', justifyContent: 'center',
          flexWrap: 'wrap',
        }}
          className="scrollbar-none">
          {HIGHLIGHTS.map((h, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.45 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '16px 28px', minWidth: 200,
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.15)' : 'none',
              }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{h.icon}</span>
              <div>
                <div style={{
                  fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 14,
                  color: '#fff',
                }}>{t(`landing.social.items.${i}.title`)}</div>
                <div style={{
                  fontFamily: 'var(--font-tajawal)', fontSize: 12,
                  color: 'rgba(255,255,255,0.65)',
                }}>{t(`landing.social.items.${i}.sub`)}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
