'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'

const LINKS = [
  { label: 'المميزات',    href: '#features' },
  { label: 'كيف يعمل',   href: '#how-it-works' },
  { label: 'الأسعار',    href: '#pricing' },
  { label: 'آراء العملاء', href: '#testimonials' },
]

export default function LandingNavbar() {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [activeLink,  setActiveLink]  = useState('')

  // Scroll + active section detection
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)

      // IntersectionObserver-based active would be better, but for compat
      // use scroll position to detect visible sections
      const sections = LINKS.map(l => ({
        id: l.href.slice(1),
        el: document.getElementById(l.href.slice(1)),
      })).filter(s => s.el)

      const scrollMid = window.scrollY + window.innerHeight / 3
      let current = ''
      for (const s of sections) {
        if (!s.el) continue
        const top = s.el.getBoundingClientRect().top + window.scrollY
        if (scrollMid >= top) current = s.id
      }
      setActiveLink(current)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Prevent body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const navLinkColor = (href: string) => {
    const id = href.slice(1)
    if (activeLink === id) return '#4F46E5'
    return scrolled ? '#475569' : '#0F172A'
  }

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: 'fixed', top: 0, right: 0, left: 0, zIndex: 100,
          transition: 'background 0.3s, box-shadow 0.3s',
          background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
          boxShadow: scrolled ? '0 1px 24px rgba(79,70,229,0.07)' : 'none',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(20px)' : 'none',
        }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 68,
        }}>
          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
            <span style={{
              fontFamily: 'var(--font-tajawal)', fontWeight: 900,
              fontSize: 26, color: '#0F172A', letterSpacing: '-0.5px',
            }}>Commerco</span>
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 3 }}
              style={{
                width: 8, height: 8, borderRadius: '50%',
                background: '#4F46E5', display: 'inline-block',
              }}
            />
          </Link>

          {/* Desktop nav */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}
            className="hidden md:flex">
            {LINKS.map(l => {
              const isActive = activeLink === l.href.slice(1)
              return (
                <a
                  key={l.href}
                  href={l.href}
                  style={{
                    fontFamily: 'var(--font-tajawal)', fontWeight: isActive ? 700 : 500,
                    fontSize: 15,
                    color: navLinkColor(l.href),
                    textDecoration: 'none', padding: '8px 14px',
                    borderRadius: 10,
                    background: isActive ? 'rgba(79,70,229,0.07)' : 'transparent',
                    transition: 'color 0.2s, background 0.2s',
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = '#4F46E5'
                      e.currentTarget.style.background = 'rgba(79,70,229,0.05)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.color = navLinkColor(l.href)
                      e.currentTarget.style.background = 'transparent'
                    }
                  }}
                >{l.label}</a>
              )
            })}
          </nav>

          {/* CTA + hamburger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link
              href="/auth/login"
              className="hidden md:block"
              style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 500, fontSize: 14,
                color: '#475569', textDecoration: 'none', padding: '8px 14px',
                borderRadius: 10, transition: 'color 0.2s',
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
                fontSize: 14, padding: '10px 20px', borderRadius: 12,
                textDecoration: 'none', boxShadow: '0 4px 14px rgba(79,70,229,0.25)',
              }}>
              ابدأ مجاناً
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M19 12H5m0 0l7-7m-7 7l7 7" />
              </svg>
            </motion.a>

            <button
              className="md:hidden"
              onClick={() => setMobileOpen(v => !v)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#0F172A', padding: 8, minWidth: 44, minHeight: 44,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              aria-label="فتح القائمة">
              <motion.div
                animate={{ rotate: mobileOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}>
                {mobileOpen ? <X size={22} /> : <Menu size={22} />}
              </motion.div>
            </button>
          </div>
        </div>
      </motion.header>

      {/* Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(15,23,42,0.5)',
              zIndex: 199, cursor: 'pointer',
              backdropFilter: 'blur(4px)',
            }}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0,
              width: '78vw', maxWidth: 320,
              background: '#fff', zIndex: 200,
              boxShadow: '-8px 0 48px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column',
            }}>
            {/* Drawer header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid #E2E8F0',
            }}>
              <div style={{
                fontFamily: 'var(--font-tajawal)', fontWeight: 900,
                fontSize: 22, color: '#0F172A',
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                Commerco
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4F46E5', display: 'inline-block' }} />
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                style={{
                  background: '#F8FAFC', border: '1px solid #E2E8F0', cursor: 'pointer',
                  width: 36, height: 36, borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#475569',
                }}>
                <X size={16} />
              </button>
            </div>

            {/* Links */}
            <div style={{ flex: 1, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {LINKS.map((l, i) => {
                const isActive = activeLink === l.href.slice(1)
                return (
                  <motion.a
                    key={l.href}
                    href={l.href}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 + 0.05 }}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      fontFamily: 'var(--font-tajawal)', fontWeight: isActive ? 700 : 600,
                      fontSize: 16, color: isActive ? '#4F46E5' : '#0F172A',
                      textDecoration: 'none', padding: '14px 16px', borderRadius: 12,
                      background: isActive ? 'rgba(79,70,229,0.07)' : 'transparent',
                      display: 'block', transition: 'background 0.2s',
                    }}>
                    {l.label}
                  </motion.a>
                )
              })}
            </div>

            {/* Bottom CTAs */}
            <div style={{ padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="/auth/login" style={{
                display: 'block', textAlign: 'center', padding: '13px',
                borderRadius: 12, border: '1.5px solid #E2E8F0',
                fontFamily: 'var(--font-tajawal)', fontWeight: 600, fontSize: 15,
                color: '#475569', textDecoration: 'none',
              }}>تسجيل الدخول</a>
              <a href="/auth/register" style={{
                display: 'block', textAlign: 'center', padding: '13px',
                background: 'linear-gradient(135deg, #4F46E5, #4338CA)',
                borderRadius: 12,
                fontFamily: 'var(--font-tajawal)', fontWeight: 700, fontSize: 15,
                color: '#fff', textDecoration: 'none',
                boxShadow: '0 4px 14px rgba(79,70,229,0.3)',
              }}>ابدأ مجاناً</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
