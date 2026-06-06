'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'

const LINKS = [
  { label: 'المميزات', href: '#features' },
  { label: 'كيف يعمل', href: '#how-it-works' },
  { label: 'الأسعار', href: '#pricing' },
  { label: 'آراء العملاء', href: '#testimonials' },
]

export default function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, right: 0, left: 0, zIndex: 100,
          transition: 'background 0.3s, box-shadow 0.3s, backdrop-filter 0.3s',
          background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
          boxShadow: scrolled ? '0 1px 24px rgba(79,70,229,0.08)' : 'none',
          backdropFilter: scrolled ? 'blur(16px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        }}
      >
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 68,
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 900,
              fontSize: 26, color: '#0F172A', letterSpacing: '-0.5px',
            }}>
              دكاني
            </span>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: '#4F46E5', display: 'inline-block', marginTop: 2,
            }} />
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}
            className="hidden md:flex">
            {LINKS.map(l => (
              <a key={l.href} href={l.href} style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 500, fontSize: 15,
                color: scrolled ? '#475569' : '#0F172A', textDecoration: 'none',
                transition: 'color 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.color = '#4F46E5')}
                onMouseLeave={e => (e.currentTarget.style.color = scrolled ? '#475569' : '#0F172A')}
              >{l.label}</a>
            ))}
          </nav>

          {/* CTA */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link href="/auth/login"
              className="hidden md:block"
              style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 500, fontSize: 14,
                color: '#475569', textDecoration: 'none', padding: '8px 16px',
              }}>
              تسجيل الدخول
            </Link>
            <motion.a
              href="/auth/register"
              whileHover={{ scale: 1.04, boxShadow: '0 8px 24px rgba(79,70,229,0.35)' }}
              whileTap={{ scale: 0.97 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: '#fff', fontFamily: 'var(--font-tajawal)', fontWeight: 700,
                fontSize: 14, padding: '10px 22px', borderRadius: 12,
                textDecoration: 'none', boxShadow: '0 4px 14px rgba(79,70,229,0.25)',
                transition: 'background 0.2s',
              }}>
              ابدأ مجاناً
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l7-7m-7 7l7 7" />
              </svg>
            </motion.a>

            {/* Mobile hamburger */}
            <button
              className="md:hidden"
              onClick={() => setMobileOpen(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#0F172A', padding: 8,
              }}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </motion.header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '75vw', maxWidth: 320,
              background: '#fff', zIndex: 200,
              boxShadow: '-8px 0 40px rgba(0,0,0,0.15)',
              padding: '80px 28px 28px',
              display: 'flex', flexDirection: 'column', gap: 8,
            }}>
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute', top: 20, left: 20,
                background: '#F8FAFC', border: 'none', cursor: 'pointer',
                width: 40, height: 40, borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#475569',
              }}>
              <X size={18} />
            </button>

            <div style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 900,
              fontSize: 22, color: '#0F172A', marginBottom: 24,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              دكاني <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
            </div>

            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={l.href}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 + 0.1 }}
                onClick={() => setMobileOpen(false)}
                style={{
                  fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 16,
                  color: '#0F172A', textDecoration: 'none',
                  padding: '14px 16px', borderRadius: 12,
                  background: 'transparent', display: 'block',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#EEF2FF')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >{l.label}</motion.a>
            ))}

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="/auth/login" style={{
                display: 'block', textAlign: 'center',
                padding: '12px', borderRadius: 12, border: '1.5px solid #E2E8F0',
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 15,
                color: '#475569', textDecoration: 'none',
              }}>تسجيل الدخول</a>
              <a href="/auth/register" style={{
                display: 'block', textAlign: 'center',
                padding: '12px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                borderRadius: 12,
                fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 15,
                color: '#fff', textDecoration: 'none',
              }}>ابدأ مجاناً</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
              zIndex: 199, cursor: 'pointer',
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
