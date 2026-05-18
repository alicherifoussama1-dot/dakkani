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
  const [sent,     setSent]     = useState(false)
  const [error,    setError]    = useState('')
  const [debugLink, setDebugLink] = useState('')

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<F>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async ({ email }: F) => {
    setError('')
    setDebugLink('')

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'حدث خطأ، حاول مرة أخرى')
      return
    }

    // Dev mode: show link directly if no email provider
    if (data.debug_link) setDebugLink(data.debug_link)

    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">تحقق من بريدك! 📬</h2>
        <p className="text-gray-500 text-sm mb-2">أرسلنا رابط إعادة تعيين كلمة المرور إلى:</p>
        <p className="font-bold text-gray-800 bg-gray-100 px-4 py-2 rounded-xl text-sm mb-5">
          {getValues('email')}
        </p>

        {/* Debug link — shows only in dev if no email provider */}
        {debugLink && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-right w-full mb-4">
            <p className="font-bold text-yellow-800 mb-2">🔧 وضع التطوير — رابط الاسترداد:</p>
            <a href={debugLink} className="text-blue-600 underline text-xs break-all">{debugLink}</a>
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700 text-right w-full mb-5">
          <p className="font-bold mb-2">💡 لم يصلك الإيميل؟</p>
          <ul className="space-y-1 text-xs list-none">
            <li>• تحقق من مجلد <strong>Spam</strong> أو <strong>Junk</strong></li>
            <li>• انتظر دقيقتين وأعد التحقق</li>
            <li>• تأكد من كتابة البريد بشكل صحيح</li>
            <li>• تأكد من إضافة <strong>RESEND_API_KEY</strong> في Vercel</li>
          </ul>
        </div>

        <button
          onClick={() => { setSent(false); setError(''); setDebugLink('') }}
          className="text-sm font-semibold mb-3 hover:underline"
          style={{ color: '#1B4332' }}
        >
          إعادة الإرسال
        </button>
        <Link href="/login" className="text-sm text-gray-500 hover:underline">
          ← العودة لتسجيل الدخول
        </Link>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: 'rgba(27,67,50,0.1)' }}>
          <Mail className="w-6 h-6" style={{ color: '#1B4332' }} />
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
            dir="ltr"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none transition"
            style={{ fontFamily: 'monospace' }}
            onFocus={e => e.target.style.borderColor = '#1B4332'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
          {errors.email && (
            <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.email.message}
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full font-black py-3.5 rounded-xl transition text-white disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#1B4332,#2D6A4F)' }}
        >
          {isSubmitting
            ? <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الإرسال...</>
            : <>إرسال رابط الاسترداد <ArrowRight className="w-4 h-4" /></>
          }
        </button>

        <div className="text-center pt-1">
          <Link href="/login" className="text-sm text-gray-500 hover:underline transition">
            ← العودة لتسجيل الدخول
          </Link>
        </div>
      </form>
    </>
  )
}
