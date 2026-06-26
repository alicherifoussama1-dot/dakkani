'use client'
import { useEffect, useState, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown, Loader2, ShieldCheck, PhoneCall, Truck, AlertCircle } from 'lucide-react'
import StopdeskPicker from './StopdeskPicker'
import { formatDZD } from '@/lib/utils/format'
import { getBaladiasForWilaya } from '@/lib/algeria-baladias'
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

// Simple dependent البلدية dropdown — mirrors the cascade already used in
// ProductBuyBox/CheckoutForm, sourced from the complete algeria-baladias dataset.
function BaladiaField({ wilayaId, value, onChange, error, textLabel, inputClass, theme, lang }: {
  wilayaId: number | null
  value: string
  onChange: (v: string) => void
  error?: string
  textLabel: string
  inputClass: string
  theme: string
  lang: Locale
}) {
  const [open, setOpen] = useState(false)
  const options = getBaladiasForWilaya(wilayaId)

  if (!wilayaId) {
    return (
      <div>
        <label className={textLabel}>{translateStorefront('baladia', lang)} *</label>
        <button
          type="button"
          disabled
          className={`${inputClass} opacity-50 cursor-not-allowed flex items-center justify-between text-start rtl:text-right`}
        >
          <span>{translateStorefront('select_wilaya', lang)}</span>
          <ChevronDown size={15} className="text-gray-400" />
        </button>
      </div>
    )
  }

  return (
    <div>
      <label className={textLabel}>{translateStorefront('baladia', lang)} *</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`${inputClass} flex items-center justify-between text-start rtl:text-right`}
          onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--pt-accent-soft)' }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          <span className={value ? (theme === 'glassmorphism' ? 'text-white' : 'text-gray-900') : 'text-gray-450'}>
            {value || translateStorefront('select_commune', lang)}
          </span>
          <ChevronDown size={15} className="text-gray-400" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div className={`absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto shadow-lg p-1.5 ${
              theme === 'glassmorphism' ? 'bg-slate-900 border border-slate-700/50 text-white' : 'bg-white border border-gray-200 text-gray-950'
            }`} style={{ borderRadius: 'var(--pt-radius-md, 12px)' }}>
              {options.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => { onChange(b); setOpen(false) }}
                  className={`block w-full text-start rtl:text-right px-3 py-2.5 rounded-lg text-sm transition ${
                    theme === 'glassmorphism' ? 'hover:bg-slate-800' : 'hover:bg-gray-50'
                  }`}
                  style={value === b ? { background: 'var(--pt-accent-soft, #EBF5FF)', color: 'var(--pt-accent, #0D6EFD)', fontWeight: 750 } : {}}
                >
                  {b}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {error && <p data-error="true" className="text-red-500 text-xs mt-1">{error}</p>}
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
  const [offices, setOffices] = useState<{ code: string; name: string; commune: string }[]>([])
  const [loadingOffices, setLoadingOffices] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)

  // Load checkout settings and theme
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

  const fieldsConfig = settings?.checkout_fields ?? {
    phone2: { visible: true, required: false },
    address: { visible: true, required: false },
    notes: { visible: true, required: false }
  }

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

  // Fetch stopdesk offices when wilaya changes to check if provider is active
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
        setOffices((data.offices || []).map((o: any) => ({
          code: o.code ?? o.id,
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
  }, [wilayaId, store.id, setValue])

  useEffect(() => {
    if (deliveryType !== 'stopdesk') {
      setValue('stopdesk_code', undefined)
    } else {
      setValue('stopdesk_code', '')
    }
  }, [deliveryType, setValue])

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
    const isStopdesk = data.delivery_type === 'stopdesk'
    const genericErr = lang === 'ar'
      ? 'تعذّر إرسال الطلب. تحقّق من اتصالك وحاول مرة أخرى، أو تواصل معنا.'
      : lang === 'fr'
        ? 'Échec de l\'envoi de la commande. Vérifiez votre connexion et réessayez.'
        : 'Could not submit your order. Check your connection and try again.'
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: store.id,
          ...data,
          baladia: data.baladia, // commune name for both; stopdesk = office commune
          address: isStopdesk ? undefined : data.address,
          stopdesk_code: isStopdesk ? data.stopdesk_code : undefined,
          items: [{ product_id: product.id, quantity: data.quantity, variant_key: variantKey ?? 'default' }],
          source: 'storefront',
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok && json.success) {
        setOrderId(json.order_number)
        setSubmitted(true)
      } else {
        setSubmitError(json.error || genericErr)
        formRef.current?.querySelector<HTMLElement>('[data-submit-error="true"]')
          ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } catch {
      setSubmitError(genericErr)
      formRef.current?.querySelector<HTMLElement>('[data-submit-error="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  if (submitted) {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        aria-live="polite"
        className={`border rounded-2xl p-6 text-center space-y-3 outline-none ${
        theme === 'glassmorphism' ? 'bg-indigo-950/20 border-indigo-500/30 text-indigo-200' : 'bg-green-50 border-green-200'
      }`}>
        <div className="text-4xl">✅</div>
        <h3 className={`text-xl font-black ${theme === 'glassmorphism' ? 'text-indigo-300' : 'text-green-800'}`}>
          {translateStorefront('order_success', lang)}
        </h3>
        <p className={theme === 'glassmorphism' ? 'text-indigo-200/80' : 'text-green-700'}>
          {lang === 'ar' ? 'رقم الطلب: ' : lang === 'fr' ? 'Numéro de commande: ' : 'Order Number: '} <strong>{orderId}</strong>
        </p>
        <p className={`text-sm ${theme === 'glassmorphism' ? 'text-indigo-200/60' : 'text-green-600'}`}>
          {translateStorefront('order_success_desc', lang)}
        </p>
      </div>
    )
  }

  // Style classes based on theme
  let cardClass = "space-y-4 p-4"
  let cardStyle = { background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' } as any
  let inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none bg-white text-gray-900"
  let textPrimary = "text-gray-900"
  let textSecondary = "text-gray-500"
  let textLabel = "block text-sm font-medium text-gray-700 mb-1"

  let btnClass = "w-full disabled:opacity-50 font-black py-3.5 text-base transition"
  let btnStyle = { background: 'var(--pt-btn-primary-bg, #0D6EFD)', color: 'var(--pt-btn-primary-text, #fff)', borderRadius: 'var(--pt-btn-radius, 12px)', boxShadow: 'var(--pt-shadow-md)' } as any

  if (theme === 'modern') {
    cardClass = "bg-[#FFFDFB] rounded-3xl border-2 border-dashed border-amber-350 shadow-[0_8px_30px_rgb(0,0,0,0.015)] p-6 space-y-4 transition-all duration-300 hover:shadow-[0_8px_30px_rgb(0,0,0,0.035)]"
    cardStyle = {} as any
    inputClass = "w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm bg-white focus:border-amber-500 focus:ring-0 outline-none transition-all text-slate-805 shadow-sm focus:shadow-md"
    textPrimary = "text-slate-850"
    textSecondary = "text-slate-500"
    textLabel = "block text-sm font-semibold text-slate-700 mb-1"
    btnClass = "w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:via-orange-600 hover:to-red-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl text-base transition shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transform hover:scale-[1.01] duration-200"
    btnStyle = {} as any
  } else if (theme === 'glassmorphism') {
    cardClass = "bg-slate-900/60 backdrop-blur-2xl border-2 border-indigo-500/20 shadow-2xl rounded-3xl p-6 space-y-4 text-slate-200"
    cardStyle = {} as any
    inputClass = "w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder-slate-500"
    textPrimary = "text-white"
    textSecondary = "text-slate-400"
    textLabel = "block text-sm font-medium text-slate-300 mb-1"
    btnClass = "w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 disabled:opacity-60 text-white font-black py-4 rounded-2xl text-base transition shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 border border-indigo-400/20 transform hover:scale-[1.01] duration-200"
    btnStyle = {} as any
  } else if (theme === 'compact') {
    cardClass = "bg-blue-50/20 border-2 border-dashed border-blue-200 rounded-xl p-4 space-y-3 shadow-sm"
    cardStyle = {} as any
    inputClass = "w-full border border-gray-305 rounded-lg px-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none bg-white text-gray-800"
    textPrimary = "text-gray-800"
    textSecondary = "text-gray-500"
    textLabel = "block text-xs font-semibold text-gray-600 mb-0.5"
    btnClass = "w-full bg-blue-600 hover:bg-blue-705 disabled:opacity-60 text-white font-bold py-3.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 hover:shadow-md"
    btnStyle = {} as any
  } else {
    // Default / classic: clean card outline with a solid border and subtle shadows
    cardClass = "bg-white rounded-3xl border-2 border-gray-200/80 shadow-[0_10px_30px_rgba(0,0,0,0.03)] p-6 space-y-4"
    cardStyle = {} as any
    inputClass = "w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-[#0D6EFD] focus:ring-2 focus:ring-[#0D6EFD]/10 outline-none bg-white text-gray-900 transition-all"
    textPrimary = "text-gray-900"
    textSecondary = "text-gray-500"
    textLabel = "block text-sm font-medium text-gray-700 mb-1"
    btnClass = "w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] disabled:opacity-60 text-white font-black py-4 rounded-2xl text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
  }

  const isRtl = lang === 'ar'

  return (
    <form ref={formRef} onSubmit={handleSubmit(onSubmit, onInvalid)} className={cardClass} style={cardStyle} dir={isRtl ? 'rtl' : 'ltr'}>
      <h3 className={`font-bold text-lg ${textPrimary}`}>{translateStorefront('buy_now', lang)}</h3>

      {/* Delivery Type */}
      <div className="grid grid-cols-2 gap-2">
        {([[ 'home', translateStorefront('home_delivery', lang) ], [ 'stopdesk', translateStorefront('stopdesk_delivery', lang) ]] as const).map(([val, label]) => {
          const isActive = deliveryType === val
          let activeBtnStyle = {}
          let activeBtnClass = "py-3 text-sm font-semibold border transition"

          if (theme === 'glassmorphism') {
            activeBtnClass += ` rounded-xl ${
              isActive
                ? 'border-indigo-500 bg-indigo-950/40 text-indigo-200'
                : 'border-slate-700/50 hover:border-slate-600 text-slate-400 bg-transparent'
            }`
          } else if (theme === 'modern') {
            activeBtnClass += ` rounded-xl ${
              isActive
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-slate-200 hover:border-slate-300 text-slate-605 bg-slate-50/50'
            }`
          } else if (theme === 'compact') {
            activeBtnClass += ` rounded-lg ${
              isActive
                ? 'border-blue-600 bg-blue-50 text-blue-700'
                : 'border-gray-300 hover:border-gray-400 text-gray-650 bg-gray-50'
            }`
          } else {
            activeBtnStyle = isActive
              ? { background: 'var(--pt-accent, #0d6efd)', borderColor: 'var(--pt-accent, #0d6efd)', color: 'var(--pt-btn-primary-text, #fff)', borderRadius: 'var(--pt-btn-radius, 12px)' }
              : { background: 'var(--pt-surface-soft, #f8f9fa)', borderColor: 'var(--pt-border, #e5e7eb)', color: 'var(--pt-text-soft, #4b5563)', borderRadius: 'var(--pt-btn-radius, 12px)' }
          }

          return (
            <button
              key={val}
              type="button"
              onClick={() => setValue('delivery_type', val)}
              className={activeBtnClass}
              style={activeBtnStyle}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* Render configurable fields in order */}
      {fieldOrder.map(fieldId => {
        // Skip phone2, address, notes if they are hidden in settings
        if (fieldId === 'phone2' && !fieldsConfig.phone2?.visible) return null
        if (fieldId === 'address' && !fieldsConfig.address?.visible) return null
        if (fieldId === 'notes' && !fieldsConfig.notes?.visible) return null

        switch (fieldId) {
          case 'name':
            return (
              <div key="field-name">
                <label className={textLabel}>{translateStorefront('full_name', lang)} <span className="text-red-500">*</span></label>
                <input
                  {...register('customer_name')}
                  autoComplete="name"
                  placeholder={lang === 'ar' ? 'محمد بن علي' : 'Mohamed Benali'}
                  className={inputClass}
                />
                {errors.customer_name && (
                  <p data-error="true" className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>
                )}
              </div>
            )

          case 'wilaya':
            return (
              <div key="field-wilaya">
                <label className={textLabel}>{translateStorefront('wilaya', lang)} <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    {...register('wilaya_id', { valueAsNumber: true })}
                    onChange={e => {
                      const id = parseInt(e.target.value)
                      setValue('wilaya_id', id)
                      setSelectedWilaya(wilayas.find(w => w.id === id) ?? null)
                    }}
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="" style={{ background: theme === 'glassmorphism' ? '#0f172a' : '#fff' }}>{translateStorefront('select_wilaya', lang)}</option>
                    {wilayas.map(w => (
                      <option key={w.id} value={w.id} style={{ background: theme === 'glassmorphism' ? '#0f172a' : '#fff' }}>
                        {w.id} - {lang === 'ar' ? w.name_ar : (w.name_fr || w.name_ar)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className={`absolute ${isRtl ? 'left-3' : 'right-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-450 pointer-events-none`} />
                </div>
                {errors.wilaya_id && <p data-error="true" className="text-red-500 text-xs mt-1">{errors.wilaya_id.message}</p>}
                {selectedWilaya && (
                  <p className="text-xs mt-1" style={{ color: theme === 'glassmorphism' ? '#818cf8' : 'var(--pt-accent)' }}>
                    {lang === 'ar' ? 'رسوم التوصيل: ' : lang === 'fr' ? 'Frais de livraison: ' : 'Delivery fee: '}{formatDZD(deliveryFee)} · {deliveryType === 'home' ? selectedWilaya.delivery_days_home : selectedWilaya.delivery_days_stopdesk}
                  </p>
                )}
              </div>
            )

          case 'baladia':
            if (deliveryType === 'home') {
              return (
                <div key="field-baladia">
                  <BaladiaField
                    wilayaId={wilayaId ?? null}
                    value={baladia ?? ''}
                    onChange={v => setValue('baladia', v, { shouldValidate: true })}
                    error={errors.baladia?.message}
                    textLabel={textLabel}
                    inputClass={inputClass}
                    theme={theme}
                    lang={lang}
                  />
                </div>
              )
            }
            if (deliveryType === 'stopdesk' && wilayaId > 0 && hasProvider) {
              return (
                <div key="field-baladia">
                  <label className={textLabel}>{translateStorefront('office', lang)} <span className="text-red-500">*</span></label>
                  {loadingOffices ? (
                    <div className="text-sm text-gray-500 py-2.5 px-3 border border-dashed rounded-xl bg-gray-50/50 flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> {lang === 'ar' ? 'جارٍ تحميل البلديات...' : 'Chargement...'}
                    </div>
                  ) : offices.length === 0 ? (
                    <div className="text-sm text-gray-400 py-2.5 px-3 border rounded-xl">{lang === 'ar' ? 'لا توجد مكاتب متوفرة لهذه الولاية' : 'Aucun bureau disponible'}</div>
                  ) : (
                    <StopdeskPicker
                      offices={offices}
                      value={watch('stopdesk_code')}
                      dark={theme === 'glassmorphism'}
                      onSelect={(o) => {
                        setValue('baladia', o.commune || o.name, { shouldValidate: true })
                        setValue('stopdesk_code', o.code, { shouldValidate: true })
                      }}
                    />
                  )}
                  {errors.baladia && <p data-error="true" className="text-red-500 text-xs mt-1">{errors.baladia.message}</p>}
                </div>
              )
            }
            return null

          case 'phone':
            return (
              <div key="field-phone">
                <label className={textLabel}>{translateStorefront('phone_number', lang)} <span className="text-red-500">*</span></label>
                <input
                  {...register('customer_phone')}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder="0555 xx xx xx"
                  className={inputClass}
                />
                {errors.customer_phone && (
                  <p data-error="true" className="text-red-500 text-xs mt-1">{errors.customer_phone.message}</p>
                )}
              </div>
            )

          case 'phone2':
            return (
              <div key="field-phone2">
                <label className={textLabel}>{translateStorefront('alternative_phone', lang)} {fieldsConfig.phone2?.required && <span className="text-red-500">*</span>}</label>
                <input
                  {...register('customer_phone2')}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  placeholder={fieldsConfig.phone2?.required ? "0555 xx xx xx" : (lang === 'ar' ? 'اختياري' : 'Optionnel')}
                  className={inputClass}
                />
                {errors.customer_phone2 && (
                  <p data-error="true" className="text-red-500 text-xs mt-1">{errors.customer_phone2.message}</p>
                )}
              </div>
            )

          case 'address':
            return deliveryType === 'home' ? (
              <div key="field-address">
                <label className={textLabel}>{translateStorefront('address', lang)} {fieldsConfig.address?.required && <span className="text-red-500">*</span>}</label>
                <textarea
                  {...register('address')}
                  rows={2}
                  autoComplete="street-address"
                  placeholder={lang === 'ar' ? 'الحي، الشارع، رقم البناية...' : 'Quartier, rue, numéro...'}
                  className={`${inputClass} resize-none`}
                />
                {errors.address && <p data-error="true" className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
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
                {errors.notes && <p data-error="true" className="text-red-500 text-xs mt-1">{errors.notes.message}</p>}
              </div>
            )

          default:
            return null
        }
      })}

      {/* Quantity */}
      <div>
        <label className={textLabel}>{translateStorefront('quantity', lang)}</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setValue('quantity', Math.max(1, quantity - 1))}
            className="w-11 h-11 rounded-full border flex items-center justify-center text-lg font-bold transition"
            style={theme === 'glassmorphism'
              ? { borderColor: 'rgba(255,255,255,0.15)', color: '#fff', background: 'rgba(255,255,255,0.05)' }
              : { borderColor: 'var(--pt-border)', color: 'var(--pt-text)', background: 'var(--pt-surface-soft)' }}
          >−</button>
          <span className="w-12 text-center font-bold text-lg" style={{ color: theme === 'glassmorphism' ? '#fff' : 'var(--pt-text)' }}>{quantity}</span>
          <button type="button" onClick={() => setValue('quantity', maxQty ? Math.min(maxQty, quantity + 1) : quantity + 1)}
            disabled={!!maxQty && quantity >= maxQty}
            className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-bold transition disabled:opacity-40"
            style={theme === 'glassmorphism'
              ? { borderColor: 'rgba(255,255,255,0.15)', color: '#fff', background: 'rgba(255,255,255,0.05)' }
              : { borderColor: 'var(--pt-border)', color: 'var(--pt-text)', background: 'var(--pt-surface-soft)' }}
          >+</button>
        </div>
        {!!maxQty && (
          <p className="text-xs mt-1" style={{ color: theme === 'glassmorphism' ? '#94a3b8' : 'var(--pt-text-muted)' }}>
            {lang === 'ar' ? 'الكمية المتوفرة: ' : lang === 'fr' ? 'Quantité disponible: ' : 'Available stock: '}{maxQty}
          </p>
        )}
      </div>

      {/* Order Summary */}
      <div className="p-3 space-y-1.5 text-sm" style={theme === 'glassmorphism'
        ? { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 'var(--pt-radius-md, 12px)' }
        : { background: 'var(--pt-surface-soft)', borderRadius: 'var(--pt-radius-md)' }}>
        <div className="flex justify-between" style={{ color: theme === 'glassmorphism' ? '#cbd5e1' : 'var(--pt-text-soft)' }}>
          <span>{lang === 'ar' ? 'المنتج' : lang === 'fr' ? 'Produit' : 'Product'}{variantLabel ? ` (${variantLabel})` : ''} × {quantity}</span>
          <span>{formatDZD(product.price * quantity)}</span>
        </div>
        <div className="flex justify-between" style={{ color: theme === 'glassmorphism' ? '#cbd5e1' : 'var(--pt-text-soft)' }}>
          <span>{lang === 'ar' ? 'رسوم التوصيل' : lang === 'fr' ? 'Frais de livraison' : 'Delivery fee'}</span>
          <span>{formatDZD(deliveryFee)}</span>
        </div>
        <div className="flex justify-between font-black text-base pt-1.5" style={{ color: theme === 'glassmorphism' ? '#fff' : 'var(--pt-text)', borderTop: theme === 'glassmorphism' ? '1px solid rgba(255,255,255,0.08)' : '1px solid var(--pt-border)' }}>
          <span>{lang === 'ar' ? 'المجموع' : 'Total'}</span>
          <span style={{ color: theme === 'glassmorphism' ? '#818cf8' : 'var(--pt-accent)' }}>{formatDZD(total)}</span>
        </div>
      </div>

      {submitError && (
        <div data-submit-error="true" role="alert" className="flex items-start gap-2 text-sm p-3"
          style={{ background: 'color-mix(in srgb, var(--pt-danger) 10%, transparent)', color: 'var(--pt-danger)', border: '1px solid color-mix(in srgb, var(--pt-danger) 30%, transparent)', borderRadius: 'var(--pt-radius-md)' }}>
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className={btnClass}
        style={btnStyle}
      >
        {isSubmitting
          ? <><Loader2 className="w-4 h-4 animate-spin" /> {translateStorefront('saving', lang)}</>
          : `${translateStorefront('order_now', lang).replace(' 🛒', '')} — ${formatDZD(total)}`}
      </button>

      {/* Trust indicators near the CTA — reduce COD hesitation at the decision point */}
      <div className="flex items-center justify-center gap-x-4 gap-y-1.5 flex-wrap text-[11px]" style={{ color: 'var(--pt-text-muted)' }}>
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--pt-success)' }} />
          {lang === 'ar' ? 'الدفع عند الاستلام' : lang === 'fr' ? 'Paiement à la livraison' : 'Cash on delivery'}
        </span>
        <span className="inline-flex items-center gap-1">
          <PhoneCall className="w-3.5 h-3.5" style={{ color: 'var(--pt-accent)' }} />
          {lang === 'ar' ? 'نتصل بك لتأكيد الطلب' : lang === 'fr' ? 'Appel de confirmation' : 'We call to confirm'}
        </span>
        <span className="inline-flex items-center gap-1">
          <Truck className="w-3.5 h-3.5" style={{ color: 'var(--pt-accent)' }} />
          {lang === 'ar' ? 'توصيل 58 ولاية' : lang === 'fr' ? 'Livraison 58 wilayas' : 'Delivery to 58 wilayas'}
        </span>
      </div>
    </form>
  )
}
