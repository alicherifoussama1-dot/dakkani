'use client'
import { useState, useCallback } from 'react'
import { useRouter }  from 'next/navigation'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import {
  GripVertical, Plus, Trash2, Eye, Save, Sparkles,
  Loader2, ChevronDown, ChevronUp,
} from 'lucide-react'

// ── Section types ─────────────────────────────────────────
type SectionType =
  | 'hero-banner' | 'product-gallery' | 'features-grid'
  | 'reviews-carousel' | 'countdown-timer' | 'faq-accordion'
  | 'video-embed' | 'trust-badges' | 'sticky-buy-button'
  | 'size-guide' | 'checkout-form'

interface Section {
  id:     string
  type:   SectionType
  label:  string
  data:   Record<string, unknown>
}

interface Props {
  storeId:      string
  storeMeta:    { pixel?: string | null; tiktok?: string | null }
  existingPage: any
  products:     { id: string; name: string; name_ar?: string; price: number; images: { url: string }[] }[]
  wilayas:      { id: number; name_ar: string; delivery_fee_home: number; delivery_fee_stopdesk: number; delivery_days_home: string }[]
}

const SECTION_CATALOG: { type: SectionType; label: string; icon: string; default: Record<string, unknown> }[] = [
  { type: 'hero-banner',      label: 'بانر رئيسي',       icon: '🖼️', default: { title: 'عنوان رئيسي', subtitle: 'وصف قصير', ctaText: 'اطلب الآن', bgColor: '#0D6EFD', textColor: '#ffffff' } },
  { type: 'product-gallery',  label: 'معرض الصور',        icon: '🖼️', default: { images: [], autoPlay: true } },
  { type: 'features-grid',    label: 'مميزات المنتج',     icon: '✨', default: { features: [{ icon: '✅', title: 'جودة ممتازة', desc: '' }, { icon: '🚚', title: 'توصيل سريع', desc: '' }, { icon: '💳', title: 'COD', desc: '' }] } },
  { type: 'reviews-carousel', label: 'آراء العملاء',      icon: '⭐', default: { reviews: [{ name: 'أحمد', rating: 5, text: 'منتج ممتاز' }] } },
  { type: 'countdown-timer',  label: 'عداد تنازلي',       icon: '⏰', default: { endsAt: '', message: 'العرض ينتهي في:' } },
  { type: 'faq-accordion',    label: 'أسئلة شائعة',       icon: '❓', default: { faqs: [{ q: 'كيف أطلب؟', a: 'اضغط على زر الطلب' }] } },
  { type: 'video-embed',      label: 'فيديو',              icon: '🎬', default: { url: '', autoPlay: false } },
  { type: 'trust-badges',     label: 'شارات الثقة',        icon: '🏅', default: { badges: ['الدفع عند الاستلام', 'فتح قبل الدفع', 'توصيل لكل الجزائر', 'ضمان الاسترجاع'] } },
  { type: 'size-guide',       label: 'دليل المقاسات',      icon: '📏', default: { sizes: ['38','40','42','44','46','48','50','52','54','56','58'], columns: ['المقاس','الصدر cm','الخصر cm','الورك cm'], rows: [] } },
  { type: 'checkout-form',    label: 'نموذج الطلب السريع', icon: '🛒', default: { buttonText: 'اطلب الآن والدفع عند الاستلام ✓', buttonColor: '#0D6EFD' } },
  { type: 'sticky-buy-button',label: 'زر شراء ثابت',      icon: '📌', default: { text: '🛒 اطلب الآن', color: '#0D6EFD' } },
]

