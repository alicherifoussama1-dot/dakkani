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
    <div className="p-4 md:p-6 max-w-5xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center justify-between mb-5">
        <h1 className="page-title">صفحات الهبوط</h1>
        <Link href="/landing-pages/new" className="btn btn-primary btn-sm gap-1.5">
          <Plus size={14} />صفحة جديدة
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(pages ?? []).map(page => {
          const convRate = page.views > 0 ? ((page.conversions / page.views) * 100).toFixed(1) : '0'
          return (
            <div key={page.id} className="card overflow-hidden group">
              <div className="h-1" style={{background:'linear-gradient(90deg, var(--color-accent), #6F42C1)'}} />
              <div className="p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm group-hover:text-[#0D6EFD] transition" style={{color:'var(--color-text-primary)'}}>
                      {page.title_ar ?? page.title}
                    </h3>
                    <p className="text-xs font-mono mt-0.5" style={{color:'var(--color-text-muted)'}}>/{page.slug}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    page.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {page.is_active ? 'نشطة' : 'مخفية'}
                  </span>
                </div>

                {(page.product as any)?.name && (
                  <p className="text-xs" style={{color:'var(--color-text-muted)'}}>
                    المنتج: {(page.product as any).name_ar ?? (page.product as any).name}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-2 rounded-lg p-3" style={{background:'var(--color-bg-soft)'}}>
                  <div className="text-center">
                    <p className="text-base font-black" style={{color:'var(--color-text-primary)'}}>{page.views.toLocaleString()}</p>
                    <p className="text-xs" style={{color:'var(--color-text-muted)'}}>زيارة</p>
                  </div>
                  <div className="text-center border-x" style={{borderColor:'var(--color-border)'}}>
                    <p className="text-base font-black" style={{color:'var(--color-accent)'}}>{page.conversions.toLocaleString()}</p>
                    <p className="text-xs" style={{color:'var(--color-text-muted)'}}>طلب</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-black text-green-600">{convRate}%</p>
                    <p className="text-xs" style={{color:'var(--color-text-muted)'}}>تحويل</p>
                  </div>
                </div>

                <p className="text-xs" style={{color:'var(--color-text-muted)'}}>{formatDateShort(page.created_at)}</p>

                <div className="flex gap-2">
                  <a href={`/store/${store.slug}/${page.slug}`} target="_blank" rel="noopener noreferrer"
                    className="flex-1 btn btn-ghost btn-sm gap-1">
                    <Eye size={12} />معاينة
                  </a>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`تسوق معنا: https://dakkani.vercel.app/store/${store.slug}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-sm" style={{background:'#25D366',color:'#fff',fontSize:'10px',padding:'0 6px'}}>
                    📤
                  </a>
                  <Link href={`/landing-pages/${page.id}`} className="flex-1 btn btn-sm gap-1" style={{background:'#EBF5FF',color:'var(--color-accent)'}}>
                    <Pencil size={12} />تعديل
                  </Link>
                </div>
              </div>
            </div>
          )
        })}

        {(!pages || pages.length === 0) && (
          <div className="col-span-3 card text-center py-16" style={{color:'var(--color-text-muted)'}}>
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">لا توجد صفحات هبوط</p>
            <p className="text-sm mt-1">أنشئ صفحة لكل منتج لزيادة معدل التحويل</p>
          </div>
        )}
      </div>
    </div>
  )
}
