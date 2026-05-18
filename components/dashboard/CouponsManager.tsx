'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDZD, formatDateShort } from '@/lib/utils/format'
import { Plus, Trash2, Copy } from 'lucide-react'
import type { Coupon } from '@/types'

const schema = z.object({
  code: z.string().min(3).toUpperCase(),
  type: z.enum(['percentage', 'fixed', 'free_shipping']),
  value: z.number().positive(),
  min_order_amount: z.number().optional(),
  max_uses: z.number().int().positive().optional(),
  expires_at: z.string().optional(),
  is_active: z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

const TYPE_LABELS = { percentage: 'نسبة مئوية %', fixed: 'مبلغ ثابت دج', free_shipping: 'شحن مجاني' }

export default function CouponsManager({
  storeId, initialCoupons,
}: { storeId: string; initialCoupons: Coupon[] }) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'percentage', is_active: true },
  })

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    await supabase.from('coupons').insert({
      ...data,
      store_id: storeId,
      code: data.code.toUpperCase(),
      min_order_amount: data.min_order_amount ?? null,
      max_uses: data.max_uses ?? null,
      expires_at: data.expires_at || null,
    })
    reset()
    setShowForm(false)
    router.refresh()
  }

  const toggleActive = async (coupon: Coupon) => {
    const supabase = createClient()
    await supabase.from('coupons').update({ is_active: !coupon.is_active }).eq('id', coupon.id)
    router.refresh()
  }

  const deleteCoupon = async (id: string) => {
    if (!confirm('حذف هذا الكوبون؟')) return
    const supabase = createClient()
    await supabase.from('coupons').delete().eq('id', id)
    router.refresh()
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatValue = (coupon: Coupon) => {
    if (coupon.type === 'percentage') return `${coupon.value}%`
    if (coupon.type === 'fixed') return formatDZD(coupon.value)
    return 'شحن مجاني'
  }

  return (
    <div className="space-y-4">
      {/* Add coupon button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-dakkani-500 hover:bg-dakkani-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          كوبون جديد
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-dakkani-100 p-5 space-y-4 shadow-sm" dir="rtl">
          <h3 className="font-bold text-gray-900">إنشاء كوبون جديد</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كود الكوبون *</label>
              <input
                {...register('code')}
                placeholder="SUMMER20"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm uppercase focus:ring-2 focus:ring-dakkani-500 outline-none"
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الخصم *</label>
              <select
                {...register('type')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-dakkani-500 outline-none"
              >
                {Object.entries(TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">قيمة الخصم *</label>
              <input
                {...register('value', { valueAsNumber: true })}
                type="number"
                min="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-dakkani-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للطلب (دج)</label>
              <input
                {...register('min_order_amount', { valueAsNumber: true })}
                type="number"
                min="0"
                placeholder="اختياري"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-dakkani-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأقصى للاستخدام</label>
              <input
                {...register('max_uses', { valueAsNumber: true })}
                type="number"
                min="1"
                placeholder="غير محدود"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-dakkani-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الانتهاء</label>
              <input
                {...register('expires_at')}
                type="datetime-local"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-dakkani-500 outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-dakkani-500 hover:bg-dakkani-600 text-white font-bold px-5 py-2 rounded-lg text-sm transition disabled:opacity-50"
            >
              {isSubmitting ? 'جارٍ الإنشاء...' : 'إنشاء الكوبون'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 text-sm hover:text-gray-700">
              إلغاء
            </button>
          </div>
        </form>
      )}

      {/* Coupons table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['الكود', 'النوع', 'الخصم', 'الاستخدام', 'الانتهاء', 'الحالة', ''].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {initialCoupons.map(c => (
              <tr key={c.id} className="hover:bg-gray-50 transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-dakkani-600">{c.code}</span>
                    <button
                      onClick={() => copyCode(c.code)}
                      className="text-gray-300 hover:text-gray-500"
                      title="نسخ"
                    >
                      {copied === c.code ? '✓' : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{TYPE_LABELS[c.type]}</td>
                <td className="px-4 py-3 font-semibold text-gray-900">{formatValue(c)}</td>
                <td className="px-4 py-3 text-gray-600">
                  {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {c.expires_at ? formatDateShort(c.expires_at) : '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(c)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${
                      c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {c.is_active ? 'نشط' : 'معطل'}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => deleteCoupon(c.id)}
                    className="text-red-400 hover:text-red-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {initialCoupons.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">لا توجد كوبونات</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
