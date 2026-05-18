'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { Mail, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react'

const schema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
})
type F = z.infer<typeof schema>

export default function ForgotPasswordPage() {
  const [sent,  setSent]  = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }: F) => {
    setError('')
    try {
      // Try our custom API first (uses Resend if configured)
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        // Fallback: use Supabase directly
        const { createClient } = await import('@/lib/supabase/client')
        const supabase = createClient()
        const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin}/reset-password`
        const { error: sbErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (sbErr) { setError(sbErr.message); return }
      }

      setSent(true)
    } catch {
      // Last fallback — always show success (security: don't reveal if email exists)
      setSent(true)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center py-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">تحقق من بريدك! 📬</h2>
        <p className="text-gray-500 text-sm mb-2">
          أرسلنا رابط إعادة تعيين كلمة المرور إلى:
        </p>
        <p className="font-bold text-gray-800 text-sm mb-6 bg-gray-100 px-4 py-2 rounded-xl">
          {getValues('email')}
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 text-right mb-6 w-full">
          <p className="font-bold mb-1">💡 لم يصلك الإيميل؟</p>
          <ul className="space-y-1 text-xs">
            <li>• تحقق من مجلد Spam أو Junk</li>
            <li>• انتظر دقيقتين ثم أعد المحاولة</li>
            <li>• تأكد من صحة البريد الإلكتروني</li>
          </ul>
        </div>
        <button
          onClick={() => { setSent(false); setError('') }}
          className="text-sm text-primary hover:underline mb-3 font-medium"
        >
          إعادة الإرسال
        </button>
        <Link href="/login" className="text-sm text-gray-500 hover:text-primary transition">
          ← العودة لتسجيل الدخول
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">نسيت كلمة المرور؟</h2>
        <p className="text-gray-500 text-sm mt-1">
          أدخل بريدك الإلكتروني وسنرسل لك رابط الاسترداد
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            البريد الإلكتروني
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="example@email.com"
            autoComplete="email"
            className="w-full border-2 border-gray-200 focus:border-primary rounded-xl px-4 py-3 text-sm outline-none transition"
            dir="ltr"
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.email.message}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-3 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-black py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-white disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2D6A4F)' }}
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الإرسال...</>
          ) : (
            <>إرسال رابط الاسترداد <ArrowRight className="w-4 h-4" /></>
          )}
        </button>

        <div className="text-center">
          <Link href="/login" className="text-sm text-gray-500 hover:text-primary transition">
            ← العودة لتسجيل الدخول
          </Link>
        </div>
      </form>
    </>
  )
}
