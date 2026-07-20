'use client'
// COMMERCO PRODUCTS — design-system rebuild.
// UX rethink: bulk actions surface as a contextual toolbar only when
// rows are selected (instead of permanently crowding the header);
// catalog stats read as status chips; token table + real empty state.
// All logic (bulk ops, CSV, filtering, stock math, links) unchanged.
import { useT, useRaw, useDir } from '@/lib/i18n/react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Eye, Pencil, Package, Trash2, Download, EyeOff, CheckCircle2 } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import { resolveProductHostname, productPublicUrl, type DomainLite } from '@/lib/domains/url'

interface Props {
  initialProducts: any[]
  storeId: string
  storeSlug: string
  storePixels: { meta?: string | null; tiktok?: string | null }
  categories: { id: string; name: string; name_ar?: string | null }[]
  warehouses: { id: string; name: string }[]
  domains?: DomainLite[]
}

export default function ProductsPageClient({
  initialProducts, storeId, storeSlug, storePixels, categories, warehouses, domains = [],
}: Props) {
  const t = useT()
  const raw = useRaw()
  const dir = useDir()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const bulkDelete = async () => {
    if (selected.size === 0 || !confirm(t('products.confirm_delete', { count: selected.size }))) return
    setDeleting(true)
    const sb = createClient()
    await sb.from('products').delete().in('id', Array.from(selected.values()))
    setSelected(new Set())
    router.refresh()
    setDeleting(false)
  }

  const bulkToggle = async (active: boolean) => {
    if (selected.size === 0) return
    const sb = createClient()
    await sb.from('products').update({ is_active: active }).in('id', Array.from(selected.values()))
    setSelected(new Set())
    router.refresh()
  }

  const exportProducts = () => {
    const rows = [raw('products.csv_cols') as string[]]
    filtered.forEach(p => rows.push([p.name, p.name_ar??'', p.sku??'', String(p.price), p.is_active?t('products.active'):t('products.hidden')]))
    const csv = '﻿' + rows.map(r => r.join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv;charset=utf-8'}))
    a.download = `products-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  const filtered = initialProducts.filter(p =>
    !search || (p.name_ar ?? p.name)?.toLowerCase().includes(search.toLowerCase()) || p.sku?.includes(search)
  )

  const stockOf = (p: any) =>
    (p.warehouse_stock ?? []).reduce((s: number, w: any) => s + (w.quantity ?? 0) - (w.reserved ?? 0), 0)

  const toggleActive = async (id: string, current: boolean) => {
    const sb = createClient()
    await sb.from('products').update({ is_active: !current }).eq('id', id)
    router.refresh()
  }

  const activeCount = initialProducts.filter(p => p.is_active).length
  const hiddenCount = initialProducts.length - activeCount

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir={dir} style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* ── Header ── */}
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>{t('products.title')}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
            {t('products.registered', { count: initialProducts.length })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportProducts} className="c-btn c-btn--secondary c-btn--sm">
            <Download size={14} aria-hidden />CSV
          </button>
          <Link href="/categories" className="c-btn c-btn--secondary c-btn--sm">{t('products.categories')}</Link>
          <Link href="/products/new" className="c-btn c-btn--primary c-btn--sm">
            <Plus size={14} aria-hidden />{t('products.create')}
          </Link>
        </div>
      </div>

      {/* ── Search + catalog stats ── */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={14} className="absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" style={{ color: 'var(--text-muted)' }} aria-hidden />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder={t('products.search_ph')} className="c-input ps-9" aria-label={t('products.search_ph')} />
        </div>
        {categories.length > 0 && (
          <select className="c-select" style={{ inlineSize: 176 }} aria-label={t('products.all_categories')}>
            <option value="">{t('products.all_categories')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>)}
          </select>
        )}
        <div className="flex items-center gap-2">
          <span className="c-badge c-badge--neutral">{t('products.count', { count: initialProducts.length })}</span>
          <span className="c-badge c-badge--success">{t('products.active_count', { count: activeCount })}</span>
          {hiddenCount > 0 && <span className="c-badge c-badge--warning">{t('products.hidden_count', { count: hiddenCount })}</span>}
        </div>
      </div>

      {/* ── Contextual bulk toolbar (appears on selection) ── */}
      {selected.size > 0 && (
        <div className="c-card mb-3 flex items-center gap-2 flex-wrap animate-fade-in" style={{ padding: 'var(--space-3)' }} role="toolbar">
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
            {selected.size} ✓
          </span>
          <span className="h-4 w-px" style={{ background: 'var(--border-default)' }} aria-hidden />
          <button onClick={() => bulkToggle(true)} className="c-btn c-btn--secondary c-btn--sm">
            <CheckCircle2 size={13} aria-hidden style={{ color: 'var(--color-success-600)' }} />{t('products.enable', { count: selected.size })}
          </button>
          <button onClick={() => bulkToggle(false)} className="c-btn c-btn--secondary c-btn--sm">
            <EyeOff size={13} aria-hidden />{t('products.hide', { count: selected.size })}
          </button>
          <button onClick={bulkDelete} disabled={deleting} className={`c-btn c-btn--danger c-btn--sm ${deleting ? 'is-loading' : ''}`}>
            {!deleting && <Trash2 size={13} aria-hidden />}{t('common.delete')}
          </button>
          <button onClick={() => setSelected(new Set())} className="c-btn c-btn--ghost c-btn--sm ms-auto">✕</button>
        </div>
      )}

      {/* ── Table / empty state ── */}
      {filtered.length === 0 ? (
        <div className="c-card" style={{ padding: 0 }}>
          <div className="c-empty">
            <div className="c-empty__icon"><Package size={24} aria-hidden /></div>
            <div className="c-empty__title">{t('products.empty')}</div>
            <Link href="/products/new" className="c-btn c-btn--primary" style={{ marginBlockStart: 'var(--space-3)' }}>
              <Plus size={15} aria-hidden />{t('products.create')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="c-table-scroll">
          <table className="c-table">
            <thead>
              <tr>
                <th style={{ inlineSize: 36 }}>
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every(p => selected.has(p.id))}
                    onChange={e => setSelected(e.target.checked ? new Set(filtered.map(p => p.id)) : new Set())}
                    className="w-4 h-4"
                    style={{ accentColor: 'var(--interactive-primary)' }}
                    aria-label={t('common.all')}
                  />
                </th>
                {(raw('products.cols') as string[] ?? []).map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const stock = stockOf(p)
                const img = (p.images as any[])?.[0]?.url
                const isSel = selected.has(p.id)
                return (
                  <tr key={p.id} className={isSel ? 'is-selected' : ''}>
                    <td>
                      <input type="checkbox" checked={isSel}
                        onChange={e => {
                          setSelected(prev => {
                            const s = new Set(prev)
                            e.target.checked ? s.add(p.id) : s.delete(p.id)
                            return s
                          })
                        }}
                        className="w-4 h-4" style={{ accentColor: 'var(--interactive-primary)' }}
                        aria-label={p.name_ar ?? p.name}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[var(--radius-md)] overflow-hidden flex-shrink-0 flex items-center justify-center"
                          style={{ background: 'var(--surface-sunken)' }}>
                          {img
                            ? <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                            : <Package size={16} style={{ color: 'var(--text-muted)' }} aria-hidden />}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate max-w-[220px]" style={{ color: 'var(--text-primary)' }}>
                            {p.name_ar ?? p.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {p.meta_pixel_id && !p.use_store_pixel && <span className="c-badge c-badge--info">{t('products.meta_own')}</span>}
                            {p.use_store_pixel && <span className="c-badge c-badge--neutral">{t('products.store_pixel')}</span>}
                            {(p.order_routing === 'sheet_only' || p.order_routing === 'both') && (
                              <span className="c-badge c-badge--success">{t('products.gsheet')}</span>
                            )}
                            {(p.order_routing === 'confirmili_only' || p.order_routing === 'both') && (
                              <span className="c-badge c-badge--info">Confirmili</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-primary)' }}>
                        {formatDZD(p.price)}
                      </span>
                      {p.cost_price && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {t('products.cost', { price: formatDZD(p.cost_price) })}
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="text-xs" dir="ltr" style={{ color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
                        {p.sku ?? '—'}
                      </span>
                    </td>
                    <td>
                      {p.track_inventory === false || p.attributes?.track_inventory === false ? (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('products.unlimited')}</span>
                      ) : stock <= 0 ? (
                        <span className="c-badge c-badge--error">{t('products.out')}</span>
                      ) : stock <= 5 ? (
                        <span className="c-badge c-badge--warning" style={{ fontVariantNumeric: 'tabular-nums' }}>{stock}</span>
                      ) : (
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{stock}</span>
                      )}
                    </td>
                    <td>
                      <button onClick={() => toggleActive(p.id, p.is_active)}
                        className={`c-badge ${p.is_active ? 'c-badge--success' : 'c-badge--neutral'}`}
                        style={{ cursor: 'pointer' }}
                        aria-pressed={p.is_active}
                        title={p.is_active ? t('products.hide', { count: 1 }) : t('products.enable', { count: 1 })}>
                        {p.is_active ? t('products.active') : t('products.hidden')}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-0.5">
                        {p.slug && (
                          <a href={productPublicUrl({ hostname: resolveProductHostname(domains, p.domain_id), storeSlug, productSlug: p.slug })}
                            target="_blank" rel="noopener noreferrer" aria-label={t('products.view_final')} title={t('products.view_final')}
                            className="w-9 h-9 rounded-[var(--radius-md)] inline-flex items-center justify-center transition-colors hover:bg-[var(--surface-sunken)]">
                            <Eye size={14} style={{ color: 'var(--text-muted)' }} aria-hidden />
                          </a>
                        )}
                        <Link href={`/products/${p.id}`} aria-label={`${t('products.title')}: ${p.name_ar ?? p.name}`}
                          className="w-9 h-9 rounded-[var(--radius-md)] inline-flex items-center justify-center transition-colors hover:bg-[var(--surface-sunken)]">
                          <Pencil size={14} style={{ color: 'var(--text-link)' }} aria-hidden />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
