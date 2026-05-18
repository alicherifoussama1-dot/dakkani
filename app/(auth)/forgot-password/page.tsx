'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Mail, ArrowRight, CheckCircle, Loader2 } from 'lucide-react'

const schema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
})
type F = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }: F) => {
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setSent(true)
  }

  if (sent) {
    return (
      <>
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">تم الإرسال!</h2>
          <p className="text-gray-500 text-sm mb-6">
            تحقق من بريدك الإلكتروني واضغط على الرابط لإعادة تعيين كلمة المرور
          </p>
          <Link
            href="/login"
            className="text-dakkani-600 font-semibold hover:underline text-sm"
          >
            العودة لتسجيل الدخول
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="mb-6">
        <div className="w-12 h-12 bg-dakkani-50 rounded-2xl flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-dakkani-600" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">نسيت كلمة المرور؟</h2>
        <p className="text-gray-500 text-sm mt-1">أدخل بريدك الإلكتروني وسنرسل لك رابط الاسترداد</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">البريد الإلكتروني</label>
          <input
            {...register('email')}
            type="email"
            placeholder="example@email.com"
            className="w-full border-2 border-gray-200 focus:border-dakkani-500 rounded-xl px-4 py-3 text-sm outline-none transition"
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">⚠️ {errors.email.message}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-dakkani-500 hover:bg-dakkani-600 disabled:opacity-50 text-white font-black py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الإرسال...</>
          ) : (
            <>إرسال رابط الاسترداد<ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <div className="text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-dakkani-600 transition">
            ← العودة لتسجيل الدخول
          </Link>
        </div>
      </form>
    </>
  )
}
