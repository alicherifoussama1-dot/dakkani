'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function AuthLoginPage() {
  return <Suspense fallback={null}><AuthLoginInner /></Suspense>
}

function AuthLoginInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams ? searchParams.get('error') : null

  const [email,setEmail]=useState(''), [password,setPassword]=useState('')
  const [showPw,setShowPw]=useState(false), [loading,setLoading]=useState(false), [error,setError]=useState(urlError || '')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    const { error: err } = await createClient().auth.signInWithPassword({ email, password })
    setLoading(false)
    if (err) { setError(err.message); return }
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12"
        style={{ background: 'linear-gradient(135deg,#0D6EFD 0%,#0B5ED7 100%)' }}>
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center font-black text-white text-xl">د</div>
            <span className="font-black text-white text-xl">دكاني</span>
          </div>
          <h2 className="text-3xl font-black text-white leading-tight mb-4" style={{ fontFamily: 'var(--font-arabic)' }}>
            ابدأ البيع أونلاين<br/>في دقائق
          </h2>
          <p className="text-white/70 text-sm leading-relaxed" style={{ fontFamily: 'var(--font-arabic)' }}>
            منصة التجارة الإلكترونية الأولى في الجزائر.<br/>توصيل لـ 48 ولاية، دفع آمن، AI بالدارجة.
          </p>
        </div>
        <div className="flex gap-3 flex-wrap">
          {['+12,000 تاجر','48 ولاية','98% رضا'].map(s => (
            <div key={s} className="bg-white/10 rounded-xl px-4 py-2.5">
              <p className="text-white font-bold text-sm">{s}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white" style={{ background: 'var(--color-accent)' }}>د</div>
            <span className="font-black text-xl" style={{ color: 'var(--color-text-primary)' }}>دكاني</span>
          </div>
          <h1 className="font-bold text-2xl mb-1" style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-arabic)' }}>مرحباً بك 👋</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>سجّل دخولك لإدارة متجرك</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-arabic)' }}>البريد الإلكتروني</label>
              <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="example@email.com" dir="ltr" autoComplete="email" className="input text-sm"/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-arabic)' }}>كلمة المرور</label>
                <Link href="/forgot-password" className="text-xs" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-arabic)' }}>نسيت كلمة المرور؟</Link>
              </div>
              <div className="relative">
                <input type={showPw?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} required dir="ltr" autoComplete="current-password" className="input text-sm pl-10"/>
                <button type="button" onClick={()=>setShowPw(s=>!s)} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }}>
                  {showPw?<EyeOff size={15}/>:<Eye size={15}/>}
                </button>
              </div>
            </div>
            {error && <div className="text-sm p-3 rounded-lg" style={{ background:'var(--color-error-soft)',color:'var(--color-error)',fontFamily:'var(--font-arabic)' }}>⚠️ {error}</div>}
            <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2" style={{ fontFamily: 'var(--font-arabic)' }}>
              {loading?<><Loader2 size={15} className="animate-spin"/>جارٍ الدخول...</>:'تسجيل الدخول'}
            </button>
          </form>
          <p className="text-center text-sm mt-5" style={{ color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)' }}>
            ليس لديك حساب؟{' '}
            <Link href="/auth/register" style={{ color:'var(--color-accent)',fontWeight:600 }}>سجّل مجاناً</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
