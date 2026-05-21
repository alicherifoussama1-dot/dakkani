'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Mail, CheckCircle, ArrowRight } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    const { error: err } = await createClient().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    setSent(true)
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--color-bg-soft)'}} dir="rtl">
        <div className="card p-8 w-full max-w-sm text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{background:'#D1E7DD'}}>
            <CheckCircle size={28} style={{color:'#198754'}} />
          </div>
          <h2 className="font-black text-xl mb-2" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>تم إرسال البريد!</h2>
          <p className="text-sm mb-5" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
            أرسلنا رابط استعادة كلمة المرور إلى <strong>{email}</strong>. تحقق من بريدك الإلكتروني.
          </p>
          <Link href="/login" className="btn btn-primary w-full" style={{fontFamily:'var(--font-arabic)'}}>
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:'var(--color-bg-soft)'}} dir="rtl">
      <div className="card p-8 w-full max-w-sm">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5" style={{background:'var(--color-accent-soft)'}}>
          <Mail size={20} style={{color:'var(--color-accent)'}} />
        </div>
        <h1 className="font-black text-xl mb-1" style={{color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)'}}>
          استعادة كلمة المرور
        </h1>
        <p className="text-sm mb-6" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
          أدخل بريدك الإلكتروني وسنرسل لك رابط الاستعادة
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)'}}>
              البريد الإلكتروني
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="example@email.com"
              dir="ltr"
              autoComplete="email"
              className="input text-sm"
            />
          </div>

          {error && (
            <div className="text-sm p-3 rounded-lg" style={{background:'var(--color-error-soft)',color:'var(--color-error)',fontFamily:'var(--font-arabic)'}}>
              ⚠️ {error}
            </div>
          )}

          <button type="submit" disabled={loading || !email} className="btn btn-primary w-full gap-2" style={{fontFamily:'var(--font-arabic)'}}>
            {loading
              ? <><Loader2 size={15} className="animate-spin" />جارٍ الإرسال...</>
              : <>إرسال رابط الاستعادة<ArrowRight size={14} /></>
            }
          </button>

          <p className="text-center text-sm" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)'}}>
            تذكرت كلمة مرورك؟{' '}
            <Link href="/login" style={{color:'var(--color-accent)',fontWeight:600}}>سجّل دخولك</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
