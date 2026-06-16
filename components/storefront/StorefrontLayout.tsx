'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X } from 'lucide-react'
import type { Store } from '@/types'
import { getProductTheme, themeToCSSVars } from '@/lib/product-themes'

interface Props { store: Store & { store_settings?: any; theme_key?: string }; children: React.ReactNode }

export default function StorefrontLayout({ store, children }: Props) {
  const [scrolled,    setScrolled]    = useState(false)
  const [mobileOpen,  setMobileOpen]  = useState(false)
  const [searchOpen,  setSearchOpen]  = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const storeUrl = `/store/${store.slug}`
  const theme = getProductTheme(store.theme_key)

  return (
    <div className="min-h-screen" dir="rtl" data-theme={theme.key}
      style={{ ...themeToCSSVars(theme), background: 'var(--pt-bg)', color: 'var(--pt-text)' }}>
      {/* ── Navigation ── */}
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          scrolled ? 'nav-blur shadow-float' : 'bg-transparent'
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link href={storeUrl} className="flex items-center gap-3 flex-shrink-0">
            {store.logo_url ? (
              <Image src={store.logo_url} alt={store.name} width={36} height={36} className="w-9 h-9 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-lg"
                style={{ background: 'var(--pt-btn-primary-bg,linear-gradient(135deg,#0D6EFD,#0B5ED7))', color: 'var(--pt-btn-primary-text,#fff)' }}>
                {store.name[0]}
              </div>
            )}
            <span className={`font-black text-lg hidden sm:block transition-colors ${scrolled ? 'text-white' : 'text-[var(--pt-accent)]'}`}>
              {store.name_ar ?? store.name}
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: 'الرئيسية', href: storeUrl },
              { label: 'المنتجات', href: `${storeUrl}/products` },
            ].map(link => (
              <Link key={link.href} href={link.href}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                  scrolled ? 'text-white/80 hover:text-white hover:bg-white/10' : 'text-[var(--pt-accent)] hover:bg-primary/5'
                }`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Icons */}
          <div className="flex items-center gap-2">
            <button onClick={() => setSearchOpen(true)}
              className={`p-2 rounded-xl transition-colors ${scrolled ? 'text-white/80 hover:bg-white/10' : 'text-[var(--pt-accent)] hover:bg-primary/5'}`}>
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden p-2 rounded-xl ${scrolled ? 'text-white' : 'text-[var(--pt-accent)]'}`}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="nav-blur border-t border-white/10 md:hidden">
            <div className="px-4 py-4 space-y-1">
              {[
                { label: 'الرئيسية', href: storeUrl },
                { label: 'جميع المنتجات', href: `${storeUrl}/products` },
              ].map(link => (
                <Link key={link.href} href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 text-white/90 hover:text-white hover:bg-white/10 rounded-xl text-sm font-semibold transition">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Search overlay */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-20 px-4"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-float w-full max-w-lg p-5"
            onClick={e => e.stopPropagation()}
          >
            <div className="relative">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                autoFocus
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && searchQuery)
                    window.location.href = `${storeUrl}/products?q=${encodeURIComponent(searchQuery)}`
                }}
                placeholder="ابحث عن منتج..."
                className="w-full border-2 border-[#DEE2E6] focus:border-[#0D6EFD] rounded-2xl pr-12 pl-4 py-4 text-base outline-none transition"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">اضغط Enter للبحث</p>
          </div>
        </div>
      )}

      {/* Content */}
      <main className="page-enter">{children}</main>

      {/* Footer */}
      <footer className="bg-[#1A2B3C] text-white mt-16">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center font-black text-white">
                {store.name[0]}
              </div>
              <div>
                <p className="font-black">{store.name_ar ?? store.name}</p>
                <p className="text-white/50 text-xs">متجر إلكتروني جزائري</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-white/60">
              {['الدفع عند الاستلام ✓', 'فتح قبل الدفع ✓', 'توصيل لكل الجزائر ✓'].map(t => (
                <span key={t}>{t}</span>
              ))}
            </div>
            <p className="text-white/30 text-xs">مدعوم بـ دكاني</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
