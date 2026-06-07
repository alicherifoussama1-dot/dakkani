'use client'
import { useState, useEffect, useCallback } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDZD } from '@/lib/utils/format'
import { usePixels } from '@/components/pixels/PixelProvider'
import { MetaPixel } from '@/components/pixels/MetaPixel'
import { TikTokPixel } from '@/components/pixels/TikTokPixel'
import { Truck, Store, CreditCard, Banknote, CheckCircle, AlertTriangle, Loader2, ChevronDown } from 'lucide-react'
import type { Wilaya } from '@/types'

// ── Validation schema ────────────────────────────────────────
const schema = z.object({
  customer_name:  z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  phone:          z.string().regex(/^(05|06|07)[0-9]{8}$/, 'رقم الهاتف غير صالح — مثال: 0555123456'),
  phone2:         z.string().regex(/^(05|06|07)[0-9]{8}$/, 'رقم الهاتف غير صالح').optional().or(z.literal('')),
  wilaya_id:      z.number({ required_error: 'اختر الولاية' }).int().min(1).max(58),
  delivery_type:  z.enum(['home', 'stopdesk']),
  commune_id:     z.number().int().optional(),
  baladia:        z.string().min(1, 'اختر البلدية'),
  address:        z.string().optional(),
  notes:          z.string().max(200).optional(),
  payment_method: z.enum(['cod', 'chargily_cib', 'chargily_edahabia']),
  coupon_code:    z.string().optional(),
  quantity:       z.number().int().min(1).max(99),
})
type FormData = z.infer<typeof schema>

// ── Interfaces ───────────────────────────────────────────────
interface StoreData {
  id: string; name: string; name_ar?: string; slug: string
  meta_pixel_id?: string; tiktok_pixel_id?: string
  store_settings?: { cash_on_delivery: boolean; baridimob: boolean; ccp: boolean; free_delivery_threshold?: number }
}
interface ProductData {
  id: string; name: string; name_ar?: string; price: number; compare_price?: number
  images: { url: string }[]; variants: { key: string; label: string; price?: number }[]
  use_store_pixel: boolean; meta_pixel_id?: string; tiktok_pixel_id?: string
}
interface Props {
  store: StoreData; product: ProductData | null
  wilayas: Wilaya[]; initialQty: number; initialVariant: string
}

// ── Status badge helpers ─────────────────────────────────────
const FRAUD_BADGE = (score: number) =>
  score >= 70 ? { label: 'خطر عالٍ', cls: 'bg-red-100 text-red-700' } :
  score >= 40 ? { label: 'خطر متوسط', cls: 'bg-yellow-100 text-yellow-700' } :
  null

// ── Pixel hook wrapper ────────────────────────────────────────
function useOrderPixels(store: StoreData, product: ProductData | null) {
  const pixelId = product
    ? (product.use_store_pixel ? store.meta_pixel_id : product.meta_pixel_id)
    : store.meta_pixel_id
  const tiktokId = product
    ? (product.use_store_pixel ? store.tiktok_pixel_id : product.tiktok_pixel_id)
    : store.tiktok_pixel_id

  return { pixelId, tiktokId, ...usePixels({ metaPixelId: pixelId, tiktokPixelId: tiktokId }) }
}

