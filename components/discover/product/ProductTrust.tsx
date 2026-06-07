'use client'

import { Truck, Shield, RefreshCw, Lock } from 'lucide-react'

const BADGES = [
  { Icon: Shield,    text: 'دفع عند الاستلام' },
  { Icon: Truck,     text: 'توصيل لـ 48 ولاية' },
  { Icon: RefreshCw, text: 'ضمان الاسترجاع' },
  { Icon: Lock,      text: 'دفع آمن 100%' },
]

export default function ProductTrust() {
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10,
    }}
      className="trust-grid">
      {BADGES.map(b => (
        <div key={b.text} className="pt-card-sm" style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 'var(--pt-radius-md)',
            background: 'var(--pt-accent-soft)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <b.Icon size={17} style={{ color: 'var(--pt-accent-text)' }} />
          </div>
          <span className="pt-text" style={{ fontSize: 13, fontWeight: 600, fontFamily: 'var(--font-tajawal)' }}>
            {b.text}
          </span>
        </div>
      ))}
      <style>{`
        @media (min-width: 768px) {
          .trust-grid { grid-template-columns: repeat(4, 1fr) !important; }
        }
      `}</style>
    </div>
  )
}
