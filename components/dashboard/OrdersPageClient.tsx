'use client'
// COMMERCO ORDERS — design-system rebuild.
// UX rethink: status filtering moved from a buried <select> to a
// one-tap chip row (the merchant's core workflow); toolbar reduced
// to one primary action; token table with proper empty state and
// toasts. All data flow (URL params, debounce, ship-to-courier,
// CSV export, pagination) preserved exactly.
import { useT, useRaw, useDir } from '@/lib/i18n/react'
import { useState, useEffect } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { RefreshCw, Plus, Search, Edit2, Download, Truck, Loader2, ShoppingCart } from 'lucide-react'
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
  const t = useT()
  const raw = useRaw()
  const dir = useDir()
  const TYPE_LABELS: Record<string,string> = { 'الكل': t('common.all'), 'نظيف': t('status.clean'), 'قيد المراجعة': t('status.reviewing'), 'مهجور': t('status.abandoned') }
  const STATUS_LABELS: Record<string,string> = { 'الكل': t('common.all'), 'جديد': t('status.new'), 'مؤكد': t('status.confirmed'), 'يُعالج': t('status.processing'), 'شُحن': t('status.shipped'), 'مُسلَّم': t('status.delivered'), 'ملغى': t('status.cancelled'), 'مُرجَع': t('status.returned') }
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()

  const [search,  setSearch]  = useState(filters.search ?? '')
  const [type,    setType]    = useState('الكل')
  const [sit,     setSit]     = useState('الكل')
  const [pp,      setPp]      = useState(perPage)
  const [shipping, setShipping] = useState<string | null>(null)
  const [toast,    setToast]    = useState('')
  const debouncedSearch = useDebounce(search, 400)

  const sendToDelivery = async (orderId: string) => {
    setShipping(orderId)
    try {
      const res = await fetch(`/api/delivery/ship/${orderId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { setToast(d.error ?? t('orders.send_fail')) }
      else { setToast(t('orders.send_ok', { provider: d.provider ?? t('orders.provider_fallback'), tracking: d.trackingNumber })); router.refresh() }
    } catch { setToast(t('orders.send_err')) }
    finally { setShipping(null); setTimeout(() => setToast(''), 3000) }
  }

  const push = (updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams(params.toString())
    Object.entries(updates).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    p.delete('page')
    router.push(`${pathname}?${p}`)
  }

  useEffect(() => {
    push({ search: debouncedSearch || undefined })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const totalPages = Math.ceil(total / perPage)
  const isEmpty = initialOrders.length === 0
  const hasActiveFilters = Boolean(filters.search || filters.status || filters.from || filters.to)

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir={dir} style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* ── Header: one primary action ── */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{t('orders.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {t('orders.total_count', { count: total.toLocaleString() })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => router.refresh()} className="c-btn c-btn--ghost c-btn--sm" aria-label={t('common.refresh')} title={t('common.refresh')}>
            <RefreshCw size={14} aria-hidden />
          </button>
          <button
            onClick={() => {
              const rows = [raw('orders.csv_cols') as string[]]
              initialOrders.forEach(o => rows.push([o.order_number,o.customer_name,o.customer_phone,String(o.total),o.status,o.created_at?.slice(0,10)]))
              const csv = rows.map(r => r.join(',')).join('\n')
              const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'}))
              a.download = `orders-${new Date().toISOString().slice(0,10)}.csv`; a.click()
            }}
            className="c-btn c-btn--secondary c-btn--sm">
            <Download size={14} aria-hidden />{t('common.export_csv')}
          </button>
          <Link href="/orders/new" className="c-btn c-btn--primary c-btn--sm">
            <Plus size={14} aria-hidden />{t('orders.create')}
          </Link>
        </div>
      </div>

      {/* ── Status chips: the core workflow, one tap ── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1 mb-3" role="group" aria-label={t('orders.title')}>
        {ORDER_STATUSES.map(s => (
          <button key={s} onClick={() => { setSit(s); push({ status: STATUS_VALUES[s] || undefined }) }}
            className="c-chip flex-shrink-0" aria-pressed={sit === s}>
            {STATUS_LABELS[s] ?? s}
          </button>
        ))}
      </div>

      {/* ── Secondary filters ── */}
      <div className="c-card mb-4" style={{ padding: 'var(--space-3)' }}>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" style={{ color: 'var(--text-muted)' }} aria-hidden />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder={t('orders.search_ph')} className="c-input ps-9" aria-label={t('orders.search_ph')} />
          </div>
          <select className="c-select w-44" style={{ inlineSize: 176 }} aria-label={t('orders.all_products')}>
            <option>{t('orders.all_products')}</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name_ar ?? p.name}</option>)}
          </select>
          <div className="flex items-center gap-1.5">
            <input type="date" onChange={e => push({ from: e.target.value || undefined })}
              className="c-input" style={{ inlineSize: 148, blockSize: 'var(--control-h-sm)', fontSize: 'var(--text-xs)' }} dir="ltr" aria-label={t('common.from')} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>–</span>
            <input type="date" onChange={e => push({ to: e.target.value || undefined })}
              className="c-input" style={{ inlineSize: 148, blockSize: 'var(--control-h-sm)', fontSize: 'var(--text-xs)' }} dir="ltr" aria-label={t('common.to')} />
          </div>
          <select value={type}
            onChange={e => {
              const v = e.target.value
              setType(v)
              // "مهجور" surfaces abandoned-checkout drafts; "الكل" resets.
              if (v === 'مهجور') { setSit('الكل'); push({ status: 'abandoned' }) }
              else if (v === 'الكل') push({ status: undefined })
            }}
            className="c-select" style={{ inlineSize: 150 }} aria-label={TYPE_LABELS['الكل']}>
            {ORDER_TYPES.map(o => <option key={o} value={o}>{TYPE_LABELS[o] ?? o}</option>)}
          </select>
        </div>
      </div>

      {/* ── Table / empty state ── */}
      {isEmpty ? (
        <div className="c-card" style={{ padding: 0 }}>
          <div className="c-empty">
            <div className="c-empty__icon"><ShoppingCart size={24} aria-hidden /></div>
            <div className="c-empty__title">{t('orders.empty')}</div>
            {hasActiveFilters ? (
              <button onClick={() => { setSearch(''); setSit('الكل'); router.push(pathname) }} className="c-btn c-btn--secondary" style={{ marginBlockStart: 'var(--space-3)' }}>
                {t('common.all')}
              </button>
            ) : (
              <Link href="/orders/new" className="c-btn c-btn--primary" style={{ marginBlockStart: 'var(--space-3)' }}>
                <Plus size={15} aria-hidden />{t('orders.create')}
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="c-table-scroll">
          <table className="c-table">
            <thead>
              <tr>
                {(raw('orders.cols') as string[] ?? []).map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {initialOrders.map(order => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/orders/${order.id}`} className="font-semibold text-xs hover:underline"
                      style={{ color: 'var(--text-link)', fontVariantNumeric: 'tabular-nums' }}>
                      #{order.order_number}
                    </Link>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{formatDateShort(order.created_at)}</p>
                  </td>
                  <td>
                    <p className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{order.customer_name}</p>
                    <p className="text-xs" dir="ltr" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', textAlign: 'inherit' }}>{order.customer_phone}</p>
                  </td>
                  <td className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    <p>{(order.wilaya as any)?.name_ar ?? '—'}</p>
                    <p>{(order.commune as any)?.name_ar ?? ''}</p>
                  </td>
                  <td>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-primary)' }}>
                      {formatDZD(order.total)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {order.delivery_type === 'stopdesk' ? t('common.office') : t('common.home')}
                    </p>
                  </td>
                  <td>
                    {(order.items as any[])?.[0]?.product_name && (
                      <>
                        <p className="text-sm font-medium max-w-[180px] truncate" style={{ color: 'var(--text-primary)' }}>
                          {(order.items as any[])[0].product_name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          ×{(order.items as any[])[0].quantity}
                        </p>
                      </>
                    )}
                  </td>
                  <td><StatusBadge status={order.status} /></td>
                  <td>
                    {order.tracking_number
                      ? <span className="text-xs font-semibold" dir="ltr" style={{ color: 'var(--text-link)', fontVariantNumeric: 'tabular-nums' }}>{order.tracking_number}</span>
                      : order.status === 'abandoned'
                        ? <span className="text-xs" style={{ color: 'var(--text-muted)' }}>N/A</span>
                        : <button onClick={() => sendToDelivery(order.id)} disabled={shipping === order.id}
                            className={`c-btn c-btn--secondary c-btn--sm ${shipping === order.id ? 'is-loading' : ''}`}
                            title={t('orders.send_to_delivery')}>
                            {shipping !== order.id && <Truck size={13} aria-hidden />} {t('orders.send')}
                          </button>
                    }
                  </td>
                  <td>
                    <Link href={`/orders/${order.id}`} aria-label={`${t('orders.title')} #${order.order_number}`}
                      className="w-9 h-9 rounded-[var(--radius-md)] inline-flex items-center justify-center transition-colors hover:bg-[var(--surface-sunken)]">
                      <Edit2 size={14} style={{ color: 'var(--text-muted)' }} aria-hidden />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center gap-2">
              <select value={pp} onChange={e => { setPp(+e.target.value); push({ per_page: e.target.value }) }}
                className="c-select" style={{ inlineSize: 72, blockSize: 'var(--control-h-sm)', fontSize: 'var(--text-xs)' }}
                aria-label={t('common.per_page')}>
                {[5,10,20,30,50].map(n => <option key={n}>{n}</option>)}
              </select>
              <span className="text-xs" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                {t('orders.range', { from: ((page-1)*perPage)+1, to: Math.min(page*perPage, total), total: total.toLocaleString() })}
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
                  <button key={btn.label} onClick={() => !btn.disabled && push({ page: String(btn.p) })} disabled={btn.disabled}
                    className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-sm border transition-colors hover:bg-[var(--surface-sunken)] disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                    aria-label={`page ${btn.p}`}>
                    {btn.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="c-toast-stack">
          <div className={`c-toast ${toast.startsWith('✓') ? 'c-toast--success' : 'c-toast--error'}`} role="status" aria-live="polite">
            {toast}
          </div>
        </div>
      )}
    </div>
  )
}
