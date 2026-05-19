'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Lock, CheckCircle } from 'lucide-react'

export default function ResetPasswordPage() {
  const router  = useRouter()
  const [pwd,   setPwd]   = useState('')
  const [pwd2,  setPwd2]  = useState('')
  const [error, setError] = useState('')
  const [done,  setDone]  = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pwd.length < 8)    { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
    if (pwd !== pwd2)       { setError('كلمتا المرور غير متطابقتين'); return }
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password: pwd })
    setLoading(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => router.push('/dashboard'), 2000)
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9F9F9] p-4" dir="rtl">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        <div className="w-12 h-12 bg-[#FFF0ED] rounded-2xl flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-[#E8431A]" />
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
                className="w-full border-2 border-[#EBEBEB] focus:border-[#E8431A] rounded-xl px-4 py-3 outline-none transition"
              />
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">⚠️ {error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#E8431A] hover:bg-[#C73615] text-white font-black py-3 rounded-xl transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الحفظ...</> : 'حفظ كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  )
}
