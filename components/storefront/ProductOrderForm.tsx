'use client'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronDown } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'
import { getBaladiasForWilaya } from '@/lib/algeria-baladias'
import type { Product, Store, Wilaya } from '@/types'

const schema = z.object({
  customer_name: z.string().min(2, 'الاسم مطلوب'),
  customer_phone: z.string().regex(/^(05|06|07)\d{8}$/, 'رقم الهاتف غير صالح'),
  customer_phone2: z.string().optional(),
  delivery_type: z.enum(['home', 'stopdesk']),
  wilaya_id: z.number({ required_error: 'اختر الولاية' }).int().min(1),
  baladia: z.string().optional(),
  address: z.string().optional(),
  stopdesk_code: z.string().optional(),
  quantity: z.number().int().min(1).max(99),
  coupon_code: z.string().optional(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.delivery_type === 'home' && (!data.baladia || data.baladia.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['baladia'],
      message: 'اختر البلدية التابعة لعنوانك',
    })
  }
})
type FormData = z.infer<typeof schema>

// Simple dependent البلدية dropdown — mirrors the cascade already used in
// ProductBuyBox/CheckoutForm, sourced from the complete algeria-baladias dataset.
function BaladiaField({ wilayaId, value, onChange, error }: {
  wilayaId: number | null
  value: string
  onChange: (v: string) => void
  error?: string
}) {
  const [open, setOpen] = useState(false)
  const options = getBaladiasForWilaya(wilayaId)

  if (!wilayaId) return null

  return (
    <div>
      <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--pt-text-soft)' }}>البلدية *</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none bg-white flex items-center justify-between"
          style={{ borderRadius: 'var(--pt-radius-md)' }}
          onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px var(--pt-accent-soft)' }}
          onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
        >
          <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || 'اختر البلدية'}</span>
          <ChevronDown size={15} className="text-gray-400" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>
        {open && (
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
            <div className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 shadow-lg p-1.5" style={{ borderRadius: 'var(--pt-radius-md)' }}>
              {options.map(b => (
                <button
                  key={b}
                  type="button"
                  onClick={() => { onChange(b); setOpen(false) }}
                  className="block w-full text-right px-3 py-2 rounded-lg text-sm transition hover:bg-gray-50"
                  style={value === b ? { background: 'var(--pt-accent-soft)', color: 'var(--pt-accent)', fontWeight: 700 } : { color: '#374151' }}
                >
                  {b}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

interface Props {
  product: Product; store: Store; wilayas: Wilaya[]
  variantKey?: string; variantLabel?: string; maxQty?: number
}

export default function ProductOrderForm({ product, store, wilayas, variantKey, variantLabel, maxQty }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState<Wilaya | null>(null)
  const [offices, setOffices] = useState<{ code: string; name: string }[]>([])
  const [loadingOffices, setLoadingOffices] = useState(false)
  const [hasProvider, setHasProvider] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delivery_type: 'home', quantity: 1, baladia: '' },
  })

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
    fetch(`/api/storefront/stopdesks?store_id=${store.id}&wilaya_id=${wilayaId}`)
      .then(res => res.json())
      .then(data => {
        setOffices(data.offices || [])
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

  const deliveryFee = selectedWilaya
    ? (deliveryType === 'stopdesk' ? selectedWilaya.delivery_fee_stopdesk : selectedWilaya.delivery_fee_home)
    : 0
  const total = product.price * quantity + deliveryFee

  const onSubmit = async (data: FormData) => {
    const isStopdesk = data.delivery_type === 'stopdesk'
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id: store.id,
        ...data,
        baladia: isStopdesk ? undefined : data.baladia,
        address: isStopdesk ? undefined : data.address,
        stopdesk_code: isStopdesk ? data.stopdesk_code : undefined,
        items: [{ product_id: product.id, quantity: data.quantity, variant_key: variantKey ?? 'default' }],
        source: 'storefront',
      }),
    })
    const json = await res.json()
    if (json.success) { setOrderId(json.order_number); setSubmitted(true) }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-6 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <h3 className="text-xl font-black text-green-800">تم تسجيل طلبك بنجاح!</h3>
        <p className="text-green-700">رقم الطلب: <strong>{orderId}</strong></p>
        <p className="text-sm text-green-600">سيتصل بك فريقنا قريباً لتأكيد الطلب</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4" style={{ background: 'var(--pt-surface)', border: '1px solid var(--pt-border)', borderRadius: 'var(--pt-radius-lg)' }}>
      <h3 className="pt-heading font-bold">اطلب الآن</h3>

      {/* Delivery Type */}
      <div className="grid grid-cols-2 gap-2">
        {([['home', 'توصيل للمنزل'], ['stopdesk', 'التوصيل للمكتب']] as const).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setValue('delivery_type', val)}
            className="py-2.5 text-sm font-semibold border transition"
            style={deliveryType === val
              ? { background: 'var(--pt-accent)', borderColor: 'var(--pt-accent)', color: 'var(--pt-btn-primary-text)', borderRadius: 'var(--pt-btn-radius)' }
              : { background: 'var(--pt-surface-soft)', borderColor: 'var(--pt-border)', color: 'var(--pt-text-soft)', borderRadius: 'var(--pt-btn-radius)' }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--pt-text-soft)' }}>الاسم الكامل *</label>
        <input
          {...register('customer_name')}
          placeholder="محمد بن علي"
          className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none bg-white text-gray-900"
          style={{ borderRadius: 'var(--pt-radius-md)' }}
        />
        {errors.customer_name && (
          <p className="text-red-500 text-xs mt-1">{errors.customer_name.message}</p>
        )}
      </div>

      {/* Wilaya */}
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--pt-text-soft)' }}>الولاية *</label>
        <select
          {...register('wilaya_id', { valueAsNumber: true })}
          onChange={e => {
            const id = parseInt(e.target.value)
            setValue('wilaya_id', id)
            setSelectedWilaya(wilayas.find(w => w.id === id) ?? null)
          }}
          className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none bg-white text-gray-900"
          style={{ borderRadius: 'var(--pt-radius-md)' }}
        >
          <option value="">اختر الولاية</option>
          {wilayas.map(w => (
            <option key={w.id} value={w.id}>{w.id} - {w.name_ar}</option>
          ))}
        </select>
        {errors.wilaya_id && <p className="text-red-500 text-xs mt-1">{errors.wilaya_id.message}</p>}
        {selectedWilaya && (
          <p className="text-xs mt-1" style={{ color: 'var(--pt-accent)' }}>
            رسوم التوصيل: {formatDZD(deliveryFee)} · {deliveryType === 'home' ? selectedWilaya.delivery_days_home : selectedWilaya.delivery_days_stopdesk}
          </p>
        )}
      </div>

      {/* Baladia (commune) — cascades from الولاية, required (Only for home delivery) */}
      {deliveryType === 'home' && (
        <BaladiaField
          wilayaId={wilayaId ?? null}
          value={baladia ?? ''}
          onChange={v => setValue('baladia', v, { shouldValidate: true })}
          error={errors.baladia?.message}
        />
      )}

      {/* Stopdesk / Delivery Office select/input */}
      {deliveryType === 'stopdesk' && wilayaId > 0 && hasProvider && (
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--pt-text-soft)' }}>
            مكتب التوصيل *
          </label>
          {loadingOffices ? (
            <div className="text-sm text-gray-500 py-2.5 px-3 border border-dashed rounded-xl bg-gray-50/50 flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
              جاري تحميل مكاتب التوصيل...
            </div>
          ) : (
            <select
              {...register('stopdesk_code', { required: 'يرجى اختيار مكتب التوصيل' })}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none bg-white text-gray-900"
              style={{ borderRadius: 'var(--pt-radius-md)' }}
              disabled={offices.length === 0}
            >
              {offices.length > 0 ? (
                <>
                  <option value="">اختر مكتب التوصيل...</option>
                  {offices.map(o => (
                    <option key={o.code} value={o.code}>{o.name}</option>
                  ))}
                </>
              ) : (
                <option value="">لا توجد مكاتب توصيل متاحة لهذه الولاية</option>
              )}
            </select>
          )}
          {errors.stopdesk_code && <p className="text-red-500 text-xs mt-1">{errors.stopdesk_code.message}</p>}
        </div>
      )}

      {/* Phone */}
      <div className="grid grid-cols-1 gap-3">
        {[
          { name: 'customer_phone', label: 'رقم الهاتف *', placeholder: '0555 xx xx xx' },
          { name: 'customer_phone2', label: 'رقم هاتف بديل', placeholder: 'اختياري' },
        ].map(f => (
          <div key={f.name}>
            <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--pt-text-soft)' }}>{f.label}</label>
            <input
              {...register(f.name as keyof FormData)}
              placeholder={f.placeholder}
              className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none bg-white text-gray-900"
              style={{ borderRadius: 'var(--pt-radius-md)' }}
            />
            {errors[f.name as keyof FormData] && (
              <p className="text-red-500 text-xs mt-1">{(errors[f.name as keyof FormData] as any)?.message}</p>
            )}
          </div>
        ))}
      </div>

      {/* Address */}
      {deliveryType === 'home' && (
        <div>
          <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--pt-text-soft)' }}>العنوان التفصيلي</label>
          <input {...register('address')} placeholder="الحي، الشارع، رقم البناية..."
            className="w-full border border-gray-200 px-3 py-2.5 text-sm outline-none bg-white text-gray-900" style={{ borderRadius: 'var(--pt-radius-md)' }} />
        </div>
      )}

      {/* Quantity */}
      <div>
        <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--pt-text-soft)' }}>الكمية</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setValue('quantity', Math.max(1, quantity - 1))}
            className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-bold transition"
            style={{ borderColor: 'var(--pt-border)', color: 'var(--pt-text)', background: 'var(--pt-surface-soft)' }}
          >−</button>
          <span className="w-12 text-center font-bold text-lg" style={{ color: 'var(--pt-text)' }}>{quantity}</span>
          <button type="button" onClick={() => setValue('quantity', maxQty ? Math.min(maxQty, quantity + 1) : quantity + 1)}
            disabled={!!maxQty && quantity >= maxQty}
            className="w-9 h-9 rounded-full border flex items-center justify-center text-lg font-bold transition disabled:opacity-40"
            style={{ borderColor: 'var(--pt-border)', color: 'var(--pt-text)', background: 'var(--pt-surface-soft)' }}
          >+</button>
        </div>
        {!!maxQty && (
          <p className="text-xs mt-1" style={{ color: 'var(--pt-text-muted)' }}>الكمية المتوفرة: {maxQty}</p>
        )}
      </div>

      {/* Order Summary */}
      <div className="p-3 space-y-1.5 text-sm" style={{ background: 'var(--pt-surface-soft)', borderRadius: 'var(--pt-radius-md)' }}>
        <div className="flex justify-between" style={{ color: 'var(--pt-text-soft)' }}>
          <span>المنتج{variantLabel ? ` (${variantLabel})` : ''} × {quantity}</span>
          <span>{formatDZD(product.price * quantity)}</span>
        </div>
        <div className="flex justify-between" style={{ color: 'var(--pt-text-soft)' }}>
          <span>رسوم التوصيل</span>
          <span>{formatDZD(deliveryFee)}</span>
        </div>
        <div className="flex justify-between font-black text-base pt-1.5" style={{ color: 'var(--pt-text)', borderTop: '1px solid var(--pt-border)' }}>
          <span>المجموع</span>
          <span style={{ color: 'var(--pt-accent)' }}>{formatDZD(total)}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full disabled:opacity-50 font-black py-3.5 text-base transition"
        style={{ background: 'var(--pt-btn-primary-bg)', color: 'var(--pt-btn-primary-text)', borderRadius: 'var(--pt-btn-radius)', boxShadow: 'var(--pt-shadow-md)' }}
      >
        {isSubmitting ? 'جارٍ تسجيل الطلب...' : `🛒 اطلب الآن — ${formatDZD(total)}`}
      </button>

      <p className="text-xs text-center" style={{ color: 'var(--pt-text-muted)' }}>الدفع عند الاستلام · توصيل لكل ولايات الجزائر</p>
    </form>
  )
}
