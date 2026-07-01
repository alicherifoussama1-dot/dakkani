'use client'
import { useState, useCallback, memo, useEffect, useMemo } from 'react'
import {
  useForm, useFieldArray, useWatch, type Control,
  type UseFormRegister, type FieldErrors, type UseFormSetValue, type UseFormGetValues,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import { Upload, X, Plus, Trash2, Loader2, Sparkles, ChevronDown, ChevronUp, GripVertical, Eye, EyeOff } from 'lucide-react'
import { DEFAULT_SECTION_ORDER, SECTION_LABELS, DEFAULT_THEME_KEY, normalizeProductOrder, type ProductSectionId } from '@/lib/product-themes'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Schema ────────────────────────────────────────────────
const variantGroupSchema = z.object({
  name:    z.string().min(1, 'اسم خيار المتغير مطلوب (مثال: اللون، المقاس)'),
  options: z.array(z.string().min(1, 'يجب ملء جميع قيم الخيارات')).min(1, 'يجب إضافة خيار واحد على الأقل للمتغير'),
})

const schema = z.object({
  name:             z.string().min(1, 'اسم المنتج بالفرنسية / الإنجليزية مطلوب'),
  name_ar:          z.string().optional(),
  slug:             z.string().min(1, 'رابط المنتج (Slug) مطلوب'),
  description:      z.string().optional(),
  description_ar:   z.string().optional(),
  sku:              z.string().optional(),
  barcode:          z.string().optional(),
  price:            z.number({ invalid_type_error: 'سعر البيع مطلوب ويجب أن يكون رقماً' }).positive('سعر البيع يجب أن يكون أكبر من 0'),
  compare_price:    z.number({ invalid_type_error: 'السعر المقارن يجب أن يكون رقماً' }).positive('السعر المقارن يجب أن يكون أكبر من 0').optional(),
  cost_price:       z.number({ invalid_type_error: 'سعر التكلفة يجب أن يكون رقماً' }).positive('سعر التكلفة يجب أن يكون أكبر من 0').optional(),
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
  track_inventory:  z.boolean().default(true),
  initial_stock:    z.number({ invalid_type_error: 'الكمية الابتدائية يجب أن تكون رقماً' }).int('يجب أن تكون الكمية عدداً صحيحاً').min(0, 'الكمية الابتدائية يجب ألا تكون سالبة').default(0),
  warehouse_id:     z.string().optional(),
  theme_key:        z.string().default(DEFAULT_THEME_KEY),
  section_order:    z.array(z.string()).default([...DEFAULT_SECTION_ORDER]),
  section_visibility: z.record(z.boolean()).default({}),
  video_url:        z.string().optional(),
  description_image_url: z.string().optional(),
  order_routing:    z.enum(['inherit', 'sheet_only', 'confirmili_only', 'both']).default('inherit'),
  google_sheet_id:  z.string().optional(),
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
  googleSheets?: { id: string; spreadsheet_name: string; worksheet_name: string; is_default: boolean }[]
}
type Tab = 'general' | 'pricing' | 'media' | 'variants' | 'inventory' | 'productpage' | 'checkout' | 'pixels' | 'seo' | 'advanced'

// ═══════════════════════════════════════════════════════════
// STATIC CONSTANTS — outside component, never recreated
// ═══════════════════════════════════════════════════════════
const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'general',     label: 'عام',          icon: '📝' },
  { id: 'pricing',     label: 'الأسعار',      icon: '💰' },
  { id: 'media',       label: 'الوسائط',      icon: '🖼️' },
  { id: 'variants',    label: 'المتغيرات',    icon: '🎨' },
  { id: 'inventory',   label: 'المخزون',      icon: '📦' },
  { id: 'productpage', label: 'صفحة المنتج',  icon: '📄' },
  { id: 'checkout',    label: 'الدفع',        icon: '🛒' },
  { id: 'pixels',      label: 'البكسل',       icon: '📡' },
  { id: 'seo',         label: 'SEO',          icon: '🔍' },
  { id: 'advanced',    label: 'متقدّم',       icon: '⚙️' },
]
const IC = 'input text-sm'
const LC = 'block text-xs font-medium mb-1.5'
const CC = 'card p-5 space-y-4'

