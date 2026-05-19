'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff } from 'lucide-react'

const schema = z.object({
  email:    z.string().email('بريد إلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const router = useRouter()
  const [error,  setError]  = useState('')
  const [showPw, setShowPw] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (data: FormData) => {
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword(data)
    if (err) { setError(err.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="w-full max-w-md rounded-3xl p-8 border"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
    >
      {/* Logo */}
      <div className="text-center mb-8">
        <Link
          href="/"
          className="inline-block font-black text-3xl mb-3"
          style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
        >
          دكاني<span style={{ color: '#E8431A' }}>.</span>
        </Link>
        <h1 className="font-bold text-xl" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
          مرحبا بك في دكاني
        </h1>
        <p className="text-sm mt-1" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
          سجّل دخولك لإدارة متجرك
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
            البريد الإلكتروني
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="example@email.com"
            dir="ltr"
            autoComplete="email"
            className="input"
          />
          {errors.email && <p className="text-xs mt-1" style={{ color: '#E8431A' }}>⚠️ {errors.email.message}</p>}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-semibold" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
              كلمة المرور
            </label>
            <Link href="/forgot-password" className="text-xs" style={{ color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}>
              نسيت كلمة المرور؟
            </Link>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••"
              dir="ltr"
              autoComplete="current-password"
              className="input pl-10"
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: '#999999' }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {errors.password && <p className="text-xs mt-1" style={{ color: '#E8431A' }}>⚠️ {errors.password.message}</p>}
        </div>

        {error && (
          <p className="text-sm p-3 rounded-xl text-center" style={{ backgroundColor: '#FFF0ED', color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}>
            ⚠️ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-accent w-full h-12 text-base rounded-xl"
          style={{ fontFamily: 'var(--font-tajawal)' }}
        >
          {isSubmitting
            ? <><Loader2 size={18} className="animate-spin ml-2" />جارٍ الدخول...</>
            : 'تسجيل الدخول'
          }
        </button>

        <p className="text-center text-sm" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
          ليس لديك حساب؟{' '}
          <Link href="/register" className="font-semibold" style={{ color: '#E8431A' }}>
            سجّل الآن مجاناً
          </Link>
        </p>
      </form>
    </div>
  )
}
