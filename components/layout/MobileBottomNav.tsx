'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Grid3X3, Search, ShoppingCart, User } from 'lucide-react'

const ITEMS = [
  { href: '/',         label: 'الرئيسية', Icon: Home },
  { href: '/products', label: 'المنتجات', Icon: Grid3X3 },
  { href: '/search',   label: 'البحث',    Icon: Search },
  { href: '/cart',     label: 'السلة',    Icon: ShoppingCart },
  { href: '/account',  label: 'حسابي',    Icon: User },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

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
              <Icon
                size={21}
                style={{
                  color: active ? '#E8431A' : '#999999',
                  transition: 'color 150ms ease',
                  strokeWidth: active ? 2.2 : 1.8,
                }}
              />
              <span
                className="text-[10px] font-medium leading-none"
                style={{
                  color: active ? '#E8431A' : '#999999',
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
                  style={{ backgroundColor: '#E8431A' }}
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
