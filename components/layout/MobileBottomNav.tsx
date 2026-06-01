'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Grid3X3, Search, ShoppingCart, User } from 'lucide-react'
import { useCart } from '@/lib/store/cart'

const ITEMS = [
  { href: '/',           label: 'الرئيسية', Icon: Home },
  { href: '/discover',   label: 'المنتجات', Icon: Grid3X3 },
  { href: '/discover',      label: 'البحث',    Icon: Search },
  { href: '/discover/cart', label: 'السلة',    Icon: ShoppingCart },
  { href: '/dashboard',     label: 'حسابي',    Icon: User },
]

export default function MobileBottomNav() {
  const pathname = usePathname()
  const { count } = useCart()

  return (
    <nav
      className="fixed bottom-0 right-0 left-0 z-40 lg:hidden"
      style={{
        backgroundColor: '#FFFFFF',
        borderTop: '1px solid #EBEBEB',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      dir="rtl"
      aria-label="التنقل السفلي"
    >
      <div className="flex items-center justify-around h-[60px] px-2">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center justify-center gap-0.5 touch-target flex-1"
              aria-label={label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  size={21}
                  style={{
                    color: active ? '#0D6EFD' : '#999999',
                    transition: 'color 150ms ease',
                    strokeWidth: active ? 2.2 : 1.8,
                  }}
                />
                {/* Cart badge */}
                {href === '/discover/cart' && count() > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black text-white flex items-center justify-center"
                    style={{background:'#0D6EFD'}}>
                    {count()}
                  </span>
                )}
              </div>
              <span
                className="text-[10px] font-medium leading-none"
                style={{
                  color: active ? '#0D6EFD' : '#999999',
                  fontFamily: 'var(--font-tajawal)',
                  transition: 'color 150ms ease',
                }}
              >
                {label}
              </span>
              {/* Active dot indicator */}
              {active && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{ backgroundColor: '#0D6EFD' }}
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
