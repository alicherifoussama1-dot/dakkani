'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react'
import type { Category } from '@/types'

const schema = z.object({
  name: z.string().min(1),
  name_ar: z.string().optional(),
  slug: z.string().min(1),
  parent_id: z.string().optional(),
  is_active: z.boolean().default(true),
})
type FormData = z.infer<typeof schema>

interface Props {
  storeId: string
  initialCategories: Category[]
}

export default function CategoriesManager({ storeId, initialCategories }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  const { register, handleSubmit, reset, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { is_active: true },
  })

  const nameAr = watch('name_ar')

  const onSubmit = async (data: FormData) => {
    const supabase = createClient()
    const payload = { ...data, store_id: storeId, parent_id: data.parent_id || null }

    if (editId) {
      await supabase.from('categories').update(payload).eq('id', editId)
    } else {
      await supabase.from('categories').insert(payload)
    }
    reset()
    setShowForm(false)
    setEditId(null)
    router.refresh()
  }

  const startEdit = (cat: Category) => {
    setEditId(cat.id)
    setValue('name', cat.name)
    setValue('name_ar', cat.name_ar ?? '')
    setValue('slug', cat.slug)
    setValue('parent_id', cat.parent_id ?? '')
    setValue('is_active', cat.is_active)
    setShowForm(true)
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('حذف هذه الفئة؟')) return
    const supabase = createClient()
    await supabase.from('categories').delete().eq('id', id)
    router.refresh()
  }

  const toggleActive = async (cat: Category) => {
    const supabase = createClient()
    await supabase.from('categories').update({ is_active: !cat.is_active }).eq('id', cat.id)
    router.refresh()
  }

  const topLevel = initialCategories.filter(c => !c.parent_id)
  const children = (parentId: string) => initialCategories.filter(c => c.parent_id === parentId)

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); reset() }}
          className="btn btn-primary btn-sm gap-1.5"
        >
          <Plus size={14} />
          فئة جديدة
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card p-5 space-y-4" dir="rtl">
          <h3 className="font-bold text-sm" style={{color:'var(--color-text-primary)'}}>{editId ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الاسم (عربي)</label>
              <input {...register('name_ar')} className="input text-sm" placeholder="ملابس رجالية" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الاسم (فرنسي/انجليزي)</label>
              <input {...register('name')} className="input text-sm" placeholder="Men's Clothing" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>Slug</label>
              <input {...register('slug')} className="input text-sm" placeholder="mens-clothing" dir="ltr" />
            </div>
            <button type="button" onClick={() => setValue('slug', slugify(nameAr ?? watch('name') ?? ''))}
              className="self-end btn btn-ghost btn-sm mb-0.5">توليد</button>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الفئة الأم</label>
            <select {...register('parent_id')} className="input text-sm">
              <option value="">لا توجد (فئة رئيسية)</option>
              {topLevel.filter(c => c.id !== editId).map(c => (
                <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('is_active')} type="checkbox" className="w-4 h-4 accent-[#0D6EFD]" />
            <span className="text-sm" style={{color:'var(--color-text-secondary)'}}>فئة نشطة</span>
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting} className="btn btn-primary btn-sm">
              {isSubmitting ? 'جارٍ الحفظ...' : editId ? 'تحديث' : 'إضافة'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset() }} className="btn btn-ghost btn-sm">إلغاء</button>
          </div>
        </form>
      )}

      <div className="card overflow-hidden">
        {topLevel.length === 0 ? (
          <div className="text-center py-12 text-sm" style={{color:'var(--color-text-muted)'}}>لا توجد فئات — أضف فئتك الأولى</div>
        ) : (
          <div className="divide-y" style={{borderColor:'var(--color-border)'}}>
            {topLevel.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center justify-between px-4 py-3 hover:bg-[#F8F9FA] transition-colors">
                  <div className="flex items-center gap-3">
                    <GripVertical size={14} style={{color:'var(--color-text-muted)'}} />
                    <div>
                      <p className="font-medium text-sm" style={{color:'var(--color-text-primary)'}}>{cat.name_ar ?? cat.name}</p>
                      <p className="text-xs font-mono" style={{color:'var(--color-text-muted)'}}>{cat.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(cat)}
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-[#F8F9FA] text-[#868E96]'}`}>
                      {cat.is_active ? 'نشط' : 'مخفي'}
                    </button>
                    <button onClick={() => startEdit(cat)} className="p-1.5 rounded hover:bg-[#EBF5FF] transition-colors">
                      <Pencil size={13} style={{color:'var(--color-accent)'}} />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                      <Trash2 size={13} className="text-red-400" />
                    </button>
                  </div>
                </div>
                {children(cat.id).map(child => (
                  <div key={child.id} className="flex items-center justify-between px-4 py-2.5 border-t hover:bg-[#F8F9FA] transition-colors" style={{borderColor:'var(--color-border)',background:'var(--color-bg-soft)'}}>
                    <div className="flex items-center gap-3 pr-8">
                      <div className="w-4 h-0.5" style={{background:'var(--color-border)'}} />
                      <div>
                        <p className="text-sm" style={{color:'var(--color-text-secondary)'}}>{child.name_ar ?? child.name}</p>
                        <p className="text-xs font-mono" style={{color:'var(--color-text-muted)'}}>{child.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(child)} className="p-1.5 rounded hover:bg-[#EBF5FF] transition-colors">
                        <Pencil size={13} style={{color:'var(--color-accent)'}} />
                      </button>
                      <button onClick={() => deleteCategory(child.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                        <Trash2 size={13} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
