'use client'
import { useT, useRaw, useDir } from '@/lib/i18n/react'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Eye, Pencil, ExternalLink, Package, Trash2, Download } from 'lucide-react'
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
    const ids = Array.from(selected.values())
    await sb.from('products').delete().in('id', ids)
    setSelected(new Set())
    router.refresh()
    setDeleting(false)
  }

  const bulkToggle = async (active: boolean) => {
    if (selected.size === 0) return
    const sb = createClient()
    const ids = Array.from(selected.values())
    await sb.from('products').update({ is_active: active }).in('id', ids)
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

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir={dir} style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="page-title">{t('products.title')}</h1>
          <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{t('products.registered', { count: initialProducts.length })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {selected.size > 0 && (
            <>
              <button onClick={() => bulkToggle(true)} className="btn btn-sm" style={{background:'#D1E7DD',color:'#198754',border:'none'}}>
                {t('products.enable', { count: selected.size })}
              </button>
              <button onClick={() => bulkToggle(false)} className="btn btn-sm" style={{background:'#FFF3CD',color:'#856404',border:'none'}}>
                {t('products.hide', { count: selected.size })}
              </button>
              <button onClick={bulkDelete} disabled={deleting} className="btn btn-sm" style={{background:'#F8D7DA',color:'#DC3545',border:'none'}}>
                <Trash2 size={12}/>{t('common.delete')}
              </button>
            </>
          )}
          <button onClick={exportProducts} className="btn btn-sm btn-ghost gap-1" style={{border:'1px solid var(--color-border)'}}>
            <Download size={13}/>CSV
          </button>
          <Link href="/categories" className="btn btn-sm btn-ghost gap-1.5" style={{border:'1px solid var(--color-border)'}}>{t('products.categories')}</Link>
          <Link href="/products/new" className="btn btn-primary btn-sm gap-1.5">
            <Plus size={14} />{t('products.create')}
          </Link>
        </div>
      </div>

      {/* Stats + Search row */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('products.search_ph')}
            className="input pr-8 text-sm"
          />
        </div>
        {categories.length > 0 && (
          <select className="input text-sm w-44">
            <option value="">{t('products.all_categories')}</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>)}
          </select>
        )}
        <div className="flex gap-3 text-xs" style={{color:'var(--color-text-muted)'}}>
          <span>{t('products.count', { count: initialProducts.length })}</span>
          <span>|</span>
          <span style={{color:'#198754'}}>{t('products.active_count', { count: initialProducts.filter(p=>p.is_active).length })}</span>
          <span>|</span>
          <span style={{color:'#DC3545'}}>{t('products.hidden_count', { count: initialProducts.filter(p=>!p.is_active).length })}</span>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox"
                    checked={filtered.length > 0 && filtered.every(p => selected.has(p.id))}
                    onChange={e => {
                      if (e.target.checked) setSelected(new Set(filtered.map(p => p.id)))
                      else setSelected(new Set())
                    }}
                    className="w-3.5 h-3.5 accent-[#0D6EFD]"
                  />
                </th>
                {(raw('products.cols') as string[] ?? []).map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={28} style={{ color: 'var(--color-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>
                        {t('products.empty')}
                      </p>
                      <Link href="/products/new" className="btn btn-primary btn-sm mt-1">
                        <Plus size={13} />{t('products.create')}
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(p => {
                const stock  = stockOf(p)
                const img    = (p.images as any[])?.[0]?.url
                return (
                  <tr key={p.id} className={selected.has(p.id) ? 'bg-[#EBF5FF]' : ''}>
                    <td>
                      <input type="checkbox"
                        checked={selected.has(p.id)}
                        onChange={e => {
                          setSelected(prev => {
                            const s = new Set(prev)
                            e.target.checked ? s.add(p.id) : s.delete(p.id)
                            return s
                          })
                        }}
                        className="w-3.5 h-3.5 accent-[#0D6EFD]"
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center"
                          style={{ background: 'var(--color-bg-muted)' }}>
                          {img
                            ? <img src={img} alt="" className="w-full h-full object-cover" />
                            : <span className="text-lg">{(p.name_ar ?? p.name)?.[0] ?? '📦'}</span>
                          }
                        </div>
                        <div>
                          <p className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>
                            {p.name_ar ?? p.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {p.meta_pixel_id && !p.use_store_pixel && (
                              <span className="badge badge-blue text-[10px]">{t('products.meta_own')}</span>
                            )}
                            {(p.use_store_pixel) && (
                              <span className="badge badge-gray text-[10px]">{t('products.store_pixel')}</span>
                            )}
                            {/* وجهة الطلبات (routing override) */}
                            {(p.order_routing === 'sheet_only' || p.order_routing === 'both') && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#D1E7DD', color: '#198754' }}>{t('products.gsheet')}</span>
                            )}
                            {(p.order_routing === 'confirmili_only' || p.order_routing === 'both') && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: '#CFE2FF', color: '#0D6EFD' }}>Confirmili</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold text-sm" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-primary)' }}>
                        {formatDZD(p.price)}
                      </span>
                      {p.cost_price && (
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)' }}>
                          {t('products.cost', { price: formatDZD(p.cost_price) })}
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                        {p.sku ?? '—'}
                      </span>
                    </td>
                    <td>
                      {p.track_inventory === false || p.attributes?.track_inventory === false ? (
                        <span className="text-gray-400 text-xs">{t('products.unlimited')}</span>
                      ) : (
                        <span className={`font-semibold text-sm ${stock <= 0 ? 'text-red-500' : stock <= 5 ? 'text-yellow-600' : ''}`}
                          style={{ color: stock > 5 ? 'var(--color-text-primary)' : undefined, fontFamily: 'var(--font-primary)' }}>
                          {stock <= 0 ? t('products.out') : stock}
                        </span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActive(p.id, p.is_active)}
                        className={`badge cursor-pointer transition-colors ${p.is_active ? 'badge-green' : 'badge-gray'}`}
                      >
                        {p.is_active ? t('products.active') : t('products.hidden')}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {p.slug && (
                          <a href={productPublicUrl({ hostname: resolveProductHostname(domains, p.domain_id), storeSlug, productSlug: p.slug })}
                            target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-[#F8F9FA] transition-colors" title={t('products.view_final')}>
                            <Eye size={13} style={{ color: 'var(--color-text-muted)' }} />
                          </a>
                        )}
                        <Link href={`/products/${p.id}`}
                          className="p-1.5 rounded hover:bg-[#EBF5FF] transition-colors">
                          <Pencil size={13} style={{ color: 'var(--color-accent)' }} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
