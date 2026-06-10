'use client'
// ============================================================
// AI Landing Page — inline editor
// Lets the merchant tweak Gemini-generated copy section by section,
// choose theme styles, manage infographic gallery images & labels,
// and persist the final version back to landing_pages.
// ============================================================
import { useRef, useState } from 'react'
import { Sparkles, RefreshCw, Check, Loader2, ExternalLink, Plus, Trash2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import { PRODUCT_THEMES } from '@/lib/product-themes'

interface AIContent {
  hero?: { headline: string; subheadline?: string; cta_text?: string; variations?: { headline: string; cta_text?: string }[] }
  benefits?: { icon?: string; title: string; text: string }[]
  social_proof?: { name: string; wilaya?: string; rating?: number; quote: string }[]
  urgency?: { type?: string; text?: string }
  faq?: { q: string; a: string }[]
  final_cta?: { headline?: string; cta_text?: string }
  [key: string]: any
}

interface ProductLite {
  id: string
  name: string
  name_ar: string | null
  price: number
  compare_price: number | null
  images?: { url: string }[] | null
}

interface Props {
  pageId: string
  storeId: string
  publicUrl: string
  initialContent: AIContent
  initialImages: { key: string; label_ar: string; url: string }[]
  product: ProductLite | null
  initialThemeKey?: string
}

async function pollJob<T>(url: string, onTick: (data: any) => T | undefined, intervalMs = 2000, maxTries = 60): Promise<T> {
  for (let i = 0; i < maxTries; i++) {
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    const result = onTick(data)
    if (result !== undefined) return result
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error('انتهت مهلة الانتظار')
}

function Field({ label, value, onChange, multiline }: { label: string; value: string; onChange: (v: string) => void; multiline?: boolean }) {
  return (
    <div>
      <label className="text-xs font-bold block mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
      {multiline ? (
        <textarea className="input" rows={2} style={{ height: 'auto', paddingTop: 8, paddingBottom: 8 }} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </div>
  )
}

export default function AILandingEditor({ pageId, storeId, publicUrl, initialContent, initialImages, product, initialThemeKey }: Props) {
  const supabase = useRef(createClient()).current
  const [content, setContent] = useState<AIContent>(initialContent ?? {})
  const [images, setImages] = useState(initialImages)
  const [themeKey, setThemeKey] = useState(initialThemeKey ?? 'classic')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  function update(path: (string | number)[], value: any) {
    setContent(prev => {
      const next = structuredClone(prev)
      let cur: any = next
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]]
      cur[path[path.length - 1]] = value
      return next
    })
  }

  async function handleSave() {
    setSaving(true)
    setMessage(null)
    const { error } = await supabase
      .from('landing_pages')
      .update({ ai_content: content, ai_images: images, theme_key: themeKey })
      .eq('id', pageId)
    setSaving(false)
    setMessage(error ? { type: 'err', text: 'تعذر حفظ التعديلات' } : { type: 'ok', text: 'تم حفظ التعديلات ✅' })
  }

  async function handleDelete() {
    if (!window.confirm('هل أنت متأكد من حذف صفحة الهبوط هذه نهائياً؟')) return
    setDeleting(true)
    setMessage(null)
    const { error } = await supabase
      .from('landing_pages')
      .delete()
      .eq('id', pageId)
    if (error) {
      setMessage({ type: 'err', text: `فشل الحذف: ${error.message}` })
      setDeleting(false)
    } else {
      window.location.href = '/landing-pages'
    }
  }

  async function regenerateContent() {
    if (!product) return
    setRegenLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/ai/landing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, product: { name: product.name_ar ?? product.name, price: product.price, images: product.images?.map(i => i.url) ?? [] } }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'فشلت إعادة التوليد')
      let result = data.result
      if (data.status !== 'done') {
        result = await pollJob(`/api/ai/landing/status/${data.jobId}`, (d) => {
          if (d.status === 'done') return d.result
          if (d.status === 'failed') throw new Error(d.error ?? 'فشلت إعادة التوليد')
          return undefined
        })
      }
      setContent(result)
      setMessage({ type: 'ok', text: 'تمت إعادة توليد النص — لا تنسَ الحفظ ✨' })
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message ?? 'فشلت إعادة التوليد' })
    } finally {
      setRegenLoading(false)
    }
  }

  async function regenerateImage() {
    const sourceUrl = product?.images?.[0]?.url
    if (!sourceUrl) return
    setPhotoLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/ai/photo/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, imageUrl: sourceUrl }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'فشل تحسين الصورة')
      let opts = data.images
      if (data.status !== 'done') {
        opts = await pollJob(`/api/ai/photo/status/${data.jobId}`, (d) => {
          if (d.status === 'done') return d.images
          if (d.status === 'failed') throw new Error(d.error ?? 'فشل تحسين الصورة')
          return undefined
        })
      }
      if (opts?.[0]) {
        setImages(prev => [
          { key: `ai_${Date.now()}`, label_ar: 'صورة الصفحة الرئيسية', url: opts[0].url },
          ...prev.filter(i => i.key !== 'selected')
        ])
        setMessage({ type: 'ok', text: 'تم تحسين الصورة بنجاح وإضافتها للمعرض — لا تنسَ الحفظ ✨' })
      }
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message ?? 'فشل تحسين الصورة' })
    } finally {
      setPhotoLoading(false)
    }
  }

  const handleUpdateImageLabel = (index: number, label: string) => {
    setImages(prev => {
      const next = [...prev]
      next[index] = { ...next[index], label_ar: label }
      return next
    })
  }

  const handleDeleteImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index))
  }

  const handleAddProductImage = (url: string) => {
    setImages(prev => [
      ...prev,
      { key: `gallery_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`, label_ar: '', url }
    ])
  }

  const hero = content.hero ?? { headline: '', subheadline: '', cta_text: '' }
  const benefits = content.benefits ?? []
  const faq = content.faq ?? []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm gap-1.5" style={{ border: '1px solid var(--color-border)', background: '#fff', color: 'var(--color-text-secondary)' }}>
          <ExternalLink size={13} />فتح الصفحة المنشورة
        </a>
        <div className="flex gap-2">
          <button onClick={regenerateContent} disabled={regenLoading || !product} className="btn btn-ghost btn-sm gap-1.5">
            {regenLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            أعد توليد النص
          </button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-sm gap-1.5">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
            حفظ التعديلات
          </button>
        </div>
      </div>

      {message && (
        <div className="text-sm p-3 rounded-lg" style={{
          background: message.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
          color: message.type === 'ok' ? '#16A34A' : '#DC2626',
          border: `1px solid ${message.type === 'ok' ? '#BBF7D0' : '#FECACA'}`,
        }}>
          {message.text}
        </div>
      )}

      {/* Theme Selection */}
      <section className="card p-5 space-y-3">
        <h3 className="font-bold text-sm text-[#111111]" style={{ fontFamily: 'var(--font-arabic)' }}>طابع الصفحة ولون المظهر</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PRODUCT_THEMES.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setThemeKey(t.key)}
              className={`p-3 border rounded-xl text-right transition flex flex-col justify-between h-20 ${themeKey === t.key ? 'border-[#0D6EFD] bg-[#EBF5FF]' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
            >
              <p className="font-bold text-xs" style={{ color: themeKey === t.key ? '#0D6EFD' : '#111111' }}>{t.name}</p>
              <div className="flex gap-1.5 mt-2">
                <span className="w-3.5 h-3.5 rounded-full border border-gray-300" style={{ background: t.preview.bg }} />
                <span className="w-3.5 h-3.5 rounded-full" style={{ background: t.preview.accent }} />
                <span className="w-3.5 h-3.5 rounded-full" style={{ background: t.preview.surface }} />
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Infographic / Gallery Images List */}
      <section className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#111111]">صور الملصق التسويقي والنصوص التوضيحية (Infographic Gallery)</h3>
          <button onClick={regenerateImage} disabled={photoLoading || !product?.images?.length} className="btn btn-ghost btn-sm gap-1.5">
            {photoLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            توليد خلفية بالذكاء الاصطناعي
          </button>
        </div>
        
        <p className="text-xs text-gray-500">
          تترتب هذه الصور بشكل تتابعي طولي في الصفحة عند استخدام «طابع الملصق الطويل». يمكنك تعديل النص التوضيحي الذي سيظهر متراكباً فوق كل صورة.
        </p>

        <div className="space-y-4">
          {images.map((img, i) => (
            <div key={img.key || i} className="flex gap-4 p-4 rounded-xl border border-gray-100 bg-[#F9F9F9] relative items-center">
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border bg-white">
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 space-y-2">
                <Field
                  label={`النص التوضيحي المكتوب فوق الصورة ${i + 1}`}
                  value={img.label_ar ?? ''}
                  onChange={(v) => handleUpdateImageLabel(i, v)}
                />
              </div>
              <button
                type="button"
                onClick={() => handleDeleteImage(i)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition shrink-0"
                title="حذف الصورة"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>

        {/* Add image from product section */}
        {product?.images && product.images.length > 0 && (
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-gray-700">أضف صورة إضافية من صور المنتج الأساسية:</h4>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {product.images.map((img: any, i: number) => {
                const exists = images.some(item => item.url === img.url)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={exists}
                    onClick={() => handleAddProductImage(img.url)}
                    className="w-14 h-14 rounded-lg overflow-hidden border bg-white relative hover:border-blue-400 disabled:opacity-40 transition shrink-0"
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                    {!exists && (
                      <div className="absolute inset-0 bg-black/25 flex items-center justify-center text-white font-bold text-xs opacity-0 hover:opacity-100 transition-opacity">
                        + أضف
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </section>

      {/* Hero copy */}
      <section className="card p-5 space-y-3">
        <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>القسم الرئيسي (Hero)</h3>
        <Field label="العنوان الرئيسي" value={hero.headline ?? ''} onChange={(v) => update(['hero', 'headline'], v)} />
        <Field label="العنوان الفرعي" value={hero.subheadline ?? ''} onChange={(v) => update(['hero', 'subheadline'], v)} multiline />
        <Field label="نص زر الشراء" value={hero.cta_text ?? ''} onChange={(v) => update(['hero', 'cta_text'], v)} />
      </section>

      {/* Urgency */}
      {content.urgency && (
        <section className="card p-5 space-y-3">
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>رسالة الإلحاح</h3>
          <Field label="النص" value={content.urgency.text ?? ''} onChange={(v) => update(['urgency', 'text'], v)} />
        </section>
      )}

      {/* Benefits */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>المزايا</h3>
          <button onClick={() => update(['benefits'], [...benefits, { icon: '✅', title: '', text: '' }])} className="btn btn-ghost btn-sm gap-1"><Plus size={13} />إضافة</button>
        </div>
        <div className="space-y-3">
          {benefits.map((b, i) => (
            <div key={i} className="p-3 rounded-lg space-y-2" style={{ background: 'var(--color-bg-soft)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>ميزة {i + 1}</span>
                <button onClick={() => update(['benefits'], benefits.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
              </div>
              <Field label="العنوان" value={b.title} onChange={(v) => update(['benefits', i, 'title'], v)} />
              <Field label="الوصف" value={b.text} onChange={(v) => update(['benefits', i, 'text'], v)} multiline />
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>الأسئلة الشائعة</h3>
          <button onClick={() => update(['faq'], [...faq, { q: '', a: '' }])} className="btn btn-ghost btn-sm gap-1"><Plus size={13} />إضافة</button>
        </div>
        <div className="space-y-3">
          {faq.map((f, i) => (
            <div key={i} className="p-3 rounded-lg space-y-2" style={{ background: 'var(--color-bg-soft)' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: 'var(--color-text-muted)' }}>سؤال {i + 1}</span>
                <button onClick={() => update(['faq'], faq.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700"><Trash2 size={13} /></button>
              </div>
              <Field label="السؤال" value={f.q} onChange={(v) => update(['faq', i, 'q'], v)} />
              <Field label="الجواب" value={f.a} onChange={(v) => update(['faq', i, 'a'], v)} multiline />
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      {content.final_cta && (
        <section className="card p-5 space-y-3">
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>الدعوة الختامية</h3>
          <Field label="العنوان" value={content.final_cta.headline ?? ''} onChange={(v) => update(['final_cta', 'headline'], v)} />
          <Field label="نص الزر" value={content.final_cta.cta_text ?? ''} onChange={(v) => update(['final_cta', 'cta_text'], v)} />
        </section>
      )}

      {/* Deletion & Save Buttons */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="btn border border-red-200 hover:bg-red-50 text-red-600 font-bold py-3 px-6 rounded-xl text-sm transition shrink-0"
        >
          {deleting ? 'جاري الحذف...' : 'حذف الصفحة 🗑️'}
        </button>

        <button onClick={handleSave} disabled={saving} className="flex-1 btn btn-primary btn-lg gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          {saving ? 'جاري الحفظ...' : 'حفظ كل التعديلات'}
        </button>
      </div>

    </div>
  )
}
