'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useT, useDir } from '@/lib/i18n/react'

export default function MerchantLoginPage() {
  return <Suspense fallback={null}><MerchantLoginInner /></Suspense>
}

function MerchantLoginInner() {
  const router = useRouter()
  const t = useT()
  const dir = useDir()
  const isRtl = dir === 'rtl'
  const searchParams = useSearchParams()
  const urlError = searchParams ? searchParams.get('error') : null
  // Middleware sets ?redirect=… when it gates a protected page; honor it
  // so deep links resume where the merchant was headed after signing in.
  const redirect = searchParams?.get('redirect') ?? null

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(urlError || '')

  // Only in-app paths — never bounce to an external URL from a query param.
  const nextTarget = (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) ? redirect : '/dashboard'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error: err } = await createClient().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) {
      // Map the common Supabase errors to Arabic; other messages fall through.
      const msg = /Invalid login credentials/i.test(err.message)
        ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        : /Email not confirmed/i.test(err.message)
          ? 'يرجى تأكيد بريدك الإلكتروني أولاً'
          : err.message
      setError(msg)
      return
    }
    router.push(nextTarget)
    router.refresh()
  }

  const ArrowInline = isRtl ? ArrowLeft : ArrowRight

  return (
    <div className="auth-card">
      {/* Mobile-only brand mark */}
      <div className="auth-mark">
        <span className="auth-mark__badge">C</span>
        <span className="auth-mark__name">Commerco</span>
      </div>

      <h1 className="auth-title">{t('auth.login.welcome_commerco')}</h1>
      <p className="auth-sub">{t('auth.login.merchants_only')}</p>

      <form onSubmit={submit} className="auth-form" noValidate>
        <div className="c-field">
          <label htmlFor="email" className="c-label">{t('auth.email')}</label>
          <input
            id="email" type="email" required autoComplete="email" dir="ltr"
            value={email} onChange={e => setEmail(e.target.value)}
            placeholder="example@email.com"
            className="c-input"
          />
        </div>

        <div className="c-field">
          <div className="auth-label-row">
            <label htmlFor="password" className="c-label">{t('auth.password')}</label>
            <Link href="/forgot-password" className="auth-link">{t('auth.login.forgot')}</Link>
          </div>
          <div className="auth-input-wrap">
            <input
              id="password" type={showPw ? 'text' : 'password'} required autoComplete="current-password" dir="ltr"
              value={password} onChange={e => setPassword(e.target.value)}
              className="c-input"
            />
            <button
              type="button" onClick={() => setShowPw(s => !s)}
              className="auth-input-btn"
              aria-label={showPw ? (isRtl ? 'إخفاء كلمة المرور' : 'Hide password') : (isRtl ? 'إظهار كلمة المرور' : 'Show password')}
            >
              {showPw ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
            </button>
          </div>
        </div>

        {error && (
          <div className="auth-alert" role="alert" aria-live="polite">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className={`c-btn c-btn--primary ${loading ? 'is-loading' : ''}`}>
          {loading
            ? <><Loader2 size={16} className="animate-spin" aria-hidden />{t('auth.login.submitting')}</>
            : <>{t('auth.login.submit')}<ArrowInline size={16} aria-hidden /></>
          }
        </button>
      </form>

      <p className="auth-foot">
        {t('auth.login.no_account')}
        <Link href="/register" className="auth-link">{t('auth.login.register_now')}</Link>
      </p>
    </div>
  )
}
