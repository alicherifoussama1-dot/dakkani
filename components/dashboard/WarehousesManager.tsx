'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Star, Trash2 } from 'lucide-react'
import type { Warehouse } from '@/types'

const schema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  address: z.string().optional(),
  wilaya_id: z.number().int().optional(),
  phone: z.string().optional(),
  is_default: z.boolean().default(false),
})
type FormData = z.infer<typeof schema>

interface Props {
  storeId: string
  initialWarehouses: Warehouse[]
  wilayas: { id: number; name_ar: string }[]
}

export default function WarehousesManager({ storeId, initialWarehouses, wilayas }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_default: initialWarehouses.length === 0 },
  })

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    if (data.is_default) {
      await supabase.from('warehouses').update({ is_default: false }).eq('store_id', storeId)
    }
    await supabase.from('warehouses').insert({
      ...data,
      store_id: storeId,
      wilaya_id: data.wilaya_id ?? null,
    })
    reset()
    setShowForm(false)
    router.refresh()
  }

  const setDefault = async (id: string) => {
    const supabase = createClient()
    await supabase.from('warehouses').update({ is_default: false }).eq('store_id', storeId)
    await supabase.from('warehouses').update({ is_default: true }).eq('id', id)
    router.refresh()
  }

  const deleteWarehouse = async (id: string) => {
    if (!confirm('حذف هذا المستودع؟')) return
    const supabase = createClient()
    await supabase.from('warehouses').delete().eq('id', id)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-[#E8431A] hover:bg-[#C73615] text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          مستودع جديد
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-[#FFF0ED] p-5 space-y-4 shadow-sm" dir="rtl">
          <h3 className="font-bold text-gray-900">إضافة مستودع</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستودع *</label>
              <input
                {...register('name')}
                placeholder="المستودع الرئيسي"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الولاية</label>
              <select
                {...register('wilaya_id', { valueAsNumber: true })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#E8431A] outline-none"
              >
                <option value="">اختر الولاية</option>
                {wilayas.map(w => <option key={w.id} value={w.id}>{w.id} - {w.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
              <input
                {...register('address')}
                placeholder="الحي الصناعي..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
              <input
                {...register('phone')}
                placeholder="055xxxxxxx"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input {...register('is_default')} type="checkbox" className="w-4 h-4 accent-dakkani-500" />
            <span className="font-medium text-gray-700">مستودع افتراضي</span>
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting}
              className="bg-[#E8431A] hover:bg-[#C73615] text-white font-bold px-5 py-2 rounded-lg text-sm transition disabled:opacity-50">
              {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ'}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 text-sm">إلغاء</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialWarehouses.map(w => (
          <div key={w.id} className={`bg-white rounded-xl border p-4 shadow-sm ${w.is_default ? 'border-[#FFF0ED]' : 'border-gray-100'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{w.name}</h3>
                  {w.is_default && (
                    <span className="text-xs bg-dakkani-100 text-[#E8431A] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <Star className="w-3 h-3" />افتراضي
                    </span>
                  )}
                </div>
                {w.address && <p className="text-sm text-gray-500 mt-1">{w.address}</p>}
                {w.phone && <p className="text-sm text-gray-400">{w.phone}</p>}
              </div>
              <div className="flex gap-1.5">
                {!w.is_default && (
                  <button
                    onClick={() => setDefault(w.id)}
                    className="p-1.5 text-gray-400 hover:text-[#E8431A] hover:bg-[#FFF0ED] rounded-lg transition"
                    title="تعيين كافتراضي"
                  >
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => deleteWarehouse(w.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {initialWarehouses.length === 0 && (
          <div className="col-span-2 text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-100">
            أضف مستودعك الأول لتتبع المخزون
          </div>
        )}
      </div>
    </div>
  )
}
