'use client'
import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { formatDZD } from '@/lib/utils/format'
import { usePixels } from '@/components/pixels/PixelProvider'
import { MetaPixel } from '@/components/pixels/MetaPixel'
import { TikTokPixel } from '@/components/pixels/TikTokPixel'
import { Truck, Store, CreditCard, Banknote, CheckCircle, AlertTriangle, Loader2, ChevronDown } from 'lucide-react'
import OfficeDeliveryPicker from './OfficeDeliveryPicker'
import type { Wilaya } from '@/types'
import { translateStorefront, type Locale } from '@/lib/utils/translations'
import { resolveCommune } from '@/lib/algeria-baladias'

// ── Validation schema (Static fallback type) ─────────────────
const schema = z.object({
  customer_name:  z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  phone:          z.string().regex(/^(05|06|07)[0-9]{8}$/, 'رقم الهاتف غير صالح — مثال: 0555123456'),
  phone2:         z.string().regex(/^(05|06|07)[0-9]{8}$/, 'رقم الهاتف غير صالح').optional().or(z.literal('')),
  wilaya_id:      z.number({ required_error: 'اختر الولاية' }).int().min(1).max(58),
  delivery_type:  z.enum(['home', 'stopdesk']),
  commune_id:     z.number().int().optional(),
  baladia:        z.string().min(1, 'اختر البلدية'),
  address:        z.string().optional(),
  stopdesk_code:  z.string().optional(),
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
  store_settings?: {
    cash_on_delivery: boolean; baridimob: boolean; ccp: boolean; free_delivery_threshold?: number
    checkout_theme?: string
    checkout_section_order?: string[]
    checkout_field_order?: string[]
    checkout_fields?: {
      phone2?: { visible: boolean; required: boolean }
      address?: { visible: boolean; required: boolean }
      notes?: { visible: boolean; required: boolean }
    }
  }
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
  const settings = Array.isArray(store.store_settings) ? store.store_settings[0] : store.store_settings
  const theme = settings?.checkout_theme ?? 'default'

  // Handle glassmorphism body background class injection
  useEffect(() => {
    if (theme === 'glassmorphism') {
      document.body.classList.add('bg-slate-950')
    } else {
      document.body.classList.remove('bg-slate-950')
    }
    return () => {
      document.body.classList.remove('bg-slate-950')
    }
  }, [theme])

  const [lang, setLang] = useState<Locale>('ar')
  const isRtl = lang === 'ar'

  // Load language from cookie on mount
  useEffect(() => {
    const enabledLanguages: Locale[] = settings?.languages ?? ['ar']
    const defaultLang: Locale = settings?.default_language ?? 'ar'
    const cookieVal = document.cookie
      .split('; ')
      .find(row => row.startsWith(`dakkani_store_lang_${store.id}=`))
      ?.split('=')[1] as Locale | undefined

    if (cookieVal && enabledLanguages.includes(cookieVal)) {
      setLang(cookieVal)
    } else {
      setLang(defaultLang)
    }
  }, [store.id, settings])

  const handleLanguageChange = (newLang: Locale) => {
    setLang(newLang)
    document.cookie = `dakkani_store_lang_${store.id}=${newLang}; path=/; max-age=31536000`
    router.refresh()
  }

  const [communes, setCommunes] = useState<{ id: number; name_ar: string; name_fr?: string }[]>([])
  const [loadingCommunes, setLoadingCommunes] = useState(false)
  const [selectedWilaya, setSelectedWilaya] = useState<Wilaya | null>(null)
  const [couponResult, setCouponResult] = useState<{ valid: boolean; discount: number; message: string } | null>(null)
  const [checkingCoupon, setCheckingCoupon] = useState(false)
  const [submitState, setSubmitState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [orderNumber, setOrderNumber] = useState('')
  const [fraudScore, setFraudScore] = useState<number | null>(null)
  const [orderId, setOrderId] = useState('')
  const [offices, setOffices] = useState<{ id: string; name: string; commune: string }[]>([])
  const [loadingOffices, setLoadingOffices] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)
  // Specific server-provided failure message (Arabic) shown under the CTA.
  const [serverError, setServerError] = useState('')

  const { pixelId, tiktokId, trackPurchase, trackInitiateCheckout } = useOrderPixels(store, product)

   const dynamicSchema = useMemo(() => {
    const isAr = lang === 'ar'
    const isFr = lang === 'fr'
    return z.object({
      customer_name:  z.string().min(2, isAr ? 'الاسم يجب أن يكون حرفين على الأقل' : isFr ? 'Le nom doit contenir au moins 2 caractères' : 'Name must be at least 2 characters'),
      phone:          z.string().regex(/^(05|06|07)[0-9]{8}$/, isAr ? 'رقم الهاتف غير صالح' : isFr ? 'Numéro de téléphone invalide' : 'Invalid phone number'),
      phone2:         z.string().regex(/^(05|06|07)[0-9]{8}$/, isAr ? 'رقم الهاتف غير صالح' : isFr ? 'Numéro alternatif invalide' : 'Invalid alternative phone number').optional().or(z.literal('')),
      wilaya_id:      z.number({ required_error: isAr ? 'اختر الولاية' : isFr ? 'Sélectionnez la Wilaya' : 'Choose province' }).int().min(1).max(58),
      delivery_type:  z.enum(['home', 'stopdesk']),
      commune_id:     z.number().int().optional(),
      baladia:        z.string().optional(),
      address:        settings?.checkout_fields?.address?.required
                        ? z.string().min(5, isAr ? 'العنوان التفصيلي مطلوب ومهم للتوصيل للمنزل' : isFr ? 'L\'adresse est requise' : 'Address is required')
                        : z.string().optional(),
      stopdesk_code:  z.string().optional(),
      notes:          z.string().max(200).optional(),
      payment_method: z.enum(['cod', 'chargily_cib', 'chargily_edahabia']),
      coupon_code:    z.string().optional(),
      quantity:       z.number().int().min(1).max(99),
    }).superRefine((data, ctx) => {
      if (data.delivery_type === 'home' && (!data.baladia || data.baladia.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['baladia'],
          message: isAr ? 'اختر البلدية التابعة لعنوانك' : isFr ? 'Choisissez la commune' : 'Choose commune',
        })
      }
      // Stopdesk: the office commune is mandatory — mirrors the server rule.
      if (data.delivery_type === 'stopdesk' && (!data.baladia || data.baladia.trim() === '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['baladia'],
          message: isAr ? 'اختر بلدية مكتب الاستلام' : isFr ? 'Choisissez la commune du bureau' : 'Choose the pickup office commune',
        })
      }
    })
  }, [settings, lang])

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(dynamicSchema),
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
  const watchedStopdeskCode = useWatch({ control, name: 'stopdesk_code' })

  // Fetch stopdesk offices when wilaya_id changes to check if provider is active
  useEffect(() => {
    if (!watchedWilayaId) {
      setOffices([])
      setHasProvider(false)
      setValue('stopdesk_code', undefined)
      return
    }
    setLoadingOffices(true)
    fetch(`/api/store/delivery/desks?store_id=${store.id}&wilaya_id=${watchedWilayaId}`)
      .then(res => res.json())
      .then(data => {
        // Keep commune separately: the stopdesk picker shows the commune
        // (البلدية) with the office name beside it; only the commune is saved.
        setOffices((data.offices || []).map((o: any) => ({
          id: o.code ?? o.id,
          name: o.name,
          commune: o.commune || '',
        })))
        setHasProvider(!!data.hasProvider)
      })
      .catch(() => {
        setOffices([])
        setHasProvider(false)
      })
      .finally(() => {
        setLoadingOffices(false)
      })
  }, [watchedWilayaId, store.id, setValue])

  useEffect(() => {
    if (watchedDeliveryType !== 'stopdesk') {
      setValue('stopdesk_code', undefined)
    } else {
      setValue('stopdesk_code', '')
    }
  }, [watchedDeliveryType, setValue])

  // No offices in this wilaya → the "المكتب" option is hidden entirely so the
  // customer can never dead-end; anyone who had picked it is moved back home.
  const stopdeskHidden = !!watchedWilayaId && !loadingOffices && offices.length === 0
  useEffect(() => {
    if (stopdeskHidden && watchedDeliveryType === 'stopdesk') {
      setValue('delivery_type', 'home', { shouldValidate: true })
    }
  }, [stopdeskHidden, watchedDeliveryType, setValue])

  // ── Abandoned-checkout draft capture ──────────────────────
  // Once the phone is valid, snapshot the partial form server-side
  // (debounced). Same phone+product updates the same draft; completing
  // the order deletes it (handled by /api/orders).
  const watchedName    = useWatch({ control, name: 'customer_name' })
  const watchedPhone   = useWatch({ control, name: 'phone' })
  const watchedBaladia = useWatch({ control, name: 'baladia' })
  const icFiredRef = useRef(false)
  const draftIdRef = useRef<string | null>(null)
  const completingRef = useRef(false)
  // PER-PRODUCT toggle («تحتسب») wins; store setting is the legacy fallback.
  const abandonedTrack = typeof (product as any)?.abandoned_count_conversion === 'boolean'
    ? (product as any).abandoned_count_conversion
    : !!(settings as any)?.abandoned_track_conversions
  useEffect(() => {
    if (submitState !== 'idle') return
    if (!/^(05|06|07)\d{8}$/.test(watchedPhone ?? '')) return
    const t = setTimeout(() => {
      fetch('/api/orders/abandoned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          product_id: product?.id,
          customer_name: watchedName || undefined,
          customer_phone: watchedPhone,
          wilaya_id: watchedWilayaId || undefined,
          baladia: watchedBaladia || undefined,
          delivery_type: watchedDeliveryType,
          quantity: watchedQty,
          source: 'storefront',
        }),
      }).then(async res => {
        const json = await res.json().catch(() => ({}))
        if (res.ok && json.draft_id) draftIdRef.current = json.draft_id
        // Product toggle «تحتسب»: count the abandoned lead as
        // InitiateCheckout (NEVER Purchase) — browser pixel + CAPI, once.
        if (res.ok && abandonedTrack && !icFiredRef.current) {
          icFiredRef.current = true
          trackInitiateCheckout(product ? [product.id] : [], unitPrice * watchedQty, watchedQty, {
            phone: watchedPhone, firstName: (watchedName ?? '').split(' ')[0] || undefined,
          })
        }
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedPhone, watchedName, watchedWilayaId, watchedBaladia, watchedDeliveryType, watchedQty, submitState])

  // ── INSTANT finalization: the customer leaves → sendBeacon marks the
  // draft abandoned right now (and pushes it to the sheet server-side).
  // Never fires while an order submit is in flight or after success.
  useEffect(() => {
    const finalize = () => {
      const id = draftIdRef.current
      if (!id || completingRef.current) return
      draftIdRef.current = null // at most once per draft
      try {
        navigator.sendBeacon(
          '/api/orders/abandoned/finalize',
          new Blob([JSON.stringify({ draft_id: id, store_id: store.id })], { type: 'application/json' }),
        )
      } catch { /* beacon unsupported — the queue fallback covers it */ }
    }
    const onVisibility = () => { if (document.visibilityState === 'hidden') finalize() }
    window.addEventListener('pagehide', finalize)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', finalize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [store.id])

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
      .select('id, name_ar, name_fr')
      .eq('wilaya_id', watchedWilayaId)
      .eq('is_active', true)
      .order('name_ar')
      .then(({ data }) => {
        setCommunes((data ?? []) as { id: number; name_ar: string; name_fr?: string }[])
        setLoadingCommunes(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedWilayaId])

  // ── Derive baladia text from selected commune (saved to orders.baladia) ──
  useEffect(() => {
    if (!watchedCommuneId) return
    const commune = communes.find(c => c.id === watchedCommuneId)
    if (commune) {
      const baladiaName = lang === 'ar' ? commune.name_ar : (commune.name_fr || commune.name_ar)
      setValue('baladia', baladiaName, { shouldValidate: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedCommuneId, communes, lang])

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
      setCouponResult({
        valid: false,
        discount: 0,
        message: lang === 'ar' ? 'الكوبون غير صالح أو منتهي الصلاحية' : lang === 'fr' ? 'Code promo invalide ou expiré' : 'Invalid or expired coupon'
      })
    } else if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      setCouponResult({
        valid: false,
        discount: 0,
        message: lang === 'ar' ? 'انتهت صلاحية هذا الكوبون' : lang === 'fr' ? 'Ce code promo a expiré' : 'This coupon has expired'
      })
    } else if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
      setCouponResult({
        valid: false,
        discount: 0,
        message: lang === 'ar' ? `الحد الأدنى للطلب ${formatDZD(coupon.min_order_amount)}` : lang === 'fr' ? `Minimum d'achat de ${formatDZD(coupon.min_order_amount)}` : `Minimum order of ${formatDZD(coupon.min_order_amount)}`
      })
    } else {
      let disc = 0
      if (coupon.type === 'percentage') disc = (subtotal * coupon.value) / 100
      else if (coupon.type === 'fixed') disc = coupon.value
      else if (coupon.type === 'free_shipping') disc = deliveryFee
      setCouponResult({
        valid: true,
        discount: disc,
        message: lang === 'ar' ? `✓ خصم ${formatDZD(disc)} مطبق` : lang === 'fr' ? `✓ Réduction de ${formatDZD(disc)} appliquée` : `✓ Discount of ${formatDZD(disc)} applied`
      })
    }
    setCheckingCoupon(false)
  }

  // ── Submit handler ────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    setSubmitState('submitting')
    setServerError('')
    completingRef.current = true // suppress the abandonment beacon while submitting

    // Stopdesk snapshot: resolve the office commune to BOTH languages via the
    // shared commune table (office lists may carry FR or AR spellings).
    const isStopdeskOrder = data.delivery_type === 'stopdesk'
    const resolved = isStopdeskOrder ? resolveCommune(data.wilaya_id, data.baladia) : null
    const chosenOffice = isStopdeskOrder ? offices.find(o => o.id === data.stopdesk_code) : undefined

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
          commune_id: data.delivery_type === 'home' ? data.commune_id : undefined,
          // baladia (commune name) is saved for BOTH: home = chosen commune,
          // stopdesk = the office's commune. The office name is display-only.
          baladia: data.baladia,
          address: data.delivery_type === 'home' ? data.address : undefined,
          stopdesk_code: data.delivery_type === 'stopdesk' ? data.stopdesk_code : undefined,
          stopdesk_commune_ar: isStopdeskOrder ? (resolved?.name_ar ?? data.baladia) : undefined,
          stopdesk_commune_fr: isStopdeskOrder ? (resolved?.name_fr ?? undefined) : undefined,
          stopdesk_office_name: chosenOffice?.name,
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

      const orderData = await orderRes.json().catch(() => ({}))
      if (!orderRes.ok || !orderData.success) {
        throw new Error(orderData.error ?? (lang === 'ar' ? 'حدث خطأ، أعد المحاولة' : lang === 'fr' ? 'Une erreur est survenue, réessayez' : 'An error occurred, please retry'))
      }

      draftIdRef.current = null // completed — the server deleted the draft

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
      completingRef.current = false // failed — abandonment tracking resumes
      setServerError((err as Error)?.message ?? '')
      setSubmitState('error')
    }
  }

  // ── SUCCESS STATE ─────────────────────────────────────────────
  if (submitState === 'success') {
    const fraud = fraudScore ?? 0
    const badge = FRAUD_BADGE(fraud)
    const isAr = lang === 'ar'
    const isFr = lang === 'fr'
    return (
      <div className="max-w-lg mx-auto text-center space-y-5 py-8" dir={isAr ? 'rtl' : 'ltr'}>
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900">
            {translateStorefront('order_success', lang)}
          </h2>
          <p className="text-gray-500 mt-2">
            {translateStorefront('order_success_desc', lang)}
          </p>
        </div>
        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-500">{isAr ? 'رقم الطلب' : isFr ? 'N° de commande' : 'Order Number'}</span>
            <span className="font-mono font-black text-[#0D6EFD] text-lg">{orderNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{isAr ? 'المبلغ الإجمالي' : isFr ? 'Montant Total' : 'Total Amount'}</span>
            <span className="font-bold text-gray-900">{formatDZD(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{isAr ? 'طريقة الدفع' : isFr ? 'Mode de paiement' : 'Payment Method'}</span>
            <span className="font-medium">
              {isAr ? 'الدفع عند الاستلام' : isFr ? 'Paiement à la livraison (COD)' : 'Cash on delivery (COD)'}
            </span>
          </div>
          {deliveryDays && (
            <div className="flex justify-between">
              <span className="text-gray-500">{isAr ? 'مدة التوصيل' : isFr ? 'Délai de livraison' : 'Delivery time'}</span>
              <span className="font-medium text-[#0D6EFD]">{deliveryDays}</span>
            </div>
          )}
          {badge && (
            <div className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${badge.cls}`}>
              <AlertTriangle className="w-3.5 h-3.5" />
              {badge.label} — {isAr ? 'قد يتم مراجعة طلبك' : 'votre commande pourrait être vérifiée'}
            </div>
          )}
        </div>
        <a
          href={`/store/${store.slug}`}
          className="block w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-bold py-3 rounded-xl transition"
        >
          {isAr ? 'العودة للمتجر' : isFr ? 'Retour à la boutique' : 'Back to Store'}
        </a>
      </div>
    )
  }

  const sectionOrder = settings?.checkout_section_order ?? ['customer_info', 'delivery_info', 'payment_info', 'coupon']
  const fieldOrder   = (settings as any)?.checkout_field_order ?? ['name', 'wilaya', 'baladia', 'phone', 'address']
  const fieldsConfig = settings?.checkout_fields ?? {
    phone2: { visible: true, required: false },
    address: { visible: true, required: false },
    notes: { visible: true, required: false }
  }

  // Style classes based on theme
  let cardClass = "bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4"
  let inputClass = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none bg-white text-gray-900"
  let titleClass = "font-bold text-gray-900 flex items-center gap-2"
  let badgeClass = "w-6 h-6 bg-[#0D6EFD] text-white rounded-full flex items-center justify-center text-xs font-black"
  let btnClass = "w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] disabled:opacity-60 text-white font-black py-4 rounded-2xl text-base transition flex items-center justify-center gap-2"
  let textPrimary = "text-gray-900"
  let textSecondary = "text-gray-500"
  let textLabel = "block text-sm font-medium text-gray-700 mb-1"
  
  if (theme === 'modern') {
    cardClass = "bg-[#FFFDFB] rounded-3xl border-2 border-dashed border-amber-300 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 space-y-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.035)]"
    inputClass = "w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:border-amber-500 focus:ring-0 outline-none transition-all text-slate-805 shadow-sm focus:shadow-md"
    titleClass = "font-bold text-slate-850 flex items-center gap-2.5 text-base border-b border-slate-100 pb-2"
    badgeClass = "w-6.5 h-6.5 bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-xl flex items-center justify-center text-xs font-bold shadow-sm shadow-orange-500/20"
    btnClass = "w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl text-base transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transform hover:scale-[1.01] duration-200"
    textPrimary = "text-slate-850"
    textSecondary = "text-slate-500"
    textLabel = "block text-sm font-semibold text-slate-700 mb-1"
  } else if (theme === 'glassmorphism') {
    cardClass = "bg-slate-900/60 backdrop-blur-2xl border-2 border-indigo-500/20 shadow-2xl rounded-3xl p-6 space-y-4 text-slate-200"
    inputClass = "w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder-slate-500"
    titleClass = "font-bold text-indigo-200 flex items-center gap-2.5 text-base border-b border-slate-700/50 pb-2"
    badgeClass = "w-6.5 h-6.5 bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-xl flex items-center justify-center text-xs font-black shadow-md shadow-indigo-500/25"
    btnClass = "w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl text-base transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 border border-indigo-400/20 transform hover:scale-[1.01] duration-200"
    textPrimary = "text-white"
    textSecondary = "text-slate-400"
    textLabel = "block text-sm font-medium text-slate-300 mb-1"
  } else if (theme === 'compact') {
    cardClass = "bg-blue-50/20 border-2 border-dashed border-blue-200 rounded-xl p-4 space-y-3 shadow-sm"
    inputClass = "w-full border border-gray-305 rounded-lg px-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none bg-white text-gray-800"
    titleClass = "font-bold text-gray-805 flex items-center gap-1.5 text-sm border-b pb-1.5"
    badgeClass = "hidden"
    btnClass = "w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 hover:shadow-md"
    textPrimary = "text-gray-800"
    textSecondary = "text-gray-500"
    textLabel = "block text-xs font-semibold text-gray-600 mb-0.5"
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
            <div className={`lg:hidden flex gap-3 p-4 ${cardClass}`}>
              <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                {product.images?.[0]?.url ? (
                  <Image src={product.images[0].url} alt={product.name} fill sizes="64px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">{product.name[0]}</div>
                )}
              </div>
              <div>
                <p className={`font-semibold text-sm ${textPrimary}`}>{product.name_ar ?? product.name}</p>
                <p className="text-[#0D6EFD] font-black text-sm mt-0.5">{formatDZD(unitPrice)}</p>
              </div>
            </div>
          )}

          {/* Render sections in customized order */}
          {sectionOrder.map((sectionId: string, sIdx: number) => {
            const stepNum = sIdx + 1

            switch (sectionId) {
              case 'customer_info':
                return null  // folded into delivery_info section

              case 'delivery_info':
                return (
                  <div key="delivery_info" className={cardClass}>
                    <h2 className={titleClass}>
                      <span className={badgeClass}>{stepNum}</span>
                      معلومات الطلب
                    </h2>

                    {/* Delivery type toggle — always first. "المكتب" disappears
                        when the selected wilaya has no pickup offices. */}
                    <div className={`grid ${stopdeskHidden ? 'grid-cols-1' : 'grid-cols-2'} gap-3`}>
                      {([
                        ['home', 'توصيل للمنزل', Truck],
                        ['stopdesk', 'التوصيل للمكتب', Store],
                      ] as const).filter(([val]) => !(val === 'stopdesk' && stopdeskHidden)).map(([val, label, Icon]) => (
                        <label
                          key={val}
                          className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                            watchedDeliveryType === val
                              ? (theme === 'glassmorphism' ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200' : 'border-[#0D6EFD] bg-[#EBF5FF]')
                              : (theme === 'glassmorphism' ? 'border-slate-700/50 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300')
                          }`}
                        >
                          <input {...register('delivery_type')} type="radio" value={val} className="sr-only" />
                          <Icon className={`w-5 h-5 ${watchedDeliveryType === val ? (theme === 'glassmorphism' ? 'text-indigo-400' : 'text-[#0D6EFD]') : 'text-gray-400'}`} />
                          <div>
                            <p className={`text-sm font-semibold ${watchedDeliveryType === val ? (theme === 'glassmorphism' ? 'text-indigo-300' : 'text-[#0B5ED7]') : (theme === 'glassmorphism' ? 'text-slate-300' : 'text-gray-700')}`}>
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

                    {/* ── Fields in configurable order ──────────────────── */}
                    {fieldOrder.map((fieldId: string) => {
                      // Skip hidden fields
                      const isFieldVisible = (fieldsConfig as any)[fieldId]?.visible ?? true
                      if (!isFieldVisible) return null

                      switch (fieldId) {

                        case 'name':
                          return (
                            <div key="field-name">
                              <label className={textLabel}>الاسم الكامل <span className="text-red-500">*</span></label>
                              <input
                                {...register('customer_name')}
                                placeholder="محمد بن علي"
                                className={inputClass}
                              />
                              {errors.customer_name && <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>}
                            </div>
                          )

                        case 'wilaya':
                          return (
                            <div key="field-wilaya">
                              <label className={textLabel}>الولاية <span className="text-red-500">*</span></label>
                              <div className="relative">
                                <select
                                  {...register('wilaya_id', { valueAsNumber: true })}
                                  className={`${inputClass} appearance-none`}
                                >
                                  <option value="">{translateStorefront('select_wilaya', lang)}...</option>
                                  {wilayas.map(w => (
                                    <option key={w.id} value={w.id} style={{ background: theme === 'glassmorphism' ? '#0f172a' : '#fff' }}>
                                      {w.code} — {lang === 'ar' ? w.name_ar : (w.name_fr || w.name_ar)}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none`} />
                              </div>
                              {errors.wilaya_id && <p className="text-red-500 text-xs mt-1">{errors.wilaya_id.message}</p>}
                              {selectedWilaya && (
                                <div className={`mt-2 flex items-center gap-3 text-xs px-3 py-2 rounded-lg ${theme === 'glassmorphism' ? 'text-indigo-300 bg-indigo-950/30' : 'text-[#0D6EFD] bg-[#EBF5FF]'}`}>
                                  <span>🚚 {lang === 'ar' ? 'التوصيل خلال ' : lang === 'fr' ? 'Livraison sous ' : 'Delivery within '}{deliveryDays}</span>
                                  <span>•</span>
                                  <span>{lang === 'ar' ? 'رسوم التوصيل: ' : lang === 'fr' ? 'Frais de livraison: ' : 'Delivery fee: '}{formatDZD(deliveryFee)}</span>
                                </div>
                              )}
                            </div>
                          )

                        case 'baladia':
                          // Home delivery: show commune dropdown
                          if (watchedDeliveryType === 'home') {
                            if (!watchedWilayaId) return null
                            return (
                              <div key="field-baladia">
                                <label className={textLabel}>{translateStorefront('baladia', lang)} <span className="text-red-500">*</span></label>
                                <div className="relative">
                                  {loadingCommunes ? (
                                    <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400 flex items-center gap-2">
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                      {lang === 'ar' ? 'جارٍ التحميل...' : 'Chargement...'}
                                    </div>
                                  ) : (
                                    <select
                                      {...register('commune_id', { valueAsNumber: true })}
                                      className={`${inputClass} appearance-none`}
                                    >
                                      <option value="">{translateStorefront('select_commune', lang)}...</option>
                                      {communes.map(c => (
                                        <option key={c.id} value={c.id} style={{ background: theme === 'glassmorphism' ? '#0f172a' : '#fff' }}>
                                          {lang === 'ar' ? c.name_ar : (c.name_fr || c.name_ar)}
                                        </option>
                                      ))}
                                    </select>
                                  )}
                                  <ChevronDown className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none`} />
                                </div>
                                {errors.baladia && <p className="text-red-500 text-xs mt-1">{errors.baladia.message}</p>}
                              </div>
                            )
                          }
                          // Stopdesk: two-step selector (commune → office) matching expected UX.
                          if (watchedDeliveryType === 'stopdesk') {
                            if (!watchedWilayaId) return null
                            if (loadingOffices) {
                              return (
                                <div key="field-baladia">
                                  <label className={textLabel}>{translateStorefront('baladia', lang)} <span className="text-red-500">*</span></label>
                                  <div className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-400 flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" /> {lang === 'ar' ? 'جارٍ التحميل...' : 'Chargement...'}
                                  </div>
                                </div>
                              )
                            }
                            return (
                              <div key="field-baladia">
                                <OfficeDeliveryPicker
                                  offices={offices}
                                  wilayaId={watchedWilayaId}
                                  lang={lang}
                                  baladia={watch('baladia')}
                                  stopdeskCode={watchedStopdeskCode}
                                  onChange={(commune, officeId) => {
                                    setValue('baladia', commune, { shouldValidate: true })
                                    setValue('stopdesk_code', officeId, { shouldValidate: true })
                                  }}
                                  theme={theme}
                                />
                                {errors.baladia && <p className="text-red-500 text-xs mt-1">{errors.baladia.message}</p>}
                              </div>
                            )
                          }
                          return null

                        case 'phone':
                          return (
                            <div key="field-phone">
                              <label className={textLabel}>{translateStorefront('phone_number', lang)} <span className="text-red-500">*</span></label>
                              <input
                                {...register('phone')}
                                type="tel"
                                placeholder="0555 xx xx xx"
                                className={inputClass}
                              />
                              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                            </div>
                          )

                        case 'phone2':
                          return (
                            <div key="field-phone2">
                              <label className={textLabel}>{translateStorefront('alternative_phone', lang)} {fieldsConfig.phone2?.required && <span className="text-red-500">*</span>}</label>
                              <input
                                {...register('phone2')}
                                type="tel"
                                placeholder={fieldsConfig.phone2?.required ? "0555 xx xx xx" : (lang === 'ar' ? 'اختياري' : 'Optionnel')}
                                className={inputClass}
                              />
                              {errors.phone2 && <p className="text-red-500 text-xs mt-1">{errors.phone2.message}</p>}
                            </div>
                          )

                        case 'address':
                          return watchedDeliveryType === 'home' ? (
                            <div key="field-address">
                              <label className={textLabel}>{translateStorefront('address', lang)} {fieldsConfig.address?.required && <span className="text-red-500">*</span>}</label>
                              <textarea
                                {...register('address')}
                                rows={2}
                                placeholder={lang === 'ar' ? 'الحي، الشارع، رقم البناية...' : 'Quartier, rue, numéro...'}
                                className={`${inputClass} resize-none`}
                              />
                              {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                            </div>
                          ) : null

                        case 'notes':
                          return (
                            <div key="field-notes">
                              <label className={textLabel}>{translateStorefront('notes', lang)} {fieldsConfig.notes?.required && <span className="text-red-500">*</span>}</label>
                              <textarea
                                {...register('notes')}
                                rows={2}
                                placeholder={lang === 'ar' ? 'أي تعليمات خاصة للتوصيل...' : 'Instructions spéciales...'}
                                className={`${inputClass} resize-none`}
                              />
                            </div>
                          )

                        default:
                          return null
                      }
                    })}
                  </div>
                )

              case 'payment_info':
                return (
                  <div key="payment_info" className={cardClass}>
                    <h2 className={titleClass}>
                      <span className={badgeClass}>{stepNum}</span>
                      {lang === 'ar' ? 'طريقة الدفع' : lang === 'fr' ? 'Mode de paiement' : 'Payment Method'}
                    </h2>

                    {[
                      { value: 'cod', label: lang === 'ar' ? 'الدفع عند الاستلام' : lang === 'fr' ? 'Paiement à la livraison (COD)' : 'Cash on Delivery (COD)', desc: lang === 'ar' ? 'ادفع نقداً عند تسلم طلبك' : lang === 'fr' ? 'Payez en espèces à la livraison' : 'Pay cash upon delivery', icon: Banknote, badge: lang === 'ar' ? 'الأكثر استخداماً' : lang === 'fr' ? 'Populaire' : 'Popular' },
                      { value: 'chargily_edahabia', label: lang === 'ar' ? 'بطاقة الذهبية' : 'Edahabia', desc: lang === 'ar' ? 'ادفع ببطاقة البريد الجزائري' : 'Paiement par carte Edahabia', icon: CreditCard },
                      { value: 'chargily_cib', label: lang === 'ar' ? 'بطاقة CIB' : 'Carte CIB', desc: lang === 'ar' ? 'ادفع ببطاقة بنكية CIB' : 'Paiement par carte CIB', icon: CreditCard },
                    ].map(opt => (
                      <label
                        key={opt.value}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition ${
                          watchedPayment === opt.value
                            ? (theme === 'glassmorphism' ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200' : 'border-[#0D6EFD] bg-[#EBF5FF]')
                            : (theme === 'glassmorphism' ? 'border-slate-700/50 hover:border-slate-600' : 'border-gray-200 hover:border-gray-300')
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
                            <p className={`text-sm font-semibold ${textPrimary}`}>{opt.label}</p>
                            {opt.badge && (
                              <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{opt.badge}</span>
                            )}
                          </div>
                          <p className={`text-xs ${textSecondary}`}>{opt.desc}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )

              case 'coupon':
                return (
                  <div key="coupon" className={cardClass}>
                    <p className={`text-sm font-medium mb-3 ${textPrimary}`}>
                      {lang === 'ar' ? 'هل لديك كوبون خصم؟' : lang === 'fr' ? 'Avez-vous un code promo ?' : 'Do you have a coupon?'}
                    </p>
                    <div className="flex gap-2">
                      <input
                        {...register('coupon_code')}
                        placeholder={lang === 'ar' ? 'أدخل الكود...' : 'Code...'}
                        className={`${inputClass} uppercase flex-1`}
                        onBlur={checkCoupon}
                      />
                      <button
                        type="button"
                        onClick={checkCoupon}
                        disabled={checkingCoupon}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl text-sm font-medium transition"
                        style={{ background: theme === 'glassmorphism' ? 'rgba(255,255,255,0.08)' : undefined, color: theme === 'glassmorphism' ? '#fff' : undefined }}
                      >
                        {checkingCoupon ? '...' : (lang === 'ar' ? 'تطبيق' : lang === 'fr' ? 'Appliquer' : 'Apply')}
                      </button>
                    </div>
                    {couponResult && (
                      <p className={`text-xs mt-2 ${couponResult.valid ? 'text-green-600' : 'text-red-500'}`}>
                        {couponResult.message}
                      </p>
                    )}
                  </div>
                )

              default:
                return null
            }
          })}
        </div>

        {/* ── RIGHT: Order Summary ─────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Product card (desktop) */}
            {product && (
              <div className={`hidden lg:block p-4 ${cardClass}`}>
                <div className="flex gap-3">
                  <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                    {product.images?.[0]?.url ? (
                      <Image src={product.images[0].url} alt={product.name} fill sizes="80px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl text-gray-300">
                        {lang === 'ar' ? (product?.name_ar || product?.name || '')[0] : (product?.name || product?.name_ar || '')[0]}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${textPrimary}`}>
                      {lang === 'ar' ? (product.name_ar || product.name) : (product.name || product.name_ar)}
                    </p>
                    <p className="text-[#0D6EFD] font-black text-lg mt-1">{formatDZD(unitPrice)}</p>
                    {product.compare_price && product.compare_price > unitPrice && (
                      <p className={`text-xs line-through ${textSecondary}`}>{formatDZD(product.compare_price)}</p>
                    )}
                  </div>
                </div>

                {/* Quantity */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100" style={{ borderColor: theme === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : undefined }}>
                  <span className={`text-sm ${textSecondary}`}>{translateStorefront('quantity', lang)}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setValue('quantity', Math.max(1, watchedQty - 1))}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm transition ${theme === 'glassmorphism' ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-gray-200 hover:bg-gray-50'}`}>−</button>
                    <span className={`w-8 text-center font-bold ${textPrimary}`}>{watchedQty}</span>
                    <button type="button" onClick={() => setValue('quantity', watchedQty + 1)}
                      className={`w-7 h-7 rounded-full border flex items-center justify-center text-sm transition ${theme === 'glassmorphism' ? 'border-slate-700 hover:bg-slate-800 text-white' : 'border-gray-200 hover:bg-gray-50'}`}>+</button>
                  </div>
                </div>
              </div>
            )}

            {/* Order totals */}
            <div className={`p-4 space-y-2.5 ${cardClass}`}>
              <h3 className={`font-bold ${textPrimary}`}>{lang === 'ar' ? 'ملخص الطلب' : lang === 'fr' ? 'Résumé du commande' : 'Order Summary'}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between" style={{ color: theme === 'glassmorphism' ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                  <span>{lang === 'ar' ? 'المنتج' : lang === 'fr' ? 'Produit' : 'Product'} × {watchedQty}</span>
                  <span>{formatDZD(subtotal)}</span>
                </div>
                <div className="flex justify-between" style={{ color: theme === 'glassmorphism' ? 'var(--color-text-secondary)' : 'var(--color-text-muted)' }}>
                  <span>{lang === 'ar' ? 'رسوم التوصيل' : lang === 'fr' ? 'Frais de livraison' : 'Delivery fee'}</span>
                  <span>{selectedWilaya ? formatDZD(deliveryFee) : '—'}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{lang === 'ar' ? 'خصم الكوبون' : lang === 'fr' ? 'Réduction code' : 'Coupon discount'}</span>
                    <span>−{formatDZD(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base border-t pt-2.5 mt-2" style={{ color: theme === 'glassmorphism' ? '#fff' : '#111827', borderColor: theme === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : undefined }}>
                  <span>{lang === 'ar' ? 'المجموع' : 'Total'}</span>
                  <span className="text-[#0D6EFD] text-xl">{formatDZD(total)}</span>
                </div>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitState === 'submitting'}
              className={btnClass}
            >
              {submitState === 'submitting' ? (
                <><Loader2 className="w-5 h-5 animate-spin" />{translateStorefront('saving', lang)}</>
              ) : (
                `${lang === 'ar' ? '🛒 تأكيد الطلب — ' : lang === 'fr' ? '🛒 Confirmer la commande — ' : '🛒 Confirm Order — '}${formatDZD(total)}`
              )}
            </button>

            {submitState === 'error' && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm text-center" role="alert">
                {serverError || (lang === 'ar' ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : lang === 'fr' ? 'Une erreur est survenue, veuillez réessayer' : 'An error occurred, please try again')}
              </div>
            )}

            <p className={`text-xs text-center ${textSecondary}`}>
              {lang === 'ar'
                ? '🔒 معلوماتك آمنة ومحمية · الدفع عند الاستلام متاح'
                : lang === 'fr'
                  ? '🔒 Vos informations sont sécurisées · Paiement à la livraison disponible'
                  : '🔒 Your information is secure · Cash on delivery available'}
            </p>
          </div>
        </div>
      </form>
    </>
  )
}
