'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Star, Trash2, Warehouse as WarehouseIcon } from 'lucide-react'
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
    <div className="space-y-4" style={{fontFamily:'var(--font-arabic)'}}>
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm gap-1.5">
          <Plus size={14} />مستودع جديد
        </button>
      </div>

      {showForm && (
        <div className="card p-5" dir="rtl">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <h3 className="font-bold text-sm" style={{color:'var(--color-text-primary)'}}>إضافة مستودع</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>اسم المستودع *</label>
                <input {...register('name')} placeholder="المستودع الرئيسي" className="input text-sm" />
                {errors.name && <p className="text-xs mt-1" style={{color:'var(--color-error)'}}>{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الولاية</label>
                <select {...register('wilaya_id', { valueAsNumber: true })} className="input text-sm">
                  <option value="">اختر الولاية</option>
                  {wilayas.map(w => <option key={w.id} value={w.id}>{w.id} - {w.name_ar}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>العنوان</label>
                <input {...register('address')} placeholder="الحي الصناعي..." className="input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الهاتف</label>
                <input {...register('phone')} placeholder="055xxxxxxx" className="input text-sm" dir="ltr" />
              </div>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input {...register('is_default')} type="checkbox" className="w-4 h-4 accent-[#0D6EFD]" />
              <span className="text-sm font-medium" style={{color:'var(--color-text-secondary)'}}>مستودع افتراضي</span>
            </label>
            <div className="flex gap-3">
              <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
                {isSubmitting ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost btn-sm">إلغاء</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {initialWarehouses.map(w => (
          <div key={w.id} className={`card p-4 ${w.is_default ? 'border-[#0D6EFD]/30' : ''}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:'var(--color-bg-soft)'}}>
                  <WarehouseIcon size={16} style={{color:'var(--color-accent)'}} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm" style={{color:'var(--color-text-primary)'}}>{w.name}</h3>
                    {w.is_default && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1" style={{background:'#EBF5FF',color:'var(--color-accent)'}}>
                        <Star size={10} />افتراضي
                      </span>
                    )}
                  </div>
                  {w.address && <p className="text-xs mt-0.5" style={{color:'var(--color-text-muted)'}}>{w.address}</p>}
                  {w.phone && <p className="text-xs" style={{color:'var(--color-text-muted)'}}>{w.phone}</p>}
                </div>
              </div>
              <div className="flex gap-1">
                {!w.is_default && (
                  <button onClick={() => setDefault(w.id)} className="p-1.5 rounded hover:bg-[#EBF5FF] transition-colors" title="تعيين كافتراضي">
                    <Star size={14} style={{color:'var(--color-text-muted)'}} />
                  </button>
                )}
                <button onClick={() => deleteWarehouse(w.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {initialWarehouses.length === 0 && (
          <div className="col-span-2 card text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>
            <WarehouseIcon size={24} className="mx-auto mb-2 opacity-40" />
            أضف مستودعك الأول لتتبع المخزون
          </div>
        )}
      </div>
    </div>
  )
}
