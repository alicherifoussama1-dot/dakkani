'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { formatDZD } from '@/lib/utils/format'
import type { Product, Store, Wilaya } from '@/types'

const schema = z.object({
  customer_name: z.string().min(2, 'الاسم مطلوب'),
  customer_phone: z.string().regex(/^(05|06|07)\d{8}$/, 'رقم الهاتف غير صالح'),
  customer_phone2: z.string().optional(),
  delivery_type: z.enum(['home', 'stopdesk']),
  wilaya_id: z.number({ required_error: 'اختر الولاية' }).int().min(1),
  address: z.string().optional(),
  quantity: z.number().int().min(1).max(99),
  coupon_code: z.string().optional(),
  notes: z.string().optional(),
})
type FormData = z.infer<typeof schema>

interface Props { product: Product; store: Store; wilayas: Wilaya[] }

export default function ProductOrderForm({ product, store, wilayas }: Props) {
  const [submitted, setSubmitted] = useState(false)
  const [orderId, setOrderId] = useState('')
  const [selectedWilaya, setSelectedWilaya] = useState<Wilaya | null>(null)

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { delivery_type: 'home', quantity: 1 },
  })

  const deliveryType = watch('delivery_type')
  const quantity = watch('quantity') || 1
  const deliveryFee = selectedWilaya
    ? (deliveryType === 'stopdesk' ? selectedWilaya.delivery_fee_stopdesk : selectedWilaya.delivery_fee_home)
    : 0
  const total = product.price * quantity + deliveryFee

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        store_id: store.id,
        ...data,
        items: [{ product_id: product.id, quantity: data.quantity, variant_key: 'default' }],
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
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white rounded-2xl border border-gray-100 p-4">
      <h3 className="font-bold text-gray-900">اطلب الآن</h3>

      {/* Delivery Type */}
      <div className="grid grid-cols-2 gap-2">
        {([['home', 'توصيل للمنزل'], ['stopdesk', 'نقطة توزيع']] as const).map(([val, label]) => (
          <button
            key={val}
            type="button"
            onClick={() => setValue('delivery_type', val)}
            className={`py-2.5 rounded-xl text-sm font-semibold border transition ${
              deliveryType === val
                ? 'bg-[#E8431A] border-dakkani-500 text-white'
                : 'bg-gray-50 border-gray-200 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Wilaya */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الولاية *</label>
        <select
          {...register('wilaya_id', { valueAsNumber: true })}
          onChange={e => {
            const id = parseInt(e.target.value)
            setValue('wilaya_id', id)
            setSelectedWilaya(wilayas.find(w => w.id === id) ?? null)
          }}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none bg-white"
        >
          <option value="">اختر الولاية</option>
          {wilayas.map(w => (
            <option key={w.id} value={w.id}>{w.id} - {w.name_ar}</option>
          ))}
        </select>
        {errors.wilaya_id && <p className="text-red-500 text-xs mt-1">{errors.wilaya_id.message}</p>}
        {selectedWilaya && (
          <p className="text-xs text-[#E8431A] mt-1">
            رسوم التوصيل: {formatDZD(deliveryFee)} · {deliveryType === 'home' ? selectedWilaya.delivery_days_home : selectedWilaya.delivery_days_stopdesk}
          </p>
        )}
      </div>

      {/* Name & Phone */}
      <div className="grid grid-cols-1 gap-3">
        {[
          { name: 'customer_name', label: 'الاسم الكامل *', placeholder: 'محمد بن علي' },
          { name: 'customer_phone', label: 'رقم الهاتف *', placeholder: '0555 xx xx xx' },
          { name: 'customer_phone2', label: 'رقم هاتف بديل', placeholder: 'اختياري' },
        ].map(f => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            <input
              {...register(f.name as keyof FormData)}
              placeholder={f.placeholder}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
            />
            {errors[f.name as keyof FormData] && (
              <p className="text-red-500 text-xs mt-1">{(errors[f.name as keyof FormData] as any)?.message}</p>
            )}
          </div>
        ))}
      </div>

      {deliveryType === 'home' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">العنوان التفصيلي</label>
          <input {...register('address')} placeholder="الحي، الشارع، رقم البناية..."
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none" />
        </div>
      )}

      {/* Quantity */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">الكمية</label>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setValue('quantity', Math.max(1, quantity - 1))}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-lg font-bold hover:bg-gray-50">−</button>
          <span className="w-12 text-center font-bold text-lg">{quantity}</span>
          <button type="button" onClick={() => setValue('quantity', quantity + 1)}
            className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-lg font-bold hover:bg-gray-50">+</button>
        </div>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-xl p-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>المنتج × {quantity}</span>
          <span>{formatDZD(product.price * quantity)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>رسوم التوصيل</span>
          <span>{formatDZD(deliveryFee)}</span>
        </div>
        <div className="flex justify-between font-black text-gray-900 text-base border-t border-gray-200 pt-1.5">
          <span>المجموع</span>
          <span className="text-[#E8431A]">{formatDZD(total)}</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#E8431A] hover:bg-[#C73615] disabled:opacity-50 text-white font-black py-3.5 rounded-xl text-base transition"
      >
        {isSubmitting ? 'جارٍ تسجيل الطلب...' : `🛒 اطلب الآن — ${formatDZD(total)}`}
      </button>

      <p className="text-xs text-gray-400 text-center">الدفع عند الاستلام · توصيل لكل ولايات الجزائر</p>
    </form>
  )
}
