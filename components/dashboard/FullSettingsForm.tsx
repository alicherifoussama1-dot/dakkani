'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, Copy, ExternalLink } from 'lucide-react'

const schema = z.object({
  // Store info
  name:         z.string().min(2),
  name_ar:      z.string().optional(),
  phone:        z.string().optional(),
  whatsapp:     z.string().optional(),
  email:        z.string().email().optional().or(z.literal('')),
  address:      z.string().optional(),
  description_ar: z.string().optional(),
  // Pixels
  meta_pixel_id:      z.string().optional(),
  tiktok_pixel_id:    z.string().optional(),
  google_tag_id:      z.string().optional(),
  snapchat_pixel_id:  z.string().optional(),
  // Payment
  cash_on_delivery:   z.boolean(),
  baridimob:          z.boolean(),
  ccp:                z.boolean(),
  free_delivery_threshold: z.number().optional(),
  // Notifications
  order_email:        z.boolean(),
  order_sms:          z.boolean(),
  low_stock_alert:    z.boolean(),
  low_stock_threshold: z.number().int().min(1).default(5),
  // Fraud
  fraud_auto_block_score: z.number().min(0).max(100),
  max_call_attempts:  z.number().min(1).max(10),
})
type FormData = z.infer<typeof schema>

const SECTION = ({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) => (
  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
    <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
      <span className="text-xl">{icon}</span>
      <h2 className="font-bold text-gray-900">{title}</h2>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
)

export default function FullSettingsForm({ store }: { store: any }) {
  const router  = useRouter()
  const s       = store.store_settings ?? {}
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState('')
  const [copied, setCopied] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:         store.name ?? '',
      name_ar:      store.name_ar ?? '',
      phone:        store.phone ?? '',
      whatsapp:     store.whatsapp ?? store.phone ?? '',
      email:        store.email ?? '',
      address:      store.address ?? '',
      description_ar: store.description_ar ?? '',
      meta_pixel_id:     store.meta_pixel_id ?? '',
      tiktok_pixel_id:   store.tiktok_pixel_id ?? '',
      google_tag_id:     store.google_tag_id ?? '',
      snapchat_pixel_id: store.snapchat_pixel_id ?? '',
      cash_on_delivery:  s.cash_on_delivery ?? true,
      baridimob:         s.baridimob ?? false,
      ccp:               s.ccp ?? false,
      free_delivery_threshold: s.free_delivery_threshold ?? undefined,
      order_email:       s.order_email ?? true,
      order_sms:         s.order_sms ?? false,
      low_stock_alert:   s.low_stock_alert ?? true,
      low_stock_threshold: s.low_stock_threshold ?? 5,
      fraud_auto_block_score: s.fraud_auto_block_score ?? 80,
      max_call_attempts:  s.max_call_attempts ?? 3,
    },
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    const supabase = createClient()
    const {
      cash_on_delivery, baridimob, ccp, free_delivery_threshold,
      order_email, order_sms, low_stock_alert, low_stock_threshold,
      fraud_auto_block_score, max_call_attempts,
      meta_pixel_id, tiktok_pixel_id, google_tag_id, snapchat_pixel_id,
      whatsapp,
      ...storeFields
    } = data

    const [r1, r2] = await Promise.all([
      supabase.from('stores').update({
        ...storeFields,
        meta_pixel_id:     meta_pixel_id || null,
        tiktok_pixel_id:   tiktok_pixel_id || null,
        google_tag_id:     google_tag_id || null,
        snapchat_pixel_id: snapchat_pixel_id || null,
        whatsapp:          whatsapp || null,
      }).eq('id', store.id),
      supabase.from('store_settings').upsert({
        store_id: store.id,
        cash_on_delivery, baridimob, ccp,
        free_delivery_threshold: free_delivery_threshold ?? null,
        order_email, order_sms,
        low_stock_alert, low_stock_threshold,
        fraud_auto_block_score, max_call_attempts,
      }, { onConflict: 'store_id' }),
    ])

    if (r1.error || r2.error) {
      setError(r1.error?.message ?? r2.error?.message ?? 'خطأ في الحفظ')
      return
    }
    setSaved(true)
    setTimeout(() => { setSaved(false); router.refresh() }, 3000)
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  const Field = ({ label, name, type = 'text', placeholder = '', hint = '' }: {
    label: string; name: keyof FormData; type?: string; placeholder?: string; hint?: string
  }) => (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <input
        {...register(name, type === 'number' ? { valueAsNumber: true } : {})}
        type={type}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] focus:border-transparent outline-none"
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
      {errors[name] && <p className="text-red-500 text-xs mt-1">⚠️ {(errors[name] as any)?.message}</p>}
    </div>
  )

  const Toggle = ({ label, name, desc }: { label: string; name: keyof FormData; desc?: string }) => (
    <label className="flex items-center justify-between cursor-pointer p-3 rounded-xl hover:bg-gray-50 transition">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        {desc && <p className="text-xs text-gray-500 mt-0.5">{desc}</p>}
      </div>
      <input {...register(name)} type="checkbox" className="w-4 h-4 accent-[#0D6EFD]" />
    </label>
  )

  const storeUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/store/${store.slug}`

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pb-24">

      {/* Store URL */}
      <div className="bg-[#EBF5FF] border border-[#EBF5FF] rounded-2xl p-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#0B5ED7]">رابط متجرك</p>
          <p className="text-xs font-mono text-[#0D6EFD] mt-0.5">{storeUrl}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => copy(storeUrl, 'url')}
            className="flex items-center gap-1.5 text-xs bg-white border border-[#EBF5FF] text-[#0D6EFD] px-3 py-1.5 rounded-xl hover:bg-[#EBF5FF] transition"
          >
            <Copy className="w-3.5 h-3.5" />
            {copied === 'url' ? '✓ نُسخ' : 'نسخ'}
          </button>
          <a href={storeUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs bg-[#0D6EFD] text-white px-3 py-1.5 rounded-xl hover:bg-[#0B5ED7] transition">
            <ExternalLink className="w-3.5 h-3.5" />
            عرض
          </a>
        </div>
      </div>

      {/* Section 1: Store Info */}
      <SECTION title="معلومات المتجر" icon="🏪">
        <div className="grid grid-cols-2 gap-4">
          <Field label="اسم المتجر بالعربية" name="name_ar" placeholder="متجري الجزائري" />
          <Field label="Nom en français" name="name" placeholder="Mon Magasin" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">وصف المتجر</label>
          <textarea
            {...register('description_ar')}
            rows={2}
            placeholder="وصف قصير عن متجرك..."
            className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="رقم الهاتف" name="phone" placeholder="0555 xx xx xx" />
          <Field label="رقم واتساب" name="whatsapp" placeholder="0555 xx xx xx" hint="للتواصل مع العملاء عبر واتساب" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="البريد الإلكتروني" name="email" type="email" placeholder="store@email.com" />
          <Field label="العنوان" name="address" placeholder="الجزائر العاصمة" />
        </div>
      </SECTION>

      {/* Section 2: Pixels */}
      <SECTION title="البكسل والتتبع الإعلاني" icon="📡">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-700 mb-2">
          💡 أدخل معرّفات البكسل هنا لتطبيقها على جميع منتجاتك تلقائياً
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
              <span className="text-blue-600">f</span> Meta Pixel ID (Facebook/Instagram)
            </label>
            <input
              {...register('meta_pixel_id')}
              placeholder="123456789012345"
              dir="ltr"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-[#0D6EFD] outline-none"
            />
            <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:underline mt-1 block">
              احصل عليه من Meta Events Manager ↗
            </a>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-2">
              <span className="text-gray-900">TT</span> TikTok Pixel ID
            </label>
            <input
              {...register('tiktok_pixel_id')}
              placeholder="CXXXXXXXXXXXXXXX"
              dir="ltr"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-[#0D6EFD] outline-none"
            />
            <a href="https://ads.tiktok.com/i18n/events/manager" target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:underline mt-1 block">
              احصل عليه من TikTok Ads Manager ↗
            </a>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Google Tag ID</label>
            <input
              {...register('google_tag_id')}
              placeholder="G-XXXXXXXXXX"
              dir="ltr"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-[#0D6EFD] outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Snapchat Pixel ID</label>
            <input
              {...register('snapchat_pixel_id')}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx"
              dir="ltr"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-[#0D6EFD] outline-none"
            />
          </div>
        </div>
      </SECTION>

      {/* Section 3: Payment */}
      <SECTION title="طرق الدفع" icon="💳">
        <div className="space-y-1">
          <Toggle label="الدفع عند الاستلام (COD)" name="cash_on_delivery" desc="الخيار الأكثر استخداماً في الجزائر — 95% من الطلبات" />
          <Toggle label="بطاقة داهبية (Baridimob)" name="baridimob" desc="دفع إلكتروني ببطاقة البريد الجزائري" />
          <Toggle label="بطاقة CCP" name="ccp" desc="تحويل عبر حساب CCP" />
        </div>
        <Field
          label="حد الشحن المجاني (دج)"
          name="free_delivery_threshold"
          type="number"
          placeholder="مثال: 5000 — الطلبات فوق هذا المبلغ توصيل مجاني"
          hint="اتركه فارغاً إذا لا تريد شحناً مجانياً"
        />
      </SECTION>

      {/* Section 4: Notifications */}
      <SECTION title="الإشعارات" icon="🔔">
        <div className="space-y-1">
          <Toggle label="إشعار بريد إلكتروني عند كل طلب" name="order_email" />
          <Toggle label="إشعار SMS عند كل طلب" name="order_sms" desc="يحتاج إعداد Twilio في .env.local" />
          <Toggle label="تنبيه المخزون المنخفض" name="low_stock_alert" />
        </div>
        <Field label="حد المخزون المنخفض" name="low_stock_threshold" type="number" placeholder="5" hint="تنبيه عند وصول المخزون لهذا الرقم" />
      </SECTION>

      {/* Section 5: Fraud */}
      <SECTION title="مكافحة الاحتيال" icon="🛡️">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              حد الحظر التلقائي (%)
            </label>
            <input
              {...register('fraud_auto_block_score', { valueAsNumber: true })}
              type="number"
              min="0"
              max="100"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none"
            />
            <p className="text-xs text-gray-400 mt-1">الطلبات التي تتجاوز هذا الحد تُحظر تلقائياً</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              الحد الأقصى لمحاولات الاتصال
            </label>
            <input
              {...register('max_call_attempts', { valueAsNumber: true })}
              type="number"
              min="1"
              max="10"
              className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none"
            />
          </div>
        </div>
      </SECTION>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-4 text-sm">⚠️ {error}</div>
      )}

      {/* Save bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center gap-4 z-20 shadow-lg">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-[#0D6EFD] hover:bg-[#0B5ED7] disabled:opacity-50 text-white font-black px-8 py-3 rounded-xl transition shadow-md"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSubmitting ? 'جارٍ الحفظ...' : '💾 حفظ الإعدادات'}
        </button>
        {saved && (
          <span className="flex items-center gap-2 text-green-600 font-bold text-sm">
            <CheckCircle className="w-4 h-4" />
            تم الحفظ بنجاح!
          </span>
        )}
      </div>
    </form>
  )
}
