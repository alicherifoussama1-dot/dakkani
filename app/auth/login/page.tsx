'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#F9F9F9' }}
      dir="rtl"
    >
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
            دكاني
            <span style={{ color: '#E8431A' }}>.</span>
          </Link>
          <h1
            className="font-bold text-xl"
            style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
          >
            مرحبا بك في دكاني
          </h1>
          <p className="text-sm mt-1" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
            سجّل دخولك لإدارة متجرك
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
            >
              البريد الإلكتروني
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
              required
              autoComplete="email"
              className="input"
            />
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="password"
                className="text-sm font-semibold"
                style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
              >
                كلمة المرور
              </label>
              <Link
                href="/forgot-password"
                className="text-xs"
                style={{ color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                dir="ltr"
                className="input pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: '#999999' }}
                aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-sm p-3 rounded-xl text-center"
              style={{ backgroundColor: '#FFF0ED', color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}
            >
              ⚠️ {error}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="btn btn-accent w-full h-12 text-base rounded-xl"
            style={{ fontFamily: 'var(--font-tajawal)' }}
          >
            {loading
              ? <><Loader2 size={18} className="animate-spin ml-2" />جارٍ الدخول...</>
              : 'تسجيل الدخول'
            }
          </button>
        </form>

        {/* Register link */}
        <p
          className="text-center mt-5 text-sm"
          style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
        >
          ما عندكش حساب؟{' '}
          <Link
            href="/auth/register"
            className="font-semibold"
            style={{ color: '#E8431A' }}
          >
            سجّل الآن مجاناً
          </Link>
        </p>
      </div>
    </div>
  )
}
