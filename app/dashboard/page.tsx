'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  LayoutDashboard, Package, ShoppingCart, BarChart2,
  Settings, TrendingUp, Users, AlertCircle, MoreHorizontal,
  LogOut, Bell, Plus,
} from 'lucide-react'

const STATS = [
  { label: 'المبيعات اليوم',     value: '12,400 دج', icon: TrendingUp, trend: '+18%', up: true },
  { label: 'الطلبات الجديدة',    value: '7',          icon: ShoppingCart, trend: '+3', up: true },
  { label: 'إجمالي الأرباح',    value: '84,200 دج', icon: BarChart2, trend: '+12%', up: true },
  { label: 'تقييم المتجر',       value: '4.8 / 5',   icon: Users, trend: '+0.2', up: true },
]

const RECENT_ORDERS = [
  { id: 'DK-00123', customer: 'محمد بن علي',   wilaya: 'الجزائر',   total: '3,500 دج', status: 'جديد',       statusColor: '#3b82f6' },
  { id: 'DK-00122', customer: 'سارة حمادة',    wilaya: 'وهران',     total: '1,800 دج', status: 'قيد التوصيل', statusColor: '#f59e0b' },
  { id: 'DK-00121', customer: 'كريم ميزاب',    wilaya: 'قسنطينة',  total: '5,200 دج', status: 'تم التسليم',  statusColor: '#10b981' },
  { id: 'DK-00120', customer: 'فاطمة الزهراء', wilaya: 'تيزي وزو', total: '2,100 دج', status: 'تم التسليم',  statusColor: '#10b981' },
]

