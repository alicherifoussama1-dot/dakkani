'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import { Plus, Trash2, Image as ImageIcon } from 'lucide-react'

const schema = z.object({
  name: z.string().min(1, 'اسم المنتج مطلوب'),
  name_ar: z.string().optional(),
  slug: z.string().min(1),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  sku: z.string().optional(),
  price: z.number({ invalid_type_error: 'أدخل السعر' }).positive(),
  compare_price: z.number().optional(),
  cost_price: z.number().optional(),
  category_id: z.string().optional(),
  use_store_pixel: z.boolean().default(true),
  meta_pixel_id: z.string().optional(),
  tiktok_pixel_id: z.string().optional(),
  is_active: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
  tags: z.string().optional(),
  initial_stock: z.number().int().min(0).default(0),
  warehouse_id: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props {
  storeId: string
  storePixels: { meta?: string | null; tiktok?: string | null }
  categories: { id: string; name: string; name_ar?: string | null }[]
  warehouses: { id: string; name: string }[]
  defaultValues?: Partial<FormData>
  productId?: string
}

export default function ProductForm({
  storeId, storePixels, categories, warehouses, defaultValues, productId,
}: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'basic' | 'pixels' | 'seo' | 'stock'>('basic')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      use_store_pixel: true,
      is_active: true,
      is_featured: false,
      initial_stock: 0,
      ...defaultValues,
    },
  })

  const useStorePixel = watch('use_store_pixel')
  const name = watch('name')

  const onSubmit = async (data: FormData) => {
    setError('')
    const supabase = createClient()
    const { tags, initial_stock, warehouse_id, ...productData } = data

    const payload = {
      ...productData,
      store_id: storeId,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    }

    let productIdResult = productId

    if (productId) {
      const { error: err } = await supabase.from('products').update(payload).eq('id', productId)
      if (err) { setError(err.message); return }
    } else {
      const { data: newProduct, error: err } = await supabase
        .from('products')
        .insert(payload)
        .select('id')
        .single()
      if (err || !newProduct) { setError(err?.message ?? 'خطأ'); return }
      productIdResult = newProduct.id
    }

    // Set initial stock
    if (productIdResult && initial_stock > 0 && warehouse_id) {
      await supabase.from('warehouse_stock').upsert({
        store_id: storeId,
        product_id: productIdResult,
        warehouse_id,
        variant_key: 'default',
        quantity: initial_stock,
        reserved: 0,
      })
    }

    setSaved(true)
    setTimeout(() => {
      router.push('/products')
      router.refresh()
    }, 800)
  }

  const TABS = [
    { id: 'basic', label: 'أساسي' },
    { id: 'pixels', label: 'البكسل' },
    { id: 'seo', label: 'SEO' },
    { id: 'stock', label: 'المخزون' },
  ] as const

  const Field = ({ label, name, type = 'text', placeholder = '', required = false }: {
    label: string; name: keyof FormData; type?: string; placeholder?: string; required?: boolean
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        {...register(name, { valueAsNumber: type === 'number' })}
        type={type}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
      />
      {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message as string}</p>}
    </div>
  )

  const Toggle = ({ label, name, desc }: { label: string; name: keyof FormData; desc?: string }) => (
    <label className="flex items-center justify-between cursor-pointer py-1">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      <input {...register(name)} type="checkbox" className="w-4 h-4 accent-dakkani-500" />
    </label>
  )

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
              tab === t.id ? 'bg-white shadow text-[#E8431A]' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm space-y-4">
        {/* BASIC TAB */}
        {tab === 'basic' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Field label="اسم المنتج (بالعربية)" name="name_ar" required placeholder="مثال: قميص قطني" />
              <Field label="Product Name (English)" name="name" required placeholder="Cotton Shirt" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الرابط (Slug)</label>
              <div className="flex gap-2">
                <input
                  {...register('slug')}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
                  placeholder="cotton-shirt"
                />
                <button
                  type="button"
                  onClick={() => setValue('slug', slugify(name ?? ''))}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-600"
                >
                  توليد تلقائي
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الوصف (عربي)</label>
              <textarea
                {...register('description_ar')}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none resize-none"
                placeholder="اكتب وصف المنتج..."
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <Field label="سعر البيع (دج)" name="price" type="number" required placeholder="2500" />
              <Field label="السعر المقارن (دج)" name="compare_price" type="number" placeholder="3000" />
              <Field label="سعر التكلفة (دج)" name="cost_price" type="number" placeholder="1200" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الفئة</label>
                <select
                  {...register('category_id')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none bg-white"
                >
                  <option value="">بدون فئة</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>
                  ))}
                </select>
              </div>
              <Field label="رمز SKU" name="sku" placeholder="SKU-001" />
            </div>
            <Field label="الوسوم (مفصولة بفاصلة)" name="tags" placeholder="صيف, قطن, رجالي" />
            <div className="space-y-2 border-t border-gray-100 pt-3">
              <Toggle label="منتج نشط ومرئي" name="is_active" desc="يظهر في المتجر الإلكتروني" />
              <Toggle label="منتج مميز" name="is_featured" desc="يظهر في أعلى الصفحة الرئيسية" />
            </div>
          </>
        )}

        {/* PIXELS TAB */}
        {tab === 'pixels' && (
          <div className="space-y-4">
            <Toggle
              label="استخدام بكسل المتجر الافتراضي"
              name="use_store_pixel"
              desc={`Meta: ${storePixels.meta ?? 'غير مضبوط'} | TikTok: ${storePixels.tiktok ?? 'غير مضبوط'}`}
            />
            {!useStorePixel && (
              <div className="bg-orange-50 border border-orange-100 rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium text-orange-700">بكسل خاص بهذا المنتج</p>
                <Field label="Meta Pixel ID" name="meta_pixel_id" placeholder="123456789012345" />
                <Field label="TikTok Pixel ID" name="tiktok_pixel_id" placeholder="ABCDEFGH" />
              </div>
            )}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-sm text-blue-700 space-y-1">
              <p className="font-medium">الأحداث المتتبعة تلقائياً:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs">
                <li>ViewContent — عند فتح صفحة المنتج</li>
                <li>AddToCart — عند اختيار المنتج</li>
                <li>InitiateCheckout — عند بدء تعبئة الطلب</li>
                <li>Purchase — عند إتمام الطلب</li>
                <li>كل حدث له event_id لمنع التكرار مع CAPI</li>
              </ul>
            </div>
          </div>
        )}

        {/* SEO TAB */}
        {tab === 'seo' && (
          <div className="space-y-4">
            <Field label="عنوان SEO" name="meta_title" placeholder="اسم المنتج | اسم المتجر" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">وصف SEO</label>
              <textarea
                {...register('meta_description')}
                rows={3}
                maxLength={160}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none resize-none"
                placeholder="وصف قصير يظهر في نتائج البحث (160 حرف)"
              />
            </div>
          </div>
        )}

        {/* STOCK TAB */}
        {tab === 'stock' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المستودع</label>
              <select
                {...register('warehouse_id')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#E8431A] outline-none"
              >
                <option value="">اختر المستودع</option>
                {warehouses.map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <Field
              label="الكمية الابتدائية"
              name="initial_stock"
              type="number"
              placeholder="0"
            />
            {!productId && (
              <p className="text-xs text-gray-400">
                * يمكنك تعديل المخزون من صفحة المستودعات لاحقاً
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">{error}</div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#E8431A] hover:bg-[#C73615] disabled:opacity-50 text-white font-bold px-6 py-2.5 rounded-lg transition"
        >
          {isSubmitting ? 'جارٍ الحفظ...' : productId ? 'حفظ التعديلات' : 'إضافة المنتج'}
        </button>
        {saved && <span className="text-green-600 text-sm font-medium">✓ تم الحفظ</span>}
        <button
          type="button"
          onClick={() => router.back()}
          className="text-gray-500 hover:text-gray-700 text-sm"
        >
          إلغاء
        </button>
      </div>
    </form>
  )
}
