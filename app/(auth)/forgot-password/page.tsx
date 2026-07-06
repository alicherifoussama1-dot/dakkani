'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Mail, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react'
import { useT, useDir } from '@/lib/i18n/react'


export default function ForgotPasswordPage() {
  const t = useT()
  const dir = useDir()
  const [email, setEmail]   = useState('')
  const [sent,  setSent]    = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const [debugLink, setDebugLink] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? t('forgot.error_generic')); return }
    if (data.debug_link) setDebugLink(data.debug_link)
    setSent(true)
  }

  if (sent) {
    return (
      <div className="w-full max-w-md card p-8 text-center" dir={dir}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'#D1E7DD'}}>
          <CheckCircle size={28} style={{color:'#198754'}} />
        </div>
        <h2 className="font-black text-xl mb-2" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>{t('forgot.sent_title')}</h2>
        <p className="text-sm mb-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
          {t('forgot.sent_sub')}
        </p>
        <p className="font-bold text-sm px-4 py-2 rounded-lg mb-4" style={{color:'var(--color-text-primary)',background:'var(--color-bg-soft)',fontFamily:'var(--font-primary)'}}>
          {email}
        </p>

        {debugLink && (
          <div className="rounded-xl p-3 text-sm text-right mb-4 border" style={{background:'#FFF3CD',borderColor:'#FFC107'}}>
            <p className="font-bold text-yellow-800 mb-1.5">{t('forgot.dev_mode')}</p>
            <a href={debugLink} className="text-xs break-all" style={{color:'var(--color-accent)'}}>{debugLink}</a>
          </div>
        )}

        <div className="rounded-xl p-3 text-sm text-right mb-4" style={{background:'#FFF3CD',fontFamily:'var(--font-arabic)'}}>
          <p className="font-bold text-yellow-800 mb-1.5">{t('forgot.not_received')}</p>
          <ul className="space-y-0.5 text-xs text-yellow-700">
            <li>{t('forgot.check_spam')}</li>
            <li>{t('forgot.wait_retry')}</li>
          </ul>
        </div>

        <button onClick={() => { setSent(false); setError(''); setDebugLink('') }}
          className="text-sm font-semibold mb-2" style={{color:'var(--color-accent)',fontFamily:'var(--font-arabic)'}}>
          {t('forgot.resend')}
        </button>
        <br/>
        <Link href="/login" className="text-sm" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
          {t('forgot.back')}
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md card p-8" dir={dir}>
      <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{background:'var(--color-accent-soft)'}}>
        <Mail size={20} style={{color:'var(--color-accent)'}} />
      </div>
      <h1 className="font-black text-xl mb-1" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>
        {t('forgot.title')}
      </h1>
      <p className="text-sm mb-6" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
        {t('forgot.subtitle')}
      </p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>
            {t('auth.email')}
          </label>
          <input
            type="email" value={email} onChange={e=>setEmail(e.target.value)}
            required placeholder="example@email.com" dir="ltr" autoComplete="email"
            className="input text-sm"
          />
        </div>

        {error && (
          <div className="text-sm p-3 rounded-lg flex items-start gap-2" style={{background:'var(--color-error-soft)',color:'var(--color-error)',fontFamily:'var(--font-arabic)'}}>
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            {error}
          </div>
        )}

        <button type="submit" disabled={loading || !email} className="btn btn-primary w-full gap-2" style={{fontFamily:'var(--font-arabic)'}}>
          {loading
            ? <><Loader2 size={15} className="animate-spin"/>{t('forgot.sending')}</>
            : <>{t('forgot.send')}<ArrowRight size={14}/></>
          }
        </button>

        <p className="text-center text-sm" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
          <Link href="/login" style={{color:'var(--color-accent)',fontWeight:600}}>{t('forgot.back')}</Link>
        </p>
      </form>
    </div>
  )
}
