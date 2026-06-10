import { getActiveStore } from '@/lib/supabase/server';
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { slugify } from '@/lib/utils/format'

export default function RegisterPage() {
  const router = useRouter()
  const [form,    setForm]    = useState({ storeName: '', email: '', phone: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (authError || !authData.user) { setError(authError?.message ?? 'خطأ في التسجيل'); setLoading(false); return }
    const slug = slugify(form.storeName) || `store-${Date.now()}`
    await supabase.from('stores').insert({
      owner_id: authData.user.id,
      name: form.storeName,
      name_ar: form.storeName,
      slug,
      phone: form.phone,
      currency: 'DZD',
      plan: 'free',
      is_active: true,
    })
    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  const fields = [
    { key: 'storeName', label: 'اسم المتجر',           ph: 'متجري الجزائري',     required: true },
    { key: 'email',     label: 'البريد الإلكتروني',   ph: 'example@email.com',  required: true, dir: 'ltr' },
    { key: 'phone',     label: 'رقم الهاتف',          ph: '0555 xx xx xx',      required: true },
    { key: 'password',  label: 'كلمة المرور',         ph: '••••••••',            required: true, type: 'password', dir: 'ltr' },
  ]

  return (
    <div
      className="w-full max-w-md rounded-3xl p-8 border"
      style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
    >
      <div className="text-center mb-8">
        <Link href="/" className="inline-block font-black text-3xl mb-3" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
          دكاني<span style={{ color: '#0D6EFD' }}>.</span>
        </Link>
        <h1 className="font-bold text-xl" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
          إنشاء حساب مجاني
        </h1>
        <p className="text-sm mt-1" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
          ابدأ البيع أونلاين في أقل من دقيقتين
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" dir="rtl">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-sm font-semibold mb-1.5" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
              {f.label}{f.required && <span style={{ color: '#0D6EFD' }}> *</span>}
            </label>
            <input
              type={(f as any).type ?? 'text'}
              value={(form as any)[f.key]}
              onChange={e => set(f.key, e.target.value)}
              placeholder={f.ph}
              required={f.required}
              dir={(f as any).dir ?? 'rtl'}
              minLength={f.key === 'password' ? 8 : undefined}
              className="input"
            />
          </div>
        ))}

        {error && (
          <p className="text-sm p-3 rounded-xl" style={{ backgroundColor: '#EBF5FF', color: '#0D6EFD', fontFamily: 'var(--font-tajawal)' }}>
            ⚠️ {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn btn-accent w-full h-12 text-base rounded-xl"
          style={{ fontFamily: 'var(--font-tajawal)' }}
        >
          {loading
            ? <><Loader2 size={18} className="animate-spin ml-2" />جارٍ الإنشاء...</>
            : 'إنشاء حساب مجاناً ←'
          }
        </button>

        <p className="text-center text-sm" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
          لديك حساب؟{' '}
          <Link href="/login" className="font-semibold" style={{ color: '#0D6EFD' }}>سجّل دخولك</Link>
        </p>
      </form>
    </div>
  )
}
