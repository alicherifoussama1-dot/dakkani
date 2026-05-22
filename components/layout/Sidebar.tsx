'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Package, ShoppingCart, Warehouse,
  Tag, Percent, Users, FileText, BarChart2, Settings,
  ExternalLink, Phone, Bot, ShieldAlert, ClipboardList,
  Zap, ChevronRight,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils/cn'
import type { Store } from '@/types'

const NAV_GROUPS = [
  {
    label: 'الرئيسية',
    items: [{ href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard }],
  },
  {
    label: 'المتجر',
    items: [
      { href: '/products',   label: 'المنتجات',  icon: Package },
      { href: '/orders',     label: 'الطلبات',   icon: ShoppingCart },
      { href: '/categories', label: 'الفئات',    icon: Tag },
      { href: '/coupons',    label: 'الكوبونات', icon: Percent },
    ],
  },
  {
    label: 'العمليات',
    items: [
      { href: '/admin/orders',      label: 'OMS متقدم',        icon: ClipboardList },
      { href: '/admin/pos',         label: 'نقطة البيع',       icon: Zap },
      { href: '/admin/call-center', label: 'مركز الاتصال',    icon: Phone },
      { href: '/admin/inventory',   label: 'المخزون',          icon: Warehouse },
    ],
  },
  {
    label: 'التسويق',
    items: [
      { href: '/admin/pages',     label: 'صفحات الهبوط', icon: FileText },
      { href: '/customers',       label: 'العملاء',       icon: Users },
      { href: '/admin/blacklist', label: 'القائمة السوداء', icon: ShieldAlert },
    ],
  },
  {
    label: 'الذكاء الاصطناعي',
    items: [
      { href: '/admin/analytics', label: 'الإحصائيات', icon: BarChart2 },
      { href: '/admin/ai-agent',  label: 'مساعد AI',   icon: Bot },
    ],
  },
  {
    label: 'الإعدادات',
    items: [{ href: '/settings', label: 'الإعدادات', icon: Settings }],
  },
]

export default function Sidebar({ store }: { store: Store }) {
  const pathname = usePathname()
  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href + '/'))

  return (
    <aside className="w-60 bg-[#0D2B1E] flex flex-col overflow-hidden border-l border-[#0D6EFD]/50">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-[#0D6EFD]/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-accent to-accent-dark rounded-xl flex items-center justify-center text-white font-black text-lg shadow-amber flex-shrink-0">
            {store.logo_url
              ? <img src={store.logo_url} alt={store.name} className="w-full h-full rounded-xl object-cover" />
              : store.name[0]
            }
          </div>
          <div className="overflow-hidden flex-1 min-w-0">
            <p className="font-black text-white truncate text-sm">{store.name_ar ?? store.name}</p>
            <p className="text-xs text-white/40 truncate">{store.slug}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5 scrollbar-hide">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            <p className="text-[10px] font-bold text-white/25 uppercase tracking-widest px-3 mb-1.5">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      active
                        ? 'bg-[#0D6EFD] text-white'
                        : 'text-white/50 hover:bg-[#0D6EFD]/40 hover:text-white/90'
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute inset-0 bg-[#0D6EFD] rounded-xl"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    )}
                    <item.icon className={cn(
                      'relative z-10 w-4 h-4 flex-shrink-0',
                      active ? 'text-accent' : 'text-white/40'
                    )} />
                    <span className="relative z-10 truncate">{item.label}</span>
                    {active && (
                      <div className="relative z-10 mr-auto w-1.5 h-1.5 bg-accent rounded-full" />
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Store link */}
      <div className="p-3 border-t border-[#0D6EFD]/50">
        <a
          href={`/store/${store.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-3 py-2.5 text-xs text-white/40 hover:text-accent hover:bg-[#0D6EFD]/40 rounded-xl transition-all group"
        >
          <ExternalLink className="w-3.5 h-3.5 group-hover:text-accent transition-colors" />
          <span className="font-medium">عرض المتجر</span>
          <span className="mr-auto w-2 h-2 bg-green-400 rounded-full dot-blink" />
        </a>
      </div>
    </aside>
  )
}
