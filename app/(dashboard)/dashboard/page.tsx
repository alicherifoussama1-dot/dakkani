export const dynamic = 'force-dynamic'
export const metadata = { title: 'لوحة التحكم — دكاني' }

import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDZD } from '@/lib/utils/format'
import {
  TrendingUp, ShoppingCart, Package, Clock,
  AlertTriangle, ArrowUpRight, ArrowDownRight,
  Truck, CheckCircle, XCircle,
} from 'lucide-react'
import RevenueChart  from '@/components/dashboard/RevenueChart'
import RecentOrders  from '@/components/dashboard/RecentOrders'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: store } = await supabase
    .from('stores')
    .select('id, name, slug')
    .eq('owner_id', session!.user.id)
    .single()
  if (!store) return null

  const sid   = store.id
  const today = new Date().toISOString().split('T')[0]
  const week  = new Date(Date.now() - 7 * 86400000).toISOString()
  const prev  = new Date(Date.now() - 14 * 86400000).toISOString()

  const [ordersAll, todayRes, weekRes, prevRes, productsRes, pendingRes, stockRes] = await Promise.all([
    supabase.from('orders').select('total, status').eq('store_id', sid),
    supabase.from('orders').select('total, status').eq('store_id', sid).gte('created_at', today),
    supabase.from('orders').select('total, status').eq('store_id', sid).gte('created_at', week),
    supabase.from('orders').select('total, status').eq('store_id', sid).gte('created_at', prev).lt('created_at', week),
    supabase.from('products').select('id', { count: 'exact' }).eq('store_id', sid).eq('is_active', true),
    supabase.from('orders').select('id', { count: 'exact' }).eq('store_id', sid).eq('status', 'new'),
    supabase.from('warehouse_stock').select('quantity, reserved, low_stock_at').eq('store_id', sid),
  ])

  const orders       = ordersAll.data ?? []
  const todayOrders  = todayRes.data  ?? []
  const weekOrders   = weekRes.data   ?? []
  const prevOrders   = prevRes.data   ?? []

  const revenue      = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const todayRev     = todayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const weekRev      = weekOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const prevRev      = prevOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + o.total, 0)
  const revGrowth    = prevRev > 0 ? Math.round(((weekRev - prevRev) / prevRev) * 100) : 0

  const weekCount    = weekOrders.length
  const prevCount    = prevOrders.length
  const ordGrowth    = prevCount > 0 ? Math.round(((weekCount - prevCount) / prevCount) * 100) : 0

  const returnRate   = orders.length > 0
    ? Math.round((orders.filter(o => o.status === 'returned').length / orders.length) * 100)
    : 0

  const lowStock     = (stockRes.data ?? []).filter(s => (s.quantity - s.reserved) <= (s.low_stock_at ?? 5))

  const statusCounts = {
    new:       orders.filter(o => o.status === 'new').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    shipped:   orders.filter(o => o.status === 'shipped').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
  }

  return (
    <div className="space-y-6 animate-fade-in" dir="rtl">
      {/* Welcome */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900">
            مرحباً 👋 — {store.name}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">إليك ملخص أداء متجرك اليوم</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/products/new"
            className="bg-dakkani-500 hover:bg-dakkani-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition shadow-sm"
          >
            + منتج جديد
          </Link>
          <a
            href={`/store/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-gray-200 hover:border-dakkani-300 text-gray-600 hover:text-dakkani-600 px-4 py-2 rounded-xl text-sm font-medium transition"
          >
            عرض المتجر ↗
          </a>
        </div>
      </div>

      {/* Alerts */}
      {(lowStock.length > 0 || (pendingRes.count ?? 0) > 5) && (
        <div className="flex flex-wrap gap-3">
          {lowStock.length > 0 && (
            <Link href="/admin/inventory" className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-2.5 rounded-xl text-sm hover:bg-yellow-100 transition">
              <AlertTriangle className="w-4 h-4" />
              <strong>{lowStock.length}</strong> منتج على وشك النفاد — اضغط لإدارة المخزون
            </Link>
          )}
          {(pendingRes.count ?? 0) > 5 && (
            <Link href="/admin/call-center" className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm hover:bg-red-100 transition">
              <Clock className="w-4 h-4" />
              <strong>{pendingRes.count}</strong> طلب ينتظر التأكيد — انتقل لمركز الاتصال
            </Link>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label:   'إجمالي الإيرادات',
            value:   formatDZD(revenue),
            sub:     `اليوم: ${formatDZD(todayRev)}`,
            icon:    TrendingUp,
            color:   'text-green-600',
            bg:      'bg-green-50',
            border:  'border-green-100',
            growth:  revGrowth,
          },
          {
            label:   'إجمالي الطلبات',
            value:   orders.length.toString(),
            sub:     `هذا الأسبوع: ${weekCount}`,
            icon:    ShoppingCart,
            color:   'text-blue-600',
            bg:      'bg-blue-50',
            border:  'border-blue-100',
            growth:  ordGrowth,
          },
          {
            label:   'طلبات معلقة',
            value:   (pendingRes.count ?? 0).toString(),
            sub:     'تنتظر التأكيد',
            icon:    Clock,
            color:   'text-orange-600',
            bg:      'bg-orange-50',
            border:  'border-orange-100',
            growth:  null,
          },
          {
            label:   'المنتجات النشطة',
            value:   (productsRes.count ?? 0).toString(),
            sub:     `${lowStock.length} منتج مخزون منخفض`,
            icon:    Package,
            color:   'text-purple-600',
            bg:      'bg-purple-50',
            border:  'border-purple-100',
            growth:  null,
          },
        ].map(card => (
          <div key={card.label} className={`bg-white rounded-2xl border ${card.border} p-5 shadow-sm hover:shadow-md transition`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {card.growth !== null && (
                <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${
                  card.growth >= 0
                    ? 'bg-green-50 text-green-600'
                    : 'bg-red-50 text-red-600'
                }`}>
                  {card.growth >= 0
                    ? <ArrowUpRight className="w-3 h-3" />
                    : <ArrowDownRight className="w-3 h-3" />
                  }
                  {Math.abs(card.growth)}%
                </div>
              )}
            </div>
            <p className="text-2xl font-black text-gray-900">{card.value}</p>
            <p className="text-sm font-medium text-gray-600 mt-0.5">{card.label}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Order status pills */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <h2 className="font-bold text-gray-900 mb-4">توزيع الطلبات حسب الحالة</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'جديد',   count: statusCounts.new,       icon: Clock,         color: 'text-blue-600',   bg: 'bg-blue-50',   href: '/orders?status=new' },
            { label: 'مؤكد',  count: statusCounts.confirmed,  icon: CheckCircle,   color: 'text-green-600',  bg: 'bg-green-50',  href: '/orders?status=confirmed' },
            { label: 'شُحن',  count: statusCounts.shipped,    icon: Truck,         color: 'text-purple-600', bg: 'bg-purple-50', href: '/orders?status=shipped' },
            { label: 'سُلّم', count: statusCounts.delivered,  icon: CheckCircle,   color: 'text-emerald-600',bg: 'bg-emerald-50',href: '/orders?status=delivered' },
            { label: 'ملغى',  count: statusCounts.cancelled,  icon: XCircle,       color: 'text-red-600',    bg: 'bg-red-50',    href: '/orders?status=cancelled' },
          ].map(s => (
            <Link key={s.label} href={s.href} className={`flex items-center gap-3 p-3 ${s.bg} rounded-xl hover:opacity-80 transition`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
              <div>
                <p className="text-lg font-black text-gray-900">{s.count}</p>
                <p className={`text-xs font-medium ${s.color}`}>{s.label}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Charts + Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">الإيرادات (آخر 30 يوم)</h2>
            <Link href="/admin/analytics" className="text-xs text-dakkani-600 hover:underline font-medium">
              تقرير مفصل ←
            </Link>
          </div>
          <RevenueChart storeId={sid} />
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">آخر الطلبات</h2>
            <Link href="/orders" className="text-xs text-dakkani-600 hover:underline font-medium">
              عرض الكل ←
            </Link>
          </div>
          <RecentOrders storeId={sid} />
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-gradient-to-br from-dakkani-500 to-dakkani-700 rounded-2xl p-5 text-white">
        <h2 className="font-bold mb-3">إجراءات سريعة</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: '+ منتج جديد',     href: '/products/new',          bg: 'bg-white/20' },
            { label: '📋 الطلبات المعلقة', href: '/orders?status=new',   bg: 'bg-white/20' },
            { label: '📡 مركز الاتصال', href: '/admin/call-center',      bg: 'bg-white/20' },
            { label: '📊 الإحصائيات',   href: '/admin/analytics',        bg: 'bg-white/20' },
          ].map(a => (
            <Link
              key={a.label}
              href={a.href}
              className={`${a.bg} hover:bg-white/30 px-4 py-3 rounded-xl text-sm font-semibold transition text-center`}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
