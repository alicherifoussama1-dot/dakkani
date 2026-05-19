'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import { Store, Loader2, ChevronRight, Sparkles } from 'lucide-react'

const schema = z.object({
  name:     z.string().min(2, 'اسم المتجر يجب أن يكون حرفين على الأقل'),
  name_ar:  z.string().optional(),
  phone:    z.string().regex(/^(05|06|07)\d{8}$/, 'رقم الهاتف غير صالح').optional().or(z.literal('')),
  wilaya:   z.string().optional(),
  category: z.string().optional(),
})
type FormData = z.infer<typeof schema>

const CATEGORIES = [
  'ملابس وأزياء', 'إلكترونيات وهواتف', 'منزل وديكور',
  'جمال وعناية', 'رياضة وترفيه', 'غذاء ومشروبات',
  'أطفال وألعاب', 'سيارات وقطع غيار', 'أخرى',
]

export default function OnboardingPage() {
  const router  = useRouter()
  const [step,  setStep]  = useState(1)
  const [error, setError] = useState('')

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const name    = watch('name')
  const nameAr  = watch('name_ar')

  const onSubmit = async (data: FormData) => {
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const slug = slugify(data.name_ar || data.name) || `store-${Date.now()}`

    const { error: storeErr } = await supabase.from('stores').insert({
      owner_id: user.id,
      name:     data.name,
      name_ar:  data.name_ar || data.name,
      slug,
      phone:    data.phone || null,
      currency: 'DZD',
      plan:     'free',
      is_active: true,
    })

    if (storeErr) {
      if (storeErr.message.includes('unique')) {
        // Slug taken — add random suffix
        const { error: e2 } = await supabase.from('stores').insert({
          owner_id: user.id,
          name:     data.name,
          name_ar:  data.name_ar || data.name,
          slug:     slug + '-' + Math.random().toString(36).slice(2, 6),
          phone:    data.phone || null,
          currency: 'DZD',
          plan:     'free',
          is_active: true,
        })
        if (e2) { setError(e2.message); return }
      } else {
        setError(storeErr.message)
        return
      }
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br [#F9F9F9] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br [#E8431A] to-[#C73615] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white font-black text-2xl">د</span>
          </div>
          <h1 className="text-3xl font-black text-[#111111]">مرحباً في دكاني! 🎉</h1>
          <p className="text-[#999999] mt-2">أنشئ متجرك الإلكتروني في دقيقتين</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className={`flex items-center gap-2 ${s < step ? 'opacity-100' : s === step ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black transition-all ${
                s < step ? 'bg-green-500 text-white' :
                s === step ? 'bg-[#E8431A] text-white ring-4 ring-[#FFF0ED]' :
                'bg-[#EBEBEB] text-[#999999]'
              }`}>
                {s < step ? '✓' : s}
              </div>
              <span className="text-sm font-medium text-[#444444] hidden sm:block">
                {s === 1 ? 'معلومات المتجر' : 'تفاصيل إضافية'}
              </span>
              {s < 2 && <ChevronRight className="w-4 h-4 text-[#EBEBEB] hidden sm:block" />}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="bg-white rounded-3xl shadow-xl border border-[#EBEBEB] overflow-hidden">
            {/* Step 1 */}
            {step === 1 && (
              <div className="p-8 space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-[#FFF0ED] rounded-xl flex items-center justify-center">
                    <Store className="w-5 h-5 text-[#E8431A]" />
                  </div>
                  <div>
                    <h2 className="font-black text-[#111111]">اسم متجرك</h2>
                    <p className="text-xs text-[#999999]">سيظهر هذا الاسم لعملائك</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111111] mb-2">
                    اسم المتجر بالعربية <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name_ar')}
                    placeholder="مثال: متجر الأناقة الجزائري"
                    className="w-full border-2 border-[#EBEBEB] focus:border-[#E8431A] rounded-2xl px-4 py-3 text-base outline-none transition"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111111] mb-2">
                    اسم المتجر بالفرنسية / الإنجليزية <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    placeholder="Ex: Elegance Store DZ"
                    className="w-full border-2 border-[#EBEBEB] focus:border-[#E8431A] rounded-2xl px-4 py-3 text-base outline-none transition"
                    dir="ltr"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">⚠️ {errors.name.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111111] mb-2">
                    رقم الهاتف (اختياري)
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    placeholder="0555 xx xx xx"
                    className="w-full border-2 border-[#EBEBEB] focus:border-[#E8431A] rounded-2xl px-4 py-3 text-base outline-none transition"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">⚠️ {errors.phone.message}</p>}
                </div>

                {/* Preview slug */}
                {(name || nameAr) && (
                  <div className="bg-[#F9F9F9] border border-[#EBEBEB] rounded-2xl p-3">
                    <p className="text-xs text-[#999999] mb-1">رابط متجرك سيكون:</p>
                    <p className="font-mono text-sm text-[#E8431A] font-bold">
                      dakkani.dz/store/<span className="text-[#111111]">{slugify(nameAr || name || '')}</span>
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (!name) return
                    setStep(2)
                  }}
                  disabled={!name}
                  className="w-full bg-[#FFF0ED]0 hover:bg-[#C73615] disabled:opacity-40 text-white font-black py-4 rounded-2xl text-base transition"
                >
                  التالي ←
                </button>
              </div>
            )}

            {/* Step 2 */}
            {step === 2 && (
              <div className="p-8 space-y-5">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="font-black text-[#111111]">نوع المتجر</h2>
                    <p className="text-xs text-[#999999]">ساعدنا في تخصيص تجربتك</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#111111] mb-3">
                    ما هي فئة منتجاتك الرئيسية؟
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setValue('category', cat)}
                        className={`py-2.5 px-2 rounded-xl text-xs font-medium border-2 transition text-center ${
                          watch('category') === cat
                            ? 'border-[#E8431A] bg-[#FFF0ED] text-[#C73615]'
                            : 'border-[#EBEBEB] text-[#444444] hover:border-gray-300'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Features preview */}
                <div className="bg-gradient-to-br from-dakkani-50 to-orange-50 rounded-2xl p-4 border border-[#FFF0ED]">
                  <p className="text-sm font-bold text-[#C73615] mb-3">✨ ما ستحصل عليه مجاناً:</p>
                  <div className="space-y-2">
                    {[
                      'متجر إلكتروني كامل',
                      'نموذج طلب مع الدفع عند الاستلام',
                      'إدارة الطلبات والمخزون',
                      'ربط بكسل فيسبوك وتيك توك',
                      'توصيل لكل الجزائر',
                    ].map(f => (
                      <div key={f} className="flex items-center gap-2 text-sm text-[#C73615]">
                        <span className="text-green-500 font-bold">✓</span>
                        {f}
                      </div>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-2xl p-3 text-sm">
                    ⚠️ {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 border-2 border-[#EBEBEB] text-[#444444] font-bold py-4 rounded-2xl hover:bg-[#F9F9F9] transition text-sm"
                  >
                    رجوع
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 bg-gradient-to-r from-[#E8431A] to-[#C73615] hover:from-dakkani-600 hover:to-[#C73615] text-white font-black py-4 rounded-2xl transition flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-5 h-5 animate-spin" />جارٍ الإنشاء...</>
                    ) : (
                      '🚀 أنشئ متجري الآن'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </form>

        <p className="text-center text-xs text-[#CCCCCC] mt-6">
          بالإنشاء، تقبل شروط الاستخدام · دكاني — منصة التجارة الإلكترونية الجزائرية
        </p>
      </div>
    </div>
  )
}
