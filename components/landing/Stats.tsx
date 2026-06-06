'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'

const STATS = [
  { value: 12000, suffix: '+', label: 'تاجر نشط', prefix: '', color: '#4F46E5' },
  { value: 48, suffix: '', label: 'ولاية مغطاة', prefix: '', color: '#7C3AED' },
  { value: 2000000, suffix: '+', label: 'طلب مُعالج', prefix: '', color: '#4F46E5' },
  { value: 98, suffix: '%', label: 'رضا العملاء', prefix: '', color: '#7C3AED' },
]

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(0) + 'K'
  return n.toString()
}

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

  const display = target >= 1000000
    ? (count / 1000000).toFixed(1) + 'M'
    : target >= 1000
    ? (count / 1000).toFixed(0) + 'K'
    : count.toString()

  return (
    <span ref={ref} style={{ color, fontFamily: 'var(--font-inter)', fontWeight: 800 }}>
      {display}{suffix}
    </span>
  )
}

export default function Stats() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })

  return (
    <section ref={ref} style={{
      background: '#FFFFFF', padding: '80px 0',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 0,
        }}>
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              style={{
                textAlign: 'center', padding: '40px 24px',
                borderRight: i < STATS.length - 1 ? '1px solid #E2E8F0' : 'none',
                position: 'relative',
              }}
            >
              <div style={{
                fontSize: 'clamp(36px, 4vw, 52px)',
                fontWeight: 800, lineHeight: 1.1, marginBottom: 8,
              }}>
                {s.prefix}
                <CountUp target={s.value} suffix={s.suffix} color={s.color} />
              </div>
              <div style={{
                fontFamily: 'var(--font-tajawal)', fontSize: 15,
                color: '#475569', fontWeight: 500,
              }}>{s.label}</div>

              {/* Accent dot */}
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: s.color, margin: '12px auto 0',
                opacity: 0.4,
              }} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
