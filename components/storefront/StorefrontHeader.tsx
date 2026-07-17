'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Menu, X } from 'lucide-react'
import type { Store } from '@/types'

interface Props { store: Store & { store_settings?: any } }

// Compact storefront header used inside pages that don't opt into the
// full StorefrontLayout (rare — most pages use StorefrontLayout).
// Tokened to --pt-*, 44px touch targets, RTL.
export default function StorefrontHeader({ store }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query,    setQuery]    = useState('')
  const storeUrl = `/store/${store.slug}`

  return (
    <header
      className="sticky top-0 z-30"
      style={{ background: 'var(--pt-surface)', borderBlockEnd: '1px solid var(--pt-border)' }}
    >
      <div className="max-w-6xl mx-auto px-4 flex items-center gap-3" style={{ blockSize: 60 }}>
        {/* Logo */}
        <Link href={storeUrl} className="flex items-center gap-2.5 flex-shrink-0" aria-label={store.name_ar ?? store.name}>
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
          <span className="font-bold text-base hidden sm:block truncate"
            style={{ color: 'var(--pt-text)', letterSpacing: '-0.01em' }}>
            {store.name_ar ?? store.name}
          </span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md mx-auto">
          <form
            role="search"
            onSubmit={e => { e.preventDefault(); window.location.href = `${storeUrl}/products?q=${encodeURIComponent(query)}` }}
            className="relative"
          >
            <Search className="absolute top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ insetInlineStart: 12, color: 'var(--pt-text-muted)' }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن منتج…"
              aria-label="بحث"
              className="w-full outline-none text-sm"
              style={{
                background: 'var(--pt-surface-soft)',
                color: 'var(--pt-text)',
                border: '1px solid var(--pt-border)',
                borderRadius: 12,
                paddingInlineStart: 36, paddingInlineEnd: 12, blockSize: 40,
              }}
              onFocus={e => (e.currentTarget.style.borderColor = 'var(--pt-accent)')}
              onBlur={e => (e.currentTarget.style.borderColor = 'var(--pt-border)')}
            />
          </form>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Link href={`${storeUrl}/products`}
            className="hidden md:inline-flex items-center h-10 px-3.5 rounded-xl text-sm font-semibold transition-colors"
            style={{ color: 'var(--pt-text-soft)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--pt-surface-soft)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            المنتجات
          </Link>
          <button type="button" onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'} aria-expanded={menuOpen}
            className="md:hidden w-11 h-11 rounded-xl inline-flex items-center justify-center"
            style={{ color: 'var(--pt-text)' }}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden px-4 py-3 grid gap-1"
          style={{ background: 'var(--pt-surface)', borderBlockStart: '1px solid var(--pt-border)' }}>
          <Link href={`${storeUrl}/products`}
            onClick={() => setMenuOpen(false)}
            className="flex items-center h-12 px-4 rounded-xl text-sm font-semibold"
            style={{ color: 'var(--pt-text)', background: 'var(--pt-surface-soft)' }}>
            المنتجات
          </Link>
        </div>
      )}
    </header>
  )
}
