'use client'
import { useState } from 'react'

interface Props { storeId: string; title?: string; placeholder?: string; cta_label?: string }

// Newsletter capture — posts to /api/storefront/newsletter (real subscribe).
export default function NewsletterBlock({ storeId, title, placeholder, cta_label }: Props) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || state === 'loading') return
    setState('loading')
    try {
      const res = await fetch('/api/storefront/newsletter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ store_id: storeId, email: email.trim() }),
      })
      setState(res.ok ? 'done' : 'error')
    } catch { setState('error') }
  }

  return (
    <section className="px-4 py-12 md:py-16" style={{ background: 'var(--pt-surface-soft,#F8FAFC)' }}>
      <div className="max-w-xl mx-auto text-center">
        <h2 className="text-2xl md:text-3xl mb-4"
          style={{ color: 'var(--pt-text,#0F172A)', fontFamily: 'var(--pt-font-heading)', fontWeight: 'var(--pt-heading-weight,800)' as any }}>
          {title ?? 'اشترك ليصلك كل جديد'}
        </h2>
        {state === 'done' ? (
          <p className="text-base font-semibold" style={{ color: 'var(--pt-success,#16A34A)' }}>✓ شكراً! تم تسجيل اشتراكك</p>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto" dir="rtl">
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder={placeholder ?? 'بريدك الإلكتروني'} dir="ltr"
              className="flex-1 h-12 px-4 rounded-[var(--pt-radius-md,12px)] border outline-none text-base"
              style={{ borderColor: 'var(--pt-border,#E2E8F0)', background: 'var(--pt-surface,#fff)', color: 'var(--pt-text,#0F172A)' }} />
            <button type="submit" disabled={state === 'loading'}
              className="h-12 px-6 rounded-[var(--pt-btn-radius,12px)] font-bold disabled:opacity-60"
              style={{ background: 'var(--pt-accent)', color: 'var(--pt-accent-text-on,#fff)' }}>
              {state === 'loading' ? '...' : (cta_label ?? 'اشتراك')}
            </button>
          </form>
        )}
        {state === 'error' && <p className="text-sm mt-2" style={{ color: 'var(--pt-danger,#DC2626)' }}>تعذّر الاشتراك، حاول مجدداً</p>}
      </div>
    </section>
  )
}
