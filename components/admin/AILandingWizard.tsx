'use client'
// ============================================================
// AI Landing Page Studio — merchant wizard (4 steps)
//
// All Gemini calls go through API routes — key never leaves server.
//   1. Pick product + description + audience/tone
//   2. AI Copy   → POST /api/ai/landing/generate, poll /status/[id]
//   3. AI Photo  → POST /api/ai/photo/enhance (with scenario), poll
//   4. Preview + Save → INSERT landing_pages row
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Sparkles, ImageIcon, Check, Loader2, RefreshCw, Lightbulb } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatDZD } from '@/lib/utils/format'
import { slugify } from '@/lib/utils/format'
import { SCENARIO_SUGGESTIONS, DEFAULT_SCENARIOS } from '@/lib/ai/scenario-suggestions'

interface ProductLite {
  id: string; name: string; name_ar: string | null
  price: number; compare_price: number | null
  category?: { name_ar: string | null } | null
  images?: { url: string }[] | null
}

interface Props { storeId: string; storeSlug: string; products: ProductLite[] }
type Step = 1 | 2 | 3 | 4

const TONES = [
  { key: 'حماسي',    label: 'حماسي 🔥' },
  { key: 'ودود',     label: 'ودود 😊' },
  { key: 'احترافي',  label: 'احترافي 💼' },
  { key: 'فاخر',    label: 'فاخر ✨' },
]

async function pollJob<T>(
  url: string,
  onTick: (data: any) => T | undefined,
  intervalMs = 2000,
  maxTries = 60,
): Promise<T> {
  for (let i = 0; i < maxTries; i++) {
    const res = await fetch(url, { cache: 'no-store' })
    const data = await res.json()
    const result = onTick(data)
    if (result !== undefined) return result
    await new Promise(r => setTimeout(r, intervalMs))
  }
  throw new Error('انتهت مهلة الانتظار')
}

