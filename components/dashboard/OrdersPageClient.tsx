'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, Plus, Search, Filter, Calendar, ChevronDown, Edit2 } from 'lucide-react'
import { formatDZD, formatDateShort } from '@/lib/utils/format'
import StatusBadge from '@/components/ui/StatusBadge'
import { useDebounce } from '@/hooks/useDebounce'

const ORDER_TYPES    = ['الكل','نظيف','قيد المراجعة','مهجور']
const ORDER_STATUSES = ['الكل','جديد','مؤكد','يُعالج','شُحن','مُسلَّم','ملغى','مُرجَع']
const STATUS_VALUES: Record<string,string> = {'الكل':'','جديد':'new','مؤكد':'confirmed','يُعالج':'processing','شُحن':'shipped','مُسلَّم':'delivered','ملغى':'cancelled','مُرجَع':'returned'}

interface Props {
  initialOrders: any[]
  total:         number
  page:          number
  perPage:       number
  storeId:       string
  products:      { id: string; name: string; name_ar?: string; sku?: string }[]
  filters:       Record<string, string | undefined>
}

export default function OrdersPageClient({
  initialOrders, total, page, perPage, storeId, products, filters,
}: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const [search,  setSearch]  = useState(filters.search ?? '')
  const [type,    setType]    = useState('الكل')
  const [sit,     setSit]     = useState('الكل')
  const [pp,      setPp]      = useState(perPage)
  const debouncedSearch = useDebounce(search, 400)

  const push = (updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params.toString())
    Object.entries(updates).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    p.delete('page')
    router.push(`${pathname}?${p}`)
  }

  // Auto-search when debounced search changes
  useEffect(() => {
    push({ search: debouncedSearch || undefined })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h1 className="page-title">الطلبات</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => router.refresh()} className="btn btn-sm gap-1.5" style={{ background: '#FFC107', color: '#000', border: 'none' }}>
            <RefreshCw size={13} />تحديث
          </button>
          <Link href="/orders/new" className="btn btn-primary btn-sm gap-1.5">
            <Plus size={13} />إنشاء طلب
          </Link>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card p-3 mb-4 flex flex-wrap gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث في الطلبات..."
            className="input pr-8 text-sm"
          />
        </div>

        {/* Products dropdown */}
        <select className="input text-sm w-44" style={{ minWidth: '160px' }}>
          <option>كل المنتجات</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name_ar ?? p.name}</option>)}
        </select>

        {/* Date */}
        <button className="btn btn-sm gap-1.5" style={{ border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-secondary)' }}>
          <Calendar size={13} />التاريخ
        </button>

        {/* Type */}
        <select value={type} onChange={e => setType(e.target.value)} className="input text-sm w-40">
          {ORDER_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>

        {/* Status */}
        <select value={sit} onChange={e => { setSit(e.target.value); push({ status: STATUS_VALUES[e.target.value] || undefined }) }} className="input text-sm w-44">
          {ORDER_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['رقم الطلب','معلومات الزبون','الموقع','معلومات الطلب','المنتج','الحالة','التتبع','إجراءات'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {initialOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    لا توجد طلبات — ابدأ بإضافة منتجك الأول
                  </td>
                </tr>
              ) : initialOrders.map(order => (
                <tr key={order.id}>
                  <td>
                    <span className="font-mono text-xs font-semibold" style={{ color: 'var(--color-accent)' }}>
                      #{order.order_number}
                    </span>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {formatDateShort(order.created_at)}
                    </p>
                  </td>
                  <td>
                    <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{order.customer_name}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{order.customer_phone}</p>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    <p>{(order.wilaya as any)?.name_ar ?? '—'}</p>
                    <p>{(order.commune as any)?.name_ar ?? ''}</p>
                  </td>
                  <td>
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-primary)' }}>
                      {formatDZD(order.total)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {order.delivery_type === 'stopdesk' ? 'مكتب' : 'منزل'}
                    </p>
                  </td>
                  <td>
                    {(order.items as any[])?.[0]?.product_name && (
                      <>
                        <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {(order.items as any[])[0].product_name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                          ×{(order.items as any[])[0].quantity}
                        </p>
                      </>
                    )}
                  </td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>
                    {order.tracking_number
                      ? <span className="font-mono text-xs" style={{ color: 'var(--color-accent)' }}>{order.tracking_number}</span>
                      : <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>—</span>
                    }
                  </td>
                  <td>
                    <Link href={`/orders/${order.id}`} className="p-1.5 rounded hover:bg-[#F8F9FA] transition-colors inline-flex">
                      <Edit2 size={13} style={{ color: 'var(--color-text-muted)' }} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t flex-wrap gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <select value={pp} onChange={e => { setPp(+e.target.value); push({ per_page: e.target.value }) }} className="input h-7 text-xs px-2 w-16">
              {[5,10,20,30,50].map(n => <option key={n}>{n}</option>)}
            </select>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {((page-1)*perPage)+1} - {Math.min(page*perPage, total)} من {total.toLocaleString('ar-DZ')}
            </span>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              {[
                { label: '«', p: 1, disabled: page <= 1 },
                { label: '‹', p: page-1, disabled: page <= 1 },
                { label: '›', p: page+1, disabled: page >= totalPages },
                { label: '»', p: totalPages, disabled: page >= totalPages },
              ].map(btn => (
                <button
                  key={btn.label}
                  onClick={() => !btn.disabled && push({ page: String(btn.p) })}
                  disabled={btn.disabled}
                  className="w-7 h-7 flex items-center justify-center rounded text-xs border hover:bg-[#F8F9FA] disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
