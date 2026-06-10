'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, Eye, Pencil, Trash2, Search, Filter, BarChart2, EyeIcon, ShoppingCart, Percent, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDateShort } from '@/lib/utils/format'

interface PageLite {
  id: string
  title: string
  title_ar: string | null
  slug: string
  is_active: boolean
  views: number
  conversions: number
  created_at: string
  product: {
    name: string
    name_ar: string | null
  } | null
}

interface Props {
  initialPages: PageLite[]
  storeSlug: string
  storeId: string
}

export default function LandingPagesClient({ initialPages, storeSlug, storeId }: Props) {
  const [pages, setPages] = useState<PageLite[]>(initialPages)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // ── KPI Metrics calculation ──────────────────────────────────
  const kpis = useMemo(() => {
    const totalViews = pages.reduce((s, p) => s + (p.views ?? 0), 0)
    const totalConversions = pages.reduce((s, p) => s + (p.conversions ?? 0), 0)
    const avgConvRate = totalViews > 0 ? ((totalConversions / totalViews) * 100).toFixed(1) : '0'
    
    // Find best page by conversions
    let bestPage: PageLite | null = null
    let maxConv = -1
    for (const p of pages) {
      if (p.conversions > maxConv) {
        maxConv = p.conversions
        bestPage = p
      }
    }

    return {
      totalViews,
      totalConversions,
      avgConvRate,
      bestPageTitle: bestPage ? (bestPage.title_ar ?? bestPage.title) : 'لا يوجد'
    }
  }, [pages])

  // ── Filter & Search Logic ────────────────────────────────────
  const filteredPages = useMemo(() => {
    return pages.filter(p => {
      const title = (p.title_ar ?? p.title ?? '').toLowerCase()
      const slug = (p.slug ?? '').toLowerCase()
      const productName = (p.product?.name_ar ?? p.product?.name ?? '').toLowerCase()
      const query = searchQuery.toLowerCase()

      const matchesSearch = title.includes(query) || slug.includes(query) || productName.includes(query)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && p.is_active) ||
        (statusFilter === 'inactive' && !p.is_active)

      return matchesSearch && matchesStatus
    })
  }, [pages, searchQuery, statusFilter])

  // ── Delete Handler ───────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`هل أنت متأكد من حذف صفحة الهبوط "${title}" نهائياً؟`)) return

    setDeletingId(id)
    setMsg(null)
    const sb = createClient()

    const { error } = await sb.from('landing_pages').delete().eq('id', id)

    setDeletingId(null)

    if (error) {
      setMsg({ type: 'err', text: `فشل الحذف: ${error.message}` })
    } else {
      setPages(prev => prev.filter(p => p.id !== id))
      setMsg({ type: 'ok', text: `تم حذف صفحة الهبوط "${title}" بنجاح!` })
      // Auto-clear message after 4s
      setTimeout(() => setMsg(null), 4000)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      
      {/* Title & Add new button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">صفحات الهبوط</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>أنشئ صفحات هبوط لزيادة مبيعات منتجاتك بفضل الذكاء الاصطناعي</p>
        </div>
        <Link href="/landing-pages/new" className="btn btn-primary gap-2 text-sm shadow-md transition transform hover:scale-[1.02]">
          <Plus size={16} />إنشاء صفحة جديدة
        </Link>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'إجمالي الزيارات', value: kpis.totalViews.toLocaleString(), sub: 'على كافة الصفحات', icon: EyeIcon, color: '#0D6EFD' },
          { label: 'إجمالي الطلبات', value: kpis.totalConversions.toLocaleString(), sub: 'طلبيات مؤكدة', icon: ShoppingCart, color: '#28A745' },
          { label: 'متوسط التحويل', value: `${kpis.avgConvRate}%`, sub: 'نسبة الزيارة إلى الطلب', icon: Percent, color: '#2BBFAD' },
          { label: 'الصفحة الأكثر مبيعاً', value: kpis.bestPageTitle, sub: 'أعلى معدل طلبات', icon: BarChart2, color: '#FFC107', isText: true }
        ].map((k, i) => (
          <div key={i} className="card p-4 transition-all duration-300 hover:shadow-md border border-gray-100 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${k.color}15` }}>
                <k.icon size={16} style={{ color: k.color }} />
              </div>
            </div>
            <div className="mt-3">
              <p className={`font-black ${k.isText ? 'text-sm truncate' : 'text-xl'}`} style={{ color: 'var(--color-text-primary)' }}>
                {k.value}
              </p>
              <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--color-text-primary)' }}>{k.label}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{k.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Notifications banner */}
      {msg && (
        <div className="text-sm p-4 rounded-xl transition duration-300" style={{
          background: msg.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
          color: msg.type === 'ok' ? '#15803d' : '#b91c1c',
          border: `1px solid ${msg.type === 'ok' ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
          <input
            type="text"
            placeholder="ابحث باسم المنتج أو رابط الصفحة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border-2 border-gray-100 focus:border-blue-400 rounded-xl pr-10 pl-3 py-2 text-sm outline-none transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: 'var(--color-text-muted)' }} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="border-2 border-gray-100 focus:border-blue-400 rounded-xl px-3 py-2 text-sm outline-none transition bg-white"
          >
            <option value="all">كل الحالات</option>
            <option value="active">الصفحات النشطة</option>
            <option value="inactive">المخفية</option>
          </select>
        </div>
      </div>

      {/* Landing Pages Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPages.map(page => {
          const convRate = page.views > 0 ? ((page.conversions / page.views) * 100).toFixed(1) : '0'
          const pageTitle = page.title_ar ?? page.title
          const isDeleting = deletingId === page.id

          return (
            <div key={page.id} className="card overflow-hidden group transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between"
              style={{ border: '1px solid var(--color-border)' }}>
              
              <div>
                {/* Accent strip */}
                <div className="h-1 bg-gradient-to-r from-[#0D6EFD] to-[#6F42C1]" />
                
                <div className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm truncate group-hover:text-[#0D6EFD] transition" style={{ color: 'var(--color-text-primary)' }}>
                        {pageTitle}
                      </h3>
                      <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--color-text-muted)' }}>/{page.slug}</p>
                    </div>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold shrink-0 ${
                      page.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-500 border border-gray-200'
                    }`}>
                      {page.is_active ? 'نشطة' : 'مخفية'}
                    </span>
                  </div>

                  {page.product && (
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      📦 المنتج: {page.product.name_ar ?? page.product.name}
                    </p>
                  )}

                  {/* Micro Analytics Panel */}
                  <div className="grid grid-cols-3 gap-2 rounded-xl p-2.5" style={{ background: 'var(--color-bg-soft)' }}>
                    <div className="text-center">
                      <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>{page.views.toLocaleString()}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>زيارة</p>
                    </div>
                    <div className="text-center border-x" style={{ borderColor: 'var(--color-border)' }}>
                      <p className="text-sm font-black" style={{ color: '#0D6EFD' }}>{page.conversions.toLocaleString()}</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>طلب</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-black text-green-600">{convRate}%</p>
                      <p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>تحويل</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons Footer */}
              <div className="px-4 pb-4 pt-2 border-t flex items-center justify-between gap-1.5" style={{ borderColor: 'var(--color-border)' }}>
                <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                  {formatDateShort(page.created_at)}
                </span>
                <div className="flex items-center gap-1.5">
                  <a href={`/store/${storeSlug}/${page.slug}`} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-center" title="معاينة الصفحة">
                    <Eye size={14} style={{ color: 'var(--color-text-secondary)' }} />
                  </a>
                  
                  <a href={`https://wa.me/?text=${encodeURIComponent(`تسوق معنا: https://dakkani.vercel.app/store/${storeSlug}/${page.slug}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-green-50 transition-colors flex items-center justify-center" title="مشاركة على واتساب">
                    <Share2 size={14} style={{ color: '#25D366' }} />
                  </a>

                  <Link href={`/landing-pages/${page.id}`} className="p-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center" title="تعديل الصفحة">
                    <Pencil size={14} style={{ color: '#0D6EFD' }} />
                  </Link>

                  <button
                    onClick={() => handleDelete(page.id, pageTitle)}
                    disabled={isDeleting}
                    className="p-2 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center text-red-500 disabled:opacity-40"
                    title="حذف الصفحة"
                  >
                    <Trash2 size={14} className={isDeleting ? 'animate-pulse' : ''} />
                  </button>
                </div>
              </div>

            </div>
          )
        })}

        {filteredPages.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 card text-center py-16" style={{ color: 'var(--color-text-muted)' }}>
            <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold text-base">لا توجد نتائج مطابقة</p>
            <p className="text-xs mt-1">جرب تغيير كلمة البحث أو فلاتر التصفية المعروضة</p>
          </div>
        )}
      </div>

    </div>
  )
}