// ── Sortable Section Item ─────────────────────────────────
function SortableSection({
  section, onEdit, onRemove,
}: { section: Section; onEdit: (s: Section) => void; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  const cat = SECTION_CATALOG.find(c => c.type === section.type)

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center gap-3 bg-gray-800 border rounded-xl px-4 py-3 transition ${isDragging ? 'border-[#0D6EFD] shadow-lg' : 'border-gray-700'}`}>
      <button {...attributes} {...listeners} className="text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="text-lg">{cat?.icon ?? '📦'}</span>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-200">{section.label || cat?.label}</p>
        <p className="text-xs text-gray-600">{section.type}</p>
      </div>
      <button onClick={() => onEdit(section)} className="text-xs text-[#0D6EFD] hover:text-[#60A5FA] px-2 py-1 bg-[#0D6EFD]/10 rounded-lg transition">
        تعديل
      </button>
      <button onClick={() => onRemove(section.id)} className="text-gray-600 hover:text-red-400 transition">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── Main component ────────────────────────────────────────
export default function PageBuilder({ storeId, storeMeta, existingPage, products, wilayas }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [sections,    setSections]    = useState<Section[]>(existingPage?.sections ?? [])
  const [title,       setTitle]       = useState(existingPage?.title ?? '')
  const [titleAr,     setTitleAr]     = useState(existingPage?.title_ar ?? '')
  const [slug,        setSlug]        = useState(existingPage?.slug ?? '')
  const [metaPixel,   setMetaPixel]   = useState(existingPage?.meta_pixel_id ?? '')
  const [tiktokPixel, setTiktokPixel] = useState(existingPage?.tiktok_pixel_id ?? '')
  const [productId,   setProductId]   = useState(existingPage?.product_id ?? '')
  const [editSection, setEditSection] = useState<Section | null>(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [showCatalog, setShowCatalog] = useState(false)
  const [preview,     setPreview]     = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (active.id !== over?.id) {
      setSections(secs => {
        const oldIdx = secs.findIndex(s => s.id === active.id)
        const newIdx = secs.findIndex(s => s.id === over?.id)
        return arrayMove(secs, oldIdx, newIdx)
      })
    }
  }

  const addSection = (type: SectionType) => {
    const cat = SECTION_CATALOG.find(c => c.type === type)!
    const newSection: Section = {
      id:    crypto.randomUUID(),
      type,
      label: cat.label,
      data:  { ...cat.default },
    }
    setSections(prev => [...prev, newSection])
    setShowCatalog(false)
  }

  const updateSection = (updated: Section) => {
    setSections(prev => prev.map(s => s.id === updated.id ? updated : s))
    setEditSection(null)
  }

  const removeSection = (id: string) => setSections(prev => prev.filter(s => s.id !== id))

  // ── AI Page Generator ─────────────────────────────────────
  const generatePage = async () => {
    const product = products.find(p => p.id === productId)
    if (!product) { alert('اختر منتجاً أولاً'); return }
    setAiLoading(true)

    const res = await fetch('/api/ai/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: product.name_ar ?? product.name, features: [], keywords: [] }),
    })

    if (res.ok) {
      const data = await res.json()
      setTitleAr(data.title_ar ?? product.name_ar ?? product.name)
      setTitle(data.title_fr ?? product.name)
      setSlug(slugify(data.title_ar ?? product.name))

      // Generate default section structure
      const aiSections: Section[] = [
        { id: crypto.randomUUID(), type: 'hero-banner',      label: 'بانر رئيسي',       data: { title: data.title_ar, subtitle: data.description_ar?.slice(0, 100), ctaText: 'اطلب الآن', bgColor: '#0D6EFD' } },
        { id: crypto.randomUUID(), type: 'product-gallery',  label: 'معرض الصور',        data: { images: product.images } },
        { id: crypto.randomUUID(), type: 'features-grid',    label: 'المميزات',           data: { features: (data.features ?? []).slice(0,4).map((f: string) => ({ icon: '✅', title: f, desc: '' })) } },
        { id: crypto.randomUUID(), type: 'checkout-form',    label: 'نموذج الطلب',       data: { buttonText: 'اطلب الآن والدفع عند الاستلام ✓' } },
        { id: crypto.randomUUID(), type: 'trust-badges',     label: 'شارات الثقة',        data: { badges: ['الدفع عند الاستلام', 'فتح قبل الدفع', 'توصيل لكل الجزائر', 'ضمان الجودة'] } },
        { id: crypto.randomUUID(), type: 'reviews-carousel', label: 'آراء العملاء',      data: { reviews: [] } },
        { id: crypto.randomUUID(), type: 'sticky-buy-button',label: 'زر شراء ثابت',      data: { text: `🛒 اطلب ${product.name_ar ?? product.name} — ${product.price.toLocaleString()} دج` } },
      ]
      setSections(aiSections)
    }
    setAiLoading(false)
  }

  // ── Save page ─────────────────────────────────────────────
  const savePage = async () => {
    if (!titleAr && !title) { alert('أدخل عنوان الصفحة'); return }
    setSaving(true)

    const payload = {
      store_id:       storeId,
      title:          title || titleAr,
      title_ar:       titleAr,
      slug:           slug || slugify(titleAr || title),
      sections,
      product_id:     productId || null,
      meta_pixel_id:  metaPixel || storeMeta.pixel || null,
      tiktok_pixel_id: tiktokPixel || storeMeta.tiktok || null,
      is_active:      true,
    }

    if (existingPage?.id) {
      await supabase.from('landing_pages').update(payload).eq('id', existingPage.id)
    } else {
      await supabase.from('landing_pages').insert(payload)
    }

    setSaving(false)
    router.push('/admin/pages')
    router.refresh()
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950" dir="rtl">
      {/* ── LEFT: Settings & Sections ─────────────────────── */}
      <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="font-bold text-white text-sm">EcoBuilder</h2>
          <div className="flex gap-2">
            <button onClick={() => setPreview(!preview)} className="p-1.5 text-gray-500 hover:text-[#60A5FA] transition">
              <Eye className="w-4 h-4" />
            </button>
            <button onClick={savePage} disabled={saving} className="flex items-center gap-1.5 text-xs bg-[#0D6EFD] text-white px-3 py-1.5 rounded-lg hover:bg-[#0B5ED7] transition disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              حفظ
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Page settings */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">إعدادات الصفحة</p>
            {[
              { label: 'العنوان (عربي)',    val: titleAr,     set: setTitleAr },
              { label: 'Title (FR/EN)',      val: title,       set: setTitle },
              { label: 'Slug (URL)',         val: slug,        set: setSlug },
              { label: 'Meta Pixel ID',     val: metaPixel,   set: setMetaPixel },
              { label: 'TikTok Pixel ID',   val: tiktokPixel, set: setTiktokPixel },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
                />
              </div>
            ))}

            {/* Product select */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">المنتج</label>
              <select
                value={productId}
                onChange={e => setProductId(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
              >
                <option value="">اختر منتجاً</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name_ar ?? p.name}</option>
                ))}
              </select>
            </div>

            {/* AI generate */}
            <button
              onClick={generatePage}
              disabled={aiLoading || !productId}
              className="w-full flex items-center justify-center gap-2 text-xs py-2 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-xl hover:bg-purple-500/30 transition disabled:opacity-40"
            >
              {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              ✨ توليد صفحة كاملة بالذكاء الاصطناعي
            </button>
          </div>

          {/* Sections list */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">الأقسام ({sections.length})</p>

            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {sections.map(section => (
                    <SortableSection
                      key={section.id}
                      section={section}
                      onEdit={setEditSection}
                      onRemove={removeSection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add section */}
            <button
              onClick={() => setShowCatalog(!showCatalog)}
              className="w-full flex items-center justify-center gap-2 py-2 border-2 border-dashed border-gray-700 text-gray-600 hover:border-[#0D6EFD] hover:text-[#60A5FA] rounded-xl text-xs transition"
            >
              <Plus className="w-3.5 h-3.5" />
              إضافة قسم
            </button>

            {showCatalog && (
              <div className="grid grid-cols-2 gap-2">
                {SECTION_CATALOG.map(cat => (
                  <button
                    key={cat.type}
                    onClick={() => addSection(cat.type)}
                    className="text-right bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl p-3 transition"
                  >
                    <span className="text-lg block mb-1">{cat.icon}</span>
                    <span className="text-xs text-gray-300">{cat.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── RIGHT: Preview ────────────────────────────────── */}
      <div className="flex-1 bg-gray-100 overflow-y-auto p-6">
        <div className="max-w-md mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden min-h-96">
          {sections.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-4xl mb-3">📄</p>
              <p className="font-semibold">صفحتك فارغة</p>
              <p className="text-sm mt-1">أضف أقساماً من القائمة اليسرى</p>
              <p className="text-sm text-purple-600 mt-2 font-medium">أو استخدم ✨ الذكاء الاصطناعي لتوليد صفحة كاملة</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {sections.map(s => (
                <SectionPreview key={s.id} section={s} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Section Editor Modal ──────────────────────────── */}
      {editSection && (
        <SectionEditor
          section={editSection}
          onSave={updateSection}
          onClose={() => setEditSection(null)}
        />
      )}
    </div>
  )
}

// ── Section Preview ───────────────────────────────────────
function SectionPreview({ section }: { section: Section }) {
  const d = section.data as any
  switch (section.type) {
    case 'hero-banner':
      return (
        <div style={{ background: d.bgColor ?? '#0D6EFD', color: d.textColor ?? '#fff' }} className="p-8 text-center">
          <h2 className="text-xl font-black">{d.title || 'عنوان البانر'}</h2>
          {d.subtitle && <p className="text-sm mt-1 opacity-80">{d.subtitle}</p>}
          <button style={{ background: 'rgba(255,255,255,0.2)' }} className="mt-3 px-6 py-2 rounded-xl text-sm font-bold">
            {d.ctaText || 'اطلب الآن'}
          </button>
        </div>
      )
    case 'trust-badges':
      return (
        <div className="p-4 grid grid-cols-2 gap-2">
          {(d.badges ?? []).map((b: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-xs text-gray-700 bg-green-50 border border-green-100 rounded-xl p-2">
              <span className="text-green-500">✓</span>{b}
            </div>
          ))}
        </div>
      )
    case 'features-grid':
      return (
        <div className="p-4 grid grid-cols-3 gap-3">
          {(d.features ?? []).map((f: any, i: number) => (
            <div key={i} className="text-center">
              <span className="text-2xl">{f.icon}</span>
              <p className="text-xs font-semibold mt-1 text-gray-800">{f.title}</p>
            </div>
          ))}
        </div>
      )
    case 'checkout-form':
      return (
        <div className="p-4 bg-gray-50">
          <div className="space-y-2">
            {['الاسم الكامل', 'رقم الهاتف', 'اختر الولاية'].map(pl => (
              <div key={pl} className="border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-400 bg-white">{pl}</div>
            ))}
            <button style={{ background: d.buttonColor ?? '#0D6EFD' }} className="w-full text-white font-black py-3 rounded-xl text-sm">
              {d.buttonText ?? 'اطلب الآن والدفع عند الاستلام ✓'}
            </button>
          </div>
        </div>
      )
    case 'countdown-timer':
      return (
        <div className="p-4 text-center bg-red-50">
          <p className="text-sm font-bold text-red-600">{d.message ?? 'العرض ينتهي في:'}</p>
          <div className="flex justify-center gap-2 mt-2">
            {['00', '12', '34'].map((v, i) => (
              <div key={i} className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm font-black font-mono">{v}</div>
            ))}
          </div>
        </div>
      )
    case 'size-guide':
      return (
        <div className="p-4">
          <h3 className="font-bold text-sm mb-2">دليل المقاسات</h3>
          <div className="flex flex-wrap gap-1">
            {(d.sizes ?? ['38','40','42','44']).map((s: string) => (
              <span key={s} className="text-xs border border-gray-200 rounded-lg px-2 py-1">{s}</span>
            ))}
          </div>
        </div>
      )
    default:
      return (
        <div className="p-4 text-center text-gray-400 text-xs border border-dashed border-gray-200 m-2 rounded-xl">
          <p>{SECTION_CATALOG.find(c => c.type === section.type)?.icon} {section.label}</p>
        </div>
      )
  }
}

// ── Section Editor ────────────────────────────────────────
function SectionEditor({ section, onSave, onClose }: {
  section: Section; onSave: (s: Section) => void; onClose: () => void
}) {
  const [data, setData] = useState({ ...section.data })
  const [label, setLabel] = useState(section.label)

  const set = (key: string, val: unknown) => setData(d => ({ ...d, [key]: val }))

  const renderFields = () => {
    switch (section.type) {
      case 'hero-banner':
        return (
          <>
            {[['title','العنوان'],['subtitle','الوصف'],['ctaText','نص الزر']].map(([k,l]) => (
              <div key={k}>
                <label className="block text-xs text-gray-500 mb-1">{l}</label>
                <input value={(data as any)[k] ?? ''} onChange={e => set(k, e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none" />
              </div>
            ))}
            {[['bgColor','لون الخلفية'],['textColor','لون النص']].map(([k,l]) => (
              <div key={k} className="flex items-center gap-3">
                <label className="text-xs text-gray-500 w-24">{l}</label>
                <input type="color" value={(data as any)[k] ?? '#0D6EFD'} onChange={e => set(k, e.target.value)} className="w-10 h-8 rounded cursor-pointer" />
              </div>
            ))}
          </>
        )
      case 'trust-badges':
        return (
          <div>
            <label className="block text-xs text-gray-500 mb-2">الشارات (كل شارة في سطر)</label>
            <textarea
              value={((data as any).badges ?? []).join('\n')}
              onChange={e => set('badges', e.target.value.split('\n').filter(Boolean))}
              rows={5}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none resize-none"
            />
          </div>
        )
      case 'countdown-timer':
        return (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">الرسالة</label>
              <input value={(data as any).message ?? ''} onChange={e => set('message', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">تاريخ الانتهاء</label>
              <input type="datetime-local" value={(data as any).endsAt ?? ''} onChange={e => set('endsAt', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none" />
            </div>
          </>
        )
      case 'checkout-form':
        return (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">نص الزر</label>
              <input value={(data as any).buttonText ?? ''} onChange={e => set('buttonText', e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500">لون الزر</label>
              <input type="color" value={(data as any).buttonColor ?? '#0D6EFD'} onChange={e => set('buttonColor', e.target.value)} className="w-10 h-8 rounded cursor-pointer" />
            </div>
          </>
        )
      default:
        return (
          <div className="text-xs text-gray-500">
            <pre className="bg-gray-800 rounded-lg p-3 overflow-auto text-gray-400 text-xs max-h-48">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md space-y-4" dir="rtl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">تعديل القسم</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-300">✕</button>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">اسم القسم</label>
          <input value={label} onChange={e => setLabel(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none" />
        </div>
        <div className="space-y-3">{renderFields()}</div>
        <button
          onClick={() => onSave({ ...section, label, data })}
          className="w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-bold py-2 rounded-xl text-sm transition"
        >
          حفظ التغييرات
        </button>
      </div>
    </div>
  )
}