const NAV_ITEMS = [
  { href: '/dashboard',  label: 'الرئيسية',   Icon: LayoutDashboard, active: true },
  { href: '/products',   label: 'المنتجات',   Icon: Package },
  { href: '/orders',     label: 'الطلبات',    Icon: ShoppingCart },
  { href: '/analytics',  label: 'الإحصائيات', Icon: BarChart2 },
  { href: '/settings',   label: 'الإعدادات',  Icon: Settings },
]

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: '#F9F9F9' }}
      dir="rtl"
    >
      {/* ── Sidebar ──────────────────────────────── */}
      <aside
        className={`fixed top-0 right-0 z-40 h-full transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        style={{
          width: '220px',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #EBEBEB',
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          className="flex items-center gap-2 px-5 h-16 border-b"
          style={{ borderColor: '#EBEBEB' }}
        >
          <span
            className="font-black text-xl"
            style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
          >
            دكاني<span style={{ color: '#E8431A' }}>.</span>
          </span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-md font-semibold"
            style={{ backgroundColor: '#FFF0ED', color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}
          >
            Pro
          </span>
        </div>

        {/* Nav */}
        <nav className="p-3 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, Icon, active }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: active ? '#FFF0ED' : 'transparent',
                color: active ? '#E8431A' : '#444444',
                fontFamily: 'var(--font-tajawal)',
              }}
            >
              <Icon size={17} style={{ flexShrink: 0 }} />
              {label}
            </Link>
          ))}
        </nav>

        {/* User */}
        <div
          className="absolute bottom-0 left-0 right-0 p-3 border-t"
          style={{ borderColor: '#EBEBEB' }}
        >
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-[#F9F9F9] transition-colors cursor-pointer">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: '#E8431A' }}
            >
              م
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                محمد بن علي
              </p>
              <p className="text-xs truncate" style={{ color: '#999999' }}>
                متجر الموضة
              </p>
            </div>
            <LogOut size={14} style={{ color: '#999999', flexShrink: 0 }} />
          </div>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="sticky top-0 z-30 flex items-center justify-between px-4 md:px-6 h-16 border-b"
          style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB' }}
        >
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden touch-target text-[#444444]"
              onClick={() => setSidebarOpen(s => !s)}
              aria-label="القائمة"
            >
              <LayoutDashboard size={20} />
            </button>
            <div>
              <p className="font-bold text-sm" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                مرحبا، محمد 👋
              </p>
              <p className="text-xs" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
                اليوم الأحد، {new Date().toLocaleDateString('ar-DZ', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/products/new"
              className="btn btn-accent text-xs h-9 px-4 rounded-xl hidden sm:flex items-center gap-1.5"
              style={{ fontFamily: 'var(--font-tajawal)' }}
            >
              <Plus size={14} />
              منتج جديد
            </Link>
            <button className="touch-target w-9 h-9 flex items-center justify-center rounded-xl relative" style={{ backgroundColor: '#F3F3F3' }}>
              <Bell size={16} style={{ color: '#444444' }} />
              <span
                className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2 border-white"
                style={{ backgroundColor: '#E8431A' }}
              />
            </button>
          </div>
        </header>

        {/* Dashboard content */}
        <main className="flex-1 p-4 md:p-6 space-y-6">
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {STATS.map(({ label, value, icon: Icon, trend, up }) => (
              <div
                key={label}
                className="rounded-2xl p-4 md:p-5 border"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: '#FFF0ED' }}
                  >
                    <Icon size={17} style={{ color: '#E8431A' }} />
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: up ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                      color: up ? '#10b981' : '#ef4444',
                      fontFamily: 'var(--font-inter)',
                    }}
                  >
                    {trend}
                  </span>
                </div>
                <p
                  className="font-black text-lg md:text-xl leading-none mb-1"
                  style={{ color: '#111111', fontFamily: 'var(--font-inter)' }}
                >
                  {value}
                </p>
                <p
                  className="text-xs"
                  style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* Recent orders table */}
          <div
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB' }}
          >
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: '#EBEBEB' }}
            >
              <h3
                className="font-bold text-sm"
                style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
              >
                آخر الطلبات
              </h3>
              <Link
                href="/orders"
                className="text-xs font-semibold"
                style={{ color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}
              >
                عرض الكل ←
              </Link>
            </div>

            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ backgroundColor: '#F9F9F9', borderBottom: '1px solid #EBEBEB' }}>
                    {['رقم الطلب', 'العميل', 'الولاية', 'المجموع', 'الحالة', ''].map(h => (
                      <th
                        key={h}
                        className="text-right px-5 py-3 text-xs font-semibold"
                        style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#EBEBEB' }}>
                  {RECENT_ORDERS.map(order => (
                    <tr key={order.id} className="hover:bg-[#F9F9F9] transition-colors">
                      <td className="px-5 py-3.5 text-sm font-mono font-semibold" style={{ color: '#E8431A' }}>
                        {order.id}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                        {order.customer}
                      </td>
                      <td className="px-5 py-3.5 text-sm" style={{ color: '#444444', fontFamily: 'var(--font-tajawal)' }}>
                        {order.wilaya}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-bold" style={{ color: '#111111', fontFamily: 'var(--font-inter)' }}>
                        {order.total}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: order.statusColor + '18',
                            color: order.statusColor,
                            fontFamily: 'var(--font-tajawal)',
                          }}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <button style={{ color: '#999999' }}>
                          <MoreHorizontal size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y" style={{ borderColor: '#EBEBEB' }}>
              {RECENT_ORDERS.map(order => (
                <div key={order.id} className="px-5 py-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-mono font-semibold" style={{ color: '#E8431A' }}>
                      {order.id}
                    </p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                      {order.customer}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
                      {order.wilaya}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold" style={{ color: '#111111', fontFamily: 'var(--font-inter)' }}>
                      {order.total}
                    </p>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: order.statusColor + '18',
                        color: order.statusColor,
                        fontFamily: 'var(--font-tajawal)',
                      }}
                    >
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'إضافة منتج',    href: '/products/new', emoji: '📦' },
              { label: 'إدارة الطلبات', href: '/orders',       emoji: '📋' },
              { label: 'الإحصائيات',   href: '/analytics',    emoji: '📊' },
              { label: 'إعدادات المتجر', href: '/settings',    emoji: '⚙️' },
            ].map(({ label, href, emoji }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border text-center transition-all hover:border-[#E8431A] hover:bg-[#FFF0ED]"
                style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB' }}
              >
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs font-semibold" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </main>
      </div>

      {/* Sidebar overlay (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  )
}
