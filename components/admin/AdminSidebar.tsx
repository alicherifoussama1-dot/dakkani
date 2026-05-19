'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Phone, Package, Users, BarChart2, Settings, Zap } from 'lucide-react'
import { cn } from '@/lib/utils/cn'
import type { Store } from '@/types'

const NAV = [
  { href: '/admin/orders',      label: 'الطلبات',       icon: ShoppingCart },
  { href: '/admin/call-center', label: 'مركز الاتصال',  icon: Phone },
  { href: '/admin/products',    label: 'المنتجات',       icon: Package },
  { href: '/admin/customers',   label: 'العملاء',        icon: Users },
  { href: '/admin/analytics',   label: 'الإحصائيات',    icon: BarChart2 },
  { href: '/dashboard',         label: 'لوحة التحكم',   icon: LayoutDashboard },
]

export default function AdminSidebar({ store }: { store: Store }) {
  const pathname = usePathname()
  return (
    <aside className="w-56 bg-gray-900 border-l border-gray-800 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E8431A] rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm">{store.name}</p>
            <p className="text-xs text-gray-500">Admin OMS</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(item => {
          const active = pathname.startsWith(item.href) && item.href !== '/dashboard'
          return (
            <Link key={item.href} href={item.href} className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition',
              active ? 'bg-[#E8431A]/20 text-dakkani-400' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
            )}>
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
