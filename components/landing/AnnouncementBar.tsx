'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useT, useRaw } from '@/lib/i18n/react'

export default function AnnouncementBar() {
  const t = useT()
  const [visible, setVisible] = useState(true)

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          style={{ overflow: 'hidden', position: 'relative', zIndex: 101 }}
        >
          <div style={{
            background: 'linear-gradient(90deg, #4F46E5 0%, #7C3AED 50%, #4F46E5 100%)',
            backgroundSize: '200% 100%',
            padding: '10px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, position: 'relative',
          }}>
            <span style={{ fontSize: 15 }}>🎉</span>
            <p style={{
              fontFamily: 'var(--font-tajawal)', fontSize: 13, fontWeight: 600,
              color: '#fff', margin: 0, textAlign: 'center',
            }}>
              {t('landing.announce.pre')}{' '}
              <span style={{ textDecoration: 'underline', fontWeight: 800 }}>
                {t('landing.announce.highlight')}
              </span>
              {' '}{t('landing.announce.post')}
              {' '}
              <a href="/auth/register" style={{
                color: '#fff', fontWeight: 800,
                background: 'rgba(255,255,255,0.2)',
                borderRadius: 6, padding: '2px 10px',
                textDecoration: 'none', display: 'inline-block',
                border: '1px solid rgba(255,255,255,0.3)',
                marginRight: 4,
              }}>{t('landing.announce.cta')}</a>
            </p>
            <button
              onClick={() => setVisible(false)}
              aria-label={t('landing.announce.close')}
              style={{
                position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.7)', fontSize: 18, lineHeight: 1,
                padding: 4, minWidth: 28, minHeight: 28,
              }}>✕</button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
