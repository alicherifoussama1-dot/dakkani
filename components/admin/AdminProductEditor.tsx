'use client'
import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import {
  Upload, X, Plus, Trash2, Loader2, Sparkles,
  ChevronDown, ChevronUp, Facebook, Video,
} from 'lucide-react'

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
  price:            z.number({ invalid_type_error: 'أدخل السعر' }).positive('السعر يجب أن يكون أكبر من 0'),
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

// ── Standalone components (OUTSIDE main component to prevent re-mount on type) ──
const inputCls = 'w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-dakkani-500 focus:border-transparent outline-none bg-white text-gray-900'
const labelCls = 'block text-sm font-semibold text-gray-700 mb-1.5'

function FieldInput({
  label, fieldName, type = 'text', placeholder = '', required = false, hint = '',
  register, errors,
}: {
  label: string; fieldName: string; type?: string; placeholder?: string
  required?: boolean; hint?: string
  register: any; errors: any
}) {
  return (
    <div>
      <label className={labelCls}>
        {label}{required && <span className="text-red-500 mr-1">*</span>}
      </label>
      <input
        {...register(fieldName, type === 'number' ? { valueAsNumber: true } : {})}
        type={type}
        placeholder={placeholder}
        className={inputCls}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {errors[fieldName] && (
        <p className="text-red-500 text-xs mt-1">⚠️ {errors[fieldName]?.message}</p>
      )}
    </div>
  )
}

function ToggleSwitch({
  label, fieldName, desc, register,
}: {
  label: string; fieldName: string; desc?: string; register: any
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <div className="relative">
        <input {...register(fieldName)} type="checkbox" className="sr-only peer" />
        <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:bg-dakkani-500 transition-colors" />
        <div className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow peer-checked:translate-x-[-20px] transition-transform" />
      </div>
    </label>
  )
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'basic',    label: 'أساسي',       icon: '📝' },
  { id: 'images',   label: 'الصور',       icon: '🖼️' },
  { id: 'variants', label: 'المتغيرات',   icon: '🎨' },
  { id: 'pixels',   label: 'البكسل',      icon: '📡' },
  { id: 'seo',      label: 'SEO',         icon: '🔍' },
  { id: 'stock',    label: 'المخزون',     icon: '📦' },
]

