'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ShoppingBag } from 'lucide-react'
import { useScrollPosition } from '@/hooks/useScrollPosition'

const NAV_LINKS = [
  { href: '/',           label: 'الرئيسية' },
  { href: '/discover',   label: 'المنتجات' },
  { href: '#features',   label: 'المميزات' },
  { href: '#pricing',    label: 'الأسعار' },
]

export default function Navbar() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [mounted,    setMounted]    = useState(false)
  const { isScrolled } = useScrollPosition(80)
  const pathname = usePathname()

  useEffect(() => { setMounted(true) }, [])

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  // Prevent body scroll when drawer open
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const isActive = (href: string) => pathname === href

  return (
    <>
      {/* ── Main Navbar ─────────────────────────────── */}
      <header
        className={`fixed top-3 right-0 left-0 z-50 mx-auto transition-all duration-300 ${
          mounted ? 'animate-slide-down' : 'opacity-0'
        }`}
        style={{ maxWidth: '1440px', padding: '0 1rem' }}
      >
        <nav
          className={`rounded-2xl transition-all duration-300 ${
            isScrolled
              ? 'bg-white/95 backdrop-blur-md shadow-nav border border-[#EBEBEB]'
              : 'bg-white/80 backdrop-blur-sm border border-white/40'
          }`}
          style={{ padding: '0 20px' }}
        >
          <div className="flex items-center justify-between h-[60px] max-w-6xl mx-auto">
            {/* Logo */}
            <Link
              href="/"
              className="flex items-center gap-1 font-black text-xl shrink-0"
              style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
            >
              دكاني
              <span
                className="w-1.5 h-1.5 rounded-full inline-block mt-0.5"
                style={{ backgroundColor: '#0D6EFD' }}
                aria-hidden="true"
              />
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#F9F9F9]"
                  style={{
                    color: isActive(link.href) ? '#0D6EFD' : '#444444',
                    fontFamily: 'var(--font-tajawal)',
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop CTAs */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-sm font-medium transition-colors"
                style={{ color: '#444444', fontFamily: 'var(--font-tajawal)' }}
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/auth/register"
                className="btn btn-accent text-sm h-10 px-5 rounded-xl"
              >
                ابدأ مجاناً
              </Link>
            </div>

            {/* Mobile actions */}
            <div className="flex lg:hidden items-center gap-3">
              <Link
                href="/products"
                className="touch-target text-[#444444] hover:text-[#0D6EFD] transition-colors"
                aria-label="المنتجات"
              >
                <ShoppingBag size={20} />
              </Link>
              <button
                onClick={() => setDrawerOpen(true)}
                className="touch-target text-[#111111] hover:text-[#0D6EFD] transition-colors"
                aria-label="فتح القائمة"
                aria-expanded={drawerOpen}
              >
                <Menu size={22} />
              </button>
            </div>
          </div>
        </nav>
      </header>

      {/* ── Mobile Drawer Overlay ────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile Drawer ────────────────────────────── */}
      <div
        className={`fixed top-0 right-0 z-[70] h-full w-[280px] bg-white shadow-xl lg:hidden
          transition-transform duration-300 ease-smooth
          ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-label="القائمة الرئيسية"
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EBEBEB]">
          <Link
            href="/"
            className="font-black text-xl"
            style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
            onClick={() => setDrawerOpen(false)}
          >
            دكاني
            <span
              className="inline-block w-1.5 h-1.5 rounded-full mr-0.5 mb-0.5"
              style={{ backgroundColor: '#0D6EFD' }}
            />
          </Link>
          <button
            onClick={() => setDrawerOpen(false)}
            className="touch-target text-[#999999] hover:text-[#111111] transition-colors"
            aria-label="إغلاق القائمة"
          >
            <X size={22} />
          </button>
        </div>

        {/* Drawer links */}
        <nav className="p-4 space-y-1">
          {NAV_LINKS.map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center px-4 py-3 rounded-xl text-base font-medium transition-colors"
              style={{
                color: isActive(link.href) ? '#0D6EFD' : '#111111',
                backgroundColor: isActive(link.href) ? '#EBF5FF' : 'transparent',
                fontFamily: 'var(--font-tajawal)',
              }}
              onClick={() => setDrawerOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Drawer footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#EBEBEB] space-y-3">
          <Link
            href="/auth/login"
            className="btn btn-white w-full text-sm"
            onClick={() => setDrawerOpen(false)}
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/auth/register"
            className="btn btn-accent w-full text-sm"
            onClick={() => setDrawerOpen(false)}
          >
            ابدأ مجاناً ←
          </Link>
        </div>
      </div>
    </>
  )
}
