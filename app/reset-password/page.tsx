'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

// This route lives OUTSIDE the (auth) route group (it's linked from the
// password-recovery email and must not depend on the group's layout / i18n
// provider). It renders its own minimal shell but reuses the cobalt DS
// classes so the visual language matches login/register exactly.
export default function ResetPasswordPage() {
  const router  = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [pwd,   setPwd]   = useState('')
  const [pwd2,  setPwd2]  = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [done,  setDone]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready,  setReady]  = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const url = new URL(window.location.href)
        const tokenHash = url.searchParams.get('token_hash')
        const type = url.searchParams.get('type')
        const code = url.searchParams.get('code')
        if (tokenHash) {
          try { await supabase.auth.verifyOtp({ type: (type as any) || 'recovery', token_hash: tokenHash }) }
          catch (otpErr) { console.error('verifyOtp failed:', otpErr) }
        } else if (code) {
          try { await supabase.auth.exchangeCodeForSession(code) }
          catch (exchangeErr) { console.error('Code exchange failed:', exchangeErr) }
        }
        let { data } = await supabase.auth.getSession()
        if (!data.session) {
          await new Promise(r => setTimeout(r, 1000))
          data = (await supabase.auth.getSession()).data
        }
        if (data.session) setHasSession(true)
        else setError('انتهت صلاحية رابط الاسترجاع أو أنه غير صالح. اطلب رابطاً جديداً من «نسيت كلمة المرور».')
      } catch (err) {
        console.error('Session establishment error:', err)
        setError('حدث خطأ أثناء التحقق من الرابط. يرجى المحاولة لاحقاً.')
      } finally {
        setReady(true)
      }
    })()
  }, [supabase])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
    if (pwd !== pwd2)    { setError('كلمتا المرور غير متطابقتين'); return }
    setError('')
    setLoading(true)
    try {
      const { error: err } = await supabase.auth.updateUser({ password: pwd })
      setLoading(false)
      if (err) {
        let msg = err.message
        if (/Auth session missing/i.test(msg)) msg = 'انتهت صلاحية جلسة العمل أو الرابط غير صالح. يرجى طلب رابط جديد.'
        setError(msg || 'فشلت عملية تغيير كلمة المرور.')
        return
      }
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (err) {
      setLoading(false)
      setError('حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.')
    }
  }

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <div className="auth-shell" dir="rtl">
      <main className="auth-main">
        <div className="auth-card">{children}</div>
      </main>
    </div>
  )

  if (!ready) return (
    <Shell>
      <div className="text-center">
        <div className="auth-success__icon" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
          <Loader2 size={28} className="animate-spin" aria-hidden />
        </div>
        <h1 className="auth-title">جارٍ التحقق...</h1>
        <p className="auth-sub">يرجى الانتظار لحين التحقق من صلاحية رابط الاسترجاع.</p>
      </div>
    </Shell>
  )

  if (done) return (
    <Shell>
      <div className="text-center" role="status" aria-live="polite">
        <div className="auth-success__icon"><CheckCircle size={28} aria-hidden /></div>
        <h1 className="auth-title">تم تغيير كلمة المرور!</h1>
        <p className="auth-sub">جارٍ توجيهك للوحة التحكم...</p>
      </div>
    </Shell>
  )

  if (error && !hasSession) return (
    <Shell>
      <div className="text-center">
        <div className="auth-success__icon" style={{ background: 'var(--color-error-100)', color: 'var(--color-error-600)' }}>
          <AlertCircle size={28} aria-hidden />
        </div>
        <h1 className="auth-title">رابط غير صالح أو منتهي</h1>
        <p className="auth-sub">{error}</p>
        <button onClick={() => router.push('/forgot-password')} className="c-btn c-btn--primary" style={{ inlineSize: '100%' }}>
          طلب رابط جديد من «نسيت كلمة المرور»
        </button>
      </div>
    </Shell>
  )

  return (
    <Shell>
      <div className="auth-success__icon" style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
        <Lock size={24} aria-hidden />
      </div>
      <h1 className="auth-title" style={{ textAlign: 'center' }}>كلمة مرور جديدة</h1>
      <p className="auth-sub" style={{ textAlign: 'center' }}>أدخل كلمة مرور قوية لحماية حسابك</p>

      <form onSubmit={submit} className="auth-form" noValidate>
        {[
          { id: 'pwd',  label: 'كلمة المرور الجديدة', val: pwd,  set: setPwd  },
          { id: 'pwd2', label: 'تأكيد كلمة المرور',    val: pwd2, set: setPwd2 },
        ].map((f, i) => (
          <div key={f.id} className="c-field">
            <label htmlFor={f.id} className="c-label">{f.label} <span className="req">*</span></label>
            <div className="auth-input-wrap">
              <input
                id={f.id}
                type={showPw ? 'text' : 'password'}
                value={f.val}
                onChange={e => f.set(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                dir="ltr"
                className="c-input"
              />
              {i === 0 && (
                <button
                  type="button" onClick={() => setShowPw(s => !s)}
                  className="auth-input-btn"
                  aria-label={showPw ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPw ? <EyeOff size={16} aria-hidden /> : <Eye size={16} aria-hidden />}
                </button>
              )}
            </div>
            {i === 0 && <p className="c-hint">8 أحرف على الأقل</p>}
          </div>
        ))}

        {error && (
          <div className="auth-alert" role="alert" aria-live="polite">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className={`c-btn c-btn--primary ${loading ? 'is-loading' : ''}`}>
          {loading
            ? <><Loader2 size={16} className="animate-spin" aria-hidden />جارٍ الحفظ...</>
            : 'حفظ كلمة المرور'
          }
        </button>
      </form>
    </Shell>
  )
}
