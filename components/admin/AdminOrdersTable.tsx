'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { formatDZD, formatDateShort } from '@/lib/utils/format'
import {
  Search, Filter, Download, Printer, CheckCircle,
  Truck, Clock, X, RefreshCw, Bell, ChevronDown,
  AlertTriangle, ShieldAlert,
} from 'lucide-react'

// ── Status config ─────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  new:        { label: 'جديد',    cls: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' },
  confirmed:  { label: 'مؤكد',   cls: 'bg-green-500/20 text-green-400 border border-green-500/30' },
  processing: { label: 'يُعالج', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
  shipped:    { label: 'شُحن',   cls: 'bg-purple-500/20 text-purple-400 border border-purple-500/30' },
  delivered:  { label: 'سُلّم',  cls: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' },
  returned:   { label: 'مُرجع',  cls: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' },
  cancelled:  { label: 'ملغى',   cls: 'bg-gray-500/20 text-gray-400 border border-gray-500/30' },
  failed:     { label: 'فاشل',   cls: 'bg-red-500/20 text-red-400 border border-red-500/30' },
}

const FRAUD_CFG = (score: number) =>
  score >= 70 ? { cls: 'text-red-400',    icon: ShieldAlert, label: `${score}%` } :
  score >= 40 ? { cls: 'text-yellow-400', icon: AlertTriangle, label: `${score}%` } :
                { cls: 'text-green-400',  icon: null, label: `${score}%` }

const PAYMENT_LABELS: Record<string, string> = {
  cod: 'COD', baridimob: 'داهبية', ccp: 'CCP', card: 'بطاقة',
  chargily_cib: 'CIB', chargily_edahabia: 'داهبية',
}

interface Order {
  id: string; order_number: string; customer_name: string; customer_phone: string
  wilaya_id: number; total: number; payment_method: string; status: string
  delivery_partner?: string; tracking_number?: string; fraud_score: number
  is_blacklisted: boolean; call_attempts: number; created_at: string
  items: { id: string }[]; wilaya?: { name_ar: string }
}

interface Props {
  orders: Order[]; total: number; page: number; pageSize: number
  storeId: string; wilayas: { id: number; name_ar: string }[]
  filters: Record<string, string | undefined>
}

export default function AdminOrdersTable({ orders: initialOrders, total, page, pageSize, storeId, wilayas, filters }: Props) {
  const router  = useRouter()
  const pathname = usePathname()
  const params  = useSearchParams()

  const [orders, setOrders]       = useState<Order[]>(initialOrders)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [bulkLoading, setBulk]    = useState<string | null>(null)
  const [newOrderCount, setNew]   = useState(0)
  const [searchVal, setSearch]    = useState(filters.search ?? '')
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // ── Realtime subscription ─────────────────────────────
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        const newOrder = payload.new as Order
        setOrders(prev => [newOrder, ...prev])
        setNew(c => c + 1)
        // Play notification sound
        try {
          if (!audioRef.current) {
            audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAA...') // beep
          }
          audioRef.current.play().catch(() => {})
        } catch {}
        // Browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`طلب جديد! ${newOrder.order_number}`, {
            body: `${newOrder.customer_name} — ${newOrder.total.toLocaleString()} دج`,
            icon: '/icons/icon-192x192.png',
          })
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        setOrders(prev => prev.map(o => o.id === payload.new.id ? { ...o, ...payload.new } as Order : o))
      })
      .subscribe()

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }

    return () => { supabase.removeChannel(channel) }
  }, [storeId])

  // ── URL push helper ───────────────────────────────────
  const push = (key: string, val: string) => {
    const p = new URLSearchParams(params.toString())
    val ? p.set(key, val) : p.delete(key)
    p.delete('page')
    router.push(`${pathname}?${p}`)
  }

  // ── Selection ─────────────────────────────────────────
  const toggleAll = () => {
    if (selected.size === orders.length) setSelected(new Set())
    else setSelected(new Set(orders.map(o => o.id)))
  }
  const toggle = (id: string) => {
    const s = new Set(selected)
    s.has(id) ? s.delete(id) : s.add(id)
    setSelected(s)
  }

  // ── Bulk actions ──────────────────────────────────────
  const bulkAction = async (action: string) => {
    if (!selected.size) return
    setBulk(action)
    const supabase = createClient()
    const ids = Array.from(selected)

    if (action === 'confirm') {
      await supabase.from('orders')
        .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
        .in('id', ids)
    } else if (action === 'cancel') {
      if (!confirm(`إلغاء ${ids.length} طلب؟`)) { setBulk(null); return }
      await supabase.from('orders').update({ status: 'cancelled' }).in('id', ids)
    } else if (action === 'ship') {
      // Send each to delivery API
      for (const id of ids) {
        await fetch('/api/delivery/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: id }),
        })
      }
    } else if (action === 'export') {
      exportCSV(orders.filter(o => ids.includes(o.id)))
      setBulk(null)
      return
    } else if (action === 'print') {
      printLabels(ids)
      setBulk(null)
      return
    }

    setSelected(new Set())
    router.refresh()
    setBulk(null)
  }

  // ── CSV Export ────────────────────────────────────────
  const exportCSV = (data: Order[]) => {
    const headers = ['رقم الطلب', 'العميل', 'الهاتف', 'الولاية', 'المجموع', 'الحالة', 'التاريخ']
    const rows = data.map(o => [
      o.order_number, o.customer_name, o.customer_phone,
      o.wilaya?.name_ar ?? o.wilaya_id, o.total,
      STATUS_CFG[o.status]?.label ?? o.status,
      formatDateShort(o.created_at),
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const printLabels = (ids: string[]) => {
    // Open label generation page in new tab
    window.open(`/api/admin/labels/generate?ids=${ids.join(',')}`, '_blank')
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-black text-white">الطلبات</h1>
          <span className="text-sm text-gray-500 bg-gray-800 px-2.5 py-1 rounded-lg">{total.toLocaleString()}</span>
          {newOrderCount > 0 && (
            <button
              onClick={() => { setNew(0); router.refresh() }}
              className="flex items-center gap-1.5 text-xs bg-[#0D6EFD]/20 text-[#F96540] border border-[#0D6EFD]/30 px-2.5 py-1 rounded-lg animate-pulse"
            >
              <Bell className="w-3.5 h-3.5" />
              {newOrderCount} طلب جديد
            </button>
          )}
        </div>
        <button onClick={() => router.refresh()} className="text-gray-500 hover:text-gray-300 transition">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ── Filters ────────────────────────────────────── */}
      <div className="px-6 py-3 border-b border-gray-800 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={searchVal}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && push('search', searchVal)}
            placeholder="اسم، هاتف، رقم طلب..."
            className="bg-gray-800 border border-gray-700 rounded-lg pr-9 pl-3 py-1.5 text-sm text-gray-300 placeholder:text-gray-600 focus:ring-1 focus:ring-[#0D6EFD] outline-none w-48"
          />
        </div>

        {/* Status filter */}
        <select
          value={filters.status ?? ''}
          onChange={e => push('status', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
        >
          <option value="">كل الحالات</option>
          {Object.entries(STATUS_CFG).map(([v, c]) => (
            <option key={v} value={v}>{c.label}</option>
          ))}
        </select>

        {/* Wilaya filter */}
        <select
          value={filters.wilaya ?? ''}
          onChange={e => push('wilaya', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
        >
          <option value="">كل الولايات</option>
          {wilayas.map(w => (
            <option key={w.id} value={w.id}>{w.name_ar}</option>
          ))}
        </select>

        {/* Date range */}
        <input
          type="date"
          value={filters.from ?? ''}
          onChange={e => push('from', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
        />
        <span className="text-gray-600 text-sm">→</span>
        <input
          type="date"
          value={filters.to ?? ''}
          onChange={e => push('to', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
        />

        {/* Fraud filter */}
        <select
          value={filters.fraud ?? ''}
          onChange={e => push('fraud', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
        >
          <option value="">كل المستويات</option>
          <option value="high">خطر عالٍ ≥70%</option>
          <option value="medium">خطر متوسط 40-70%</option>
          <option value="low">خطر منخفض &lt;40%</option>
        </select>

        {Object.values(filters).some(Boolean) && (
          <button
            onClick={() => router.push(pathname)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition"
          >
            <X className="w-3 h-3" />
            مسح الفلاتر
          </button>
        )}
      </div>

      {/* ── Bulk Actions ───────────────────────────────── */}
      {selected.size > 0 && (
        <div className="px-6 py-2 bg-[#0D6EFD]/10 border-b border-[#0D6EFD]/20 flex items-center gap-3">
          <span className="text-sm text-[#F96540] font-medium">{selected.size} طلب محدد</span>
          {[
            { id: 'confirm', label: 'تأكيد', icon: CheckCircle, cls: 'text-green-400 hover:bg-green-500/10' },
            { id: 'ship',    label: 'إرسال للتوصيل', icon: Truck, cls: 'text-blue-400 hover:bg-blue-500/10' },
            { id: 'print',   label: 'طباعة الملصقات', icon: Printer, cls: 'text-gray-300 hover:bg-gray-700' },
            { id: 'export',  label: 'تصدير CSV', icon: Download, cls: 'text-gray-300 hover:bg-gray-700' },
            { id: 'cancel',  label: 'إلغاء', icon: X, cls: 'text-red-400 hover:bg-red-500/10' },
          ].map(a => (
            <button
              key={a.id}
              onClick={() => bulkAction(a.id)}
              disabled={bulkLoading === a.id}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition ${a.cls}`}
            >
              {bulkLoading === a.id
                ? <span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                : <a.icon className="w-3.5 h-3.5" />
              }
              {a.label}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} className="mr-auto text-xs text-gray-600 hover:text-gray-400">
            إلغاء التحديد
          </button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="sticky top-0 bg-gray-900 border-b border-gray-800 z-10">
            <tr>
              <th className="px-4 py-3 text-right w-10">
                <input
                  type="checkbox"
                  checked={selected.size === orders.length && orders.length > 0}
                  onChange={toggleAll}
                  className="w-3.5 h-3.5 accent-[#0D6EFD]"
                />
              </th>
              {['#', 'رقم الطلب', 'العميل', 'الولاية', 'المنتجات', 'المجموع', 'الدفع', 'الحالة', 'الناقل', 'التتبع', 'الاحتيال', 'التاريخ', ''].map(h => (
                <th key={h} className="px-3 py-3 text-right text-xs font-semibold text-gray-500 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((order, idx) => {
              const st   = STATUS_CFG[order.status] ?? { label: order.status, cls: 'bg-gray-800 text-gray-400' }
              const fraud = FRAUD_CFG(order.fraud_score)
              const FraudIcon = fraud.icon
              return (
                <tr
                  key={order.id}
                  className={`border-b border-gray-800/50 hover:bg-gray-800/40 transition ${
                    order.is_blacklisted ? 'bg-red-900/10' : ''
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      onChange={() => toggle(order.id)}
                      className="w-3.5 h-3.5 accent-[#0D6EFD]"
                    />
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs">{(page - 1) * pageSize + idx + 1}</td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/orders/${order.id}`} className="font-mono text-[#F96540] hover:text-[#FDBA74] font-bold text-xs">
                      {order.order_number}
                    </Link>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-gray-200 font-medium text-xs">{order.customer_name}</p>
                    <p className="text-gray-500 text-xs">{order.customer_phone}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{order.wilaya?.name_ar ?? order.wilaya_id}</td>
                  <td className="px-3 py-3 text-gray-400 text-xs">{order.items?.length ?? 0} منتج</td>
                  <td className="px-3 py-3 font-bold text-gray-200 text-xs whitespace-nowrap">{formatDZD(order.total)}</td>
                  <td className="px-3 py-3 text-xs text-gray-400">{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-3 py-3 text-gray-500 text-xs capitalize">{order.delivery_partner ?? '—'}</td>
                  <td className="px-3 py-3">
                    {order.tracking_number ? (
                      <span className="font-mono text-xs text-blue-400">{order.tracking_number}</span>
                    ) : <span className="text-gray-700">—</span>}
                  </td>
                  <td className="px-3 py-3">
                    <div className={`flex items-center gap-1 text-xs font-bold ${fraud.cls}`}>
                      {FraudIcon && <FraudIcon className="w-3 h-3" />}
                      {fraud.label}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">{formatDateShort(order.created_at)}</td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-xs text-[#0D6EFD] hover:text-[#F96540] font-medium"
                    >
                      إدارة
                    </Link>
                  </td>
                </tr>
              )
            })}
            {orders.length === 0 && (
              <tr><td colSpan={14} className="text-center py-16 text-gray-600">لا توجد طلبات مطابقة</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────── */}
      <div className="px-6 py-3 border-t border-gray-800 flex items-center justify-between">
        <p className="text-xs text-gray-600">
          {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} من {total.toLocaleString()} طلب
        </p>
        <div className="flex items-center gap-2">
          {page > 1 && (
            <button
              onClick={() => push('page', String(page - 1))}
              className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg transition"
            >
              السابق
            </button>
          )}
          <span className="text-xs text-gray-500">صفحة {page} / {totalPages}</span>
          {page < totalPages && (
            <button
              onClick={() => push('page', String(page + 1))}
              className="text-xs px-3 py-1.5 bg-[#0D6EFD] text-white hover:bg-[#0B5ED7] rounded-lg transition"
            >
              التالي
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
