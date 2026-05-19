export const dynamic = 'force-dynamic'
export const metadata = { title: 'صفحات الهبوط' }

import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Pencil, Eye, Trash2, BarChart2 } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/format'

export default async function AdminPagesPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id, slug').eq('owner_id', user!.id).single()
  if (!store) return null

  const { data: pages } = await supabase
    .from('landing_pages')
    .select('*, product:products(name, name_ar)')
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })

  const deleteP = async (id: string) => { 'use server'; const s = createServerClient(); await s.from('landing_pages').delete().eq('id', id) }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white">صفحات الهبوط</h1>
        <Link href="/admin/pages/builder" className="flex items-center gap-2 bg-[#E8431A] hover:bg-[#C73615] text-white px-4 py-2 rounded-xl text-sm font-bold transition">
          <Plus className="w-4 h-4" />
          صفحة جديدة
        </Link>
      </div>

      {(!pages || pages.length === 0) ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-16 text-center">
          <BarChart2 className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-400 font-semibold">لا توجد صفحات هبوط بعد</p>
          <p className="text-gray-600 text-sm mt-1">أنشئ صفحة لكل منتج لزيادة معدل التحويل</p>
          <Link href="/admin/pages/builder" className="inline-block mt-4 bg-[#E8431A] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#C73615] transition">
            ✨ أنشئ أول صفحة
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pages.map((page: any) => {
            const rate = page.views > 0 ? ((page.conversions / page.views) * 100).toFixed(1) : '0'
            return (
              <div key={page.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-dakkani-500/40 transition">
                <div className="h-1.5 bg-gradient-to-r from-[#F96540] to-[#C73615]" />
                <div className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate">{page.title_ar ?? page.title}</h3>
                      <p className="text-xs text-gray-500 font-mono mt-0.5 truncate">/{page.slug}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${page.is_active ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-700 text-gray-500'}`}>
                      {page.is_active ? 'نشطة' : 'مخفية'}
                    </span>
                  </div>

                  {page.product && (
                    <p className="text-xs text-gray-500">
                      المنتج: {(page.product as any).name_ar ?? (page.product as any).name}
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 bg-gray-800 rounded-xl p-3 text-center text-xs">
                    <div><p className="text-white font-black text-sm">{page.views.toLocaleString()}</p><p className="text-gray-500">زيارة</p></div>
                    <div className="border-x border-gray-700"><p className="text-dakkani-400 font-black text-sm">{page.conversions}</p><p className="text-gray-500">طلب</p></div>
                    <div><p className="text-green-400 font-black text-sm">{rate}%</p><p className="text-gray-500">تحويل</p></div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={`/store/${store.slug}/${page.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-2 border border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600 rounded-xl transition"
                    >
                      <Eye className="w-3.5 h-3.5" />معاينة
                    </a>
                    <Link
                      href={`/admin/pages/builder?page_id=${page.id}`}
                      className="flex-1 flex items-center justify-center gap-1 text-xs py-2 bg-[#E8431A]/20 text-dakkani-400 border border-dakkani-500/30 hover:bg-[#E8431A]/30 rounded-xl transition"
                    >
                      <Pencil className="w-3.5 h-3.5" />تعديل
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
