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
          className="flex items-center gap-2 bg-[#E8431A] hover:bg-[#C73615] text-white px-4 py-2 rounded-lg text-sm font-semibold"
        >
          <Plus className="w-4 h-4" />
          فئة جديدة
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl border border-[#FFF0ED] p-5 space-y-4 shadow-sm" dir="rtl">
          <h3 className="font-bold text-gray-900">{editId ? 'تعديل الفئة' : 'إضافة فئة جديدة'}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (عربي)</label>
              <input
                {...register('name_ar')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
                placeholder="ملابس رجالية"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم (فرنسي/انجليزي)</label>
              <input
                {...register('name')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
                placeholder="Men's Clothing"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                {...register('slug')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#E8431A] outline-none"
                placeholder="mens-clothing"
              />
            </div>
            <button
              type="button"
              onClick={() => setValue('slug', slugify(nameAr ?? watch('name') ?? ''))}
              className="self-end text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg text-gray-600 mb-0.5"
            >
              توليد
            </button>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الفئة الأم</label>
            <select
              {...register('parent_id')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-[#E8431A] outline-none"
            >
              <option value="">لا توجد (فئة رئيسية)</option>
              {topLevel.filter(c => c.id !== editId).map(c => (
                <option key={c.id} value={c.id}>{c.name_ar ?? c.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input {...register('is_active')} type="checkbox" className="w-4 h-4 accent-[#E8431A]" />
            <span className="text-sm text-gray-700">فئة نشطة</span>
          </label>
          <div className="flex gap-3">
            <button type="submit" disabled={isSubmitting}
              className="bg-[#E8431A] hover:bg-[#C73615] text-white font-bold px-5 py-2 rounded-lg text-sm disabled:opacity-50">
              {isSubmitting ? 'جارٍ الحفظ...' : editId ? 'تحديث' : 'إضافة'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); reset() }} className="text-gray-500 text-sm">إلغاء</button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {topLevel.length === 0 ? (
          <div className="text-center py-12 text-gray-400">لا توجد فئات — أضف فئتك الأولى</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {topLevel.map(cat => (
              <div key={cat.id}>
                <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-gray-300" />
                    <div>
                      <p className="font-medium text-gray-900">{cat.name_ar ?? cat.name}</p>
                      <p className="text-xs text-gray-400">{cat.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleActive(cat)}
                      className={`text-xs px-2 py-0.5 rounded-full ${cat.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {cat.is_active ? 'نشط' : 'مخفي'}
                    </button>
                    <button onClick={() => startEdit(cat)} className="p-1.5 text-gray-400 hover:text-[#E8431A] rounded">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                {children(cat.id).map(child => (
                  <div key={child.id} className="flex items-center justify-between px-4 py-2.5 bg-gray-50/50 border-t border-gray-50 hover:bg-gray-50">
                    <div className="flex items-center gap-3 pr-8">
                      <div className="w-4 h-0.5 bg-gray-200" />
                      <div>
                        <p className="text-sm text-gray-700">{child.name_ar ?? child.name}</p>
                        <p className="text-xs text-gray-400">{child.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => startEdit(child)} className="p-1 text-gray-400 hover:text-[#E8431A]">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCategory(child.id)} className="p-1 text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
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
