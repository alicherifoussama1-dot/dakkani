'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'
import { useT, useDir } from '@/lib/i18n/react'

// Fields the register form owns — kept small on purpose (auth + store name +
// contact). Full store setup happens in the dashboard.
type FieldKey = 'storeName' | 'email' | 'phone' | 'password'

export default function RegisterPage() {
  const router = useRouter()
  const t = useT()
  const dir = useDir()
  const isRtl = dir === 'rtl'
  const ArrowInline = isRtl ? ArrowLeft : ArrowRight

  const [form,    setForm]    = useState({ storeName: '', email: '', phone: '', password: '' })
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const set = (k: FieldKey, v: string) => setForm(f => ({ ...f, [k]: v }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const sb = createClient()
    // 1) Sign up
    const { data: auth, error: authErr } = await sb.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (authErr || !auth.user) {
      const msg = authErr?.message ?? t('auth.register.error')
      setError(
        /already registered|already exists|User already/i.test(msg)
          ? 'هذا البريد الإلكتروني مسجَّل مسبقاً — استخدم «تسجيل الدخول» بدلاً من ذلك'
          : /Password.*(short|length)/i.test(msg) ? 'كلمة المرور قصيرة — 8 أحرف على الأقل'
          : /valid email/i.test(msg) ? 'صيغة البريد الإلكتروني غير صحيحة'
          : msg,
      )
      setLoading(false); return
    }

    // 2) Store insert — HARDENED: check error + retry with random suffix on
    // slug uniqueness collision (same pattern as DashboardShell.createStore).
    const baseSlug = slugify(form.storeName) || `store-${Date.now()}`
    const storeRow = {
      owner_id: auth.user.id,
      name: form.storeName,
      name_ar: form.storeName,
      slug: baseSlug,
      phone: form.phone || null,
      currency: 'DZD',
      plan: 'free',
      is_active: true,
    }

    let { error: insertErr } = await sb.from('stores').insert(storeRow)
    if (insertErr && /unique|duplicate/i.test(insertErr.message)) {
      const randomSlug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`
      ;({ error: insertErr } = await sb.from('stores').insert({ ...storeRow, slug: randomSlug }))
    }

    setLoading(false)
    if (insertErr) {
      // The auth account exists at this point — surface a real message so
      // the merchant knows what to do (usually: contact support / retry).
      setError('تم إنشاء حسابك، لكن تعذّر إنشاء المتجر: ' + insertErr.message + '. أعد المحاولة أو تواصل مع الدعم.')
      return
    }

    // Full-page nav so the sb-* cookie is on the very next request and
    // the /dashboard middleware+layout both see the session (no push/refresh race).
    window.location.assign('/dashboard')
  }

  const fields: { key: FieldKey; label: string; placeholder: string; type?: string; dir?: 'ltr' | 'rtl'; autocomplete?: string; minLength?: number }[] = [
    { key: 'storeName', label: t('auth.register.f_store'),    placeholder: t('auth.register.f_store_ph'), autocomplete: 'organization' },
    { key: 'email',     label: t('auth.register.f_email'),    placeholder: 'example@email.com', type: 'email', dir: 'ltr', autocomplete: 'email' },
    { key: 'phone',     label: t('auth.register.f_phone'),    placeholder: '0555 xx xx xx', type: 'tel', dir: 'ltr', autocomplete: 'tel' },
  ]

  return (
    <div className="auth-card">
      <div className="auth-mark">
        <span className="auth-mark__badge">C</span>
        <span className="auth-mark__name">Commerco</span>
      </div>

      <h1 className="auth-title">{t('auth.register.title2')}</h1>
      <p className="auth-sub">{t('auth.register.subtitle2')}</p>

      <form onSubmit={onSubmit} className="auth-form" noValidate>
        {fields.map(f => (
          <div key={f.key} className="c-field">
            <label htmlFor={f.key} className="c-label">
              {f.label} <span className="req">*</span>
            </label>
            <input
              id={f.key}
              type={f.type ?? 'text'}
              required
              autoComplete={f.autocomplete}
              dir={f.dir ?? (isRtl ? 'rtl' : 'ltr')}
              value={form[f.key]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="c-input"
            />
          </div>
        ))}

        <div className="c-field">
          <label htmlFor="password" className="c-label">
            {t('auth.register.f_password')} <span className="req">*</span>
          </label>
          <div className="auth-input-wrap">
            <input
              id="password"
              type={showPw ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              dir="ltr"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              placeholder="••••••••"
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
          <p className="c-hint">{isRtl ? '8 أحرف على الأقل' : '8 characters minimum'}</p>
        </div>

        {error && (
          <div className="auth-alert" role="alert" aria-live="polite">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className={`c-btn c-btn--primary ${loading ? 'is-loading' : ''}`}>
          {loading
            ? <><Loader2 size={16} className="animate-spin" aria-hidden />{t('auth.register.submitting')}</>
            : <>{t('auth.register.submit')}<ArrowInline size={16} aria-hidden /></>
          }
        </button>
      </form>

      <p className="auth-foot">
        {t('auth.register.have_account')}
        <Link href="/login" className="auth-link">{t('auth.register.login_link')}</Link>
      </p>
    </div>
  )
}
