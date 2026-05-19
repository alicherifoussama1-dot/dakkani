import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Eye, Pencil, ExternalLink } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'المنتجات' }

export default async function ProductsPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  // نجلب slug المتجر أيضاً لبناء رابط المعاينة
  const { data: store } = await supabase
    .from('stores')
    .select('id, slug, name')
    .eq('owner_id', user!.id)
    .single()
  if (!store) return null

  const { data: products } = await supabase
    .from('products')
    .select('*, warehouse_stock(quantity, reserved)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">المنتجات</h1>
          <p className="text-sm text-gray-500 mt-0.5">{products?.length ?? 0} منتج</p>
        </div>
        <div className="flex items-center gap-2">
          {/* رابط المتجر */}
          <a
            href={`/store/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-[#FFF0ED] text-[#E8431A] hover:bg-[#FFF0ED] px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <ExternalLink className="w-4 h-4" />
            عرض المتجر
          </a>
          <Link
            href="/products/new"
            className="flex items-center gap-2 bg-[#E8431A] hover:bg-[#C73615] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
          >
            <Plus className="w-4 h-4" />
            منتج جديد
          </Link>
        </div>
      </div>

      {/* Products table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['المنتج', 'السعر', 'التكلفة', 'الهامش', 'المخزون', 'الحالة', 'الإجراءات'].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(products ?? []).map(p => {
              const stock  = (p.warehouse_stock as any[])?.reduce((s: number, w: any) => s + w.quantity - w.reserved, 0) ?? 0
              const margin = p.cost_price ? Math.round(((p.price - p.cost_price) / p.price) * 100) : null
              const img    = (p.images as any[])?.[0]?.url

              return (
                <tr key={p.id} className="hover:bg-gray-50 transition group">
                  {/* Product */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                        {img ? (
                          <img src={img} alt={p.name_ar ?? p.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl text-gray-300">
                            {(p.name_ar ?? p.name)[0]}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{p.name_ar ?? p.name}</p>
                        {p.name_ar && p.name !== p.name_ar && (
                          <p className="text-xs text-gray-400">{p.name}</p>
                        )}
                        <p className="text-xs text-gray-400 font-mono">{p.sku ?? '—'}</p>
                      </div>
                    </div>
                  </td>

                  {/* Price */}
                  <td className="px-4 py-3 font-bold text-gray-900">
                    {formatDZD(p.price)}
                    {p.compare_price && p.compare_price > p.price && (
                      <p className="text-xs text-gray-400 line-through font-normal">{formatDZD(p.compare_price)}</p>
                    )}
                  </td>

                  {/* Cost */}
                  <td className="px-4 py-3 text-gray-500">
                    {p.cost_price ? formatDZD(p.cost_price) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Margin */}
                  <td className="px-4 py-3">
                    {margin !== null ? (
                      <span className={`font-bold text-sm px-2 py-0.5 rounded-lg ${
                        margin > 40 ? 'bg-green-100 text-green-700' :
                        margin > 20 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {margin}%
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>

                  {/* Stock */}
                  <td className="px-4 py-3">
                    <span className={`font-bold ${
                      stock <= 0 ? 'text-red-500' :
                      stock <= 5 ? 'text-yellow-600' :
                      'text-gray-900'
                    }`}>
                      {stock <= 0 ? '⚠️ نفد' : stock}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      p.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.is_active ? '✅ نشط' : '🔴 مخفي'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {/* زر عرض المنتج في المتجر */}
                      {p.slug && p.is_active ? (
                        <a
                          href={`/${store.slug}/product/${p.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="عرض المنتج في المتجر"
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#E8431A] bg-gray-100 hover:bg-[#FFF0ED] px-2.5 py-1.5 rounded-lg transition font-medium border border-gray-200 hover:border-[#FFF0ED]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          عرض
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300 px-2.5 py-1.5">
                          {!p.slug ? 'لا يوجد slug' : 'مخفي'}
                        </span>
                      )}

                      {/* زر تعديل */}
                      <Link
                        href={`/products/${p.id}`}
                        title="تعديل المنتج"
                        className="flex items-center gap-1 text-xs text-[#E8431A] hover:text-white bg-[#FFF0ED] hover:bg-[#E8431A] px-2.5 py-1.5 rounded-lg transition font-medium border border-[#FFF0ED] hover:border-dakkani-500"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        تعديل
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}

            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="text-gray-400">
                    <p className="text-4xl mb-3">📦</p>
                    <p className="font-semibold text-gray-600">لا توجد منتجات بعد</p>
                    <p className="text-sm mt-1">أضف منتجك الأول للبدء في البيع</p>
                    <Link
                      href="/products/new"
                      className="inline-flex items-center gap-2 mt-4 bg-[#E8431A] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#C73615] transition"
                    >
                      <Plus className="w-4 h-4" />
                      أضف منتجاً الآن
                    </Link>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Quick tip */}
      {products && products.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-xl">💡</span>
          <div className="text-sm text-blue-700">
            <p className="font-semibold mb-1">نصيحة:</p>
            <p>
              اضغط على <strong>عرض</strong> لرؤية المنتج كما يراه العميل في متجرك.
              اضغط على <strong>تعديل</strong> لتغيير الصور والسعر والبكسل.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
