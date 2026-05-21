'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDZD, formatDateShort } from '@/lib/utils/format'
import { Plus, Trash2, Copy, Tag } from 'lucide-react'
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

const TYPE_LABELS: Record<string, string> = { percentage: 'نسبة مئوية %', fixed: 'مبلغ ثابت دج', free_shipping: 'شحن مجاني' }

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
    <div className="space-y-4" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm gap-1.5">
          <Plus size={14} />كوبون جديد
        </button>
      </div>

      {showForm && (
        <div className="card p-5 space-y-4" dir="rtl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <h3 className="font-bold text-sm" style={{color:'var(--color-text-primary)'}}>إنشاء كوبون جديد</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>كود الكوبون *</label>
                <input {...register('code')} placeholder="SUMMER20" className="input text-sm uppercase" dir="ltr" />
                {errors.code && <p className="text-xs mt-1" style={{color:'var(--color-error)'}}>{errors.code.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>نوع الخصم *</label>
                <select {...register('type')} className="input text-sm">
                  {Object.entries(TYPE_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>قيمة الخصم *</label>
                <input {...register('value', { valueAsNumber: true })} type="number" min="0" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الحد الأدنى للطلب (دج)</label>
                <input {...register('min_order_amount', { valueAsNumber: true })} type="number" min="0" placeholder="اختياري" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الحد الأقصى للاستخدام</label>
                <input {...register('max_uses', { valueAsNumber: true })} type="number" min="1" placeholder="غير محدود" className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>تاريخ الانتهاء</label>
                <input {...register('expires_at')} type="datetime-local" className="input text-sm" />
              </div>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
                {isSubmitting ? 'جارٍ الإنشاء...' : 'إنشاء الكوبون'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              {['الكود', 'النوع', 'الخصم', 'الاستخدام', 'الانتهاء', 'الحالة', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {initialCoupons.map(c => (
              <tr key={c.id}>
                <td>
                  <div className="flex items-center gap-2">
                    <Tag size={12} style={{color:'var(--color-accent)'}} />
                    <span className="font-mono font-bold text-sm" style={{color:'var(--color-accent)'}}>{c.code}</span>
                    <button onClick={() => copyCode(c.code)} className="p-1 rounded hover:bg-[#EBF5FF] transition-colors">
                      {copied === c.code
                        ? <span className="text-xs text-green-600">✓</span>
                        : <Copy size={11} style={{color:'var(--color-text-muted)'}} />
                      }
                    </button>
                  </div>
                </td>
                <td className="text-sm" style={{color:'var(--color-text-secondary)'}}>{TYPE_LABELS[c.type]}</td>
                <td className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>{formatValue(c)}</td>
                <td className="text-sm" style={{color:'var(--color-text-secondary)'}}>
                  {c.used_count}{c.max_uses ? `/${c.max_uses}` : ''}
                </td>
                <td className="text-xs" style={{color:'var(--color-text-muted)'}}>
                  {c.expires_at ? formatDateShort(c.expires_at) : '—'}
                </td>
                <td>
                  <button onClick={() => toggleActive(c)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                      c.is_active ? 'bg-green-100 text-green-700' : 'bg-[#F8F9FA] text-[#868E96]'
                    }`}>
                    {c.is_active ? 'نشط' : 'معطل'}
                  </button>
                </td>
                <td>
                  <button onClick={() => deleteCoupon(c.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                    <Trash2 size={13} className="text-red-400" />
                  </button>
                </td>
              </tr>
            ))}
            {initialCoupons.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>
                  لا توجد كوبونات — أنشئ كوبونك الأول
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
