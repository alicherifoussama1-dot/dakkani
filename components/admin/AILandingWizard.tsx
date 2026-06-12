'use client'
// ============================================================
// AI Landing Page Studio — merchant wizard (5 steps)
//
// All Gemini calls go through API routes — key never leaves server.
//   1. Pick product + description + audience/tone
//   2. AI Copy   → POST /api/ai/landing/generate
//   3. AI Photo  → POST /api/ai/photo/enhance (with scenario)
//   3.5 Infographic → POST /api/ai/infographic/generate
//   4. Preview + Save → INSERT landing_pages row
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Sparkles, ImageIcon, Check, Loader2, RefreshCw, Lightbulb, LayoutTemplate, Grid3X3, ChevronDown, ChevronUp, Upload, Download, ExternalLink, HelpCircle } from 'lucide-react'
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
type Step = 1 | 2 | 3 | 3.5 | 4

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

  // ── Step 3.5 — Infographic studio ──
  const [infographicLoading, setInfographicLoading] = useState(false)
  const [infographicTemplate, setInfographicTemplate] = useState<'story' | 'grid'>('story')
  const [infographicUrl, setInfographicUrl] = useState<string | null>(null)
  const [infographicSkipped, setInfographicSkipped] = useState(false)
  const [brandColor, setBrandColor] = useState('#7C3AED')
  const [accentColor, setAccentColor] = useState('#F59E0B')
  const [panels, setPanels] = useState<any[]>([])
  const [expandedPanel, setExpandedPanel] = useState<number | null>(0)
  const [uploadingCustom, setUploadingCustom] = useState(false)

  const sourceImageUrl = product?.images?.[0]?.url ?? null
  const categoryName   = product?.category?.name_ar ?? ''

  // Collect all unique product images (original + enhanced), prioritizing background-removed options first
  const enhancedImages = photoOptions.filter(o => o.key !== 'original').map(o => o.url)
  const originalImages = [
    selectedImageUrl,
    ...(product?.images?.map(i => i.url) ?? []),
    ...photoOptions.filter(o => o.key === 'original').map(o => o.url),
  ].filter(Boolean)

  const allImages = [
    ...enhancedImages,
    ...originalImages,
  ].filter((v, i, a) => a.indexOf(v) === i) as string[]

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

  // Helper to update a panel's field
  function updatePanel(index: number, key: string, value: any) {
    setPanels(prev => prev.map((p, idx) => idx === index ? { ...p, [key]: value } : p))
  }

  // Initialize panels when aiContent changes or when entering step 3.5
  useEffect(() => {
    if (aiContent && product && panels.length === 0) {
      const enhanced = photoOptions.filter(o => o.key !== 'original').map(o => o.url)
      const original = [
        selectedImageUrl,
        ...(product.images?.map((i: any) => i.url) ?? []),
        ...photoOptions.filter(o => o.key === 'original').map(o => o.url),
      ].filter(Boolean)

      const allImages = [
        ...enhanced,
        ...original,
      ].filter((v, i, a) => a.indexOf(v) === i) as string[]

      const defaultPanels = [
        {
          imageUrl: allImages[0],
          headline: aiContent?.product_story?.hook ?? `كرهتي تطلبي من الانترنت وما يوصلك ما توقعتيه؟`,
          subtext: aiContent?.hero?.subheadline ?? '',
          layout: 'image-full',
        },
        {
          imageUrl: allImages[1] ?? allImages[0],
          headline: aiContent?.hero?.headline ?? `${product.name_ar ?? product.name} — الحل اللي كنتِ تستنّيه`,
          subtext: aiContent?.product_story?.body ?? '',
          layout: 'image-right',
        },
        {
          imageUrl: allImages[2] ?? allImages[0],
          headline: aiContent?.benefits?.[0]?.title ?? 'جودة تستاهل',
          subtext: (aiContent?.benefits ?? []).slice(0, 3).map((b: any) => `${b.icon ?? '✅'} ${b.title}`).join('  '),
          layout: 'image-left',
        },
        {
          imageUrl: allImages[3] ?? allImages[0],
          headline: 'ماتحيريش في المقاس — متوفر كل القياسات',
          subtext: aiContent?.product_details?.specs?.slice(0, 3).join(' • ') ?? '',
          layout: 'image-right',
        },
        {
          imageUrl: allImages[4] ?? allImages[0],
          headline: aiContent?.final_cta?.headline ?? `يصلك كما في الصورة — التوصيل لـ58 ولاية`,
          subtext: `الدفع عند الاستلام • ${product.price.toLocaleString('fr-DZ')} دج`,
          badge: '⭐⭐⭐⭐⭐ + 🚚',
          layout: 'image-left',
        },
      ]
      setPanels(defaultPanels)
    }
  }, [aiContent, product, selectedImageUrl, photoOptions, panels.length])

  // ── Infographic generation ──
  async function runInfographicGeneration() {
    if (!product) return
    setError(null)
    setInfographicLoading(true)
    try {
      const res = await fetch('/api/ai/infographic/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storeId,
          images: allImages.slice(0, 6),
          aiContent,
          template: infographicTemplate,
          brandColor,
          accentColor,
          productName: product.name_ar ?? product.name,
          price: product.price,
          panels: panels.length > 0 ? panels : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'تعذر توليد الإنفوغرافيك')
      setInfographicUrl(data.url)
    } catch (e: any) {
      console.error('Infographic generation error:', e)
      setError(e?.message || String(e) || 'حدث خطأ أثناء توليد الإنفوغرافيك')
    } finally {
      setInfographicLoading(false)
    }
  }

  // ── Custom infographic upload ──
  async function handleCustomUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !product) return
    setUploadingCustom(true)
    setError(null)
    try {
      const supabase = createClient()
      const filename = `infographic/${storeId}/${Date.now()}-custom-${file.name}`
      
      const { error: uploadErr } = await supabase.storage
        .from('dakkani-uploads')
        .upload(filename, file, {
          upsert: true
        })
      if (uploadErr) throw uploadErr
      
      const { data: publicUrlData } = supabase.storage.from('dakkani-uploads').getPublicUrl(filename)
      setInfographicUrl(publicUrlData.publicUrl)
      setInfographicSkipped(false)
    } catch (err: any) {
      console.error('Custom infographic upload error:', err)
      setError('تعذر رفع الملف المخصص: ' + (err.message ?? String(err)))
    } finally {
      setUploadingCustom(false)
    }
  }

  // ── Download SVG helper ──
  async function handleDownloadSvg() {
    if (!infographicUrl) return
    try {
      const res = await fetch(infographicUrl)
      const blob = await res.blob()
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = `${product?.name_ar || product?.name || 'infographic'}.svg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (e) {
      // Fallback: just open in new tab
      window.open(infographicUrl, '_blank')
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

  useEffect(() => {
    if (step === 3.5 && !infographicUrl && !infographicLoading) runInfographicGeneration()
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
      const aiImages = [
        ...(selectedImageUrl ? [{ key: 'selected', label_ar: 'صورة الصفحة', url: selectedImageUrl }] : []),
        ...(infographicUrl && !infographicSkipped ? [{ key: 'infographic', label_ar: 'إنفوغرافيك', url: infographicUrl }] : []),
      ]

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
      <div className="flex items-center gap-1 my-5">
        {[
          { n: 1,   label: 'المنتج' },
          { n: 2,   label: 'النص AI' },
          { n: 3,   label: 'الصور' },
          { n: 3.5, label: 'إنفوغرافيك' },
          { n: 4,   label: 'حفظ' },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-1 flex-1">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
              style={{
                background: step >= s.n ? 'var(--color-accent)' : 'var(--color-bg-soft)',
                color:      step >= s.n ? '#fff' : 'var(--color-text-muted)',
              }}
            >
              {step > s.n ? <Check size={12} /> : (s.n === 3.5 ? '✦' : s.n)}
            </div>
            <span
              className="text-[10px] hidden sm:block truncate"
              style={{ color: step >= s.n ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}
            >
              {s.label}
            </span>
            {i < 4 && (
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
                    <button onClick={() => setStep(3.5)} className="btn btn-primary btn-sm gap-1.5">
                      <Sparkles size={13} /> إنفوغرافيك <ArrowLeft size={13} />
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

      {/* ── STEP 3.5 — Infographic Studio ────────────────────── */}
      {/* ── STEP 3.5 — Infographic Studio ────────────────────── */}
      {step === 3.5 && (
        <div className="space-y-6">
          {/* Main Layout Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Right column: Designer / Editor (7 cols on lg) */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Panels Accordion Card */}
              <div className="card p-5 space-y-4">
                <div>
                  <p className="text-sm font-black flex items-center gap-2" style={{ color: 'var(--color-text-primary)' }}>
                    <Sparkles size={16} style={{ color: 'var(--color-accent)' }} />
                    محرر شرائح الإنفوغرافيك الـ 5
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                    قم بتعديل النصوص، اختيار اتجاه التصميم، وتخصيص صورة كل شريحة بالكامل
                  </p>
                </div>

                <div className="space-y-3">
                  {panels.map((p, idx) => {
                    const isExpanded = expandedPanel === idx
                    const panelLabels = [
                      'الشريحة 1: الخطاف (جذب الانتباه)',
                      'الشريحة 2: تقديم الحل وميزات المنتج',
                      'الشريحة 3: الفوائد وتجربة الاستخدام',
                      'الشريحة 4: التفاصيل والمقاسات والمواصفات',
                      'الشريحة 5: الضمان وبناء الثقة',
                    ]
                    
                    return (
                      <div 
                        key={idx} 
                        className="rounded-xl border transition-all"
                        style={{ 
                          borderColor: isExpanded ? 'var(--color-accent)' : 'var(--color-border)',
                          background: isExpanded ? 'var(--color-bg-soft, #FAFAFA)' : '#fff'
                        }}
                      >
                        {/* Header */}
                        <button
                          type="button"
                          onClick={() => setExpandedPanel(isExpanded ? null : idx)}
                          className="w-full flex items-center justify-between p-4 text-right font-bold text-xs"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          <span className="flex items-center gap-2">
                            <span 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-white"
                              style={{ background: isExpanded ? 'var(--color-accent)' : 'var(--color-text-muted)' }}
                            >
                              {idx + 1}
                            </span>
                            {panelLabels[idx]}
                          </span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>

                        {/* Content */}
                        {isExpanded && (
                          <div className="p-4 pt-0 border-t border-dashed space-y-4 mt-2">
                            {/* Headline */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold block" style={{ color: 'var(--color-text-primary)' }}>
                                العنوان الرئيسي (Darija)
                              </label>
                              <input
                                type="text"
                                value={p.headline || ''}
                                onChange={(e) => updatePanel(idx, 'headline', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border text-xs"
                                style={{ borderColor: 'var(--color-border)' }}
                                placeholder="العنوان الرئيسي للشريحة..."
                              />
                            </div>

                            {/* Subtext */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold block" style={{ color: 'var(--color-text-primary)' }}>
                                النص التوضيحي الفرعي
                              </label>
                              <textarea
                                value={p.subtext || ''}
                                onChange={(e) => updatePanel(idx, 'subtext', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border text-xs"
                                style={{ borderColor: 'var(--color-border)' }}
                                rows={2}
                                placeholder="تفاصيل إضافية لشرح الميزة أو المشكلة..."
                              />
                            </div>

                            {/* Layout Selector */}
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold block" style={{ color: 'var(--color-text-primary)' }}>
                                اتجاه تصميم الشريحة
                              </label>
                              <select
                                value={p.layout || 'image-right'}
                                onChange={(e) => updatePanel(idx, 'layout', e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border text-xs bg-white"
                                style={{ borderColor: 'var(--color-border)' }}
                              >
                                <option value="image-full">صورة كاملة مع نص متراكب بالأسفل</option>
                                <option value="image-right">صورة على اليمين ونصوص على اليسار</option>
                                <option value="image-left">صورة على اليسار ونصوص على اليمين</option>
                                <option value="text-only">نص فقط مع خلفية المظهر (بدون صورة)</option>
                              </select>
                            </div>

                            {/* Optional Badge */}
                            {(idx === 0 || idx === 4) && (
                              <div className="space-y-1">
                                <label className="text-[11px] font-bold block" style={{ color: 'var(--color-text-primary)' }}>
                                  الشارة الملفتة (Badge)
                                </label>
                                <input
                                  type="text"
                                  value={p.badge || ''}
                                  onChange={(e) => updatePanel(idx, 'badge', e.target.value)}
                                  className="w-full px-3 py-2 rounded-lg border text-xs"
                                  style={{ borderColor: 'var(--color-border)' }}
                                  placeholder="مثال: ⭐⭐⭐⭐⭐ + 🚚"
                                />
                              </div>
                            )}

                            {/* Image selector */}
                            {p.layout !== 'text-only' && (
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold block" style={{ color: 'var(--color-text-primary)' }}>
                                  اختر صورة هذه الشريحة
                                </label>
                                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                                  {allImages.map((imgUrl, i) => {
                                    const isSelected = p.imageUrl === imgUrl
                                    return (
                                      <button
                                        key={i}
                                        type="button"
                                        onClick={() => updatePanel(idx, 'imageUrl', imgUrl)}
                                        className="w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 bg-white relative transition-all"
                                        style={{
                                          borderColor: isSelected ? 'var(--color-accent)' : 'var(--color-border)',
                                          opacity: isSelected ? 1 : 0.6,
                                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                                        }}
                                      >
                                        <img src={imgUrl} alt="" className="w-full h-full object-cover" />
                                        {isSelected && (
                                          <div 
                                            className="absolute top-1 left-1 w-3 h-3 rounded-full flex items-center justify-center text-[6px] text-white"
                                            style={{ background: 'var(--color-accent)' }}
                                          >
                                            ✓
                                          </div>
                                        )}
                                      </button>
                                    )
                                  })}
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Free Tools Directory Card */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} style={{ color: 'var(--color-accent)' }} />
                  <p className="text-sm font-black" style={{ color: 'var(--color-text-primary)' }}>
                    تطبيقات مجانية لمساعدتك في تصميم صور احترافية
                  </p>
                </div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  يمكنك استخدام هذه الأدوات المجانية بالكامل لتصميم صور جذابة، إزالة الخلفيات، أو بناء ملصق تسويقي مخصص ورفعه مباشرة هنا:
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                  {([
                    {
                      name: 'Canva',
                      desc: 'موقع وتطبيق مجاني يحتوي على آلاف القوالب الاحترافية الجاهزة للإنفوغرافيك والتسويق.',
                      url: 'https://www.canva.com',
                      badge: 'تصميم قوالب',
                    },
                    {
                      name: 'Remove.bg',
                      desc: 'لحذف خلفية صورة منتجك بضغطة زر واحدة لتصبح شفافة وجاهزة للدمج.',
                      url: 'https://www.remove.bg',
                      badge: 'حذف الخلفية',
                    },
                    {
                      name: 'Photopea',
                      desc: 'موقع مجاني بالكامل بديل للفوتوشوب يعمل مباشرة من المتصفح دون الحاجة لتثبيت أي شيء.',
                      url: 'https://www.photopea.com',
                      badge: 'تعديل احترافي',
                    },
                    {
                      name: 'Adobe Express',
                      desc: 'أداة مجانية من شركة أدوبي لتصميم المنشورات والملصقات الإعلانية المميزة.',
                      url: 'https://www.adobe.com/express',
                      badge: 'بانرات سريعة',
                    },
                    {
                      name: 'Pixlr',
                      desc: 'محرر صور سهل وسريع يوفر أدوات تحسين سريعة وفلاتر مجانية لصور المنتجات.',
                      url: 'https://pixlr.com',
                      badge: 'محرر سريع',
                    },
                  ] as const).map((t, idx) => (
                    <a
                      key={idx}
                      href={t.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 rounded-xl border border-gray-100 hover:border-blue-400 bg-white hover:bg-slate-50 transition flex flex-col justify-between h-32 text-right group"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-800 flex items-center gap-1 group-hover:text-blue-500 transition-colors">
                            {t.name}
                            <ExternalLink size={12} />
                          </span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-500">
                            {t.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                          {t.desc}
                        </p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>

            </div>

            {/* Left column: Preview & Settings (5 cols on lg) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Design Settings Card */}
              <div className="card p-5 space-y-4">
                <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>خيارات وقالب الإنفوغرافيك</p>
                
                {/* Template selector */}
                <div>
                  <p className="text-[11px] font-bold mb-2 text-slate-500">شكل الإنفوغرافيك</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: 'story', label: 'قصصي طولي', desc: '5 بانلات متسلسلة', icon: <LayoutTemplate size={18} /> },
                      { key: 'grid',  label: 'شبكة صور',  desc: 'صورتين في صف', icon: <Grid3X3 size={18} /> },
                    ] as const).map(t => (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => setInfographicTemplate(t.key)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all"
                        style={{
                          borderColor: infographicTemplate === t.key ? 'var(--color-accent)' : 'var(--color-border)',
                          background:  infographicTemplate === t.key ? 'var(--color-accent-soft, #EBF5FF)' : '#fff',
                        }}
                      >
                        <span style={{ color: infographicTemplate === t.key ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                          {t.icon}
                        </span>
                        <span className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>{t.label}</span>
                        <span className="text-[9px]" style={{ color: 'var(--color-text-muted)' }}>{t.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color pickers */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text-primary)' }}>
                      اللون الرئيسي للمتجر
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={e => setBrandColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                      <span className="text-xs font-mono text-slate-500">{brandColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold block mb-1" style={{ color: 'var(--color-text-primary)' }}>
                      لون الـ CTA والأزرار
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={e => setAccentColor(e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border"
                        style={{ borderColor: 'var(--color-border)' }}
                      />
                      <span className="text-xs font-mono text-slate-500">{accentColor}</span>
                    </div>
                  </div>
                </div>

                {/* Trigger button */}
                <button
                  type="button"
                  onClick={runInfographicGeneration}
                  disabled={infographicLoading}
                  className="btn btn-primary btn-sm w-full gap-1.5 mt-2"
                >
                  {infographicLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  {infographicLoading ? 'جاري التوليد والتحديث...' : 'تحديث وتوليد الإنفوغرافيك'}
                </button>
              </div>

              {/* Live Preview Card */}
              <div className="card p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold" style={{ color: 'var(--color-text-primary)' }}>معاينة الملصق التسويقي</p>
                  
                  {infographicUrl && !infographicLoading && (
                    <button
                      type="button"
                      onClick={handleDownloadSvg}
                      className="text-blue-500 hover:text-blue-700 text-xs flex items-center gap-1 font-bold"
                    >
                      <Download size={13} />
                      تحميل SVG
                    </button>
                  )}
                </div>

                {/* Result preview */}
                {infographicUrl && !infographicLoading && (
                  <div className="space-y-3">
                    <a href={infographicUrl} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden border rounded-xl shadow-inner bg-slate-50">
                      <img
                        src={infographicUrl}
                        alt="إنفوغرافيك"
                        className="w-full rounded-xl"
                        style={{ maxHeight: '420px', objectFit: 'contain' }}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                        <Sparkles size={14} /> اضغط للتكبير في نافذة جديدة
                      </div>
                    </a>
                  </div>
                )}

                {/* Loading state */}
                {infographicLoading && (
                  <div className="flex flex-col items-center gap-3 py-16 border rounded-xl border-dashed">
                    <Loader2 size={32} className="animate-spin text-blue-500" />
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      🎨 جاري بناء وتنسيق الإنفوغرافيك...
                    </p>
                    <p className="text-xs text-center text-slate-500 px-4">
                      نقوم بجلب الصور وتحويلها للعمل دون إنترنت، وترتيب الخطوط العربية والتصميم
                    </p>
                  </div>
                )}

                {/* No infographic generated yet */}
                {!infographicUrl && !infographicLoading && (
                  <div className="flex flex-col items-center gap-2 py-16 border rounded-xl border-dashed bg-slate-50 text-slate-500">
                    <ImageIcon size={32} className="opacity-40" />
                    <p className="text-xs font-bold">لم يتم توليد أي إنفوغرافيك بعد</p>
                    <p className="text-[10px] text-center px-4">اضغط على زر التحديث في الأعلى لتوليد الإنفوغرافيك</p>
                  </div>
                )}

                {/* Custom File Upload option */}
                <div className="border-t pt-4 space-y-2">
                  <p className="text-[11px] font-bold text-slate-700">أو قم برفع تصميمك الخاص الجاهز (Canva / Photopea)</p>
                  <div className="flex items-center gap-2">
                    <label 
                      className="btn btn-ghost btn-sm border-2 border-dashed flex-1 flex items-center justify-center gap-1.5 cursor-pointer hover:bg-slate-50"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      {uploadingCustom ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                      <span className="text-xs font-bold">
                        {uploadingCustom ? 'جاري الرفع...' : 'اختر ملف صورة أو SVG'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleCustomUpload} 
                        disabled={uploadingCustom || infographicLoading}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  <p className="text-[9px] text-slate-500">
                    يدعم جميع صيغ الصور (PNG, JPG, WebP, SVG). سيتم دمجها كملصق تسويقي كامل في صفحتك.
                  </p>
                </div>
              </div>

              {/* Step Navigation Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setInfographicSkipped(true); setStep(4) }}
                  className="btn btn-ghost btn-sm flex-1"
                  disabled={infographicLoading || uploadingCustom}
                >
                  تخطي هذه الخطوة
                </button>
                {infographicUrl && (
                  <button
                    type="button"
                    onClick={() => { setInfographicSkipped(false); setStep(4) }}
                    className="btn btn-primary btn-sm flex-1 gap-1.5"
                    disabled={infographicLoading || uploadingCustom}
                  >
                    <Check size={13} /> استخدام هذا التصميم والانتقال للمعاينة <ArrowLeft size={13} />
                  </button>
                )}
              </div>

            </div>

          </div>
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
