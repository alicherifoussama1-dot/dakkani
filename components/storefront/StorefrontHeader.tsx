'use client'
import { useState } from 'react'
import Link from 'next/link'
import { ShoppingCart, Search, Menu, X } from 'lucide-react'
import type { Store } from '@/types'

interface Props { store: Store & { store_settings?: any } }

export default function StorefrontHeader({ store }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [query,    setQuery]    = useState('')

  return (
    <header className="bg-white border-b border-gray-100 sticky top-0 z-20 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo */}
        <Link href={`/store/${store.slug}`} className="flex items-center gap-2.5 flex-shrink-0">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.name} className="w-9 h-9 rounded-xl object-cover" />
          ) : (
            <div className="w-9 h-9 bg-dakkani-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
              {store.name[0]}
            </div>
          )}
          <span className="font-black text-gray-900 text-lg hidden sm:block">{store.name_ar ?? store.name}</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md mx-auto">
          <form
            onSubmit={e => { e.preventDefault(); window.location.href = `/store/${store.slug}/products?q=${encodeURIComponent(query)}` }}
            className="relative"
          >
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="ابحث عن منتج..."
              className="w-full border border-gray-200 rounded-xl pr-9 pl-4 py-2 text-sm focus:ring-2 focus:ring-dakkani-500 outline-none"
            />
          </form>
        </div>

        {/* Cart & Nav */}
        <div className="flex items-center gap-2">
          <Link
            href={`/store/${store.slug}/products`}
            className="hidden md:flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-dakkani-600 transition px-3 py-2 rounded-lg hover:bg-dakkani-50"
          >
            المنتجات
          </Link>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 text-gray-500 hover:text-gray-700"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1">
          <Link href={`/store/${store.slug}/products`} className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
            المنتجات
          </Link>
        </div>
      )}
    </header>
  )
}