export default function CheckoutForm({ store, product, wilayas, initialQty, initialVariant }: Props) {
  const router = useRouter()
  const [communes, setCommunes] = useState<{ id: number; name_ar: string }[]>([])
  const [loadingCommunes, setLoadingCommunes] = useState(false)
  const [selectedWilaya, setSelectedWilaya] = useState<Wilaya | null>(null)
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount: number; message: string } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [orderNumber, setOrderNumber] = useState('')
  const [fraudScore, setFraudScore] = useState<number | null>(null)
  const [orderId, setOrderId] = useState('')

  const { pixelId, tiktokId, trackPurchase } = useOrderPixels(store, product)

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      delivery_type: 'home',
      payment_method: 'cod',
      quantity: initialQty,
    },
  })

  const watchedWilayaId    = useWatch({ control, name: 'wilaya_id' })
  const watchedDeliveryType = useWatch({ control, name: 'delivery_type' })
  const watchedQty          = useWatch({ control, name: 'quantity' }) ?? 1
  const watchedPayment      = useWatch({ control, name: 'payment_method' })
  const watchedCommuneId    = useWatch({ control, name: 'commune_id' })

  // ── Calculate totals ────────────────────────────────────────
  const unitPrice    = product?.price ?? 0
  const subtotal     = unitPrice * watchedQty
  const deliveryFee  = selectedWilaya
    ? (watchedDeliveryType === 'stopdesk'
        ? selectedWilaya.delivery_fee_stopdesk
        : selectedWilaya.delivery_fee_home)
    : 0
  const discount     = couponResult?.valid ? couponResult.discount : 0
  const total        = Math.max(0, subtotal + deliveryFee - discount)
  const deliveryDays = selectedWilaya
    ? (watchedDeliveryType === 'stopdesk'
        ? selectedWilaya.delivery_days_stopdesk
        : selectedWilaya.delivery_days_home)
    : null

  // ── Load communes on wilaya change ──────────────────────────
  useEffect(() => {
    if (!watchedWilayaId) return
    const wilaya = wilayas.find(w => w.id === watchedWilayaId) ?? null
    setSelectedWilaya(wilaya)
    setValue('commune_id', undefined)
    setValue('baladia', '')
    setCommunes([])

    setLoadingCommunes(true)
    const supabase = createClient()
    supabase.from('communes')
      .select('id, name_ar')
      .eq('wilaya_id', watchedWilayaId)
      .eq('is_active', true)
      .order('name_ar')
      .then(({ data }) => {
        setCommunes((data ?? []) as { id: number; name_ar: string }[])
        setLoadingCommunes(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedWilayaId])

  // ── Derive baladia text from selected commune (saved to orders.baladia) ──
  useEffect(() => {
    if (!watchedCommuneId) return
    const commune = communes.find(c => c.id === watchedCommuneId)
    if (commune) setValue('baladia', commune.name_ar, { shouldValidate: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCommuneId, communes])

  // ── Coupon check ─────────────────────────────────────────────
  const checkCoupon = async () => {
    const code = watch('coupon_code')
    if (!code) return
    setCheckingCoupon(true)
    const supabase = createClient()
    const { data: coupon } = await supabase
      .from('coupons')
      .select('*')
      .eq('store_id', store.id)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle()

    if (!coupon) {
      setCouponResult({ valid: false, discount: 0, message: 'الكوبون غير صالح أو منتهي الصلاحية' })
    } else if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      setCouponResult({ valid: false, discount: 0, message: 'انتهت صلاحية هذا الكوبون' })
    } else if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      setCouponResult({ valid: false, discount: 0, message: `الحد الأدنى للطلب ${formatDZD(coupon.min_order_amount)}` })
    } else {
      let disc = 0
      if (coupon.type === 'percentage') disc = (subtotal * coupon.value) / 100
      else if (coupon.type === 'fixed') disc = coupon.value
      else if (coupon.type === 'free_shipping') disc = deliveryFee
      setCouponResult({ valid: true, discount: disc, message: `✓ خصم ${formatDZD(disc)} مطبق` })
    }
    setCheckingCoupon(false)
  }

  // ── Submit handler ────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setSubmitState('submitting')

    try {
      // 1. Create order
      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          customer_name: data.customer_name,
          customer_phone: data.phone,
          customer_phone2: data.phone2 || undefined,
          delivery_type: data.delivery_type,
          wilaya_id: data.wilaya_id,
          commune_id: data.commune_id,
          baladia: data.baladia,
          address: data.address,
          payment_method: data.payment_method,
          coupon_code: data.coupon_code,
          notes: data.notes,
          source: 'storefront',
          utm_source: new URLSearchParams(window.location.search).get('utm_source') ?? undefined,
          utm_medium: new URLSearchParams(window.location.search).get('utm_medium') ?? undefined,
          utm_campaign: new URLSearchParams(window.location.search).get('utm_campaign') ?? undefined,
          items: product ? [{ product_id: product.id, quantity: data.quantity, variant_key: initialVariant }] : [],
        }),
      })

      const orderData = await orderRes.json()
      if (!orderRes.ok || !orderData.success) throw new Error(orderData.error ?? 'فشل في إنشاء الطلب')

      const newOrderId = orderData.order_id
      const newOrderNumber = orderData.order_number
      setOrderId(newOrderId)
      setOrderNumber(newOrderNumber)
      setFraudScore(orderData.fraud_score)

      // 2. Fire pixels (browser-side)
      if (product) {
        trackPurchase(newOrderNumber, product.id, orderData.total)
      }

      // 3. CAPI server-side (fire-and-forget)
      if (pixelId) {
        fetch('/api/meta-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pixelId,
            eventName: 'Purchase',
            eventId: `purchase-${newOrderNumber}`,
            eventSourceUrl: window.location.href,
            userData: {
              phone: data.phone,
              firstName: data.customer_name.split(' ')[0],
              userAgent: navigator.userAgent,
            },
            customData: {
              value: orderData.total,
              currency: 'DZD',
              contentIds: product ? [product.id] : [],
              orderId: newOrderId,
            },
          }),
        }).catch(() => {})
      }

      if (tiktokId) {
        fetch('/api/tiktok-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pixelId: tiktokId,
            eventName: 'CompletePayment',
            eventId: `payment-${newOrderNumber}`,
            eventSourceUrl: window.location.href,
            userData: { phone: data.phone, userAgent: navigator.userAgent },
            properties: { value: orderData.total, currency: 'DZD', orderId: newOrderId },
          }),
        }).catch(() => {})
      }

      // 4. WhatsApp confirmation
      fetch('/api/notifications/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: data.phone,
          orderNumber: newOrderNumber,
          customerName: data.customer_name,
          total: orderData.total,
          storeName: store.name_ar ?? store.name,
        }),
      }).catch(() => {})

      // 5. SMS confirmation
      fetch('/api/notifications/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: data.phone,
          orderNumber: newOrderNumber,
          customerName: data.customer_name,
          total: orderData.total,
          storeName: store.name_ar ?? store.name,
        }),
      }).catch(() => {})

      // 6. Chargily redirect
      if (data.payment_method !== 'cod' && orderData.chargily_url) {
        window.location.href = orderData.chargily_url
        return
      }

      setSubmitState('success')
    } catch (err) {
      console.error(err)
      setSubmitState('error')
    }
  }

  // ── SUCCESS STATE ─────────────────────────────────────────────
  if (submitState === 'success') {
    const fraud = fraudScore ?? 0
    const badge = FRAUD_BADGE(fraud)
    return (
      <div className="max-w-lg mx-auto text-center space-y-5 py-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900">تم تسجيل طلبك! 🎉</h2>
          <p className="text-gray-500 mt-2">سنتصل بك قريباً لتأكيد الطلب</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">رقم الطلب</span>
            <span className="font-mono font-black text-[#0D6EFD] text-lg">{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">المبلغ الإجمالي</span>
            <span className="font-bold text-gray-900">{formatDZD(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">طريقة الدفع</span>
            <span className="font-medium">الدفع عند الاستلام</span>
          </div>
          {deliveryDays && (
            <div className="flex justify-between">
              <span className="text-gray-500">مدة التوصيل</span>
              <span className="font-medium text-[#0D6EFD]">{deliveryDays}</span>
            </div>
          )}
          {badge && (
            <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${badge.cls}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              {badge.label} — قد يتم مراجعة طلبك
            </div>
          )}
        </div>
        <a
          href={`/store/${store.slug}`}
          className="block w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-bold py-3 rounded-xl transition"
        >
          العودة للمتجر
        </a>
      </div>
    )
  }

  // ── MAIN FORM ──────────────────────────────────────────────────
  return (
    <>
      {/* Pixel init */}
      {pixelId   && <MetaPixel   pixelId={pixelId} />}
      {tiktokId  && <TikTokPixel pixelId={tiktokId} />}

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── LEFT: Form ──────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-4">
          {/* Product summary (mobile) */}
          {product && (
            <div className="lg:hidden bg-white rounded-2xl border border-gray-100 p-4 flex gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                {product.images?.[0]?.url ? (
                  <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">{product.name[0]}</div>
                )}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{product.name_ar ?? product.name}</p>
                <p className="text-[#0D6EFD] font-black">{formatDZD(unitPrice)}</p>
              </div>
            </div>
          )}

          {/* ── Section 1: Customer Info ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#0D6EFD] text-white rounded-full flex items-center justify-center text-xs font-black">1</span>
              معلومات العميل
            </h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
              <input
                {...register('customer_name')}
                placeholder="محمد بن علي"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none"
              />
              {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف <span className="text-red-500">*</span></label>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="0555 xx xx xx"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none"
                />
                {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">هاتف بديل</label>
                <input
                  {...register('phone2')}
                  type="tel"
                  placeholder="اختياري"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none"
                />
                {errors.phone2 && <p className="text-red-500 text-xs mt-1">{errors.phone2.message}</p>}
              </div>
            </div>
          </div>

          {/* ── Section 2: Delivery ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#0D6EFD] text-white rounded-full flex items-center justify-center text-xs font-black">2</span>
              معلومات التوصيل
            </h2>

            {/* Delivery type toggle */}
            <div className="grid grid-cols-2 gap-3">
              {([
                ['home', 'توصيل للمنزل', Truck],
                ['stopdesk', 'نقطة توزيع', Store],
              ] as const).map(([val, label, Icon]) => (
                <label
                  key={val}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                    watchedDeliveryType === val
                      ? 'border-[#0D6EFD] bg-[#EBF5FF]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    {...register('delivery_type')}
                    type="radio"
                    value={val}
                    className="sr-only"
                  />
                  <Icon className={`w-5 h-5 ${watchedDeliveryType === val ? 'text-[#0D6EFD]' : 'text-gray-400'}`} />
                  <div>
                    <p className={`text-sm font-semibold ${watchedDeliveryType === val ? 'text-[#0B5ED7]' : 'text-gray-700'}`}>
                      {label}
                    </p>
                    {selectedWilaya && (
                      <p className="text-xs text-gray-500">
                        {formatDZD(val === 'stopdesk' ? selectedWilaya.delivery_fee_stopdesk : selectedWilaya.delivery_fee_home)}
                        {' · '}
                        {val === 'stopdesk' ? selectedWilaya.delivery_days_stopdesk : selectedWilaya.delivery_days_home}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            {/* Wilaya select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الولاية <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  {...register('wilaya_id', { valueAsNumber: true })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[#0D6EFD] outline-none appearance-none"
                >
                  <option value="">اختر الولاية...</option>
                  {wilayas.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.code} — {w.name_ar}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              {errors.wilaya_id && <p className="text-red-500 text-xs mt-1">{errors.wilaya_id.message}</p>}
              {selectedWilaya && (
                <div className="mt-2 flex items-center gap-3 text-xs text-[#0D6EFD] bg-[#EBF5FF] px-3 py-2 rounded-lg">
                  <span>🚚 التوصيل خلال {deliveryDays}</span>
                  <span>•</span>
                  <span>رسوم التوصيل: {formatDZD(deliveryFee)}</span>
                </div>
              )}
            </div>

            {/* Commune select */}
            {watchedWilayaId > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">البلدية <span className="text-red-500">*</span></label>
                <div className="relative">
                  {loadingCommunes ? (
                    <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400 flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جارٍ التحميل...
                    </div>
                  ) : (
                    <select
                      {...register('commune_id', { valueAsNumber: true })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-2 focus:ring-[#0D6EFD] outline-none appearance-none"
                    >
                      <option value="">اختر البلدية...</option>
                      {communes.map(c => (
                        <option key={c.id} value={c.id}>{c.name_ar}</option>
                      ))}
                    </select>
                  )}
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.baladia && <p className="text-red-500 text-xs mt-1">{errors.baladia.message}</p>}
              </div>
            )}

            {/* Address (home only) */}
            {watchedDeliveryType === 'home' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان التفصيلي</label>
                <textarea
                  {...register('address')}
                  rows={2}
                  placeholder="الحي، الشارع، رقم البناية..."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none resize-none"
                />
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
              <textarea
                {...register('notes')}
                rows={2}
                placeholder="أي تعليمات خاصة للتوصيل..."
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none resize-none"
              />
            </div>
          </div>

          {/* ── Section 3: Payment ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#0D6EFD] text-white rounded-full flex items-center justify-center text-xs font-black">3</span>
              طريقة الدفع
            </h2>

            {[
              { value: 'cod', label: 'الدفع عند الاستلام', desc: 'ادفع نقداً عند تسلم طلبك', icon: Banknote, badge: 'الأكثر استخداماً' },
              { value: 'chargily_edahabia', label: 'بطاقة داهبية', desc: 'ادفع ببطاقة البريد الجزائري', icon: CreditCard },
              { value: 'chargily_cib', label: 'بطاقة CIB', desc: 'ادفع ببطاقة بنكية CIB', icon: CreditCard },
            ].map(opt => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                  watchedPayment === opt.value
                    ? 'border-[#0D6EFD] bg-[#EBF5FF]'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input {...register('payment_method')} type="radio" value={opt.value} className="sr-only" />
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  watchedPayment === opt.value ? 'border-[#0D6EFD]' : 'border-gray-300'
                }`}>
                  {watchedPayment === opt.value && <div className="w-2.5 h-2.5 bg-[#0D6EFD] rounded-full" />}
                </div>
                <opt.icon className={`w-5 h-5 ${watchedPayment === opt.value ? 'text-[#0D6EFD]' : 'text-gray-400'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{opt.label}</p>
                    {opt.badge && (
                      <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{opt.badge}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{opt.desc}</p>
                </div>
              </label>
            ))}
          </div>

          {/* ── Coupon ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <p className="text-sm font-medium text-gray-700 mb-3">هل لديك كوبون خصم؟</p>
            <div className="flex gap-2">
              <input
                {...register('coupon_code')}
                placeholder="أدخل الكود..."
                className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none uppercase"
                onBlur={checkCoupon}
              />
              <button
                type="button"
                onClick={checkCoupon}
                disabled={checkingCoupon}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition"
              >
                {checkingCoupon ? '...' : 'تطبيق'}
              </button>
            </div>
            {couponResult && (
              <p className={`text-xs mt-2 ${couponResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                {couponResult.message}
              </p>
            )}
          </div>
        </div>

        {/* ── RIGHT: Order Summary ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Product card (desktop) */}
            {product && (
              <div className="hidden lg:block bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    {product.images?.[0]?.url ? (
                      <img src={product.images[0].url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">{product.name[0]}</div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{product.name_ar ?? product.name}</p>
                    <p className="text-[#0D6EFD] font-black text-lg mt-1">{formatDZD(unitPrice)}</p>
                    {product.compare_price && product.compare_price > unitPrice && (
                      <p className="text-xs text-gray-400 line-through">{formatDZD(product.compare_price)}</p>
                    )}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-sm text-gray-600">الكمية</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setValue('quantity', Math.max(1, watchedQty - 1))}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50">−</button>
                    <span className="w-8 text-center font-bold">{watchedQty}</span>
                    <button type="button" onClick={() => setValue('quantity', watchedQty + 1)}
                      className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-sm hover:bg-gray-50">+</button>
                  </div>
                </div>
              </div>
            )}

            {/* Order totals */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2.5">
              <h3 className="font-bold text-gray-900">ملخص الطلب</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>المنتج × {watchedQty}</span>
                  <span>{formatDZD(subtotal)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>رسوم التوصيل</span>
                  <span>{selectedWilaya ? formatDZD(deliveryFee) : '—'}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>خصم الكوبون</span>
                    <span>−{formatDZD(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-gray-900 text-base border-t border-gray-100 pt-2.5 mt-2">
                  <span>المجموع</span>
                  <span className="text-[#0D6EFD] text-xl">{formatDZD(total)}</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitState === 'submitting'}
              className="w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] disabled:opacity-60 text-white font-black py-4 rounded-2xl text-base transition flex items-center justify-center gap-2"
            >
              {submitState === 'submitting' ? (
                <><Loader2 className="w-5 h-5 animate-spin" />جارٍ تسجيل الطلب...</>
              ) : (
                `🛒 تأكيد الطلب — ${formatDZD(total)}`
              )}
            </button>

            {submitState === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm text-center">
                حدث خطأ، يرجى المحاولة مرة أخرى
              </div>
            )}

            <p className="text-xs text-gray-400 text-center">
              🔒 معلوماتك آمنة ومحمية · الدفع عند الاستلام متاح
            </p>
          </div>
        </div>
      </form>
    </>
  )
}
