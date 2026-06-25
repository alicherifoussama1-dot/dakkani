'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function MerchantLoginPage() {
  return <Suspense fallback={null}><MerchantLoginInner /></Suspense>
}

function MerchantLoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams ? searchParams.get('error') : null

  const [email,setEmail]=useState(''),[password,setPassword]=useState('')
  const [showPw,setShowPw]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState(urlError || '')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    const { error: err } = await createClient().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="w-full max-w-md rounded-2xl border bg-white p-8" style={{ borderColor:'var(--color-border)', boxShadow:'var(--shadow-card)' }}>
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-white text-xl" style={{ background:'var(--color-accent)' }}>د</div>
          <span className="font-black text-2xl" style={{ color:'var(--color-text-primary)' }}>دكاني</span>
        </div>
        <h1 className="font-bold text-xl" style={{ color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)' }}>مرحبا بك في دكاني</h1>
        <p className="text-xs mt-1 font-medium px-3 py-1 rounded-full inline-block" style={{ background:'var(--color-accent-soft)',color:'var(--color-accent)',fontFamily:'var(--font-arabic)' }}>للتجار فقط</p>
      </div>
      <form onSubmit={submit} className="space-y-4" dir="rtl">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)' }}>البريد الإلكتروني</label>
          <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="example@email.com" dir="ltr" autoComplete="email" className="input text-sm"/>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium" style={{ color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)' }}>كلمة المرور</label>
            <Link href="/forgot-password" className="text-xs" style={{ color:'var(--color-accent)',fontFamily:'var(--font-arabic)' }}>نسيت كلمة المرور؟</Link>
          </div>
          <div className="relative">
            <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required dir="ltr" autoComplete="current-password" className="input text-sm pl-10"/>
            <button type="button" onClick={()=>setShowPw(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color:'var(--color-text-muted)' }}>
              {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
            </button>
          </div>
        </div>
        {error && <div className="text-sm p-3 rounded-lg" style={{ background:'var(--color-error-soft)',color:'var(--color-error)',fontFamily:'var(--font-arabic)' }}>⚠️ {error}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2" style={{ fontFamily:'var(--font-arabic)' }}>
          {loading?<><Loader2 size={15} className="animate-spin"/>جارٍ الدخول...</>:'تسجيل الدخول'}
        </button>
        <p className="text-center text-sm" style={{ color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)' }}>
          ليس لديك حساب؟{' '}
          <Link href="/register" style={{ color:'var(--color-accent)',fontWeight:600 }}>سجّل الآن مجاناً</Link>
        </p>
      </form>
    </div>
  )
}
