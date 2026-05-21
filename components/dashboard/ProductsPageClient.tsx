'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, Search, Eye, Pencil, ExternalLink, Package } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'

interface Props {
  initialProducts: any[]
  storeId: string
  storeSlug: string
  storePixels: { meta?: string | null; tiktok?: string | null }
  categories: { id: string; name: string; name_ar?: string | null }[]
  warehouses: { id: string; name: string }[]
}

export default function ProductsPageClient({
  initialProducts, storeId, storeSlug, storePixels, categories, warehouses,
}: Props) {
  const router = useRouter()
  const [search, setSearch] = useState('')

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <h1 className="page-title">المنتجات</h1>
        <Link href="/products/new" className="btn btn-primary btn-sm gap-1.5">
          <Plus size={14} />إنشاء منتج
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-xs">
        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="ابحث عن المنتجات..."
          className="input pr-8 text-sm"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['المنتج','سعر البيع','SKU','المخزون','الحالة','إجراءات'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2">
                      <Package size={28} style={{ color: 'var(--color-text-muted)' }} />
                      <p className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>
                        لا توجد منتجات — أضف منتجك الأول
                      </p>
                      <Link href="/products/new" className="btn btn-primary btn-sm mt-1">
                        <Plus size={13} />إنشاء منتج
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(p => {
                const stock  = stockOf(p)
                const img    = (p.images as any[])?.[0]?.url
                return (
                  <tr key={p.id}>
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
                              <span className="badge badge-blue text-[10px]">Meta خاص</span>
                            )}
                            {(p.use_store_pixel) && (
                              <span className="badge badge-gray text-[10px]">بكسل المتجر</span>
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
                          ت: {formatDZD(p.cost_price)}
                        </p>
                      )}
                    </td>
                    <td>
                      <span className="text-xs font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                        {p.sku ?? '—'}
                      </span>
                    </td>
                    <td>
                      <span className={`font-semibold text-sm ${stock <= 0 ? 'text-red-500' : stock <= 5 ? 'text-yellow-600' : ''}`}
                        style={{ color: stock > 5 ? 'var(--color-text-primary)' : undefined, fontFamily: 'var(--font-primary)' }}>
                        {stock <= 0 ? '⚠️ نفد' : stock}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => toggleActive(p.id, p.is_active)}
                        className={`badge cursor-pointer transition-colors ${p.is_active ? 'badge-green' : 'badge-gray'}`}
                      >
                        {p.is_active ? 'نشط' : 'مخفي'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {p.slug && (
                          <a href={`/store/${storeSlug}/product/${p.slug}`} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded hover:bg-[#F8F9FA] transition-colors">
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
