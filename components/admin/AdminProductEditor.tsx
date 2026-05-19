'use client'
import { useState, useCallback, memo } from 'react'
import {
  useForm, useFieldArray, useWatch, type Control,
  type UseFormRegister, type FieldErrors, type UseFormSetValue, type UseFormGetValues,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import { Upload, X, Plus, Trash2, Loader2, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'

// ── Schema ────────────────────────────────────────────────
const variantGroupSchema = z.object({
  name:    z.string().min(1),
  options: z.array(z.string().min(1)).min(1),
})

const schema = z.object({
  name:             z.string().min(1, 'اسم المنتج مطلوب'),
  name_ar:          z.string().optional(),
  slug:             z.string().min(1, 'الرابط مطلوب'),
  description:      z.string().optional(),
  description_ar:   z.string().optional(),
  sku:              z.string().optional(),
  barcode:          z.string().optional(),
  price:            z.number({ invalid_type_error: 'أدخل السعر' }).positive(),
  compare_price:    z.number().positive().optional(),
  cost_price:       z.number().positive().optional(),
  weight:           z.number().positive().optional(),
  category_id:      z.string().optional(),
  tags:             z.string().optional(),
  is_active:        z.boolean().default(true),
  is_featured:      z.boolean().default(false),
  use_store_pixel:  z.boolean().default(true),
  meta_pixel_id:    z.string().optional(),
  tiktok_pixel_id:  z.string().optional(),
  meta_title:       z.string().optional(),
  meta_description: z.string().optional(),
  variant_groups:   z.array(variantGroupSchema).default([]),
  initial_stock:    z.number().int().min(0).default(0),
  warehouse_id:     z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface ProductImage { url: string; path: string }
interface StockRow     { warehouse_id: string; quantity: number; reserved: number; variant_key: string }
interface Props {
  storeId:     string
  storePixels: { meta?: string | null; tiktok?: string | null }
  categories:  { id: string; name: string; name_ar?: string | null }[]
  warehouses:  { id: string; name: string }[]
  product?:    any
  stockData?:  StockRow[]
}
type Tab = 'basic' | 'images' | 'variants' | 'pixels' | 'seo' | 'stock'

// ═══════════════════════════════════════════════════════════
// STATIC CONSTANTS — outside component, never recreated
// ═══════════════════════════════════════════════════════════
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'basic',    label: 'أساسي',     icon: '📝' },
  { id: 'images',   label: 'الصور',     icon: '🖼️' },
  { id: 'variants', label: 'المتغيرات', icon: '🎨' },
  { id: 'pixels',   label: 'البكسل',    icon: '📡' },
  { id: 'seo',      label: 'SEO',       icon: '🔍' },
  { id: 'stock',    label: 'المخزون',   icon: '📦' },
]
const IC = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-dakkani-500 focus:border-transparent outline-none bg-white text-gray-900'
const LC = 'block text-sm font-semibold text-gray-700 mb-1.5'
const CC = 'bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4'

// ═══════════════════════════════════════════════════════════
// PURE FIELD COMPONENTS — defined outside, never re-created
// ═══════════════════════════════════════════════════════════
const Field = memo(function Field({
  label, name, type = 'text', placeholder = '', required = false, hint = '', register, errors,
}: { label: string; name: string; type?: string; placeholder?: string; required?: boolean; hint?: string; register: any; errors: any }) {
  return (
    <div>
      <label className={LC}>{label}{required && <span className="text-red-500 mr-1">*</span>}</label>
      <input
        {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
        type={type}
        placeholder={placeholder}
        className={IC}
        autoComplete="off"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {errors[name] && <p className="text-red-500 text-xs mt-1">⚠️ {errors[name]?.message}</p>}
    </div>
  )
})

const TextArea = memo(function TextArea({
  label, name, rows = 3, placeholder = '', register,
}: { label: string; name: string; rows?: number; placeholder?: string; register: any }) {
  return (
    <div>
      <label className={LC}>{label}</label>
      <textarea
        {...register(name)}
        rows={rows}
        placeholder={placeholder}
        className={`${IC} resize-none`}
      />
    </div>
  )
})

const Toggle = memo(function Toggle({
  label, name, desc, register,
}: { label: string; name: string; desc?: string; register: any }) {
  return (
    <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <div className="relative">
        <input {...register(name)} type="checkbox" className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-dakkani-500 transition-colors" />
        <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-[-20px] transition-transform" />
      </div>
    </label>
  )
})

// ── Slug preview — isolated useWatch so only THIS re-renders ──
const SlugPreview = memo(function SlugPreview({
  control, setValue,
}: { control: Control<FormData>; setValue: UseFormSetValue<FormData> }) {
  const nameAr = useWatch({ control, name: 'name_ar' })
  const slug   = useWatch({ control, name: 'slug' })
  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
      <span className="font-mono">/{slug || '...'}</span>
      {nameAr && (
        <button
          type="button"
          onClick={() => setValue('slug', slugify(nameAr))}
          className="text-dakkani-500 hover:underline"
        >
          توليد تلقائي
        </button>
      )}
    </div>
  )
})

// ── Pixel section — isolated so pixel toggle doesn't re-render whole form ──
const PixelSection = memo(function PixelSection({
  control, register, storePixels,
}: { control: Control<FormData>; register: UseFormRegister<FormData>; storePixels: { meta?: string | null; tiktok?: string | null } }) {
  const useStore = useWatch({ control, name: 'use_store_pixel' })
  return (
    <div className={CC}>
      <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">البكسل والتتبع 📡</h3>
      <Toggle
        label="استخدام بكسل المتجر الافتراضي"
        name="use_store_pixel"
        desc={`Meta: ${storePixels.meta ?? 'غير مضبوط'} | TikTok: ${storePixels.tiktok ?? 'غير مضبوط'}`}
        register={register}
      />
      {!useStore && (
        <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-orange-700">بكسل خاص بهذا المنتج فقط</p>
          <div>
            <label className={LC}>Meta Pixel ID</label>
            <input {...register('meta_pixel_id')} placeholder="123456789012345" dir="ltr" className={IC} />
          </div>
          <div>
            <label className={LC}>TikTok Pixel ID</label>
            <input {...register('tiktok_pixel_id')} placeholder="CXXXXXXXX" dir="ltr" className={IC} />
          </div>
        </div>
      )}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700 space-y-1">
        <p className="font-bold">الأحداث المتتبعة تلقائياً:</p>
        <p>• ViewContent • AddToCart • InitiateCheckout • Purchase + CAPI server-side</p>
      </div>
    </div>
  )
})

// ── SEO preview — isolated so meta desc typing doesn't re-render form ──
const SeoPreview = memo(function SeoPreview({
  control, register,
}: { control: Control<FormData>; register: UseFormRegister<FormData> }) {
  const title = useWatch({ control, name: 'meta_title' })
  const desc  = useWatch({ control, name: 'meta_description' })
  return (
    <div className={CC}>
      <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">تحسين محركات البحث 🔍</h3>
      <div>
        <label className={LC}>عنوان SEO</label>
        <input {...register('meta_title')} placeholder="اسم المنتج | اسم المتجر" className={IC} />
      </div>
      <div>
        <label className={LC}>وصف SEO (160 حرف)</label>
        <textarea
          {...register('meta_description')}
          rows={3}
          maxLength={160}
          placeholder="وصف قصير يظهر في جوجل..."
          className={`${IC} resize-none`}
        />
        <p className="text-xs text-gray-400 mt-1">{(desc ?? '').length}/160 حرف</p>
      </div>
      {/* Google preview */}
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <p className="text-xs text-gray-400 mb-1.5">معاينة في Google</p>
        <p className="text-blue-700 text-sm font-medium truncate">{title || 'عنوان المنتج'}</p>
        <p className="text-green-700 text-xs">dakkani.vercel.app/store/.../</p>
        <p className="text-gray-600 text-xs mt-0.5 line-clamp-2">{desc || 'الوصف يظهر هنا في نتائج البحث...'}</p>
      </div>
    </div>
  )
})

// ── Image gallery — memoized, only re-renders when images[] changes ──
const ImageGallery = memo(function ImageGallery({
  images, uploading, removingBg, onFileChange, onRemove, onMove, onRemoveBg,
}: {
  images: ProductImage[]
  uploading: boolean
  removingBg: string | null
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemove: (idx: number) => void
  onMove: (idx: number, dir: -1 | 1) => void
  onRemoveBg: (img: ProductImage, idx: number) => void
}) {
  return (
    <div className={CC}>
      <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">صور المنتج 🖼️</h3>
      <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition ${uploading ? 'border-dakkani-500 bg-dakkani-50' : 'border-gray-300 hover:border-gray-400'}`}>
        <input type="file" multiple accept="image/*" onChange={onFileChange} className="sr-only" disabled={uploading} />
        {uploading
          ? <><Loader2 className="w-8 h-8 text-dakkani-500 animate-spin mb-2" /><p className="text-sm text-gray-500">جارٍ الرفع...</p></>
          : <><Upload className="w-8 h-8 text-gray-400 mb-2" /><p className="text-sm text-gray-500">اسحب الصور هنا أو اضغط للاختيار</p><p className="text-xs text-gray-400 mt-1">JPEG, PNG, WebP — max 5MB</p></>
        }
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mt-2">
          {images.map((img, idx) => (
            <div key={`${img.url}-${idx}`} className="relative group aspect-square bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute top-1.5 right-1.5 bg-dakkani-500 text-white text-xs px-1.5 py-0.5 rounded font-bold">رئيسية</span>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                {idx > 0 && (
                  <button type="button" onClick={() => onMove(idx, -1)} className="p-1 bg-white/20 hover:bg-white/40 rounded-lg text-white">
                    <ChevronDown className="w-3 h-3" />
                  </button>
                )}
                {idx < images.length - 1 && (
                  <button type="button" onClick={() => onMove(idx, 1)} className="p-1 bg-white/20 hover:bg-white/40 rounded-lg text-white">
                    <ChevronUp className="w-3 h-3" />
                  </button>
                )}
                <button type="button" onClick={() => onRemoveBg(img, idx)} title="إزالة الخلفية" disabled={removingBg === img.url}
                  className="p-1 bg-purple-500/60 hover:bg-purple-500/80 rounded-lg text-white text-xs">
                  {removingBg === img.url ? <Loader2 className="w-3 h-3 animate-spin" /> : '✂️'}
                </button>
                <button type="button" onClick={() => onRemove(idx)} className="p-1 bg-red-500/60 hover:bg-red-500/80 rounded-lg text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
})

// ── Variants section ──────────────────────────────────────
const VariantsSection = memo(function VariantsSection({
  control, register, setValue,
}: { control: Control<FormData>; register: UseFormRegister<FormData>; setValue: UseFormSetValue<FormData> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'variant_groups' })
  const variantGroups = useWatch({ control, name: 'variant_groups' }) ?? []

  return (
    <div className={CC}>
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <h3 className="font-bold text-gray-900">المتغيرات 🎨</h3>
        <button type="button" onClick={() => append({ name: '', options: [''] })}
          className="flex items-center gap-1.5 text-xs bg-dakkani-50 text-dakkani-600 border border-dakkani-100 px-3 py-1.5 rounded-lg hover:bg-dakkani-100 transition">
          <Plus className="w-3.5 h-3.5" />إضافة متغير
        </button>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-6 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
          <p className="text-sm">لا توجد متغيرات — أضف اللون أو المقاس</p>
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, gIdx) => (
          <div key={field.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <input
                {...register(`variant_groups.${gIdx}.name`)}
                placeholder="اسم المتغير (مثال: اللون)"
                className="bg-transparent border-b border-gray-400 pb-1 text-sm font-semibold text-gray-800 focus:outline-none focus:border-dakkani-500 w-44"
              />
              <button type="button" onClick={() => remove(gIdx)} className="text-red-400 hover:text-red-600">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {(variantGroups[gIdx]?.options ?? ['']).map((_, oIdx) => (
                <div key={`${field.id}-opt-${oIdx}`} className="flex items-center gap-2">
                  <input
                    {...register(`variant_groups.${gIdx}.options.${oIdx}`)}
                    placeholder={`الخيار ${oIdx + 1}`}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-dakkani-500 outline-none"
                  />
                  <button type="button"
                    onClick={() => {
                      const cur = [...(variantGroups[gIdx]?.options ?? [])]
                      cur.splice(oIdx, 1)
                      setValue(`variant_groups.${gIdx}.options`, cur)
                    }}
                    className="text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button"
              onClick={() => setValue(`variant_groups.${gIdx}.options`, [...(variantGroups[gIdx]?.options ?? []), ''])}
              className="text-xs text-dakkani-500 hover:text-dakkani-700 flex items-center gap-1">
              <Plus className="w-3 h-3" />إضافة خيار
            </button>
          </div>
        ))}
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
export default function AdminProductEditor({
  storeId, storePixels, categories, warehouses, product, stockData = [],
}: Props) {
  const router = useRouter()
  const isEdit = !!product

  // Non-form state only (UI state, not field values)
  const [tab,        setTab]        = useState<Tab>('basic')
  const [images,     setImages]     = useState<ProductImage[]>(
    Array.isArray(product?.images)
      ? product.images.map((img: any) => ({ url: img.url ?? img, path: '' }))
      : []
  )
  const [uploading,  setUploading]  = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [removingBg, setRemovingBg] = useState<string | null>(null)

  // useForm with NO watch() in main component
  const {
    register, handleSubmit, control, getValues, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:             product?.name            ?? '',
      name_ar:          product?.name_ar         ?? '',
      slug:             product?.slug            ?? '',
      description:      product?.description     ?? '',
      description_ar:   product?.description_ar  ?? '',
      sku:              product?.sku             ?? '',
      barcode:          product?.barcode         ?? '',
      price:            product?.price,
      compare_price:    product?.compare_price,
      cost_price:       product?.cost_price,
      weight:           product?.weight,
      category_id:      product?.category_id     ?? '',
      tags:             Array.isArray(product?.tags) ? product.tags.join(', ') : '',
      is_active:        product?.is_active       ?? true,
      is_featured:      product?.is_featured     ?? false,
      use_store_pixel:  product?.use_store_pixel ?? true,
      meta_pixel_id:    product?.meta_pixel_id   ?? '',
      tiktok_pixel_id:  product?.tiktok_pixel_id ?? '',
      meta_title:       product?.meta_title      ?? '',
      meta_description: product?.meta_description ?? '',
      variant_groups:   Array.isArray(product?.variants) ? product.variants : [],
      initial_stock:    0,
      warehouse_id:     warehouses[0]?.id ?? '',
    },
  })

  // ── Stable callbacks (useCallback prevents recreation) ────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setError('')
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) { setError(`الصورة ${file.name} أكبر من 5MB`); continue }
      const form = new FormData()
      form.append('file', file)
      form.append('folder', `products/${storeId}`)
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (res.ok) {
        const data = await res.json()
        setImages(prev => [...prev, { url: data.url, path: data.path }])
      } else {
        setError('فشل رفع الصورة — تأكد من إعداد Supabase Storage')
      }
    }
    setUploading(false)
    e.target.value = ''
  }, [storeId])

  const handleRemoveImage = useCallback((idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx))
  }, [])

  const handleMoveImage = useCallback((idx: number, dir: -1 | 1) => {
    setImages(prev => {
      const arr = [...prev]
      const tgt = idx + dir
      if (tgt < 0 || tgt >= arr.length) return prev
      ;[arr[idx], arr[tgt]] = [arr[tgt], arr[idx]]
      return arr
    })
  }, [])

  const handleRemoveBg = useCallback(async (img: ProductImage, idx: number) => {
    setRemovingBg(img.url)
    const res = await fetch('/api/ai/image/remove-bg', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageUrl: img.url }),
    })
    if (res.ok) {
      const data = await res.json()
      if (!data.skipped) {
        setImages(prev => prev.map((p, i) => i === idx ? { ...p, url: data.url } : p))
      }
    }
    setRemovingBg(null)
  }, [])

  // Use getValues() instead of watch() — reads once, no subscription
  const generateDescription = useCallback(async () => {
    const name = getValues('name_ar') || getValues('name')
    if (!name) { setError('أدخل اسم المنتج أولاً'); return }
    setAiLoading(true)
    setError('')
    const res = await fetch('/api/ai/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        category: categories.find(c => c.id === getValues('category_id'))?.name_ar ?? '',
        features: [], keywords: [],
      }),
    })
    if (res.ok) {
      const data = await res.json()
      if (data.title_ar)        setValue('name_ar',          data.title_ar)
      if (data.title_fr)        setValue('name',             data.title_fr)
      if (data.description_ar)  setValue('description_ar',   data.description_ar)
      if (data.description_fr)  setValue('description',      data.description_fr)
      if (data.seo_title)       setValue('meta_title',       data.seo_title)
      if (data.seo_description) setValue('meta_description', data.seo_description)
    } else {
      setError('تأكد من إضافة GEMINI_API_KEY في Vercel / .env.local')
    }
    setAiLoading(false)
  }, [categories, getValues, setValue])

  const onSubmit = async (data: FormData) => {
    setError('')
    const supabase = createClient()
    const { variant_groups, tags, initial_stock, warehouse_id, ...rest } = data
    const payload = {
      ...rest,
      store_id:    storeId,
      images:      images.map((img, i) => ({ url: img.url, position: i })),
      variants:    variant_groups,
      tags:        tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      category_id: data.category_id || null,
    }

    let productId = product?.id
    if (isEdit) {
      const { error: err } = await supabase.from('products').update(payload).eq('id', productId)
      if (err) { setError(err.message); return }
    } else {
      const { data: np, error: err } = await supabase.from('products').insert(payload).select('id').single()
      if (err || !np) { setError(err?.message ?? 'خطأ في الحفظ'); return }
      productId = np.id
    }

    if (productId && initial_stock > 0 && warehouse_id) {
      await supabase.from('warehouse_stock').upsert({
        store_id: storeId, product_id: productId,
        warehouse_id, variant_key: 'default',
        quantity: initial_stock, reserved: 0,
      }, { onConflict: 'warehouse_id,product_id,variant_key' })
    }

    setSaved(true)
    setTimeout(() => router.push('/products'), 800)
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} dir="rtl" className="space-y-4 max-w-4xl pb-24">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === t.id ? 'bg-white shadow-sm text-dakkani-600 border border-dakkani-100' : 'text-gray-500 hover:text-gray-800'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── BASIC TAB ── */}
      {tab === 'basic' && (
        <div className="space-y-4">
          <div className={CC}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-gray-900">معلومات المنتج 📝</h3>
              <button type="button" onClick={generateDescription} disabled={aiLoading}
                className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition disabled:opacity-50">
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                ✨ توليد بالذكاء الاصطناعي
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="الاسم بالعربية *" name="name_ar" placeholder="مثال: قميص قطني" register={register} errors={errors} required />
              <Field label="Nom en français / English" name="name" placeholder="Cotton Shirt" register={register} errors={errors} required />
            </div>

            <div>
              <label className={LC}>الرابط (Slug) *</label>
              <input {...register('slug')} placeholder="cotton-shirt" className={IC} dir="ltr" />
              <SlugPreview control={control} setValue={setValue} />
              {errors.slug && <p className="text-red-500 text-xs mt-1">⚠️ {errors.slug.message}</p>}
            </div>

            <TextArea label="الوصف بالعربية" name="description_ar" rows={3} placeholder="اكتب وصفاً مقنعاً للمنتج..." register={register} />
            <TextArea label="Description en français" name="description" rows={3} placeholder="Description persuasive du produit..." register={register} />

            <div className="grid grid-cols-3 gap-4">
              <Field label="سعر البيع (دج) *" name="price" type="number" placeholder="2500" required register={register} errors={errors} />
              <Field label="السعر المقارن (دج)" name="compare_price" type="number" placeholder="3200" register={register} errors={errors} />
              <Field label="سعر التكلفة (دج)" name="cost_price" type="number" placeholder="1100" register={register} errors={errors} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={LC}>الفئة</label>
                <select {...register('category_id')} className={IC}>
                  <option value="">بدون فئة</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>)}
                </select>
              </div>
              <Field label="SKU" name="sku" placeholder="SKU-001" register={register} errors={errors} />
              <Field label="الوزن (كغ)" name="weight" type="number" placeholder="0.5" register={register} errors={errors} />
            </div>

            <Field label="الوسوم (مفصولة بفاصلة)" name="tags" placeholder="صيف, قطن, رجالي" register={register} errors={errors} />

            <div className="border-t border-gray-100 pt-3 space-y-1">
              <Toggle label="منتج نشط ومرئي" name="is_active" desc="يظهر في المتجر للعملاء" register={register} />
              <Toggle label="منتج مميز" name="is_featured" desc="يظهر في أعلى الصفحة الرئيسية" register={register} />
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGES TAB ── */}
      {tab === 'images' && (
        <ImageGallery
          images={images}
          uploading={uploading}
          removingBg={removingBg}
          onFileChange={handleFileChange}
          onRemove={handleRemoveImage}
          onMove={handleMoveImage}
          onRemoveBg={handleRemoveBg}
        />
      )}

      {/* ── VARIANTS TAB ── */}
      {tab === 'variants' && (
        <VariantsSection control={control} register={register} setValue={setValue} />
      )}

      {/* ── PIXELS TAB ── */}
      {tab === 'pixels' && (
        <PixelSection control={control} register={register} storePixels={storePixels} />
      )}

      {/* ── SEO TAB ── */}
      {tab === 'seo' && (
        <SeoPreview control={control} register={register} />
      )}

      {/* ── STOCK TAB ── */}
      {tab === 'stock' && (
        <div className={CC}>
          <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-2">المخزون 📦</h3>

          {isEdit && stockData.length > 0 && (
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['المستودع', 'المتغير', 'الكمية', 'محجوز', 'متاح'].map(h => (
                      <th key={h} className="px-3 py-2 text-right text-xs text-gray-500 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stockData.map((row, i) => (
                    <tr key={i}>
                      <td className="px-3 py-2 text-xs text-gray-600">{warehouses.find(w => w.id === row.warehouse_id)?.name ?? 'مستودع'}</td>
                      <td className="px-3 py-2 text-xs font-mono text-gray-500">{row.variant_key === 'default' ? '—' : row.variant_key}</td>
                      <td className="px-3 py-2 font-semibold">{row.quantity}</td>
                      <td className="px-3 py-2 text-yellow-600">{row.reserved}</td>
                      <td className="px-3 py-2 font-bold text-green-600">{row.quantity - row.reserved}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={LC}>المستودع</label>
              <select {...register('warehouse_id')} className={IC}>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <Field label="الكمية الابتدائية" name="initial_stock" type="number" placeholder="100" register={register} errors={errors} />
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm flex items-start gap-2">
          ⚠️ {error}
        </div>
      )}

      {/* Save bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center gap-3 z-20 shadow-lg">
        <button type="submit" disabled={isSubmitting}
          className="flex items-center gap-2 bg-dakkani-500 hover:bg-dakkani-600 disabled:opacity-50 text-white font-black px-8 py-3 rounded-xl transition shadow-sm">
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'جارٍ الحفظ...' : isEdit ? '💾 حفظ التعديلات' : '✅ إضافة المنتج'}
        </button>
        {saved && <span className="text-green-600 font-bold text-sm flex items-center gap-1">✓ تم الحفظ!</span>}
        <button type="button" onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 text-sm mr-auto">
          إلغاء
        </button>
      </div>
    </form>
  )
}
