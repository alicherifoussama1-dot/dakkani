'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useT, useRaw } from '@/lib/i18n/react'

export default function FloatingCTA() {
  const t = useT()
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const prefersReduced = useReducedMotion()

  useEffect(() => {
    const onScroll = () => {
      // Show after scrolling past the hero (600px)
      setShow(window.scrollY > 600 && !dismissed)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [dismissed])

  return (
    <>
      {/* Mobile sticky CTA */}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="md:hidden"
            style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              zIndex: 90, padding: '12px 16px 24px',
              background: 'rgba(255,255,255,0.95)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderTop: '1px solid rgba(79,70,229,0.1)',
              display: 'flex', gap: 10, alignItems: 'center',
            }}>
            <a href="/auth/register" style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
              color: '#fff', fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 15,
              padding: '14px', borderRadius: 14, textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
            }}>{t('landing.floating.cta')}</a>
            <button
              onClick={() => setDismissed(true)}
              style={{
                background: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: 12, width: 44, height: 44, minWidth: 44,
                cursor: 'pointer', color: '#94A3B8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              ✕
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop floating WhatsApp */}
      <AnimatePresence>
        {show && (
          <motion.a
            href="https://wa.me/213000000000"
            target="_blank"
            rel="noopener noreferrer"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            whileHover={prefersReduced ? {} : { scale: 1.1 }}
            className="hidden md:flex"
            style={{
              position: 'fixed', bottom: 28, left: 28,
              zIndex: 90, width: 52, height: 52, borderRadius: '50%',
              background: '#25D366',
              alignItems: 'center', justifyContent: 'center',
              textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
            }}>
            {/* WA ring pulse */}
            <motion.div
              animate={prefersReduced ? {} : {
                scale: [1, 1.5, 1],
                opacity: [0.4, 0, 0.4],
              }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeOut' }}
              style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(37,211,102,0.4)',
              }}
            />
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </motion.a>
        )}
      </AnimatePresence>
    </>
  )
}
