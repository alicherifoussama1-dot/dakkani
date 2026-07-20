'use client'
// COMMERCO CUSTOMERS — design-system rebuild. Same data contract;
// stats become one composed strip (not three identical boxes),
// token table with keyboard-accessible rows and real empty state.
import { useT, useRaw, useDir } from '@/lib/i18n/react'
import { useState, useMemo } from 'react'
import { Search, Users, Phone, MapPin, Download } from 'lucide-react'
import { formatDZD, formatDateShort } from '@/lib/utils/format'

interface Customer {
  name: string; phone: string; wilaya?: string; commune?: string
  orders: number; lastId: string; spent: number; first: string; last: string
}

export default function CustomersPageClient({ customers }: { customers: Customer[] }) {
  const t = useT()
  const raw = useRaw()
  const dir = useDir()
  const [q, setQ] = useState('')

  const exportCSV = () => {
    const rows = [raw('customers.csv_cols') as string[]]
    filtered.forEach(c => rows.push([c.name, c.phone, c.wilaya??'', c.commune??'', String(c.orders), String(c.spent), c.first?.slice(0,10)??'', c.last?.slice(0,10)??'']))
    const csv = '﻿' + rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}))
    a.download = `customers-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const filtered = useMemo(() => {
    if (!q.trim()) return customers
    const lq = q.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(lq) ||
      c.phone.includes(lq) ||
      (c.wilaya ?? '').includes(lq) ||
      (c.commune ?? '').includes(lq)
    )
  }, [q, customers])

  const totalSpent = customers.reduce((s, c) => s + c.spent, 0)

  return (
    <div className="space-y-4" dir={dir} style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* ── Composed stats strip: one card, three figures ── */}
      <div className="c-card flex flex-wrap items-stretch gap-x-8 gap-y-4">
        {[
          { label: t('customers.total'),       value: customers.length.toLocaleString(), accent: false },
          { label: t('customers.total_sales'), value: formatDZD(totalSpent), accent: true },
          { label: t('customers.avg_spend'),   value: customers.length > 0 ? formatDZD(totalSpent / customers.length) : '0 دج', accent: false },
        ].map((s, i) => (
          <div key={s.label} className="flex items-center gap-8">
            {i > 0 && <span className="hidden sm:block w-px self-stretch" style={{ background: 'var(--border-default)' }} aria-hidden />}
            <div>
              <p className="text-2xl font-extrabold leading-tight"
                style={{ color: s.accent ? 'var(--color-primary-700)' : 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-primary)' }}>
                {s.value}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + export ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-xs flex-1 min-w-[200px]">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" style={{ color: 'var(--text-muted)' }} aria-hidden />
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder={t('customers.search_ph')} className="c-input ps-9" aria-label={t('customers.search_ph')} />
        </div>
        <button onClick={exportCSV} className="c-btn c-btn--secondary c-btn--sm">
          <Download size={14} aria-hidden />{t('common.export_csv')}
        </button>
      </div>

      {/* ── Table / empty ── */}
      {filtered.length === 0 ? (
        <div className="c-card" style={{ padding: 0 }}>
          <div className="c-empty">
            <div className="c-empty__icon"><Users size={24} aria-hidden /></div>
            <div className="c-empty__title">{q ? t('customers.no_results') : t('customers.no_data')}</div>
            {q && (
              <button onClick={() => setQ('')} className="c-btn c-btn--secondary" style={{ marginBlockStart: 'var(--space-3)' }}>
                {t('common.all')}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="c-table-scroll">
          <table className="c-table">
            <thead>
              <tr>{(raw('customers.cols') as string[] ?? []).map(h => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.phone} tabIndex={0} className="cursor-pointer"
                  onClick={() => window.location.href = `/customers/${encodeURIComponent(c.phone)}`}
                  onKeyDown={e => { if (e.key === 'Enter') window.location.href = `/customers/${encodeURIComponent(c.phone)}` }}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: 'var(--interactive-primary)' }} aria-hidden>
                        {c.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                        <p className="text-xs flex items-center gap-1" dir="ltr" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          <Phone size={10} aria-hidden />{c.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.wilaya ? (
                      <p className="text-sm flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <MapPin size={11} aria-hidden />{c.commune ? `${c.commune}، ${c.wilaya}` : c.wilaya}
                      </p>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{c.orders}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>#{c.lastId}</p>
                  </td>
                  <td>
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-primary-700)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-primary)' }}>
                      {formatDZD(c.spent)}
                    </p>
                  </td>
                  <td>
                    <p className="text-sm" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{formatDateShort(c.last)}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('customers.first', { date: formatDateShort(c.first) })}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2.5 border-t text-xs" style={{ borderColor: 'var(--border-default)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {t('customers.count', { count: filtered.length })}{q ? t('customers.of_total', { total: customers.length }) : ''}
          </div>
        </div>
      )}
    </div>
  )
}