export default function AdminProductEditor({
  storeId, storePixels, categories, warehouses, product, stockData = [],
}: Props) {
  const router    = useRouter()
  const isEdit    = !!product

  const [tab,       setTab]       = useState<Tab>('basic')
  const [images,    setImages]    = useState<ProductImage[]>(
    Array.isArray(product?.images) ? product.images.map((img: any) => ({ url: img.url ?? img, path: '' })) : []
  )
  const [uploading,  setUploading]  = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [error,      setError]      = useState('')
  const [aiLoading,  setAiLoading]  = useState(false)
  const [removingBg, setRemovingBg] = useState<string | null>(null)

  const {
    register, handleSubmit, control, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:             product?.name ?? '',
      name_ar:          product?.name_ar ?? '',
      slug:             product?.slug ?? '',
      description:      product?.description ?? '',
      description_ar:   product?.description_ar ?? '',
      sku:              product?.sku ?? '',
      barcode:          product?.barcode ?? '',
      price:            product?.price,
      compare_price:    product?.compare_price,
      cost_price:       product?.cost_price,
      weight:           product?.weight,
      category_id:      product?.category_id ?? '',
      tags:             Array.isArray(product?.tags) ? product.tags.join(', ') : '',
      is_active:        product?.is_active ?? true,
      is_featured:      product?.is_featured ?? false,
      use_store_pixel:  product?.use_store_pixel ?? true,
      meta_pixel_id:    product?.meta_pixel_id ?? '',
      tiktok_pixel_id:  product?.tiktok_pixel_id ?? '',
      meta_title:       product?.meta_title ?? '',
      meta_description: product?.meta_description ?? '',
      variant_groups:   Array.isArray(product?.variants) ? product.variants : [],
      initial_stock:    0,
      warehouse_id:     warehouses[0]?.id ?? '',
    },
  })

  const { fields: vGroups, append: appendGroup, remove: removeGroup } = useFieldArray({
    control, name: 'variant_groups',
  })

  const nameAr        = watch('name_ar')
  const useStorePixel = watch('use_store_pixel')
  const metaDesc      = watch('meta_description') ?? ''
  const watchedQty    = watch('initial_stock') ?? 0

  // ── Image Upload ─────────────────────────────────────────
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    setError('')
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`الصورة ${file.name} أكبر من 5MB`)
        continue
      }
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

  const removeImage = (idx: number) => setImages(prev => prev.filter((_, i) => i !== idx))

  const moveImage = (idx: number, dir: -1 | 1) => {
    setImages(prev => {
      const arr   = [...prev]
      const tgt   = idx + dir
      if (tgt < 0 || tgt >= arr.length) return prev
      ;[arr[idx], arr[tgt]] = [arr[tgt], arr[idx]]
      return arr
    })
  }

  // ── Remove Background ─────────────────────────────────────
  const removeBg = async (img: ProductImage, idx: number) => {
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
  }

  // ── AI Description ────────────────────────────────────────
  const generateDescription = async () => {
    const name = watch('name_ar') || watch('name')
    if (!name) { setError('أدخل اسم المنتج أولاً'); return }
    setAiLoading(true)
    setError('')
    const res = await fetch('/api/ai/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        category: categories.find(c => c.id === watch('category_id'))?.name_ar ?? '',
        features: [],
        keywords: [],
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
      setError('تأكد من إضافة GEMINI_API_KEY في ملف .env.local')
    }
    setAiLoading(false)
  }

  // ── Save ──────────────────────────────────────────────────
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

    // Save stock
    if (productId && initial_stock > 0 && warehouse_id) {
      await supabase.from('warehouse_stock').upsert({
        store_id: storeId, product_id: productId,
        warehouse_id, variant_key: 'default',
        quantity: initial_stock, reserved: 0,
      }, { onConflict: 'warehouse_id,product_id,variant_key' })
    }

    setSaved(true)
    setTimeout(() => {
      router.push('/products')
      router.refresh()
    }, 1000)
  }

  // ── UI Helpers ────────────────────────────────────────────
  const cardCls = 'bg-white border border-gray-200 rounded-2xl p-5 shadow-sm space-y-4'
  const r = register   // shorthand
  const e = errors     // shorthand

  return (
    <form onSubmit={handleSubmit(onSubmit)} dir="rtl" className="space-y-4 max-w-4xl pb-20">
      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === t.id
                ? 'bg-white shadow-sm text-dakkani-600 border border-dakkani-100'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── BASIC TAB ── */}
      {tab === 'basic' && (
        <div className="space-y-4">
          <div className={cardCls}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-gray-900">معلومات المنتج الأساسية</h3>
              <button
                type="button"
                onClick={generateDescription}
                disabled={aiLoading}
                className="flex items-center gap-2 text-sm bg-gradient-to-r from-purple-500 to-dakkani-500 text-white px-4 py-2 rounded-xl hover:opacity-90 transition disabled:opacity-50 shadow-sm"
              >
                {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                ✨ توليد وصف بالذكاء الاصطناعي
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FieldInput label="الاسم بالعربية" fieldName="name_ar" placeholder="مثال: قميص قطني رجالي" required  register={r} errors={e} />
              <FieldInput label="الاسم بالفرنسية / الإنجليزية" fieldName="name" placeholder="Cotton Shirt" required  register={r} errors={e} />
            </div>

            <div>
              <label className={labelCls}>الرابط (Slug) <span className="text-red-500">*</span></label>
              <div className="flex gap-2">
                <input
                  {...register('slug')}
                  className={inputCls}
                  placeholder="cotton-shirt"
                  dir="ltr"
                />
                <button
                  type="button"
                  onClick={() => setValue('slug', slugify(nameAr ?? watch('name') ?? ''))}
                  className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl transition whitespace-nowrap font-medium"
                >
                  توليد تلقائي
                </button>
              </div>
              {errors.slug && <p className="text-red-500 text-xs mt-1">⚠️ {errors.slug.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>الوصف بالعربية</label>
                <textarea
                  {...register('description_ar')}
                  rows={4}
                  placeholder="اكتب وصفاً جذاباً يبيّن فوائد المنتج..."
                  className={`${inputCls} resize-none`}
                />
              </div>
              <div>
                <label className={labelCls}>الوصف بالفرنسية</label>
                <textarea
                  {...register('description')}
                  rows={4}
                  placeholder="Description du produit..."
                  className={`${inputCls} resize-none`}
                  dir="ltr"
                />
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <h3 className="font-bold text-gray-900">الأسعار والتكلفة</h3>
            <div className="grid grid-cols-3 gap-4">
              <FieldInput label="سعر البيع (دج) *" fieldName="price" type="number" placeholder="2500" required hint="السعر الذي يدفعه العميل"  register={r} errors={e} />
              <FieldInput label="السعر الأصلي (دج)" fieldName="compare_price" type="number" placeholder="3200" hint="للعرض كسعر مخفّض"  register={r} errors={e} />
              <FieldInput label="سعر التكلفة (دج)" fieldName="cost_price" type="number" placeholder="1100" hint="لحساب هامش الربح فقط"  register={r} errors={e} />
            </div>

            {/* Live profit margin */}
            {watch('price') > 0 && watch('cost_price') && watch('cost_price')! > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center justify-between">
                <p className="text-sm text-green-700 font-medium">هامش الربح</p>
                <p className="text-lg font-black text-green-600">
                  {Math.round(((watch('price') - watch('cost_price')!) / watch('price')) * 100)}%
                  <span className="text-sm font-normal mr-2 text-green-500">
                    ({(watch('price') - watch('cost_price')!).toLocaleString('fr-DZ')} دج ربح)
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className={cardCls}>
            <h3 className="font-bold text-gray-900">التصنيف والمعرّفات</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>الفئة</label>
                <select {...register('category_id')} className={inputCls}>
                  <option value="">-- بدون فئة --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>
                  ))}
                </select>
              </div>
              <FieldInput label="SKU (رمز المنتج)" fieldName="sku" placeholder="SKU-001" hint="اختياري"  register={r} errors={e} />
              <FieldInput label="الباركود" fieldName="barcode" placeholder="6291004058613" hint="اختياري"  register={r} errors={e} />
            </div>
            <FieldInput label="الوسوم (مفصولة بفاصلة)" fieldName="tags" placeholder="صيف, قطن, رجالي, تخفيض" hint="تساعد في البحث والتصفية"  register={r} errors={e} />
            <FieldInput label="الوزن (كغ)" fieldName="weight" type="number" placeholder="0.5" hint="لحساب رسوم الشحن"  register={r} errors={e} />
          </div>

          <div className={cardCls}>
            <h3 className="font-bold text-gray-900">إعدادات العرض</h3>
            <div className="space-y-2">
              <ToggleSwitch label="منتج نشط ومرئي في المتجر" fieldName="is_active" desc="أوقف هذا لإخفاء المنتج مؤقتاً"  register={r} />
              <ToggleSwitch label="⭐ منتج مميز" fieldName="is_featured" desc="يظهر في أعلى الصفحة الرئيسية وفي قسم العروض"  register={r} />
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGES TAB ── */}
      {tab === 'images' && (
        <div className={cardCls}>
          <div>
            <h3 className="font-bold text-gray-900 mb-1">صور المنتج</h3>
            <p className="text-sm text-gray-500 mb-4">يمكنك رفع عدة صور — الصورة الأولى هي الصورة الرئيسية</p>
          </div>

          {/* Upload zone */}
          <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-10 cursor-pointer transition ${
            uploading
              ? 'border-dakkani-400 bg-dakkani-50'
              : 'border-gray-300 hover:border-dakkani-400 hover:bg-dakkani-50'
          }`}>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleFileChange}
              disabled={uploading}
              className="sr-only"
            />
            {uploading ? (
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-dakkani-500 animate-spin mx-auto mb-3" />
                <p className="font-semibold text-dakkani-600">جارٍ رفع الصور...</p>
              </div>
            ) : (
              <div className="text-center">
                <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <p className="font-semibold text-gray-700 mb-1">اسحب الصور هنا أو اضغط لاختيار ملفات</p>
                <p className="text-sm text-gray-400">JPEG، PNG، WebP — الحجم الأقصى 5MB لكل صورة</p>
                <p className="text-xs text-dakkani-500 mt-2 font-medium">يمكنك اختيار عدة صور مرة واحدة</p>
              </div>
            )}
          </label>

          {/* Image grid */}
          {images.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                {images.length} صورة مرفوعة — اسحب لإعادة الترتيب
              </p>
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={img.url + idx} className="relative group rounded-xl overflow-hidden aspect-square bg-gray-100 shadow-sm">
                    <img
                      src={img.url}
                      alt={`صورة ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />

                    {/* Primary badge */}
                    {idx === 0 && (
                      <span className="absolute top-2 right-2 bg-dakkani-500 text-white text-xs px-2 py-0.5 rounded-lg font-bold shadow">
                        رئيسية
                      </span>
                    )}

                    {/* Action overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                      <div className="flex gap-1.5">
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => moveImage(idx, -1)}
                            title="تحريك للأمام"
                            className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white transition"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                        )}
                        {idx < images.length - 1 && (
                          <button
                            type="button"
                            onClick={() => moveImage(idx, 1)}
                            title="تحريك للخلف"
                            className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-white transition"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeBg(img, idx)}
                          disabled={removingBg === img.url}
                          title="إزالة الخلفية (remove.bg)"
                          className="p-1.5 bg-purple-500/70 hover:bg-purple-500 rounded-lg text-white transition text-xs font-bold"
                        >
                          {removingBg === img.url
                            ? <Loader2 className="w-4 h-4 animate-spin" />
                            : '✂️'
                          }
                        </button>
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          title="حذف الصورة"
                          className="p-1.5 bg-red-500/70 hover:bg-red-500 rounded-lg text-white transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {images.length === 0 && !uploading && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-700">
              ⚠️ لم تُضف أي صورة بعد — يُنصح بإضافة صور واضحة للمنتج لزيادة المبيعات
            </div>
          )}
        </div>
      )}

      {/* ── VARIANTS TAB ── */}
      {tab === 'variants' && (
        <div className={cardCls}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-gray-900">متغيرات المنتج</h3>
              <p className="text-sm text-gray-500 mt-0.5">مثال: اللون (أحمر، أزرق، أخضر) أو المقاس (S، M، L، XL)</p>
            </div>
            <button
              type="button"
              onClick={() => appendGroup({ name: '', options: [''] })}
              className="flex items-center gap-2 bg-dakkani-50 text-dakkani-600 border border-dakkani-200 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-dakkani-100 transition"
            >
              <Plus className="w-4 h-4" />
              إضافة متغير
            </button>
          </div>

          {vGroups.length === 0 ? (
            <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
              <p className="text-4xl mb-3">🎨</p>
              <p className="font-semibold text-gray-600">لا توجد متغيرات</p>
              <p className="text-sm text-gray-400 mt-1">أضف متغيرات مثل اللون أو المقاس أو الحجم</p>
            </div>
          ) : (
            <div className="space-y-4">
              {vGroups.map((group, gIdx) => (
                <div key={group.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      {...register(`variant_groups.${gIdx}.name`)}
                      placeholder="اسم المتغير (مثال: اللون)"
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-dakkani-500 outline-none bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => removeGroup(gIdx)}
                      className="mr-3 text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(watch(`variant_groups.${gIdx}.options`) ?? []).map((_, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <input
                          {...register(`variant_groups.${gIdx}.options.${oIdx}`)}
                          placeholder={`الخيار ${oIdx + 1} (مثال: أحمر)`}
                          className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-dakkani-500 outline-none bg-white"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const opts = [...(watch(`variant_groups.${gIdx}.options`) ?? [])]
                            opts.splice(oIdx, 1)
                            setValue(`variant_groups.${gIdx}.options`, opts)
                          }}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const opts = [...(watch(`variant_groups.${gIdx}.options`) ?? []), '']
                        setValue(`variant_groups.${gIdx}.options`, opts)
                      }}
                      className="flex items-center gap-1.5 text-sm text-dakkani-500 hover:text-dakkani-700 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      إضافة خيار
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PIXELS TAB ── */}
      {tab === 'pixels' && (
        <div className="space-y-4">
          {/* Main toggle */}
          <div className={cardCls}>
            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
              <span className="text-xl">📡</span>
              إعدادات بكسل التتبع
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              البكسل يتبع سلوك الزوار (مشاهدة، إضافة للسلة، شراء) لتحسين حملاتك الإعلانية
            </p>
            <ToggleSwitch label="استخدام بكسل المتجر الافتراضي" fieldName="use_store_pixel"
              desc={`Meta: ${storePixels.meta ? '✅ ' + storePixels.meta : '❌ غير مضبوط'} | TikTok: ${storePixels.tiktok ? '✅ ' + storePixels.tiktok : '❌ غير مضبوط'}`}
             register={r} />
          </div>

          {/* Custom pixel for this product */}
          {!useStorePixel && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">⚠️</span>
                <p className="font-semibold text-orange-800">بكسل خاص بهذا المنتج فقط</p>
              </div>
              <p className="text-sm text-orange-700">
                هذا مفيد عندما تريد تتبع هذا المنتج بحملة إعلانية مختلفة عن باقي متجرك
              </p>

              {/* Meta Pixel */}
              <div className="bg-white rounded-xl p-4 border border-orange-100">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                  <Facebook className="w-4 h-4 text-blue-600" />
                  Meta Pixel ID (Facebook / Instagram)
                </label>
                <input
                  {...register('meta_pixel_id')}
                  placeholder="مثال: 123456789012345"
                  className={inputCls}
                  dir="ltr"
                />
                <p className="text-xs text-gray-400 mt-1">
                  احصل عليه من: Meta Business Manager → Events Manager → Pixel
                </p>
              </div>

              {/* TikTok Pixel */}
              <div className="bg-white rounded-xl p-4 border border-orange-100">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
                  <Video className="w-4 h-4 text-gray-900" />
                  TikTok Pixel ID
                </label>
                <input
                  {...register('tiktok_pixel_id')}
                  placeholder="مثال: CXXXXXXXXXXXXXXX"
                  className={inputCls}
                  dir="ltr"
                />
                <p className="text-xs text-gray-400 mt-1">
                  احصل عليه من: TikTok Ads Manager → Assets → Events → Web Events
                </p>
              </div>
            </div>
          )}

          {/* Store pixel setup guide */}
          {useStorePixel && (!storePixels.meta && !storePixels.tiktok) && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <p className="font-semibold text-blue-800 mb-2">🔧 كيف تضبط بكسل المتجر؟</p>
              <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
                <li>اذهب إلى <strong>الإعدادات</strong> في لوحة التحكم</li>
                <li>في قسم <strong>&quot;البكسل والتتبع&quot;</strong> أدخل Meta Pixel ID أو TikTok Pixel ID</li>
                <li>احفظ الإعدادات — سيُطبّق على جميع المنتجات تلقائياً</li>
              </ol>
            </div>
          )}

          {/* Events tracked info */}
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
            <p className="font-bold text-gray-800 mb-3">📊 الأحداث المتتبعة تلقائياً:</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { event: 'ViewContent',      when: 'عند فتح صفحة المنتج',    platform: 'Meta + TikTok' },
                { event: 'AddToCart',         when: 'عند الضغط على اطلب الآن', platform: 'Meta + TikTok' },
                { event: 'InitiateCheckout',  when: 'عند بدء تعبئة الطلب',    platform: 'Meta + TikTok' },
                { event: 'Purchase',          when: 'عند إتمام الطلب',         platform: 'Meta + TikTok' },
              ].map(e => (
                <div key={e.event} className="bg-white border border-gray-100 rounded-xl p-3">
                  <p className="font-mono text-xs font-bold text-dakkani-600">{e.event}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{e.when}</p>
                  <p className="text-xs text-gray-400">{e.platform}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              ✅ كل حدث له event_id فريد لمنع التكرار بين البكسل في المتصفح والـ CAPI من الخادم
            </p>
          </div>
        </div>
      )}

      {/* ── SEO TAB ── */}
      {tab === 'seo' && (
        <div className={cardCls}>
          <h3 className="font-bold text-gray-900 mb-1">تحسين محركات البحث (SEO)</h3>
          <p className="text-sm text-gray-500 mb-4">هذه المعلومات تظهر في نتائج Google</p>

          <FieldInput label="عنوان SEO" fieldName="meta_title" placeholder="اسم المنتج | اسم متجرك" hint="الحد الأقصى 60 حرف"  register={r} errors={e} />
          <div>
            <label className={labelCls}>
              وصف SEO
              <span className={`text-xs mr-2 ${metaDesc.length > 150 ? 'text-red-500' : 'text-gray-400'}`}>
                {metaDesc.length}/155
              </span>
            </label>
            <textarea
              {...register('meta_description')}
              rows={3}
              maxLength={155}
              placeholder="وصف قصير يظهر في نتائج البحث — يجب أن يحتوي على الكلمة المفتاحية الرئيسية"
              className={`${inputCls} resize-none`}
            />
          </div>

          {/* Google preview */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">معاينة Google:</p>
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-inner">
              <p className="text-blue-700 text-base font-medium truncate hover:underline cursor-pointer">
                {watch('meta_title') || watch('name_ar') || 'عنوان المنتج'}
              </p>
              <p className="text-green-700 text-xs mt-0.5 font-mono">
                https://yourdomain.dz/store/your-store/product/{watch('slug') || 'product-slug'}
              </p>
              <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                {watch('meta_description') || 'الوصف يظهر هنا. أضف وصفاً مقنعاً يحتوي على الكلمات المفتاحية لتحسين ظهور منتجك في Google.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── STOCK TAB ── */}
      {tab === 'stock' && (
        <div className="space-y-4">
          {/* Current stock table */}
          {isEdit && stockData.length > 0 && (
            <div className={cardCls}>
              <h3 className="font-bold text-gray-900 mb-1">المخزون الحالي</h3>
              <div className="overflow-hidden border border-gray-200 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['المستودع', 'المتغير', 'الكمية الكلية', 'محجوز', 'متاح'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-right text-xs font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockData.map((row, i) => {
                      const avail = row.quantity - row.reserved
                      return (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2.5 text-gray-700">
                            {warehouses.find(w => w.id === row.warehouse_id)?.name ?? 'مستودع'}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-gray-500 text-xs">
                            {row.variant_key === 'default' ? '—' : row.variant_key}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-gray-800">{row.quantity}</td>
                          <td className="px-4 py-2.5 text-yellow-600">{row.reserved}</td>
                          <td className="px-4 py-2.5">
                            <span className={`font-black ${avail <= 0 ? 'text-red-500' : avail <= 5 ? 'text-yellow-500' : 'text-green-600'}`}>
                              {avail}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Add stock */}
          <div className={cardCls}>
            <h3 className="font-bold text-gray-900 mb-1">
              {isEdit ? 'إضافة مخزون جديد' : 'تحديد المخزون الابتدائي'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {isEdit
                ? 'حدد الكمية المراد إضافتها للمستودع'
                : 'حدد الكمية الابتدائية للمنتج عند إنشائه'
              }
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>المستودع</label>
                <select {...register('warehouse_id')} className={inputCls}>
                  {warehouses.length === 0
                    ? <option value="">لا يوجد مستودع — أنشئ مستودعاً أولاً</option>
                    : warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)
                  }
                </select>
                {warehouses.length === 0 && (
                  <p className="text-xs text-orange-500 mt-1">
                    ⚠️ <a href="/warehouses" className="underline">أنشئ مستودعاً</a> لتحديد المخزون
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>الكمية</label>
                <input
                  {...register('initial_stock', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  placeholder="0"
                  className={inputCls}
                />
              </div>
            </div>

            {watchedQty > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm text-green-700">
                ✅ سيتم تسجيل <strong>{watchedQty}</strong> وحدة في المخزون عند الحفظ
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-sm flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Save bar — sticky */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center gap-4 z-10 shadow-lg">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-dakkani-500 hover:bg-dakkani-600 disabled:opacity-50 text-white font-black px-8 py-3 rounded-xl transition shadow-md text-base"
        >
          {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          {isSubmitting ? 'جارٍ الحفظ...' : isEdit ? '💾 حفظ التعديلات' : '✅ إضافة المنتج'}
        </button>

        {saved && (
          <span className="text-green-600 font-bold text-sm flex items-center gap-1">
            ✅ تم الحفظ بنجاح!
          </span>
        )}

        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          إلغاء والعودة
        </button>

        {/* Tab reminder */}
        <div className="mr-auto text-xs text-gray-400">
          تأكد من إضافة الصور في تبويب <strong>الصور 🖼️</strong> وضبط البكسل في تبويب <strong>البكسل 📡</strong>
        </div>
      </div>
    </form>
  )
}