// ── Validation errors helper ──
function getErrorMessages(errors: any): string[] {
  const messages: string[] = []
  const traverse = (obj: any) => {
    if (!obj || typeof obj !== 'object') return
    if (typeof obj.message === 'string') {
      messages.push(obj.message)
      return
    }
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        traverse(obj[key])
      }
    }
  }
  traverse(errors)
  return messages
}

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
      {hint && <p className="text-xs mt-1">{hint}</p>}
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
    <label className="flex items-center justify-between cursor-pointer p-3 bg-[#F8F9FA] rounded-xl hover:bg-[#F8F9FA] transition">
      <div>
        <p className="text-sm font-semibold" style={{color:'var(--color-text-primary)'}}>{label}</p>
        {desc && <p className="text-xs mt-0.5">{desc}</p>}
      </div>
      <div className="relative">
        <input {...register(name)} type="checkbox" className="sr-only peer" />
        <div className="w-11 h-6 bg-[#DEE2E6] rounded-full peer peer-checked:bg-[#0D6EFD] transition-colors" />
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
  const nameFr = useWatch({ control, name: 'name' })
  const slug   = useWatch({ control, name: 'slug' })

  const generateSlug = () => {
    // Prefer French/English name for URL (better SEO), fallback to Arabic transliteration
    const source = nameFr?.trim() || nameAr?.trim() || ''
    const generated = slugify(source)
    setValue('slug', generated || `product-${Date.now()}`)
  }

  const hasName = nameAr || nameFr

  return (
    <div className="flex items-center gap-2 text-xs mt-1">
      {slug
        ? <span className="font-mono text-green-600">✓ /{slug}</span>
        : <span className="font-mono text-red-400">⚠️ الرابط فارغ</span>
      }
      {hasName && (
        <button
          type="button"
          onClick={generateSlug}
          className="text-[#0D6EFD] hover:text-[#0B5ED7] font-semibold underline"
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
      <h3 className="font-semibold text-sm pb-2 border-b" style={{color:"var(--color-text-primary)",borderColor:"var(--color-border)"}}>البكسل والتتبع 📡</h3>
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
      <h3 className="font-semibold text-sm pb-2 border-b" style={{color:"var(--color-text-primary)",borderColor:"var(--color-border)"}}>تحسين محركات البحث 🔍</h3>
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
        <p className="text-xs mt-1">{(desc ?? '').length}/160 حرف</p>
      </div>
      {/* Google preview */}
      <div className="bg-white border border-[#DEE2E6] rounded-xl p-3">
        <p className="text-xs mb-1.5">معاينة في Google</p>
        <p className="text-blue-700 text-sm font-medium truncate">{title || 'عنوان المنتج'}</p>
        <p className="text-green-700 text-xs">dakkani.vercel.app/store/.../</p>
        <p className="text-sm text-xs mt-0.5 line-clamp-2">{desc || 'الوصف يظهر هنا في نتائج البحث...'}</p>
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
      <h3 className="font-semibold text-sm pb-2 border-b" style={{color:"var(--color-text-primary)",borderColor:"var(--color-border)"}}>صور المنتج 🖼️</h3>
      <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition ${uploading ? 'border-[#0D6EFD] bg-[#EBF5FF]' : 'border-[#DEE2E6] hover:border-[#0D6EFD]'}`}>
        <input type="file" multiple accept="image/*" onChange={onFileChange} className="sr-only" disabled={uploading} />
        {uploading
          ? <><Loader2 className="w-8 h-8 text-[#0D6EFD] animate-spin mb-2" /><p className="text-sm" style={{color:'var(--color-text-muted)'}}>جارٍ الرفع...</p></>
          : <><Upload className="w-8 h-8 mb-2" style={{color:'var(--color-text-muted)'}} /><p className="text-sm" style={{color:'var(--color-text-muted)'}}>اسحب الصور هنا أو اضغط للاختيار</p><p className="text-xs mt-1" style={{color:'var(--color-text-muted)'}}>JPEG, PNG, WebP — max 5MB</p></>
        }
      </label>

      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3 mt-2">
          {images.map((img, idx) => (
            <div key={`${img.url}-${idx}`} className="relative group aspect-square bg-[#F8F9FA] rounded-2xl overflow-hidden border border-[#DEE2E6]">
              <img src={img.url} alt="" className="w-full h-full object-cover" />
              {idx === 0 && (
                <span className="absolute top-1.5 right-1.5 bg-[#0D6EFD] text-white text-xs px-1.5 py-0.5 rounded font-bold">رئيسية</span>
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
      <div className="flex items-center justify-between border-b border-[#DEE2E6] pb-2">
        <h3 className="font-semibold text-sm" style={{color:"var(--color-text-primary)"}}>المتغيرات 🎨</h3>
        <button type="button" onClick={() => append({ name: '', options: [''] })}
          className="flex items-center gap-1.5 text-xs bg-[#EBF5FF] text-[#0D6EFD] border border-[#EBF5FF] px-3 py-1.5 rounded-lg hover:bg-[#EBF5FF] transition">
          <Plus className="w-3.5 h-3.5" />إضافة متغير
        </button>
      </div>

      {fields.length === 0 && (
        <div className="text-center py-6 text-xs border-2 border-dashed border-[#DEE2E6] rounded-xl">
          <p className="text-sm">لا توجد متغيرات — أضف اللون أو المقاس</p>
        </div>
      )}

      <div className="space-y-3">
        {fields.map((field, gIdx) => (
          <div key={field.id} className="bg-[#F8F9FA] border border-[#DEE2E6] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <input
                {...register(`variant_groups.${gIdx}.name`)}
                placeholder="اسم المتغير (مثال: اللون)"
                className="bg-transparent border-b border-[#CED4DA] pb-1 text-sm font-semibold focus:outline-none focus:border-[#0D6EFD] w-44" style={{color:'var(--color-text-primary)'}}
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
                    className="flex-1 border border-[#DEE2E6] rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-1 focus:ring-[#0D6EFD] outline-none"
                  />
                  <button type="button"
                    onClick={() => {
                      const cur = [...(variantGroups[gIdx]?.options ?? [])]
                      cur.splice(oIdx, 1)
                      setValue(`variant_groups.${gIdx}.options`, cur)
                    }}
                    className="text-xs hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button type="button"
              onClick={() => setValue(`variant_groups.${gIdx}.options`, [...(variantGroups[gIdx]?.options ?? []), ''])}
              className="text-xs text-[#0D6EFD] hover:text-[#0B5ED7] flex items-center gap-1">
              <Plus className="w-3 h-3" />إضافة خيار
            </button>
          </div>
        ))}
      </div>
    </div>
  )
})

// ── Sortable section row — drag handle + visibility toggle ──
const SortableSectionRow = memo(function SortableSectionRow({
  id, visible, onToggle,
}: { id: ProductSectionId; visible: boolean; onToggle: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-white border border-[#DEE2E6] rounded-xl px-3 py-2.5">
      <button type="button" {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-[#ADB5BD] hover:text-[#495057]">
        <GripVertical className="w-4 h-4" />
      </button>
      <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {SECTION_LABELS[id] ?? id}
      </span>
      <button type="button" onClick={onToggle}
        className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-semibold transition ${
          visible ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'
        }`}>
        {visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        {visible ? 'ظاهر' : 'مخفي'}
      </button>
    </div>
  )
})

