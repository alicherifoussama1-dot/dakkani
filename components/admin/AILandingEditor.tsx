'use client'
// ============================================================
// AI Landing Page — inline editor
// Lets the merchant tweak Gemini-generated copy section by section,
// re-run AI generation ("أعد التوليد") for the whole page or just the
// image, and persist the final version back to landing_pages.
// ============================================================
import { useRef, useState } from 'react'
import { Sparkles, RefreshCw, Check, Loader2, ExternalLink, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface AIContent {
  hero?: { headline: string; subheadline?: string; cta_text?: string; variations?: { headline: string; cta_text?: string }[] }
  benefits?: { icon?: string; title: string; text: string }[]
  social_proof?: { name: string; wilaya?: string; rating?: number; quote: string }[]
  urgency?: { type?: string; text?: string }
  faq?: { q: string; a: string }[]
  final_cta?: { headline?: string; cta_text?: string }
  [key: string]: any
}

interface ProductLite { id: string; name: string; name_ar: string | null; price: number; compare_price: number | null; images?: { url: string }[] | null }

interface Props {
  pageId: string; storeId: string; publicUrl: string
  initialContent: AIContent
  initialImages: { key: string; label_ar: string; url: string }[]
  product: ProductLite | null
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

export default function AILandingEditor({ pageId, storeId, publicUrl, initialContent, initialImages, product }: Props) {
  const supabase = useRef(createClient()).current
  const [content, setContent] = useState<AIContent>(initialContent ?? {})
  const [images, setImages] = useState(initialImages)
  const [saving, setSaving] = useState(false)
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
    const { error } = await supabase.from('landing_pages').update({ ai_content: content, ai_images: images }).eq('id', pageId)
    setSaving(false)
    setMessage(error ? { type: 'err', text: 'تعذر حفظ التعديلات' } : { type: 'ok', text: 'تم حفظ التعديلات ✅' })
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
        setImages([{ key: 'selected', label_ar: 'صورة الصفحة', url: opts[0].url }])
        setMessage({ type: 'ok', text: 'تم تحسين الصورة — لا تنسَ الحفظ ✨' })
      }
    } catch (e: any) {
      setMessage({ type: 'err', text: e?.message ?? 'فشل تحسين الصورة' })
    } finally {
      setPhotoLoading(false)
    }
  }

  const hero = content.hero ?? { headline: '', subheadline: '', cta_text: '' }
  const benefits = content.benefits ?? []
  const faq = content.faq ?? []

  return (
    <div className="space-y-4">
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

      {/* Hero image */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>صورة الصفحة الرئيسية</h3>
          <button onClick={regenerateImage} disabled={photoLoading || !product?.images?.length} className="btn btn-ghost btn-sm gap-1.5">
            {photoLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            أعد التحسين بالذكاء الاصطناعي
          </button>
        </div>
        <div className="w-32 h-32 rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-soft)' }}>
          {(images[0]?.url ?? product?.images?.[0]?.url) && (
            <img src={images[0]?.url ?? product?.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
          )}
        </div>
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

      <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-lg w-full gap-2">
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
        {saving ? 'جاري الحفظ...' : 'حفظ كل التعديلات'}
      </button>
    </div>
  )
}
