'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, CheckCircle, AlertCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router  = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [pwd,   setPwd]   = useState('')
  const [pwd2,  setPwd2]  = useState('')
  const [error, setError] = useState('')
  const [done,  setDone]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready,  setReady]  = useState(false)       // checking session finished?
  const [hasSession, setHasSession] = useState(false) // valid session exists?

  // Establish the session from the recovery link BEFORE allowing updateUser.
  // The link returns either ?code=… (PKCE — must be exchanged) or a
  // #access_token…&type=recovery hash (auto-detected by the client).
  useEffect(() => {
    ;(async () => {
      try {
        const url = new URL(window.location.href)
        const tokenHash = url.searchParams.get('token_hash')
        const type = url.searchParams.get('type')
        const code = url.searchParams.get('code')
        // Preferred: deterministic recovery OTP from the emailed link.
        if (tokenHash) {
          try {
            await supabase.auth.verifyOtp({ type: (type as any) || 'recovery', token_hash: tokenHash })
          } catch (otpErr) {
            console.error('verifyOtp failed:', otpErr)
          }
        } else if (code) {
          try {
            await supabase.auth.exchangeCodeForSession(code)
          } catch (exchangeErr) {
            console.error('Code exchange failed:', exchangeErr)
          }
        }
        // give the client a tick to pick up a hash-based recovery session
        let { data } = await supabase.auth.getSession()
        if (!data.session) {
          await new Promise(r => setTimeout(r, 1000))
          data = (await supabase.auth.getSession()).data
        }
        if (data.session) {
          setHasSession(true)
        } else {
          setError('انتهت صلاحية رابط الاسترجاع أو أنه غير صالح. اطلب رابطاً جديداً من «نسيت كلمة المرور».')
        }
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
    if (pwd.length < 8)    { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
    if (pwd !== pwd2)       { setError('كلمتا المرور غير متطابقتين'); return }
    setError('')
    setLoading(true)
    
    try {
      const { error: err } = await supabase.auth.updateUser({ password: pwd })
      setLoading(false)
      if (err) {
        let msg = err.message
        if (msg.includes('Auth session missing')) {
          msg = 'انتهت صلاحية جلسة العمل أو الرابط غير صالح. يرجى طلب رابط جديد.'
        }
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

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9]" dir="rtl">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm w-full">
          <Loader2 className="w-10 h-10 text-[#0D6EFD] animate-spin mx-auto mb-4" />
          <h2 className="text-lg font-black text-gray-900">جارٍ التحقق...</h2>
          <p className="text-gray-500 text-sm mt-1">يرجى الانتظار لحين التحقق من صلاحية رابط الاسترجاع.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9]" dir="rtl">
        <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-sm w-full">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900">تم تغيير كلمة المرور!</h2>
          <p className="text-gray-500 text-sm mt-2">جارٍ توجيهك للوحة التحكم...</p>
        </div>
      </div>
    )
  }

  if (error && !hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9] p-4" dir="rtl">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <AlertCircle className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-2">رابط غير صالح أو منتهي</h2>
          <p className="text-red-600 text-sm leading-relaxed mb-6">{error}</p>
          <button
            onClick={() => router.push('/forgot-password')}
            className="w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-black py-3 rounded-xl transition"
          >
            طلب رابط جديد من «نسيت كلمة المرور»
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9] p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="w-12 h-12 bg-[#EBF5FF] rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-[#0D6EFD]" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-1">كلمة مرور جديدة</h2>
        <p className="text-gray-500 text-sm mb-6">أدخل كلمة مرور قوية لحماية حسابك</p>
        <form onSubmit={submit} className="space-y-4">
          {[
            { label: 'كلمة المرور الجديدة', val: pwd,  set: setPwd },
            { label: 'تأكيد كلمة المرور',  val: pwd2, set: setPwd2 },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">{f.label}</label>
              <input
                type="password"
                value={f.val}
                onChange={e => f.set(e.target.value)}
                placeholder="••••••••"
                className="w-full border-2 border-[#EBEBEB] focus:border-[#0D6EFD] rounded-xl px-4 py-3 outline-none transition"
              />
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">⚠️ {error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-black py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الحفظ...</> : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  )
}

