'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowRight, ArrowLeft, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useT, useDir } from '@/lib/i18n/react'

export default function ForgotPasswordPage() {
  const t = useT()
  const dir = useDir()
  const isRtl = dir === 'rtl'
  const ArrowInline = isRtl ? ArrowLeft : ArrowRight

  const [email,     setEmail]     = useState('')
  const [sent,      setSent]      = useState(false)
  const [error,     setError]     = useState('')
  const [loading,   setLoading]   = useState(false)
  const [debugLink, setDebugLink] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json().catch(() => ({}))
    setLoading(false)
    if (!res.ok) { setError(data.error ?? t('forgot.error_generic')); return }
    if (data.debug_link) setDebugLink(data.debug_link)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="auth-card" role="status" aria-live="polite">
        <div className="text-center">
          <div className="auth-success__icon"><CheckCircle size={28} aria-hidden /></div>
          <h1 className="auth-title">{t('forgot.sent_title')}</h1>
          <p className="auth-sub">
            {t('forgot.sent_sub')}
            <br />
            <strong style={{ color: 'var(--text-primary)', fontVariantNumeric: 'var(--numeric-tabular)' }} dir="ltr">
              {email}
            </strong>
          </p>
        </div>

        {debugLink && (
          <div className="auth-alert auth-alert--warn" style={{ marginBlockEnd: 'var(--space-4)' }}>
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 'var(--font-semibold)', marginBlockEnd: 4 }}>{t('forgot.dev_mode')}</div>
              <a href={debugLink} dir="ltr" style={{ fontSize: 'var(--text-xs)', wordBreak: 'break-all', color: 'var(--text-link)' }}>{debugLink}</a>
            </div>
          </div>
        )}

        <div className="auth-alert auth-alert--warn">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <div style={{ fontWeight: 'var(--font-semibold)', marginBlockEnd: 4 }}>{t('forgot.not_received')}</div>
            <ul style={{ fontSize: 'var(--text-xs)', lineHeight: 'var(--leading-loose)', paddingInlineStart: 'var(--space-4)', listStyle: 'disc' }}>
              <li>{t('forgot.check_spam')}</li>
              <li>{t('forgot.wait_retry')}</li>
            </ul>
          </div>
        </div>

        <div style={{ marginBlockStart: 'var(--space-6)', display: 'grid', gap: 'var(--space-2)' }}>
          <button
            onClick={() => { setSent(false); setError(''); setDebugLink('') }}
            className="c-btn c-btn--secondary"
          >
            {t('forgot.resend')}
          </button>
          <Link href="/login" className="c-btn c-btn--ghost">
            {t('forgot.back')}
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-card">
      <div className="auth-mark">
        <span className="auth-mark__badge">C</span>
        <span className="auth-mark__name">Commerco</span>
      </div>

      <h1 className="auth-title">{t('forgot.title')}</h1>
      <p className="auth-sub">{t('forgot.subtitle')}</p>

      <form onSubmit={submit} className="auth-form" noValidate>
        <div className="c-field">
          <label htmlFor="email" className="c-label">{t('auth.email')}</label>
          <div className="auth-input-wrap">
            <input
              id="email" type="email" required autoComplete="email" dir="ltr"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              className="c-input"
              style={{ paddingInlineStart: 44 }}
            />
            <span aria-hidden style={{
              position: 'absolute', insetBlockStart: '50%', insetInlineStart: 14,
              transform: 'translateY(-50%)', color: 'var(--text-muted)',
              display: 'inline-flex', pointerEvents: 'none',
            }}>
              <Mail size={16} />
            </span>
          </div>
        </div>

        {error && (
          <div className="auth-alert" role="alert" aria-live="polite">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <button type="submit" disabled={loading || !email} className={`c-btn c-btn--primary ${loading ? 'is-loading' : ''}`}>
          {loading
            ? <><Loader2 size={16} className="animate-spin" aria-hidden />{t('forgot.sending')}</>
            : <>{t('forgot.send')}<ArrowInline size={16} aria-hidden /></>
          }
        </button>
      </form>

      <p className="auth-foot">
        <Link href="/login" className="auth-link">{t('forgot.back')}</Link>
      </p>
    </div>
  )
}
