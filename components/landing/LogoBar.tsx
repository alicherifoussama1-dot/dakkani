'use client'

import { motion } from 'framer-motion'

const MERCHANTS = [
  { name: 'متجر الأناقة', icon: '👗' },
  { name: 'إلكترونيك برو', icon: '📱' },
  { name: 'طازج فريش', icon: '🛒' },
  { name: 'بيت الرياضة', icon: '⚽' },
  { name: 'كوزميتيك DZ', icon: '💄' },
  { name: 'أثاث الجزائر', icon: '🛋️' },
  { name: 'سمارت تك', icon: '💻' },
  { name: 'حلويات أم البنين', icon: '🍰' },
  { name: 'كتب وقراءة', icon: '📚' },
  { name: 'كيدس ورلد', icon: '🧸' },
  { name: 'ستايل مودا', icon: '👠' },
  { name: 'مطبخ عصري', icon: '🍳' },
]

const DOUBLED = [...MERCHANTS, ...MERCHANTS]

export default function LogoBar() {
  return (
    <section style={{
      background: '#F8FAFC', padding: '48px 0', overflow: 'hidden',
      borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', marginBottom: 24, textAlign: 'center' }}>
        <p style={{
          fontFamily: 'var(--font-tajawal)', fontSize: 14, color: '#94A3B8', fontWeight: 500,
        }}>
          موثوق به من أكثر من{' '}
          <span style={{ color: '#4F46E5', fontWeight: 700 }}>12,000</span>
          {' '}تاجر جزائري
        </p>
      </div>

      {/* Infinite marquee */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Fade edges */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 120,
          background: 'linear-gradient(to left, #F8FAFC, transparent)',
          zIndex: 1, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 120,
          background: 'linear-gradient(to right, #F8FAFC, transparent)',
          zIndex: 1, pointerEvents: 'none',
        }} />

        <motion.div
          animate={{ x: ['0%', '-50%'] }}
          transition={{ repeat: Infinity, duration: 28, ease: 'linear' }}
          style={{ display: 'flex', gap: 16, width: 'max-content', direction: 'ltr' }}
          whileHover={{ animationPlayState: 'paused' } as any}
        >
          {DOUBLED.map((m, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: '#fff', borderRadius: 12,
              padding: '10px 20px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              flexShrink: 0,
              filter: 'grayscale(40%)',
              transition: 'filter 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.filter = 'none')}
              onMouseLeave={e => (e.currentTarget.style.filter = 'grayscale(40%)')}
            >
              <span style={{ fontSize: 22 }}>{m.icon}</span>
              <span style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 13,
                color: '#475569', whiteSpace: 'nowrap',
              }}>{m.name}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