export default function AILandingWizard({ storeId, storeSlug, products }: Props) {
  const router = useRouter()
  const supabase = useRef(createClient()).current

  const [step, setStep] = useState<Step>(1)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Step 1 ──
  const [productId, setProductId]     = useState<string>('')
  const [description, setDescription] = useState('')
  const [audience, setAudience]       = useState('')
  const [tone, setTone]               = useState('حماسي')
  const product = products.find(p => p.id === productId) ?? null

  // ── Step 2 — AI copy ──
  const [copyLoading, setCopyLoading]   = useState(false)
  const [copyProgress, setCopyProgress] = useState('')
  const [aiContent, setAiContent]       = useState<any | null>(null)

  // ── Step 3 — Photo studio ──
  const [photoLoading, setPhotoLoading]   = useState(false)
  const [photoProgress, setPhotoProgress] = useState('')
  const [photoOptions, setPhotoOptions]   = useState<{ key: string; label_ar: string; url: string }[]>([])
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
  const [scenario, setScenario]           = useState('')
  const [scenarioApplied, setScenarioApplied] = useState(false)

  const sourceImageUrl = product?.images?.[0]?.url ?? null
  const categoryName   = product?.category?.name_ar ?? ''

  // Scenario suggestions for the detected/selected category
  const scenarioSuggestions = SCENARIO_SUGGESTIONS[categoryName] ?? DEFAULT_SCENARIOS

  // ── Copy generation ──
  async function runCopyGeneration() {
    if (!product) return
    setError(null)
    setCopyLoading(true)
    setCopyProgress('🧠 Gemini يكتب نص صفحتك بالدارجة...')
    try {
      const res = await fetch('/api/ai/landing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          product: {
            name:        product.name_ar ?? product.name,
            description: description || undefined,
            price:       product.price,
            category:    categoryName || undefined,
            audience:    audience || undefined,
            tone,
            images:      product.images?.map(i => i.url) ?? [],
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'تعذر توليد المحتوى')

      if (data.status === 'done' && data.result) {
        setAiContent(data.result)
      } else {
        setCopyProgress('⏳ جاري المعالجة...')
        const result = await pollJob(`/api/ai/landing/status/${data.jobId}`, d => {
          if (d.status === 'done')   return d.result
          if (d.status === 'failed') throw new Error(d.error ?? 'فشل توليد المحتوى')
        })
        setAiContent(result)
      }
      setStep(3)
    } catch (e: any) {
      setError(e?.message ?? 'حدث خطأ أثناء توليد المحتوى')
    } finally {
      setCopyLoading(false)
    }
  }

  // ── Photo enhancement ──
  async function runPhotoEnhancement(customScenario?: string) {
    if (!sourceImageUrl) { setStep(4); return }
    setError(null)
    setPhotoLoading(true)
    setPhotoOptions([])
    const usedScenario = customScenario ?? scenario
    setScenarioApplied(!!usedScenario)
    setPhotoProgress(
      usedScenario
        ? `🎨 Gemini يولّد 4 خيارات بمشهد: "${usedScenario.slice(0, 40)}..."`
        : '🎨 استوديو الصور بالذكاء الاصطناعي يحسّن صورتك...'
    )
    try {
      const res = await fetch('/api/ai/photo/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          imageUrl: sourceImageUrl,
          scenario: usedScenario || undefined,
          category: categoryName || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'تعذر تحسين الصورة')

      let images = data.images as typeof photoOptions
      if (data.status !== 'done') {
        setPhotoProgress('⏳ جاري تحسين الصورة...')
        images = await pollJob(`/api/ai/photo/status/${data.jobId}`, d => {
          if (d.status === 'done')   return d.images
          if (d.status === 'failed') throw new Error(d.error ?? 'فشل تحسين الصورة')
        })
      }
      setPhotoOptions(images ?? [])
      setSelectedImageUrl(images?.[0]?.url ?? sourceImageUrl)
    } catch (e: any) {
      setError(e?.message ?? 'حدث خطأ أثناء تحسين الصورة')
      setPhotoOptions([{ key: 'original', label_ar: 'الصورة الأصلية', url: sourceImageUrl }])
      setSelectedImageUrl(sourceImageUrl)
    } finally {
      setPhotoLoading(false)
    }
  }

  // Auto-trigger steps when entering them
  useEffect(() => {
    if (step === 2 && !aiContent && !copyLoading) runCopyGeneration()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  useEffect(() => {
    if (step === 3 && photoOptions.length === 0 && !photoLoading) runPhotoEnhancement()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // ── Save ──
  async function handleSave() {
    if (!product || !aiContent) return
    setSaving(true)
    setError(null)
    try {
      const baseSlug = slugify(product.name_ar ?? product.name) || 'landing'
      const slug     = `${baseSlug}-${Math.random().toString(36).slice(2, 7)}`
      const aiImages = selectedImageUrl
        ? [{ key: 'selected', label_ar: 'صورة الصفحة', url: selectedImageUrl }]
        : []

      let pageId: string | null = null

      // Try with AI columns (migration 014 applied)
      const { data: full, error: fullErr } = await supabase
        .from('landing_pages')
        .insert({
          store_id:     storeId,
          product_id:   product.id,
          title:        product.name,
          title_ar:     product.name_ar ?? product.name,
          slug,
          template:     'ai',
          ai_content:   aiContent,
          ai_images:    aiImages,
          theme_key:    'classic',
          hero_variant: 0,
          is_active:    true,
        })
        .select('id')
        .single()

      if (!fullErr && full) {
        pageId = full.id
      } else {
        // Fallback: store AI content in sections jsonb (migration not applied)
        const { data: base, error: baseErr } = await supabase
          .from('landing_pages')
          .insert({
            store_id:   storeId,
            product_id: product.id,
            title:      product.name,
            title_ar:   product.name_ar ?? product.name,
            slug,
            template:   'ai',
            sections:   [{ type: 'ai_content', data: aiContent, images: aiImages }],
            is_active:  true,
          })
          .select('id')
          .single()

        if (baseErr || !base) throw new Error('تعذر حفظ الصفحة — ' + (baseErr?.message ?? ''))
        pageId = base.id
      }

      router.push(`/landing-pages/${pageId}`)
    } catch (e: any) {
      setError(e?.message ?? 'حدث خطأ أثناء الحفظ')
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => step > 1 ? setStep(s => (s - 1) as Step) : router.push('/landing-pages')}
          className="p-1.5 rounded hover:bg-[#F8F9FA] transition-colors"
        >
          <ArrowRight size={16} style={{ color: 'var(--color-text-muted)' }} />
        </button>
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Sparkles size={18} style={{ color: 'var(--color-accent)' }} />
            صفحة هبوط بالذكاء الاصطناعي
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            Gemini Pro يكتب النص ويحسّن الصور تلقائياً
          </p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 my-5">
        {[
          { n: 1, label: 'المنتج' },
          { n: 2, label: 'النص بالذكاء الاصطناعي' },
          { n: 3, label: 'استوديو الصور' },
          { n: 4, label: 'المعاينة والحفظ' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2 flex-1">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
              style={{
                background: step >= s.n ? 'var(--color-accent)' : 'var(--color-bg-soft)',
                color:      step >= s.n ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {step > s.n ? <Check size={14} /> : s.n}
            </div>
            <span
              className="text-xs hidden sm:block"
              style={{ color: step >= s.n ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
            >
              {s.label}
            </span>
            {i < 3 && (
              <div
                className="flex-1 h-0.5 rounded"
                style={{ background: step > s.n ? 'var(--color-accent)' : 'var(--color-border)' }}
              />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 text-sm p-3 rounded-lg" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── STEP 1 — Product + details ───────────────────────── */}
      {step === 1 && (
        <div className="card p-5 space-y-5">
          {/* Product picker */}
          <div>
            <label className="text-sm font-bold block mb-2" style={{ color: 'var(--color-text-primary)' }}>
              اختر المنتج
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {products.map(p => (
                <button
                  key={p.id}
                  onClick={() => setProductId(p.id)}
                  className="flex items-center gap-3 p-2.5 rounded-lg border text-right transition-colors"
                  style={{
                    borderColor: productId === p.id ? 'var(--color-accent)' : 'var(--color-border)',
                    background:  productId === p.id ? 'var(--color-accent-soft, #EBF5FF)' : '#fff',
                  }}
                >
                  <div className="w-12 h-12 rounded-md overflow-hidden shrink-0" style={{ background: 'var(--color-bg-soft)' }}>
                    {p.images?.[0]?.url && <img src={p.images[0].url} alt="" className="w-full h-full object-cover" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: 'var(--color-text-primary)' }}>
                      {p.name_ar ?? p.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-accent)' }}>{formatDZD(p.price)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Description (NEW) */}
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              وصف المنتج
              <span className="font-normal mr-1" style={{ color: 'var(--color-text-muted)' }}>(كلما زدت التفاصيل كان النص أفضل)</span>
            </label>
            <textarea
              className="input w-full resize-none"
              rows={3}
              placeholder="مثال: قميص قطن 100%، متوفر بـ5 ألوان، مقاسات S إلى XL، مثالي للمناسبات والسهرات..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ fontFamily: 'inherit' }}
            />
          </div>

          {/* Audience */}
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
              الجمهور المستهدف
              <span className="font-normal mr-1" style={{ color: 'var(--color-text-muted)' }}>(اختياري)</span>
            </label>
            <input
              className="input"
              placeholder="مثال: نساء 25-40 سنة، مهتمات بالموضة"
              value={audience}
              onChange={e => setAudience(e.target.value)}
            />
          </div>

          {/* Tone */}
          <div>
            <label className="text-sm font-bold block mb-1.5" style={{ color: 'var(--color-text-primary)' }}>أسلوب الكتابة</label>
            <div className="flex flex-wrap gap-2">
              {TONES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTone(t.key)}
                  className="text-sm px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    borderColor: tone === t.key ? 'var(--color-accent)' : 'var(--color-border)',
                    background:  tone === t.key ? 'var(--color-accent)' : '#fff',
                    color:       tone === t.key ? '#fff' : 'var(--color-text-secondary)',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!productId}
            onClick={() => setStep(2)}
            className="btn btn-primary btn-lg w-full gap-2"
          >
            <Sparkles size={16} />
            توليد محتوى الصفحة بالذكاء الاصطناعي
          </button>
        </div>
      )}

      {/* ── STEP 2 — Copy generation ─────────────────────────── */}
      {step === 2 && (
        <div className="card p-8 text-center space-y-4">
          {copyLoading ? (
            <>
              <Loader2 size={36} className="animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
              <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{copyProgress}</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Gemini Pro يكتب نص صفحتك بالدارجة الجزائرية الأصيلة...
              </p>
            </>
          ) : aiContent ? (
            <>
              <Check size={36} className="mx-auto text-green-600" />
              <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>تم توليد المحتوى بنجاح ✨</p>
              <p className="text-sm px-4" style={{ color: 'var(--color-text-muted)' }}>
                &ldquo;{aiContent.hero?.headline}&rdquo;
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => { setAiContent(null); runCopyGeneration() }}
                  className="btn btn-ghost btn-sm gap-1.5"
                >
                  <RefreshCw size={13} />أعد التوليد
                </button>
                <button onClick={() => setStep(3)} className="btn btn-primary btn-sm gap-1.5">
                  متابعة <ArrowLeft size={13} />
                </button>
              </div>
            </>
          ) : (
            <button onClick={runCopyGeneration} className="btn btn-primary gap-2">
              <Sparkles size={16} />ابدأ التوليد
            </button>
          )}
        </div>
      )}

      {/* ── STEP 3 — AI Photo Studio (with scenario) ─────────── */}
      {step === 3 && (
        <div className="card p-5 space-y-4">
          {!sourceImageUrl ? (
            <div className="text-center py-6">
              <ImageIcon size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                هذا المنتج لا يحتوي على صور — يمكنك المتابعة بدون صورة
              </p>
              <button onClick={() => setStep(4)} className="btn btn-primary btn-sm mt-3">متابعة</button>
            </div>
          ) : (
            <>
              {/* Scenario input (shown before loading or when done) */}
              {!photoLoading && (
                <div>
                  <label className="text-sm font-bold flex items-center gap-1.5 mb-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Lightbulb size={14} style={{ color: 'var(--color-accent)' }} />
                    مشهد الصورة
                    <span className="font-normal" style={{ color: 'var(--color-text-muted)' }}>(اختياري — يولّد 4 خيارات مخصصة)</span>
                  </label>

                  {/* Suggestion chips */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {scenarioSuggestions.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setScenario(s.value)}
                        className="text-xs px-2.5 py-1 rounded-full border transition-colors"
                        style={{
                          borderColor: scenario === s.value ? 'var(--color-accent)' : 'var(--color-border)',
                          background:  scenario === s.value ? 'var(--color-accent-soft, #EBF5FF)' : '#fff',
                          color:       scenario === s.value ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>

                  <input
                    className="input"
                    placeholder="أو اكتب مشهدك الخاص بالعربية أو الإنجليزية..."
                    value={scenario}
                    onChange={e => setScenario(e.target.value)}
                  />
                </div>
              )}

              {/* Loading state */}
              {photoLoading ? (
                <div className="text-center py-8 space-y-3">
                  <Loader2 size={36} className="animate-spin mx-auto" style={{ color: 'var(--color-accent)' }} />
                  <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{photoProgress}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                    {scenarioApplied ? 'يولّد 4 خيارات بإضاءات مختلفة...' : 'يولّد: أبيض احترافي، تدرج لوني، مشهد واقعي...'}
                  </p>
                </div>
              ) : photoOptions.length > 0 ? (
                <>
                  <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                    اختر أفضل صورة لصفحتك
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {photoOptions.map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setSelectedImageUrl(opt.url)}
                        className="relative rounded-xl overflow-hidden border-2 transition-colors"
                        style={{
                          borderColor: selectedImageUrl === opt.url ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      >
                        <div className="aspect-square">
                          <img src={opt.url} alt={opt.label_ar} className="w-full h-full object-cover" />
                        </div>
                        <div
                          className="absolute bottom-0 inset-x-0 px-2 py-1 text-[11px] font-bold text-center"
                          style={{ background: 'rgba(0,0,0,.55)', color: '#fff' }}
                        >
                          {opt.label_ar}
                        </div>
                        {selectedImageUrl === opt.url && (
                          <div
                            className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: 'var(--color-accent)' }}
                          >
                            <Check size={12} color="#fff" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => { setPhotoOptions([]); runPhotoEnhancement() }}
                      className="btn btn-ghost btn-sm gap-1.5"
                    >
                      <RefreshCw size={13} />
                      {scenario ? 'أعد بنفس المشهد' : 'أعد التحسين'}
                    </button>
                    {scenario && (
                      <button
                        onClick={() => { setScenario(''); setPhotoOptions([]); runPhotoEnhancement('') }}
                        className="btn btn-ghost btn-sm gap-1.5"
                      >
                        <RefreshCw size={13} />بدون مشهد
                      </button>
                    )}
                    <button onClick={() => setStep(4)} className="btn btn-primary btn-sm gap-1.5">
                      متابعة <ArrowLeft size={13} />
                    </button>
                  </div>
                </>
              ) : (
                // Initial "start" button if auto-trigger hasn't fired yet
                <button
                  onClick={() => runPhotoEnhancement()}
                  className="btn btn-primary w-full gap-2"
                >
                  <ImageIcon size={16} />
                  {scenario ? 'ولّد صور بهذا المشهد' : 'حسّن صورة المنتج بالذكاء الاصطناعي'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ── STEP 4 — Preview + Save ───────────────────────────── */}
      {step === 4 && product && aiContent && (
        <div className="space-y-4">
          <div className="card p-5">
            <p className="text-sm font-bold mb-3" style={{ color: 'var(--color-text-primary)' }}>معاينة سريعة</p>
            <div className="flex gap-3">
              <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0" style={{ background: 'var(--color-bg-soft)' }}>
                {(selectedImageUrl ?? sourceImageUrl) && (
                  <img src={(selectedImageUrl ?? sourceImageUrl) as string} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-black text-sm mb-1" style={{ color: 'var(--color-text-primary)' }}>
                  {aiContent.hero?.headline}
                </p>
                <p className="text-xs line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>
                  {aiContent.hero?.subheadline}
                </p>
                <p className="text-xs font-bold mt-1.5" style={{ color: 'var(--color-accent)' }}>
                  {aiContent.hero?.cta_text}
                </p>
              </div>
            </div>

            {/* Content stats */}
            <div className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[
                { value: aiContent.benefits?.length ?? 0,      label: 'مزايا' },
                { value: aiContent.social_proof?.length ?? 0,  label: 'آراء' },
                { value: aiContent.faq?.length ?? 0,           label: 'أسئلة' },
                { value: aiContent.how_to_order?.length ?? 0,  label: 'خطوات' },
              ].map((stat, i) => (
                <div key={i} className="rounded-lg p-2" style={{ background: 'var(--color-bg-soft)' }}>
                  <p className="font-black text-sm" style={{ color: 'var(--color-text-primary)' }}>{stat.value}</p>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Story/framework note */}
            {aiContent.framework_used && (
              <p className="mt-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                📐 إطار: {aiContent.framework_used}
              </p>
            )}
          </div>

          <button onClick={handleSave} disabled={saving} className="btn btn-primary btn-lg w-full gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            {saving ? 'جاري الحفظ...' : 'حفظ ونشر الصفحة'}
          </button>
        </div>
      )}
    </div>
  )
}
