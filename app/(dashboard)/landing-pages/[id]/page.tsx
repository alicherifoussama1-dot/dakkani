export const dynamic = 'force-dynamic'

import { createServerClient, getActiveStore } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Eye, ExternalLink } from 'lucide-react'
import AILandingEditor from '@/components/admin/AILandingEditor'

export async function generateMetadata({ params }: { params: { id: string } }) {
  return { title: 'تعديل صفحة الهبوط' }
}

export default async function EditLandingPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { activeStore: store } = await getActiveStore(supabase, user.id)
  if (!store) return null

  const { data: page } = await supabase.from('landing_pages').select('*, product:products(id,name,name_ar,price,compare_price,images)').eq('id', params.id).eq('store_id', store.id).single()
  if (!page) notFound()

  const isAI = page.template === 'ai' && page.ai_content

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link href="/landing-pages" className="p-1.5 rounded hover:bg-[#F8F9FA] transition-colors">
            <ArrowRight size={16} style={{color:'var(--color-text-muted)'}} />
          </Link>
          <div>
            <h1 className="page-title">{page.title_ar ?? page.title}</h1>
            <p className="text-xs font-mono mt-0.5" style={{color:'var(--color-text-muted)'}}>/{page.slug}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(page.product as any)?.slug && (
            <a href={`/store/${store.slug}/product/${(page.product as any).slug}`} target="_blank" rel="noopener noreferrer"
              className="btn btn-sm gap-1.5" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)'}}>
              <Eye size={13} />معاينة المنتج
            </a>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          {label:'الزيارات', value: page.views?.toLocaleString('ar-DZ') ?? '0'},
          {label:'الطلبات', value: page.conversions?.toLocaleString('ar-DZ') ?? '0'},
          {label:'معدل التحويل', value: page.views > 0 ? `${((page.conversions / page.views) * 100).toFixed(1)}%` : '0%'},
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className="font-black text-xl" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>{s.value}</p>
            <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{s.label}</p>
          </div>
        ))}
      </div>

      {isAI ? (
        <AILandingEditor
          pageId={page.id}
          storeId={store.id}
          publicUrl={`/store/${store.slug}/${page.slug}`}
          initialContent={page.ai_content as any}
          initialImages={(page.ai_images as any[]) ?? []}
          product={page.product as any}
        />
      ) : (
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">🚀</div>
          <h2 className="font-black text-xl mb-2" style={{color:'var(--color-text-primary)'}}>محرر الصفحات</h2>
          <p className="text-sm mb-4" style={{color:'var(--color-text-muted)'}}>
            هذه الصفحة لم تُنشأ بالذكاء الاصطناعي بعد — أنشئ صفحة جديدة للاستفادة من المحرر الذكي
          </p>
          <a href={`/store/${store.slug}/${page.slug}`} target="_blank" rel="noopener noreferrer"
            className="btn btn-primary gap-2 inline-flex">
            <ExternalLink size={14} />عرض الصفحة الحالية
          </a>
        </div>
      )}
    </div>
  )
}
