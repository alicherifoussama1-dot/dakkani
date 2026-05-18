'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDZD } from '@/lib/utils/format'
import { Search, Eye, EyeOff, Pencil, Trash2, Star } from 'lucide-react'

interface Product {
  id: string; name: string; name_ar?: string; slug: string
  price: number; compare_price?: number; cost_price?: number
  images: { url: string }[]; is_active: boolean; is_featured: boolean
  use_store_pixel: boolean; meta_pixel_id?: string; tiktok_pixel_id?: string
  category?: { name_ar?: string; name: string }
  stock?: { quantity: number; reserved: number }[]
}

interface Props {
  products: Product[]; total: number; page: number; pageSize: number
  categories: { id: string; name: string; name_ar?: string }[]
  storeId: string
}

export default function AdminProductsTable({ products, total, page, pageSize, categories, storeId }: Props) {
  const router   = useRouter()
  const pathname = usePathname()
  const params   = useSearchParams()
  const [search, setSearch] = useState(params.get('search') ?? '')

  const push = (key: string, val: string) => {
    const p = new URLSearchParams(params.toString())
    val ? p.set(key, val) : p.delete(key)
    p.delete('page')
    router.push(`${pathname}?${p}`)
  }

  const toggleActive = async (id: string, current: boolean) => {
    const supabase = createClient()
    await supabase.from('products').update({ is_active: !current }).eq('id', id)
    router.refresh()
  }

  const deleteProduct = async (id: string) => {
    if (!confirm('حذف هذا المنتج نهائياً؟')) return
    const supabase = createClient()
    await supabase.from('products').delete().eq('id', id)
    router.refresh()
  }

  const totalPages = Math.ceil(total / pageSize)

  const stockOf = (p: Product) =>
    (p.stock ?? []).reduce((s, w) => s + w.quantity - w.reserved, 0)

  const marginOf = (p: Product) =>
    p.cost_price && p.cost_price > 0
      ? Math.round(((p.price - p.cost_price) / p.price) * 100)
      : null

  return (
    <div className="space-y-3">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && push('search', search)}
            placeholder="بحث في المنتجات..."
            className="bg-gray-800 border border-gray-700 rounded-lg pr-9 pl-3 py-1.5 text-sm text-gray-300 focus:ring-1 focus:ring-dakkani-500 outline-none w-52"
          />
        </div>
        <select
          value={params.get('category') ?? ''}
          onChange={e => push('category', e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:ring-1 focus:ring-dakkani-500 outline-none"
        >
          <option value="">كل الفئات</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm min-w-[900px]">
          <thead className="bg-gray-800/50 border-b border-gray-800">
            <tr>
              {['المنتج', 'الفئة', 'السعر', 'التكلفة', 'الهامش', 'المخزون', 'الحالة', 'البكسل', ''].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {products.map(p => {
              const stock  = stockOf(p)
              const margin = marginOf(p)
              const img    = p.images?.[0]?.url
              const hasPixel = !p.use_store_pixel && (p.meta_pixel_id || p.tiktok_pixel_id)

              return (
                <tr key={p.id} className="hover:bg-gray-800/30 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                        {img
                          ? <img src={img} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-xl text-gray-600">{(p.name_ar ?? p.name)[0]}</div>
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-gray-200 text-sm">{p.name_ar ?? p.name}</p>
                        <p className="text-xs text-gray-600 font-mono">{p.slug}</p>
                        {p.is_featured && (
                          <span className="flex items-center gap-1 text-xs text-yellow-500">
                            <Star className="w-3 h-3" /> مميز
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.category?.name_ar ?? p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 font-bold text-gray-200">{formatDZD(p.price)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.cost_price ? formatDZD(p.cost_price) : '—'}</td>
                  <td className="px-4 py-3">
                    {margin !== null
                      ? <span className={`font-bold text-xs ${margin > 40 ? 'text-green-400' : margin > 20 ? 'text-yellow-400' : 'text-red-400'}`}>{margin}%</span>
                      : <span className="text-gray-700">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold text-sm ${stock <= 0 ? 'text-red-400' : stock <= 5 ? 'text-yellow-400' : 'text-gray-300'}`}>
                      {stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(p.id, p.is_active)} className={`text-xs px-2.5 py-1 rounded-full border font-medium transition ${p.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-gray-700 text-gray-500 border-gray-600'}`}>
                      {p.is_active ? 'نشط' : 'مخفي'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {p.use_store_pixel
                      ? <span className="text-xs text-gray-600">متجر</span>
                      : hasPixel
                      ? <span className="text-xs bg-dakkani-500/20 text-dakkani-400 px-2 py-0.5 rounded border border-dakkani-500/30">خاص</span>
                      : <span className="text-xs text-gray-700">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Link href={`/admin/products/${p.id}/edit`} className="p-1.5 text-gray-500 hover:text-dakkani-400 hover:bg-dakkani-500/10 rounded-lg transition">
                        <Pencil className="w-3.5 h-3.5" />
                      </Link>
                      <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {products.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-gray-600">لا توجد منتجات</td></tr>
            )}
          </tbody>
        </table>

        {totalPages > 1 && (
          <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-600">{total} منتج</p>
            <div className="flex gap-2">
              {page > 1 && (
                <button onClick={() => push('page', String(page - 1))} className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg">السابق</button>
              )}
              {page < totalPages && (
                <button onClick={() => push('page', String(page + 1))} className="text-xs px-3 py-1.5 bg-dakkani-500 text-white hover:bg-dakkani-600 rounded-lg">التالي</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
