export const dynamic = 'force-dynamic'
export const metadata = { title: 'صفحات الهبوط' }

import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Eye, Pencil, BarChart2 } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/format'

export default async function LandingPagesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id, slug').eq('owner_id', user!.id).single()
  if (!store) return null

  const { data: pages } = await supabase
    .from('landing_pages')
    .select('*, product:products(name, name_ar)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">صفحات الهبوط</h1>
        <Link
          href="/landing-pages/new"
          className="flex items-center gap-2 bg-dakkani-500 hover:bg-dakkani-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          صفحة جديدة
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(pages ?? []).map(page => {
          const convRate = page.views > 0 ? ((page.conversions / page.views) * 100).toFixed(1) : '0'
          return (
            <div key={page.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden group">
              <div className="h-2 bg-gradient-to-r from-dakkani-400 to-dakkani-600" />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-dakkani-600 transition">
                      {page.title_ar ?? page.title}
                    </h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">/{page.slug}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    page.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {page.is_active ? 'نشطة' : 'مخفية'}
                  </span>
                </div>

                {(page.product as any)?.name && (
                  <p className="text-xs text-gray-500">
                    المنتج: {(page.product as any).name_ar ?? (page.product as any).name}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 bg-gray-50 rounded-lg p-3">
                  <div className="text-center">
                    <p className="text-lg font-black text-gray-900">{page.views.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">زيارة</p>
                  </div>
                  <div className="text-center border-x border-gray-200">
                    <p className="text-lg font-black text-dakkani-600">{page.conversions.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">طلب</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-black text-green-600">{convRate}%</p>
                    <p className="text-xs text-gray-400">تحويل</p>
                  </div>
                </div>

                <p className="text-xs text-gray-400">{formatDateShort(page.created_at)}</p>

                <div className="flex gap-2 pt-1">
                  <a
                    href={`/store/${store.slug}/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    معاينة
                  </a>
                  <Link
                    href={`/landing-pages/${page.id}`}
                    className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 bg-dakkani-50 text-dakkani-600 rounded-lg hover:bg-dakkani-100 transition"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    تعديل
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        {(!pages || pages.length === 0) && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-100 text-center py-16 text-gray-400">
            <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد صفحات هبوط</p>
            <p className="text-sm mt-1">أنشئ صفحة لكل منتج لزيادة معدل التحويل</p>
          </div>
        )}
      </div>
    </div>
  )
}
