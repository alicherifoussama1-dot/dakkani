'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'

const schema = z.object({
  storeName: z.string().min(2, 'اسم المتجر يجب أن يكون حرفين على الأقل'),
  email: z.string().email('بريد إلكتروني غير صالح'),
  phone: z.string().regex(/^(05|06|07)\d{8}$/, 'رقم الهاتف غير صالح'),
  password: z.string().min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: 'كلمتا المرور غير متطابقتين',
  path: ['confirmPassword'],
})
type FormData = z.infer<typeof schema>

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })
    if (authError || !authData.user) { setError(authError?.message ?? 'خطأ في التسجيل'); return }

    const slug = slugify(data.storeName) || `store-${Date.now()}`
    const { error: storeError } = await supabase.from('stores').insert({
      owner_id: authData.user.id,
      name: data.storeName,
      slug,
      phone: data.phone,
      email: data.email,
    })
    if (storeError) { setError(storeError.message); return }

    router.push('/dashboard')
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">إنشاء متجر جديد</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
        {[
          { name: 'storeName', label: 'اسم المتجر', type: 'text', placeholder: 'متجري الجزائري' },
          { name: 'email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'example@email.com' },
          { name: 'phone', label: 'رقم الهاتف', type: 'tel', placeholder: '0555123456' },
          { name: 'password', label: 'كلمة المرور', type: 'password', placeholder: '••••••••' },
          { name: 'confirmPassword', label: 'تأكيد كلمة المرور', type: 'password', placeholder: '••••••••' },
        ].map(f => (
          <div key={f.name}>
            <label className="block text-sm font-medium text-gray-700 mb-1">{f.label}</label>
            <input
              {...register(f.name as keyof FormData)}
              type={f.type}
              placeholder={f.placeholder}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-dakkani-500 outline-none"
            />
            {errors[f.name as keyof FormData] && (
              <p className="text-red-500 text-xs mt-1">{errors[f.name as keyof FormData]?.message}</p>
            )}
          </div>
        ))}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">{error}</div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-dakkani-500 hover:bg-dakkani-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition"
        >
          {isSubmitting ? 'جارٍ إنشاء المتجر...' : 'إنشاء المتجر مجاناً'}
        </button>
        <div className="text-center text-sm text-gray-600">
          لديك حساب؟{' '}
          <Link href="/login" className="text-dakkani-600 font-semibold hover:underline">سجّل دخولك</Link>
        </div>
      </form>
    </>
  )
}