// ── Product Page tab — drag-and-drop section order + visibility ──
const DesignSection = memo(function DesignSection({
  control, setValue,
}: {
  control: Control<FormData>
  setValue: UseFormSetValue<FormData>
}) {
  const sectionOrderRaw    = useWatch({ control, name: 'section_order' })
  const sectionVisibility  = (useWatch({ control, name: 'section_visibility' }) ?? {}) as Record<string, boolean>

  const sectionOrder = (Array.isArray(sectionOrderRaw) && sectionOrderRaw.length
    ? sectionOrderRaw
    : [...DEFAULT_SECTION_ORDER]) as ProductSectionId[]

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const order = [...sectionOrder]
    const oldIdx = order.indexOf(active.id as ProductSectionId)
    const newIdx = order.indexOf(over.id as ProductSectionId)
    if (oldIdx === -1 || newIdx === -1) return
    setValue('section_order', arrayMove(order, oldIdx, newIdx), { shouldDirty: true })
  }

  const toggleVisible = (id: ProductSectionId) => {
    const next = { ...sectionVisibility }
    next[id] = next[id] === false ? true : false
    setValue('section_visibility', next, { shouldDirty: true })
  }

  return (
    <div className="space-y-4">
      {/* Product Theme picker DEPRECATED (Phase 1): the storefront now uses ONE
          global design system (--pt-* tokens). `theme_key` stays in the DB and
          in form defaults for backward compatibility, but is no longer
          merchant-configurable here. Do not re-introduce per-product themes. */}

      {/* Section order + visibility */}
      <div className={CC}>
        <h3 className="font-semibold text-sm pb-2 border-b" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
          ترتيب أقسام الصفحة 📐
        </h3>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          اسحب لإعادة الترتيب، وفعّل أو أخفِ أي قسم — التغييرات تنعكس مباشرة على صفحة المنتج بعد الحفظ.
        </p>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sectionOrder} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sectionOrder.map(id => (
                <SortableSectionRow
                  key={id}
                  id={id}
                  visible={sectionVisibility[id] !== false}
                  onToggle={() => toggleVisible(id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
})

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════
// ── Order routing — where do orders for THIS product go? ────
const ROUTING_CHOICES = [
  { value: 'inherit',         label: 'حسب إعداد المتجر',  icon: '🏬' },
  { value: 'confirmili_only', label: 'Confirmili فقط',    icon: '🔵' },
  { value: 'sheet_only',      label: 'قوقل شيت فقط',      icon: '📊' },
  { value: 'both',            label: 'الاثنين معاً',        icon: '🔀' },
] as const

const OrderRoutingSection = memo(function OrderRoutingSection({
  control, register, googleSheets,
}: {
  control: Control<FormData>
  register: UseFormRegister<FormData>
  googleSheets: { id: string; spreadsheet_name: string; worksheet_name: string; is_default: boolean }[]
}) {
  const routing = useWatch({ control, name: 'order_routing' })
  const needsSheet = routing === 'sheet_only' || routing === 'both'
  return (
    <div className={CC}>
      <h3 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>وجهة الطلبات 📬</h3>
      <p className="text-xs -mt-2" style={{ color: 'var(--color-text-muted)' }}>
        أين تذهب طلبات هذا المنتج؟ الافتراضي يتبع إعداد المتجر في صفحة «قوقل شيت».
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={LC}>وجهة طلبات هذا المنتج</label>
          <select {...register('order_routing')} className={IC}>
            {ROUTING_CHOICES.map(c => <option key={c.value} value={c.value}>{c.icon} {c.label}</option>)}
          </select>
        </div>
        <div>
          <label className={LC}>قوقل شيت</label>
          <select {...register('google_sheet_id')} className={IC} disabled={!needsSheet && routing !== 'inherit'}>
            <option value="">الشيت الافتراضي للمتجر</option>
            {googleSheets.map(s => (
              <option key={s.id} value={s.id}>
                📊 {s.spreadsheet_name} — {s.worksheet_name}{s.is_default ? ' (افتراضي)' : ''}
              </option>
            ))}
          </select>
          {needsSheet && googleSheets.length === 0 && (
            <p className="text-xs mt-1" style={{ color: '#DC3545' }}>
              ⚠️ لا توجد شيتات — أضف واحداً من صفحة «قوقل شيت» وإلا سيذهب الطلب لـ Confirmili
            </p>
          )}
        </div>
      </div>
    </div>
  )
})

export default function AdminProductEditor({
  storeId, storePixels, categories, warehouses, product, stockData = [], googleSheets = [],
}: Props) {
  const router = useRouter()
  const isEdit = !!product

  // Non-form state only (UI state, not field values)
  const [tab,        setTab]        = useState<Tab>('general')
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
  const [descUploading, setDescUploading] = useState(false)

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
      track_inventory:  product?.track_inventory ?? product?.attributes?.track_inventory ?? true,
      initial_stock:    product ? (stockData.find(r => r.variant_key === 'default' && r.warehouse_id === (warehouses[0]?.id ?? ''))?.quantity ?? 0) : 0,
      warehouse_id:     warehouses[0]?.id ?? '',
      theme_key:          product?.theme_key ?? DEFAULT_THEME_KEY,
      section_order:      normalizeProductOrder(product?.section_order),
      section_visibility: product?.section_visibility ?? {},
      video_url:          product?.video_url ?? '',
      description_image_url: product?.description_image_url ?? product?.attributes?.description_image_url ?? '',
      order_routing:      product?.order_routing ?? 'inherit',
      google_sheet_id:    product?.google_sheet_id ?? '',
    },
  })

  const descriptionImageUrl = useWatch({ control, name: 'description_image_url' })
  const trackInventory = useWatch({ control, name: 'track_inventory' }) ?? true
  const variantGroups = useWatch({ control, name: 'variant_groups' }) ?? []
  const selectedWarehouseId = useWatch({ control, name: 'warehouse_id' }) || (warehouses[0]?.id ?? '')

  const [variantStocks, setVariantStocks] = useState<Record<string, Record<string, number>>>({})

  // Helper to generate Cartesian product combinations
  const combinations = useMemo(() => {
    const validGroups = variantGroups.filter(g => g && g.name && Array.isArray(g.options) && g.options.filter((opt: string) => opt.trim() !== '').length > 0)
    if (validGroups.length === 0) return []

    let results: string[][] = [[]]
    for (const group of validGroups) {
      const nextResults: string[][] = []
      const cleanOptions = group.options.filter((opt: string) => opt.trim() !== '')
      for (const res of results) {
        for (const opt of cleanOptions) {
          nextResults.push([...res, opt])
        }
      }
      results = nextResults
    }

    return results.map(combo => combo.join('|'))
  }, [variantGroups])

  // Initialize/sync variant stocks
  useEffect(() => {
    const initialStocks: Record<string, Record<string, number>> = {}
    if (stockData && stockData.length > 0) {
      for (const row of stockData) {
        if (!initialStocks[row.warehouse_id]) {
          initialStocks[row.warehouse_id] = {}
        }
        initialStocks[row.warehouse_id][row.variant_key] = row.quantity
      }
    }
    
    // Ensure all combinations have an entry for each warehouse (defaulting to 0)
    for (const w of warehouses) {
      if (!initialStocks[w.id]) {
        initialStocks[w.id] = {}
      }
      for (const combo of combinations) {
        if (initialStocks[w.id][combo] === undefined) {
          initialStocks[w.id][combo] = 0
        }
      }
      // Also default value for 'default' key if no variant
      if (combinations.length === 0 && initialStocks[w.id]['default'] === undefined) {
        initialStocks[w.id]['default'] = 0
      }
    }
    
    setVariantStocks(initialStocks)
  }, [stockData, combinations, warehouses])

  const handleStockChange = (comboKey: string, val: string) => {
    const qty = parseInt(val) || 0
    setVariantStocks(prev => ({
      ...prev,
      [selectedWarehouseId]: {
        ...(prev[selectedWarehouseId] ?? {}),
        [comboKey]: qty
      }
    }))
  }

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

  const handleDescriptionImageChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setDescUploading(true)
    setError('')
    if (file.size > 5 * 1024 * 1024) {
      setError('صورة الوصف أكبر من 5MB')
      setDescUploading(false)
      return
    }
    const form = new FormData()
    form.append('file', file)
    form.append('folder', `products/${storeId}`)
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: form })
      if (res.ok) {
        const data = await res.json()
        setValue('description_image_url', data.url, { shouldDirty: true })
      } else {
        setError('فشل رفع صورة الوصف — تأكد من إعداد Supabase Storage')
      }
    } catch (err) {
      setError('حدث خطأ أثناء رفع الصورة')
    } finally {
      setDescUploading(false)
      e.target.value = ''
    }
  }, [storeId, setValue])

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

    // Auto-generate slug if empty
    if (!rest.slug || rest.slug.trim() === '') {
      rest.slug = slugify(data.name_ar ?? data.name ?? '') || `product-${Date.now()}`
    }

    const payload: Record<string, any> = {
      ...rest,
      store_id:    storeId,
      images:      images.map((img, i) => ({ url: img.url, position: i })),
      variants:    variant_groups,
      tags:        tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      category_id: data.category_id || null,
      google_sheet_id: data.google_sheet_id || null,
    }

    // Routing & description_image_url columns fallback check — retries saving by moving missing fields to attributes or removing them
    const saveProduct = async (p: Record<string, any>) =>
      isEdit
        ? await supabase.from('products').update(p).eq('id', product.id).select('id').single()
        : await supabase.from('products').insert(p).select('id').single()

    const trySave = async (p: Record<string, any>) => {
      let res = await saveProduct(p)
      if (res.error) {
        let modified = false
        const nextPayload = { ...p }
        
        // Fallback 1: description_image_url column missing
        if (/description_image_url/i.test(res.error.message)) {
          delete nextPayload.description_image_url
          nextPayload.attributes = {
            ...(p.attributes ?? product?.attributes ?? {}),
            description_image_url: p.description_image_url
          }
          modified = true
        }
        
        // Fallback 2: order_routing or google_sheet_id columns missing
        if (/order_routing|google_sheet_id/i.test(res.error.message)) {
          delete nextPayload.order_routing
          delete nextPayload.google_sheet_id
          modified = true
        }

        // Fallback 3: track_inventory column missing
        if (/track_inventory/i.test(res.error.message)) {
          delete nextPayload.track_inventory
          nextPayload.attributes = {
            ...(p.attributes ?? product?.attributes ?? {}),
            track_inventory: p.track_inventory
          }
          modified = true
        }
        
        if (modified) {
          res = await saveProduct(nextPayload)
          // Double check if it still fails due to the other unhandled fallback
          if (res.error && (/description_image_url/i.test(res.error.message) || /order_routing|google_sheet_id/i.test(res.error.message) || /track_inventory/i.test(res.error.message))) {
            const cleanPayload = { ...nextPayload }
            if (/description_image_url/i.test(res.error.message)) {
              delete cleanPayload.description_image_url
              cleanPayload.attributes = {
                ...(nextPayload.attributes ?? product?.attributes ?? {}),
                description_image_url: p.description_image_url
              }
            }
            if (/order_routing|google_sheet_id/i.test(res.error.message)) {
              delete cleanPayload.order_routing
              delete cleanPayload.google_sheet_id
            }
            if (/track_inventory/i.test(res.error.message)) {
              delete cleanPayload.track_inventory
              cleanPayload.attributes = {
                ...(cleanPayload.attributes ?? nextPayload.attributes ?? product?.attributes ?? {}),
                track_inventory: p.track_inventory
              }
            }
            res = await saveProduct(cleanPayload)
          }
        }
      }
      return res
    }

    const { data: np, error: err } = await trySave(payload)
    if (err || !np) { setError(err?.message ?? 'خطأ في الحفظ'); return }
    const productId = np.id

    if (productId && data.track_inventory !== false) {
      const activeWarehouseId = data.warehouse_id || warehouses[0]?.id
      if (activeWarehouseId) {
        if (combinations.length > 0) {
          const stockUpserts = combinations.map(comboKey => {
            const qty = variantStocks[activeWarehouseId]?.[comboKey] ?? 0
            return {
              store_id: storeId,
              product_id: productId,
              warehouse_id: activeWarehouseId,
              variant_key: comboKey,
              quantity: qty,
              reserved: 0,
            }
          })
          await supabase.from('warehouse_stock').upsert(stockUpserts, { onConflict: 'warehouse_id,product_id,variant_key' })
        } else {
          const qty = data.initial_stock || 0
          await supabase.from('warehouse_stock').upsert({
            store_id: storeId,
            product_id: productId,
            warehouse_id: activeWarehouseId,
            variant_key: 'default',
            quantity: qty,
            reserved: 0,
          }, { onConflict: 'warehouse_id,product_id,variant_key' })
        }
      }
    }

    setSaved(true)
    setTimeout(() => router.push('/products'), 800)
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onSubmit)} dir="rtl" className="space-y-4 max-w-4xl pb-24">
      {/* Tab bar */}
      <div className="flex gap-1 bg-[#F8F9FA] p-1 rounded-2xl w-fit flex-wrap">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              tab === t.id ? 'bg-white shadow-sm text-[#0D6EFD] border border-[#EBF5FF]' : 'text-[#495057] hover:text-[#212529]'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* Global Validation Errors Alert */}
      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-2xl p-4 text-sm space-y-2 shadow-sm animate-pulse duration-1000">
          <div className="flex items-center gap-2 font-bold text-base text-red-900">
            <span>⚠️</span>
            <span>يرجى ملء الحقول المطلوبة وإكمال المعلومات التالية لحفظ المنتج:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 pr-4">
            {getErrorMessages(errors).map((msg, i) => (
              <li key={i} className="text-red-700 font-medium list-item">
                {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── GENERAL TAB ── */}
      {tab === 'general' && (
        <div className="space-y-4">
          <div className={CC}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-sm" style={{color:"var(--color-text-primary)"}}>معلومات المنتج 📝</h3>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={LC}>الفئة</label>
                <select {...register('category_id')} className={IC}>
                  <option value="">بدون فئة</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>)}
                </select>
              </div>
              <Field label="SKU" name="sku" placeholder="SKU-001" register={register} errors={errors} />
            </div>

            <Field label="الوسوم (مفصولة بفاصلة)" name="tags" placeholder="صيف, قطن, رجالي" register={register} errors={errors} />

            <div className="border-t border-[#DEE2E6] pt-3 space-y-1">
              <Toggle label="منتج نشط ومرئي" name="is_active" desc="يظهر في المتجر للعملاء" register={register} />
              <Toggle label="منتج مميز" name="is_featured" desc="يظهر في أعلى الصفحة الرئيسية" register={register} />
            </div>
          </div>
        </div>
      )}

      {/* ── PRICING TAB ── */}
      {tab === 'pricing' && (
        <div className={CC}>
          <h3 className="font-semibold text-sm pb-2 border-b" style={{color:"var(--color-text-primary)",borderColor:"var(--color-border)"}}>الأسعار 💰</h3>
          <div className="grid grid-cols-3 gap-4">
            <Field label="سعر البيع (دج) *" name="price" type="number" placeholder="2500" required register={register} errors={errors} />
            <Field label="السعر المقارن (دج)" name="compare_price" type="number" placeholder="3200" register={register} errors={errors} />
            <Field label="سعر التكلفة (دج)" name="cost_price" type="number" placeholder="1100" register={register} errors={errors} />
          </div>
          <p className="text-[11px]" style={{color:'var(--color-text-muted)'}}>
            «السعر المقارن» يظهر مشطوباً بجانب سعر البيع. «سعر التكلفة» داخلي فقط (لحساب الربح) ولا يظهر للزبون.
          </p>
        </div>
      )}

      {/* ── MEDIA TAB ── */}
      {tab === 'media' && (
        <div className="space-y-4">
          <ImageGallery
            images={images}
            uploading={uploading}
            removingBg={removingBg}
            onFileChange={handleFileChange}
            onRemove={handleRemoveImage}
            onMove={handleMoveImage}
            onRemoveBg={handleRemoveBg}
          />

          {/* Product video */}
          <div className={CC}>
            <h3 className="font-semibold text-sm pb-2 border-b" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
              فيديو المنتج 🎬
            </h3>
            <Field
              label="رابط الفيديو (اختياري)"
              name="video_url"
              placeholder="https://example.com/video.mp4"
              hint="يظهر الفيديو ضمن معرض صور المنتج إن تم إدخاله"
              register={register}
              errors={errors}
            />
          </div>

          {/* Description banner image */}
          <div className={CC}>
            <h3 className="font-semibold text-sm pb-2 border-b" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
              صورة الوصف (بنر) 🖼️
            </h3>
            <p className="text-[10px] text-gray-400 -mt-1">صورة إعلانية أو بنر توضيحي يظهر ضمن «تفاصيل المنتج» في صفحة المنتج</p>

            <div className="flex gap-4 items-start">
              <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-4 cursor-pointer transition w-48 shrink-0 ${descUploading ? 'border-[#0D6EFD] bg-[#EBF5FF]' : 'border-[#DEE2E6] hover:border-[#0D6EFD]'}`}>
                <input type="file" accept="image/*" onChange={handleDescriptionImageChange} className="sr-only" disabled={descUploading} />
                {descUploading ? (
                  <>
                    <Loader2 className="w-5 h-5 text-[#0D6EFD] animate-spin mb-1" />
                    <span className="text-[10px]" style={{color:'var(--color-text-muted)'}}>جارٍ الرفع...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5 mb-1" style={{color:'var(--color-text-muted)'}} />
                    <span className="text-[10px] font-bold text-center" style={{color:'var(--color-text-muted)'}}>اختر أو اسحب صورة</span>
                  </>
                )}
              </label>

              {descriptionImageUrl ? (
                <div className="relative group w-48 h-16 bg-[#F8F9FA] rounded-2xl overflow-hidden border border-[#DEE2E6] flex items-center justify-center">
                  <img src={descriptionImageUrl} alt="معاينة صورة الوصف" className="w-full h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setValue('description_image_url', '', { shouldDirty: true })}
                    className="absolute top-1 right-1 p-1 bg-red-500/80 hover:bg-red-500 rounded-lg text-white"
                    title="حذف الصورة"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex-1 self-center text-[11px] text-gray-400 border border-dashed border-gray-200 rounded-2xl py-5 text-center">
                  لم يتم رفع صورة وصف لهذا المنتج بعد
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── VARIANTS TAB ── */}
      {tab === 'variants' && (
        <VariantsSection control={control} register={register} setValue={setValue} />
      )}

      {/* ── PRODUCT PAGE TAB ── (section order + visibility — first-class feature) */}
      {tab === 'productpage' && (
        <DesignSection control={control} setValue={setValue} />
      )}

      {/* ── CHECKOUT TAB ── (store settings = default & source of truth;
           architected for future per-product overrides, not implemented) */}
      {tab === 'checkout' && (
        <div className="space-y-4">
          <div className={CC}>
            <h3 className="font-semibold text-sm pb-2 border-b" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
              إعدادات الدفع 🛒
            </h3>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              تُدار إعدادات الدفع على مستوى المتجر وتنطبق على كل منتجاتك افتراضياً: الحقول الظاهرة والمطلوبة، ترتيب الحقول، التوصيل للمنزل والمكتب، والشحن المجاني.
            </p>
            <ul className="text-xs space-y-1.5 pr-4 list-disc" style={{ color: 'var(--color-text-soft, #4b5563)' }}>
              <li>الحقول الظاهرة / المطلوبة وترتيبها</li>
              <li>التوصيل للمنزل والتوصيل للمكتب (Stopdesk)</li>
              <li>الشحن المجاني فوق مبلغ معيّن</li>
            </ul>
            <a href="/settings?tab=checkout"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#0D6EFD] hover:underline">
              فتح إعدادات الدفع للمتجر →
            </a>
            <div className="mt-2 flex items-center gap-2 text-[11px] rounded-xl border border-dashed px-3 py-2.5" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              ⌁ تجاوزات الدفع الخاصة بهذا المنتج — قريباً (البنية جاهزة، غير مُفعّلة بعد).
            </div>
          </div>
        </div>
      )}

      {/* ── PIXELS TAB ── */}
      {tab === 'pixels' && (
        <PixelSection control={control} register={register} storePixels={storePixels} />
      )}

      {/* ── SEO TAB ── */}
      {tab === 'seo' && (
        <SeoPreview control={control} register={register} />
      )}

      {/* ── INVENTORY TAB ── */}
      {tab === 'inventory' && (
        <div className={CC}>
          <h3 className="font-semibold text-sm pb-2 border-b" style={{color:"var(--color-text-primary)",borderColor:"var(--color-border)"}}>المخزون 📦</h3>

          {/* Track Inventory Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">تفعيل تتبع المخزون</p>
              <p className="text-xs text-gray-500 mt-0.5">عند تعطيله، يكون المنتج متوفراً للشراء بكميات غير محدودة</p>
            </div>
            <button
              type="button"
              onClick={() => setValue('track_inventory', !trackInventory)}
              className="w-12 h-6 rounded-full relative transition-colors duration-200"
              style={{ background: trackInventory ? '#0D6EFD' : '#DEE2E6' }}
            >
              <span
                className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                style={{ right: trackInventory ? '4px' : 'calc(100% - 20px)' }}
              />
            </button>
          </div>

          {trackInventory ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={LC}>المستودع المحدد للتعديل</label>
                  <select {...register('warehouse_id')} className={IC}>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                {combinations.length === 0 && (
                  <Field label="الكمية بالمخزن" name="initial_stock" type="number" placeholder="100" register={register} errors={errors} />
                )}
              </div>

              {combinations.length > 0 && (
                <div className="space-y-2 mt-4">
                  <label className="text-xs font-semibold text-gray-700 block">جدول كميات المتغيرات في المستودع المحدد:</label>
                  <div className="border border-[#DEE2E6] rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-[#F8F9FA] border-b border-[#DEE2E6]">
                        <tr>
                          <th className="px-4 py-2.5 font-semibold text-gray-700">المتغير</th>
                          <th className="px-4 py-2.5 font-semibold text-gray-700 w-36">الكمية بالمخزن</th>
                          {isEdit && <th className="px-4 py-2.5 font-semibold text-gray-700 w-24">محجوز</th>}
                          {isEdit && <th className="px-4 py-2.5 font-semibold text-gray-700 w-24">متاح</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {combinations.map(comboKey => {
                          const qty = variantStocks[selectedWarehouseId]?.[comboKey] ?? 0
                          const stockRow = stockData.find(r => r.warehouse_id === selectedWarehouseId && r.variant_key === comboKey)
                          const reserved = stockRow?.reserved ?? 0
                          const available = qty - reserved

                          return (
                            <tr key={comboKey} className="hover:bg-gray-50/50 transition">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {comboKey.split('|').join(' / ')}
                              </td>
                              <td className="px-4 py-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  value={qty === 0 ? '' : qty}
                                  onChange={e => handleStockChange(comboKey, e.target.value)}
                                  placeholder="0"
                                  className="w-full px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:border-[#0D6EFD] focus:ring-1 focus:ring-[#0D6EFD] transition text-center text-sm"
                                />
                              </td>
                              {isEdit && (
                                <td className="px-4 py-3 text-yellow-600 font-medium">
                                  {reserved}
                                </td>
                              )}
                              {isEdit && (
                                <td className="px-4 py-3 text-green-600 font-bold">
                                  {available}
                                </td>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl text-center text-gray-500">
              <span className="text-3xl block mb-2">📦</span>
              تتبع المخزون معطل للمنتج حالياً (مخزون غير محدود)
            </div>
          )}
        </div>
      )}

      {/* ── ADVANCED TAB ── (order routing + Google Sheet) */}
      {tab === 'advanced' && (
        <OrderRoutingSection control={control} register={register} googleSheets={googleSheets} />
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm flex items-start gap-2">
          ⚠️ {error}
        </div>
      )}

      {/* Save bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[#DEE2E6] px-6 py-3 flex items-center gap-3 z-20 shadow-lg">
        <button type="submit" disabled={isSubmitting}
          className="flex items-center gap-2 bg-[#0D6EFD] hover:bg-[#0B5ED7] disabled:opacity-50 text-white font-black px-8 py-3 rounded-xl transition shadow-sm">
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'جارٍ الحفظ...' : isEdit ? '💾 حفظ التعديلات' : '✅ إضافة المنتج'}
        </button>
        {saved && <span className="text-green-600 font-bold text-sm flex items-center gap-1">✓ تم الحفظ!</span>}
        <button type="button" onClick={() => router.back()} className="text-xs hover:underline text-sm mr-auto">
          إلغاء
        </button>
      </div>
    </form>
  )
}
