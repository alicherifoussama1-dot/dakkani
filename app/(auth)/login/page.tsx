'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const schema = z.object({
  email: z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) { setError(error.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">تسجيل الدخول</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
          <input
            {...register('email')}
            type="email"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-dakkani-500 focus:border-transparent outline-none"
            placeholder="example@email.com"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
          <input
            {...register('password')}
            type="password"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right focus:ring-2 focus:ring-dakkani-500 focus:border-transparent outline-none"
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-dakkani-500 hover:bg-dakkani-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg transition"
        >
          {isSubmitting ? 'جارٍ الدخول...' : 'دخول'}
        </button>
        <div className="text-center text-sm text-gray-600">
          ليس لديك حساب؟{' '}
          <Link href="/register" className="text-dakkani-600 font-semibold hover:underline">
            سجّل الآن
          </Link>
        </div>
        <div className="text-center">
          <Link href="/forgot-password" className="text-xs text-gray-500 hover:underline">
            نسيت كلمة المرور؟
          </Link>
        </div>
      </form>
    </>
  )
}
