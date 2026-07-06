'use client'

import { motion, useInView } from 'framer-motion'
import { useT, useRaw } from '@/lib/i18n/react'
import { useRef } from 'react'

const MERCHANTS = [
  { name: '', icon: '👗' },
  { name: '', icon: '📱' },
  { name: '', icon: '🛒' },
  { name: '', icon: '⚽' },
  { name: '', icon: '💄' },
  { name: '', icon: '🛋️' },
  { name: '', icon: '💻' },
  { name: '', icon: '🍰' },
  { name: '', icon: '📚' },
  { name: '', icon: '🧸' },
  { name: '', icon: '👠' },
  { name: '', icon: '🍳' },
]

const DOUBLED = [...MERCHANTS, ...MERCHANTS]

export default function LogoBar() {
  const t = useT()
  const raw = useRaw()
  const names: string[] = (raw('landing.logobar.names') as string[]) ?? []
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })

  return (
    <section ref={ref} style={{
      background: '#F8FAFC', padding: '40px 0',
      overflow: 'hidden',
      borderTop: '1px solid #E2E8F0',
      borderBottom: '1px solid #E2E8F0',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 20 }}>
        <p style={{
          fontFamily: 'var(--font-tajawal)', fontSize: 13, color: '#94A3B8', fontWeight: 500,
        }}>
          {t('landing.logobar.pre')}{' '}
          <span style={{ color: '#4F46E5', fontWeight: 700 }}>12,000</span>
          {' '}{t('landing.logobar.post')}
        </p>
      </motion.div>

      {/* CSS marquee — reliable, hover-pausable */}
      <div className="logobar-track" style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Fade edges */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 100,
          background: 'linear-gradient(to left, #F8FAFC, transparent)',
          zIndex: 1, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 100,
          background: 'linear-gradient(to right, #F8FAFC, transparent)',
          zIndex: 1, pointerEvents: 'none',
        }} />

        <div className="logobar-inner" style={{ direction: 'ltr' }}>
          {DOUBLED.map((m, i) => (
            <div key={i} className="logobar-card" style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: '#fff', borderRadius: 12,
              padding: '10px 20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              marginLeft: 12, flexShrink: 0,
              verticalAlign: 'middle',
              filter: 'grayscale(40%)',
              transition: 'filter 0.2s, transform 0.2s, box-shadow 0.2s',
            }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{m.icon}</span>
              <span style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 13,
                color: '#475569', whiteSpace: 'nowrap',
              }}>{names[i % names.length] ?? m.name}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes logobar-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .logobar-inner {
          display: inline-flex;
          animation: logobar-scroll 32s linear infinite;
          white-space: nowrap;
        }
        .logobar-track:hover .logobar-inner {
          animation-play-state: paused;
        }
        .logobar-card:hover {
          filter: none !important;
          transform: scale(1.04);
          box-shadow: 0 4px 16px rgba(79,70,229,0.12) !important;
        }
        @media (prefers-reduced-motion: reduce) {
          .logobar-inner { animation: none; }
        }
      `}</style>
    </section>
  )
}
