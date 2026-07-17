'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X, ShieldCheck, Truck, PhoneCall } from 'lucide-react'
import type { Store } from '@/types'
import { getProductTheme, themeToCSSVars } from '@/lib/product-themes'

interface Props { store: Store & { store_settings?: any; theme_key?: string }; children: React.ReactNode }

// STOREFRONT LAYOUT — merchant-themed via --pt-* tokens.
// Header behaves like a modern e-commerce site: quiet on landing, opaque
// after scroll. Search opens a full-screen sheet on mobile. Trust strip
// in the footer speaks to the Algerian COD buyer's #1 hesitation.
export default function StorefrontLayout({ store, children }: Props) {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 12)
    fn()
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // Body scroll lock while overlays are open (mobile UX polish)
  useEffect(() => {
    document.body.style.overflow = (mobileOpen || searchOpen) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen, searchOpen])

  const storeUrl = `/store/${store.slug}`
  const theme = getProductTheme(store.theme_key)
  const nav = [
    { label: 'الرئيسية', href: storeUrl },
    { label: 'المنتجات', href: `${storeUrl}/products` },
  ]

  return (
    <div className="min-h-screen" dir="rtl" data-theme={theme.key}
      style={{ ...themeToCSSVars(theme), background: 'var(--pt-bg)', color: 'var(--pt-text)', fontFamily: 'var(--pt-font-body, var(--font-sans))' }}>
      {/* ── Header ─────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-40"
        style={{
          background: scrolled ? 'var(--pt-surface)' : 'transparent',
          borderBottom: scrolled ? '1px solid var(--pt-border)' : '1px solid transparent',
          backdropFilter: scrolled ? 'saturate(1.4) blur(10px)' : 'none',
          WebkitBackdropFilter: scrolled ? 'saturate(1.4) blur(10px)' : 'none',
          transition: 'background 180ms ease, border-color 180ms ease, backdrop-filter 180ms ease',
        }}
      >
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between gap-3" style={{ blockSize: 60 }}>
          {/* Logo */}
          <Link href={storeUrl} className="flex items-center gap-2.5 min-w-0" aria-label={store.name_ar ?? store.name}>
            {store.logo_url ? (
              <Image src={store.logo_url} alt="" width={36} height={36}
                className="w-9 h-9 rounded-xl object-cover"
                style={{ border: '1px solid var(--pt-border)' }} />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-base"
                style={{ background: 'var(--pt-accent)', color: 'var(--pt-accent-text-on,#fff)' }}>
                {(store.name[0] ?? 'C').toUpperCase()}
              </div>
            )}
            <span className="font-bold text-base truncate hidden sm:block"
              style={{ color: 'var(--pt-text)', letterSpacing: '-0.01em', fontFamily: 'var(--pt-font-display, var(--font-sans))' }}>
              {store.name_ar ?? store.name}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1" aria-label="أقسام المتجر">
            {nav.map(link => (
              <Link key={link.href} href={link.href}
                className="px-3.5 h-10 inline-flex items-center rounded-xl text-sm font-semibold transition-colors"
                style={{ color: 'var(--pt-text-soft)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--pt-surface-soft)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Actions — 44px touch targets */}
          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setSearchOpen(true)}
              aria-label="بحث"
              className="w-11 h-11 rounded-xl inline-flex items-center justify-center transition-colors"
              style={{ color: 'var(--pt-text)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--pt-surface-soft)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <Search className="w-[18px] h-[18px]" />
            </button>
            <button type="button" onClick={() => setMobileOpen(o => !o)}
              aria-label={mobileOpen ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={mobileOpen}
              className="md:hidden w-11 h-11 rounded-xl inline-flex items-center justify-center"
              style={{ color: 'var(--pt-text)' }}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden" style={{ background: 'var(--pt-surface)', borderBlockStart: '1px solid var(--pt-border)' }}>
            <div className="px-4 py-3 grid gap-1">
              {nav.map(link => (
                <Link key={link.href} href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center h-12 px-4 rounded-xl text-sm font-semibold"
                  style={{ color: 'var(--pt-text)', background: 'var(--pt-surface-soft)' }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Header spacer */}
      <div aria-hidden style={{ blockSize: 60 }} />

      {/* Search overlay — full-height sheet */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 sm:pt-24"
          style={{ background: 'rgb(6 11 24 / 0.6)', backdropFilter: 'blur(6px)', animation: 'sf-fade 160ms ease-out' }}
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-4 sm:p-5"
            style={{ background: 'var(--pt-surface)', boxShadow: '0 24px 60px -20px rgb(6 11 24 / 0.35)', animation: 'sf-scale-in 180ms ease-out' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              <Search className="absolute top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" style={{ insetInlineStart: 16, color: 'var(--pt-text-muted)' }} />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery)
                    window.location.href = `${storeUrl}/products?q=${encodeURIComponent(searchQuery)}`
                  if (e.key === 'Escape') setSearchOpen(false)
                }}
                placeholder="ابحث عن منتج…"
                className="w-full outline-none text-base"
                style={{
                  background: 'var(--pt-surface-soft)',
                  color: 'var(--pt-text)',
                  border: '1px solid var(--pt-border)',
                  borderRadius: 16,
                  paddingInlineStart: 48, paddingInlineEnd: 16, blockSize: 52,
                }}
              />
            </div>
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--pt-text-muted)' }}>
              اضغط Enter للبحث · Esc للإغلاق
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <main>{children}</main>

      {/* ── Footer — trust-first ─────────────────────────── */}
      <footer className="mt-16" style={{ background: 'var(--pt-text)', color: 'var(--pt-bg)' }}>
        <div className="max-w-6xl mx-auto px-4 py-10">
          {/* Trust strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-8 mb-8" style={{ borderBlockEnd: '1px solid rgb(255 255 255 / 0.08)' }}>
            {[
              { Icon: ShieldCheck, title: 'الدفع عند الاستلام', sub: 'ادفع بعد ما تشوف المنتج' },
              { Icon: PhoneCall,   title: 'نتصل لتأكيد الطلب', sub: 'مكالمة قصيرة قبل التوصيل' },
              { Icon: Truck,       title: 'توصيل 58 ولاية',    sub: 'شركات توصيل معتمدة' },
            ].map(({ Icon, title, sub }) => (
              <div key={title} className="flex items-start gap-3">
                <span className="flex items-center justify-center rounded-full flex-shrink-0"
                  style={{ inlineSize: 36, blockSize: 36, background: 'rgb(255 255 255 / 0.08)' }}>
                  <Icon className="w-4 h-4" aria-hidden />
                </span>
                <div>
                  <p className="font-bold text-sm">{title}</p>
                  <p className="text-xs mt-0.5" style={{ opacity: 0.6 }}>{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black"
                style={{ background: 'var(--pt-accent)', color: 'var(--pt-accent-text-on,#fff)' }}>
                {(store.name[0] ?? 'C').toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-sm">{store.name_ar ?? store.name}</p>
                <p className="text-xs" style={{ opacity: 0.55 }}>متجر إلكتروني جزائري</p>
              </div>
            </div>
            <p className="text-xs" style={{ opacity: 0.4 }}>مدعوم بـ Commerco</p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes sf-fade      { from { opacity: 0 } to { opacity: 1 } }
        @keyframes sf-scale-in  { from { opacity: 0; transform: translateY(6px) scale(0.98) } to { opacity: 1; transform: none } }
      `}</style>
    </div>
  )
}
