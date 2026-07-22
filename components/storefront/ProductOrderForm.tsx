'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, Loader2, ShieldCheck, PhoneCall, Truck, AlertCircle, User, Phone, Home, Store, CheckCircle2 } from 'lucide-react'
import OfficeDeliveryPicker from './OfficeDeliveryPicker'
import { formatDZD } from '@/lib/utils/format'
import { getBaladiasBilingualForWilaya, resolveCommune } from '@/lib/algeria-baladias'
import type { Product, Wilaya } from '@/types'
import { translateStorefront, type Locale } from '@/lib/utils/translations'

type FormData = {
  customer_name: string
  customer_phone: string
  customer_phone2?: string
  delivery_type: 'home' | 'stopdesk'
  wilaya_id: number
  baladia?: string
  address?: string
  stopdesk_code?: string
  quantity: number
  coupon_code?: string
  notes?: string
}

// Commerco design tokens — ONE system for every store; only the accent varies.
const DK = { accent: 'var(--pt-accent)', ink: '#1B1B1F', muted: '#71716E', line: '#EBE8E1', paper: '#FAF8F5', surface: '#FFFFFF', ok: '#1D9E75' }

// Simple dependent البلدية dropdown — mirrors the cascade already used in
// ProductBuyBox/CheckoutForm, sourced from the complete algeria-baladias dataset.
function BaladiaField({ wilayaId, value, onChange, error, lang }: {
  wilayaId: number | null
  value: string
  onChange: (v: string) => void
  error?: string
  lang: Locale
}) {
  const [open, setOpen] = useState(false)
  // Bilingual options: value = stored commune (name_ar, unchanged), label = "French - Arabic".
  const options = getBaladiasBilingualForWilaya(wilayaId)
  const selectedLabel = options.find(o => o.value === value)?.label

  if (!wilayaId) {
    return (
      <div>
        <label className="dk-label">{translateStorefront('baladia', lang)} *</label>
        <button type="button" disabled className="dk-field dk-field-strong opacity-50 cursor-not-allowed flex items-center justify-between text-start rtl:text-right">
          <span style={{ color: '#5C594F' }}>{translateStorefront('select_wilaya', lang)}</span>
          <ChevronDown size={16} style={{ color: '#5C594F' }} />
        </button>
      </div>
    )
  }

  return (
    <div>
      <label className="dk-label">{translateStorefront('baladia', lang)} *</label>
      <div className="relative">
        <button type="button" onClick={() => setOpen(o => !o)} className="dk-field dk-field-strong flex items-center justify-between text-start rtl:text-right">
          <span style={{ color: value ? '#111111' : '#5C594F' }}>
            {selectedLabel || value || (lang === 'ar' ? 'اضغط هنا لاختيار البلدية' : lang === 'fr' ? 'Cliquez pour choisir la commune' : 'Click to choose commune')}
          </span>
          <ChevronDown size={16} style={{ color: '#57564F', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div className="absolute z-50 mt-1.5 w-full max-h-72 overflow-y-auto p-1.5 rounded-2xl" style={{ background: DK.surface, border: `1.5px solid #B0AA9C`, boxShadow: '0 12px 32px rgba(20,18,15,0.12)' }}>
              {options.map(o => (
                <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false) }}
                  className="block w-full text-start rtl:text-right px-3.5 py-3 rounded-xl text-lg transition"
                  style={value === o.value ? { background: 'color-mix(in srgb, var(--pt-accent) 12%, transparent)', color: DK.accent, fontWeight: 700 } : { color: '#111111' }}>
                  {o.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {error && <p data-error="true" className="text-xs mt-1.5" style={{ color: '#A32D2D' }}>{error}</p>}
    </div>
  )
}

interface Props {
  product: Product; store: any; wilayas: Wilaya[]
  variantKey?: string; variantLabel?: string; maxQty?: number
  lang?: Locale
}

export default function ProductOrderForm({ product, store, wilayas, variantKey, variantLabel, maxQty, lang = 'ar' }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [submitError, setSubmitError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const successRef = useRef<HTMLDivElement>(null)
  const [selectedWilaya, setSelectedWilaya] = useState<Wilaya | null>(null)
  // Offices for the routed provider of the selected wilaya (provider-agnostic;
  // served by /api/store/delivery/desks which abstracts every provider).
  const [offices, setOffices] = useState<{ id: string; name: string; commune: string; address: string }[]>([])
  const [loadingOffices, setLoadingOffices] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)

  // Load checkout settings
  const settings = Array.isArray(store.store_settings) ? store.store_settings[0] : store.store_settings

  const fieldsConfig = useMemo(() => settings?.checkout_fields ?? {
    phone2: { visible: true, required: false },
    address: { visible: true, required: false },
    notes: { visible: true, required: false }
  }, [settings?.checkout_fields])

  const fieldOrder: string[] = settings?.checkout_field_order ?? ['name', 'wilaya', 'baladia', 'phone', 'address']

  const dynamicSchema = useMemo(() => {
    const isAr = lang === 'ar'
    const isFr = lang === 'fr'
    return z.object({
      customer_name: z.string().min(2, isAr ? 'الاسم مطلوب' : isFr ? 'Le nom est requis' : 'Name is required'),
      customer_phone: z.string().regex(/^(05|06|07)\d{8}$/, isAr ? 'رقم الهاتف غير صالح' : isFr ? 'Numéro de téléphone invalide' : 'Invalid phone number'),
      customer_phone2: fieldsConfig.phone2?.required
        ? z.string().regex(/^(05|06|07)\d{8}$/, isAr ? 'رقم الهاتف البديل غير صالح' : isFr ? 'Numéro alternatif invalide' : 'Invalid alternative phone number')
        : z.string().regex(/^(05|06|07)\d{8}$/, isAr ? 'رقم الهاتف البديل غير صالح' : isFr ? 'Numéro alternatif invalide' : 'Invalid alternative phone number').optional().or(z.literal('')),
      delivery_type: z.enum(['home', 'stopdesk']),
      wilaya_id: z.number({ required_error: isAr ? 'اختر الولاية' : isFr ? 'Sélectionnez la Wilaya' : 'Choose province' }).int().min(1),
      baladia: z.string().optional(),
      address: fieldsConfig.address?.required
        ? z.string().min(5, isAr ? 'العنوان التفصيلي مطلوب ومهم للتوصيل للمنزل' : isFr ? 'L\'adresse est requise' : 'Address is required')
        : z.string().optional(),
      stopdesk_code: z.string().optional(),
      quantity: z.number().int().min(1).max(99),
      coupon_code: z.string().optional(),
      notes: fieldsConfig.notes?.required
        ? z.string().min(5, isAr ? 'ملاحظات الطلب مطلوبة' : isFr ? 'Notes requises' : 'Notes required')
        : z.string().optional(),
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
  }, [fieldsConfig, lang])

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(dynamicSchema),
    mode: 'onTouched', // validate on blur after first touch — gentler, fewer submit-time surprises
    defaultValues: { delivery_type: 'home', quantity: 1, baladia: '' },
  })

  // On invalid submit, bring the first error into view (RHF focuses native inputs,
  // but custom dropdowns aren't focusable — so we also scroll to the first message).
  const onInvalid = () => {
    requestAnimationFrame(() => {
      const el = formRef.current?.querySelector<HTMLElement>('[data-error="true"]')
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const deliveryType = watch('delivery_type')
  const quantity = watch('quantity') || 1
  const wilayaId = watch('wilaya_id')
  const baladia = watch('baladia')

  // Reset البلدية whenever الولاية changes (cascading + required)
  useEffect(() => { setValue('baladia', '', { shouldValidate: false }) }, [wilayaId, setValue])

  // Load offices for the selected wilaya from the provider abstraction.
  useEffect(() => {
    if (!wilayaId) {
      setOffices([])
      setHasProvider(false)
      setValue('stopdesk_code', undefined)
      return
    }
    setLoadingOffices(true)
    fetch(`/api/store/delivery/desks?store_id=${store.id}&wilaya_id=${wilayaId}`)
      .then(res => res.json())
      .then(data => {
        setOffices((data.offices || []).map((o: any) => ({ id: String(o.id), name: o.name, commune: o.commune || '', address: o.address || '' })))
        setHasProvider(!!data.hasProvider)
      })
      .catch(() => { setOffices([]); setHasProvider(false) })
      .finally(() => setLoadingOffices(false))
  }, [wilayaId, store.id, setValue])

  useEffect(() => {
    if (deliveryType !== 'stopdesk') {
      setValue('stopdesk_code', undefined)
    } else {
      setValue('stopdesk_code', '')
    }
  }, [deliveryType, setValue])

  // No offices in this wilaya → hide "المكتب" so the customer never dead-ends.
  const stopdeskHidden = !!wilayaId && !loadingOffices && offices.length === 0
  useEffect(() => {
    if (stopdeskHidden && deliveryType === 'stopdesk') {
      setValue('delivery_type', 'home', { shouldValidate: true })
    }
  }, [stopdeskHidden, deliveryType, setValue])

  // ── Abandoned-checkout draft capture (debounced) ──────────
  // Valid phone → snapshot the partial form server-side. Same phone+product
  // updates the same draft; a completed order deletes it server-side.
  const watchedName  = watch('customer_name')
  const watchedPhone = watch('customer_phone')
  const icFiredRef = useRef(false)
  const draftIdRef = useRef<string | null>(null)
  const completingRef = useRef(false)
  // PER-PRODUCT toggle («تحتسب») wins; store setting is the legacy fallback.
  const abandonedTrack = typeof (product as any)?.abandoned_count_conversion === 'boolean'
    ? (product as any).abandoned_count_conversion
    : !!(settings as any)?.abandoned_track_conversions
  useEffect(() => {
    if (submitted) return
    if (!/^(05|06|07)\d{8}$/.test(watchedPhone ?? '')) return
    const t = setTimeout(() => {
      fetch('/api/orders/abandoned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          product_id: product.id,
          customer_name: watchedName || undefined,
          customer_phone: watchedPhone,
          wilaya_id: wilayaId || undefined,
          baladia: baladia || undefined,
          delivery_type: deliveryType,
          quantity,
          source: 'storefront',
        }),
      }).then(async res => {
        const json = await res.json().catch(() => ({}))
        if (res.ok && json.draft_id) draftIdRef.current = json.draft_id
        // Product toggle «تحتسب»: count the abandoned lead as InitiateCheckout
        // via the product's isolated pixels (<ProductTracking/> — never Purchase).
        if (res.ok && abandonedTrack && !icFiredRef.current) {
          icFiredRef.current = true
          window.dispatchEvent(new CustomEvent('dakkani:ic'))
        }
      }).catch(() => {})
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchedPhone, watchedName, wilayaId, baladia, deliveryType, quantity, submitted])

  // ── INSTANT finalization: customer leaves → sendBeacon marks the draft
  // abandoned right now (and the server pushes it to the sheet immediately).
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

  // Move focus to the confirmation so customers (and screen readers) know it worked.
  useEffect(() => {
    if (submitted) successRef.current?.focus()
  }, [submitted])

  const deliveryFee = selectedWilaya
    ? (deliveryType === 'stopdesk' ? selectedWilaya.delivery_fee_stopdesk : selectedWilaya.delivery_fee_home)
    : 0
  const total = product.price * quantity + deliveryFee

  const onSubmit = async (data: FormData) => {
    if (isSubmitting) return // extra guard against a double submit
    setSubmitError('')
    completingRef.current = true // suppress the abandonment beacon while submitting
    // Tracking bridge (isolated pixels live in <ProductTracking/>). Fire-and-forget;
    // no pixel logic here so order/business logic stays untouched.
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('dakkani:ic'))
    const isStopdesk = data.delivery_type === 'stopdesk'
    const genericErr = lang === 'ar'
      ? 'تعذّر إرسال الطلب. تحقّق من اتصالك وحاول مرة أخرى، أو تواصل معنا.'
      : lang === 'fr'
        ? 'Échec de l\'envoi de la commande. Vérifiez votre connexion et réessayez.'
        : 'Could not submit your order. Check your connection and try again.'
    try {
      // Stopdesk snapshot: resolve the office commune to BOTH languages via
      // the shared commune table (office lists may carry FR or AR spellings).
      const resolved = isStopdesk ? resolveCommune(data.wilaya_id, data.baladia) : null
      const chosenOffice = isStopdesk ? offices.find(o => o.id === data.stopdesk_code) : undefined
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          ...data,
          baladia: data.baladia, // commune name for both; stopdesk = office commune
          address: isStopdesk ? undefined : data.address,
          stopdesk_code: isStopdesk ? data.stopdesk_code : undefined,
          stopdesk_commune_ar: isStopdesk ? (resolved?.name_ar ?? data.baladia) : undefined,
          stopdesk_commune_fr: isStopdesk ? (resolved?.name_fr ?? undefined) : undefined,
          stopdesk_office_name: chosenOffice?.name,
          items: [{ product_id: product.id, quantity: data.quantity, variant_key: variantKey ?? 'default' }],
          source: 'storefront',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        draftIdRef.current = null // completed — the server deleted the draft
        setOrderId(json.order_number)
        setSubmitted(true)
        // Tracking bridge → <ProductTracking/> fires Purchase to this product's pixels only.
        if (typeof window !== 'undefined') {
          const value = ((product as any)?.price ?? 0) * (data.quantity ?? 1)
          window.dispatchEvent(new CustomEvent('dakkani:purchase', { detail: { orderId: json.order_number, value } }))
        }
        // Set short-lived same-site browser access gate cookie (1 hour)
        document.cookie = `ty_order=${json.order_id}; path=/; max-age=3600; SameSite=Lax`
        // Redirect with a tiny delay to allow trackers to execute
        setTimeout(() => {
          const isPlatform = window.location.hostname.includes('vercel.app') || window.location.hostname.includes('localhost') || window.location.hostname.includes('dakkani.com')
          const redirectPath = isPlatform
            ? `/store/${store.slug}/order-confirmation?order=${json.order_id}`
            : `/order-confirmation?order=${json.order_id}`
          window.location.href = redirectPath
        }, 150)
      } else {
        completingRef.current = false // failed — abandonment tracking resumes
        setSubmitError(json.error || genericErr)
        formRef.current?.querySelector<HTMLElement>('[data-submit-error="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } catch {
      completingRef.current = false // failed — abandonment tracking resumes
      setSubmitError(genericErr)
      formRef.current?.querySelector<HTMLElement>('[data-submit-error="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const isRtl = lang === 'ar'

  if (submitted) {
    return (
      <div ref={successRef} tabIndex={-1} role="status" aria-live="polite" dir={isRtl ? 'rtl' : 'ltr'}
        className="rounded-3xl p-8 text-center outline-none" style={{ background: DK.surface, border: `0.5px solid ${DK.line}`, borderTop: `3px solid ${DK.ok}` }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'color-mix(in srgb, #1D9E75 14%, transparent)' }}>
          <CheckCircle2 className="w-9 h-9" style={{ color: DK.ok }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: DK.ink }}>{translateStorefront('order_success', lang)}</h3>
        <p className="text-sm mb-1" style={{ color: DK.muted }}>
          {lang === 'ar' ? 'رقم الطلب: ' : lang === 'fr' ? 'Numéro de commande: ' : 'Order Number: '}
          <strong style={{ color: DK.ink }}>{orderId}</strong>
        </p>
        <p className="text-sm" style={{ color: DK.muted }}>{translateStorefront('order_success_desc', lang)}</p>
      </div>
    )
  }

  const completeLabel = lang === 'ar' ? 'أكمل طلبك' : lang === 'fr' ? 'Complétez votre commande' : 'Complete your order'
  const stepBtn = { border: `0.5px solid ${DK.line}`, color: DK.ink, background: DK.paper } as const

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit, onInvalid)} dir={isRtl ? 'rtl' : 'ltr'}
      className="dk-tight space-y-3 px-5 sm:px-6 pb-5 sm:pb-6 rounded-3xl" style={{ background: DK.surface, border: `2px solid color-mix(in srgb, var(--pt-accent) 32%, ${DK.line})`, boxShadow: '0 12px 36px rgba(20,18,15,0.10)' }}>
      {/* Compact rhythm + attention-grabbing CTA glow — scoped to this form only */}
      <style>{`.dk-tight .dk-label{margin-bottom:4px;font-size:12.5px}.dk-tight .dk-field{min-height:46px}
@keyframes dkGlow{0%,100%{box-shadow:0 6px 18px color-mix(in srgb,var(--pt-accent) 32%,transparent)}50%{box-shadow:0 12px 32px color-mix(in srgb,var(--pt-accent) 62%,transparent),0 0 0 4px color-mix(in srgb,var(--pt-accent) 20%,transparent)}}
.dk-cta{animation:dkGlow 1.8s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.dk-cta{animation:none}}`}</style>

      {/* Bold header — the gradient follows the product's theme accent (var(--pt-accent)) */}
      <div className="-mx-5 sm:-mx-6 rounded-t-3xl px-5 sm:px-6 py-3 flex items-center justify-between"
        style={{ background: 'linear-gradient(105deg, color-mix(in srgb, var(--pt-accent) 82%, #000), var(--pt-accent))', color: '#fff' }}>
        <span className="font-bold text-base flex items-center gap-2">🛒 {completeLabel}</span>
        <span className="text-[10.5px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)' }}>🔥 {lang === 'ar' ? 'عرض اليوم' : lang === 'fr' ? 'Offre du jour' : 'Today'}</span>
      </div>

      {/* Delivery type — compact segmented control; active fill = product accent */}
      <div className={`flex gap-1 p-1 rounded-2xl ${stopdeskHidden ? '' : ''}`} style={{ background: DK.paper, border: `0.5px solid ${DK.line}` }}>
        {([['home', translateStorefront('home_delivery', lang), <Home key="h" className="w-4 h-4" />], ['stopdesk', translateStorefront('stopdesk_delivery', lang), <Store key="s" className="w-4 h-4" />]] as const).filter(([val]) => !(val === 'stopdesk' && stopdeskHidden)).map(([val, label, icon]) => {
          const isActive = deliveryType === val
          return (
            <button key={val} type="button" onClick={() => setValue('delivery_type', val)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-bold transition"
              style={isActive
                ? { background: DK.accent, color: '#fff', boxShadow: '0 3px 10px color-mix(in srgb, var(--pt-accent) 38%, transparent)' }
                : { background: 'transparent', color: DK.muted }}>
              {icon}{label}
            </button>
          )
        })}
      </div>

      {/* Configurable fields in order */}
      {fieldOrder.map(fieldId => {
        if (fieldId === 'phone2' && !fieldsConfig.phone2?.visible) return null
        if (fieldId === 'address' && !fieldsConfig.address?.visible) return null
        if (fieldId === 'notes' && !fieldsConfig.notes?.visible) return null

        switch (fieldId) {
          case 'name':
            return (
              <div key="field-name">
                <label className="dk-label">{translateStorefront('full_name', lang)} <span style={{ color: '#D85A30' }}>*</span></label>
                <div className="relative">
                  <User className="w-[18px] h-[18px] absolute top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ right: isRtl ? 15 : 'auto', left: isRtl ? 'auto' : 15, color: DK.muted }} aria-hidden="true" />
                  <input {...register('customer_name')} autoComplete="name"
                    placeholder={lang === 'ar' ? 'اكتب اسمك الكامل هنا (مثال: محمد أحمد)' : lang === 'fr' ? 'Entrez votre nom complet' : 'Please enter your full name'}
                    className="dk-field"
                    style={{
                      paddingRight: isRtl ? 46 : 18,
                      paddingLeft: isRtl ? 18 : 46
                    }} />
                </div>
                {errors.customer_name && <p data-error="true" className="text-xs mt-1.5" style={{ color: '#A32D2D' }}>{errors.customer_name.message}</p>}
              </div>
            )

          case 'wilaya':
            {
              const wilayaSelect = (
                <div>
                  <label className="dk-label">{translateStorefront('wilaya', lang)} <span style={{ color: '#D85A30' }}>*</span></label>
                  <div className="relative">
                    <select {...register('wilaya_id', { valueAsNumber: true })}
                      onChange={e => { const id = parseInt(e.target.value); setValue('wilaya_id', id); setSelectedWilaya(wilayas.find(w => w.id === id) ?? null) }}
                      className="dk-field dk-field-strong appearance-none">
                      <option value="">{lang === 'ar' ? 'اختر الولاية' : lang === 'fr' ? 'Choisir la wilaya' : 'Choose wilaya'}</option>
                      {wilayas.map(w => (
                        <option key={w.id} value={w.id}>{[w.id, w.name_fr, w.name_ar].filter(Boolean).join(' - ')}</option>
                      ))}
                    </select>
                    <ChevronDown className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none`} style={{ color: '#57564F' }} />
                  </div>
                  {errors.wilaya_id && <p data-error="true" className="text-xs mt-1.5" style={{ color: '#A32D2D' }}>{errors.wilaya_id.message}</p>}
                </div>
              )
              const feeNote = selectedWilaya ? (
                <p className="text-sm mt-1 font-semibold" style={{ color: DK.accent }}>
                  {lang === 'ar' ? 'رسوم التوصيل: ' : lang === 'fr' ? 'Frais de livraison: ' : 'Delivery fee: '}{formatDZD(deliveryFee)} · {deliveryType === 'home' ? selectedWilaya.delivery_days_home : selectedWilaya.delivery_days_stopdesk}
                </p>
              ) : null
              // Home delivery → pair Wilaya + Baladia on one compact row.
              if (deliveryType === 'home') {
                return (
                  <div key="field-wilaya" className="space-y-1">
                    <div className="grid grid-cols-2 gap-2.5 items-start">
                      {wilayaSelect}
                      <BaladiaField wilayaId={wilayaId ?? null} value={baladia ?? ''} onChange={v => setValue('baladia', v, { shouldValidate: true })} error={errors.baladia?.message} lang={lang} />
                    </div>
                    {feeNote}
                  </div>
                )
              }
              return <div key="field-wilaya">{wilayaSelect}{feeNote}</div>
            }

          case 'baladia':
            // Home delivery → the municipality is rendered beside the wilaya above.
            if (deliveryType === 'home') return null
            // Office delivery → provider-agnostic two-step flow: municipalities that
            // have offices → office selector. The municipality field is ALWAYS present
            // for office delivery (never disappears) — it just shows nothing to pick
            // until a wilaya with offices is chosen. Submission unchanged
            // (baladia = commune, stopdesk_code = office id).
            if (deliveryType === 'stopdesk') {
              if (loadingOffices) {
                return (
                  <div key="field-baladia">
                    <label className="dk-label">{translateStorefront('baladia', lang)} <span style={{ color: '#D85A30' }}>*</span></label>
                    <div className="dk-field flex items-center justify-center gap-2" style={{ color: DK.muted }}>
                      <Loader2 className="w-4 h-4 animate-spin" /> {lang === 'ar' ? 'جارٍ التحميل...' : 'Chargement...'}
                    </div>
                  </div>
                )
              }
              return (
                <div key="field-baladia">
                  <OfficeDeliveryPicker
                    offices={offices}
                    wilayaId={wilayaId ?? null}
                    lang={lang}
                    baladia={baladia ?? ''}
                    stopdeskCode={watch('stopdesk_code')}
                    onChange={(commune, officeId) => {
                      setValue('baladia', commune, { shouldValidate: true })
                      setValue('stopdesk_code', officeId, { shouldValidate: true })
                    }}
                  />
                  {errors.baladia && <p data-error="true" className="text-xs mt-1.5" style={{ color: '#A32D2D' }}>{errors.baladia.message}</p>}
                </div>
              )
            }
            return null

          case 'phone':
            return (
              <div key="field-phone">
                <label className="dk-label">{translateStorefront('phone_number', lang)} <span style={{ color: '#D85A30' }}>*</span></label>
                <div className="relative">
                  <Phone className="w-[18px] h-[18px] absolute top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ right: isRtl ? 15 : 'auto', left: isRtl ? 'auto' : 15, color: DK.muted }} aria-hidden="true" />
                  <input {...register('customer_phone')} type="tel" inputMode="numeric" autoComplete="tel"
                    placeholder={lang === 'ar' ? 'اكتب رقم هاتفك هنا (مثال: 0612345678)' : lang === 'fr' ? 'Entrez votre numéro de téléphone (ex: 0612345678)' : 'Please enter your phone number'}
                    className="dk-field" dir="ltr"
                    style={{
                      textAlign: isRtl ? 'right' : 'left',
                      paddingRight: isRtl ? 46 : 18,
                      paddingLeft: isRtl ? 18 : 46
                    }} />
                </div>
                {errors.customer_phone && <p data-error="true" className="text-xs mt-1.5" style={{ color: '#A32D2D' }}>{errors.customer_phone.message}</p>}
              </div>
            )

          case 'phone2':
            return (
              <div key="field-phone2">
                <label className="dk-label">{translateStorefront('alternative_phone', lang)} {fieldsConfig.phone2?.required && <span style={{ color: '#D85A30' }}>*</span>}</label>
                <input {...register('customer_phone2')} type="tel" inputMode="numeric" autoComplete="tel"
                  placeholder={fieldsConfig.phone2?.required ? '0555 xx xx xx' : (lang === 'ar' ? 'اختياري' : 'Optionnel')} className="dk-field" />
                {errors.customer_phone2 && <p data-error="true" className="text-xs mt-1.5" style={{ color: '#A32D2D' }}>{errors.customer_phone2.message}</p>}
              </div>
            )

          case 'address':
            return deliveryType === 'home' ? (
              <div key="field-address">
                <label className="dk-label">{translateStorefront('address', lang)} {fieldsConfig.address?.required && <span style={{ color: '#D85A30' }}>*</span>}</label>
                <textarea {...register('address')} rows={2} autoComplete="street-address"
                  placeholder={lang === 'ar' ? 'الحي، الشارع، رقم البناية...' : 'Quartier, rue, numéro...'} className="dk-field" />
                {errors.address && <p data-error="true" className="text-xs mt-1.5" style={{ color: '#A32D2D' }}>{errors.address.message}</p>}
              </div>
            ) : null

          case 'notes':
            return (
              <div key="field-notes">
                <label className="dk-label">{translateStorefront('notes', lang)} {fieldsConfig.notes?.required && <span style={{ color: '#D85A30' }}>*</span>}</label>
                <textarea {...register('notes')} rows={2}
                  placeholder={lang === 'ar' ? 'أي تعليمات خاصة للتوصيل...' : 'Instructions spéciales...'} className="dk-field" />
                {errors.notes && <p data-error="true" className="text-xs mt-1.5" style={{ color: '#A32D2D' }}>{errors.notes.message}</p>}
              </div>
            )

          default:
            return null
        }
      })}

      {/* Quantity */}
      <div>
        <label className="dk-label">{translateStorefront('quantity', lang)}</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setValue('quantity', Math.max(1, quantity - 1))}
            className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold transition" style={stepBtn}>−</button>
          <span className="w-12 text-center font-bold text-lg" style={{ color: DK.ink }}>{quantity}</span>
          <button type="button" onClick={() => setValue('quantity', maxQty ? Math.min(maxQty, quantity + 1) : quantity + 1)}
            disabled={!!maxQty && quantity >= maxQty}
            className="w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold transition disabled:opacity-40" style={stepBtn}>+</button>
        </div>
        {!!maxQty && (
          <p className="text-xs mt-1.5" style={{ color: DK.muted }}>
            {lang === 'ar' ? 'الكمية المتوفرة: ' : lang === 'fr' ? 'Quantité disponible: ' : 'Available stock: '}{maxQty}
          </p>
        )}
      </div>

      {/* Order summary */}
      <div className="p-4 space-y-2 text-base rounded-2xl" style={{ background: DK.paper }}>
        <div className="flex justify-between" style={{ color: DK.muted }}>
          <span>{lang === 'ar' ? 'المنتج' : lang === 'fr' ? 'Produit' : 'Product'}{variantLabel ? ` (${variantLabel})` : ''} × {quantity}</span>
          <span className="tabular-nums">{formatDZD(product.price * quantity)}</span>
        </div>
        <div className="flex justify-between" style={{ color: DK.muted }}>
          <span>{lang === 'ar' ? 'رسوم التوصيل' : lang === 'fr' ? 'Frais de livraison' : 'Delivery fee'}</span>
          <span className="tabular-nums">{formatDZD(deliveryFee)}</span>
        </div>
        <div className="flex justify-between font-bold text-xl pt-2.5" style={{ color: DK.ink, borderTop: `0.5px solid ${DK.line}` }}>
          <span>{lang === 'ar' ? 'المجموع' : 'Total'}</span>
          <span className="tabular-nums" style={{ color: DK.accent }}>{formatDZD(total)}</span>
        </div>
      </div>

      {submitError && (
        <div data-submit-error="true" role="alert" className="flex items-start gap-2 text-sm p-3 rounded-2xl"
          style={{ background: '#FAECE7', color: '#A32D2D', border: '0.5px solid #F0997B' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <button type="submit" id="original-submit-btn" disabled={isSubmitting}
        className="dk-cta w-full rounded-2xl text-white font-bold py-3 flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95 disabled:opacity-60 disabled:animate-none"
        style={{ background: `linear-gradient(100deg, color-mix(in srgb, var(--pt-accent) 82%, #000), var(--pt-accent) 52%, color-mix(in srgb, var(--pt-accent) 84%, #fff))` }}>
        {isSubmitting
          ? <span className="flex items-center gap-2 text-lg"><Loader2 className="w-4 h-4 animate-spin" /> {translateStorefront('saving', lang)}</span>
          : <>
              <span className="flex items-center gap-2 text-lg tabular-nums">🛒 {translateStorefront('order_now', lang).replace(' 🛒', '')} — {formatDZD(total)}</span>
              <span className="text-[11px] font-medium opacity-90">{lang === 'ar' ? 'الدفع عند الاستلام' : lang === 'fr' ? 'Paiement à la livraison' : 'Cash on delivery'}</span>
            </>}
      </button>

      {/* Trust indicators near the CTA */}
      <div className="flex items-center justify-center gap-x-4 gap-y-1.5 flex-wrap text-[11px]" style={{ color: DK.muted }}>
        <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" style={{ color: DK.ok }} />{lang === 'ar' ? 'الدفع عند الاستلام' : lang === 'fr' ? 'Paiement à la livraison' : 'Cash on delivery'}</span>
        <span className="inline-flex items-center gap-1"><PhoneCall className="w-3.5 h-3.5" style={{ color: DK.accent }} />{lang === 'ar' ? 'نتصل بك لتأكيد الطلب' : lang === 'fr' ? 'Appel de confirmation' : 'We call to confirm'}</span>
        <span className="inline-flex items-center gap-1"><Truck className="w-3.5 h-3.5" style={{ color: DK.accent }} />{lang === 'ar' ? 'توصيل 58 ولاية' : lang === 'fr' ? 'Livraison 58 wilayas' : 'Delivery to 58 wilayas'}</span>
      </div>
    </form>
  )
}
