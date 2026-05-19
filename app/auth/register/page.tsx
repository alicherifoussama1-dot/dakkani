'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Eye, EyeOff } from 'lucide-react'
import WilayaSelector from '@/components/ui/WilayaSelector'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { slugify } from '@/lib/utils/format'

export default function RegisterPage() {
  const router = useRouter()
  const [form,    setForm]    = useState({ name: '', email: '', phone: '', password: '' })
  const [wilaya,  setWilaya]  = useState<number | null>(null)
  const [showPw,  setShowPw]  = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.name || !form.email || !form.password) {
      setError('يرجى ملء جميع الحقول الإلزامية')
      return
    }
    setLoading(true)
    const supabase = createClient()
    const { data: auth, error: authErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (authErr || !auth.user) { setError(authErr?.message ?? 'خطأ في التسجيل'); setLoading(false); return }

    const slug = slugify(form.name) || `store-${Date.now()}`
    await supabase.from('stores').insert({
      owner_id: auth.user.id,
      name:     form.name,
      name_ar:  form.name,
      slug,
      phone:    form.phone,
      currency: 'DZD',
      plan:     'free',
      is_active: true,
    })

    setLoading(false)
    router.push('/dashboard')
    router.refresh()
  }

  const fields = [
    { key: 'name',     label: 'الاسم الكامل',        placeholder: 'محمد بن علي',       type: 'text',     required: true },
    { key: 'email',    label: 'البريد الإلكتروني',   placeholder: 'example@email.com', type: 'email',    required: true, dir: 'ltr' },
    { key: 'phone',    label: 'رقم الهاتف',          placeholder: '0555 xx xx xx',     type: 'tel',      required: false },
  ]

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ backgroundColor: '#F9F9F9' }}
      dir="rtl"
    >
      <div
        className="w-full max-w-md rounded-3xl p-8 border"
        style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link
            href="/"
            className="inline-block font-black text-3xl mb-3"
            style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
          >
            دكاني<span style={{ color: '#E8431A' }}>.</span>
          </Link>
          <h1
            className="font-bold text-xl"
            style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
          >
            إنشاء حساب مجاني
          </h1>
          <p className="text-sm mt-1" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
            ابدأ البيع أونلاين في أقل من دقيقتين
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Text fields */}
          {fields.map(f => (
            <div key={f.key}>
              <label
                htmlFor={f.key}
                className="block text-sm font-semibold mb-1.5"
                style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
              >
                {f.label}{f.required && <span style={{ color: '#E8431A' }}>  *</span>}
              </label>
              <input
                id={f.key}
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                required={f.required}
                dir={(f as any).dir ?? 'rtl'}
                autoComplete={f.key === 'email' ? 'email' : f.key === 'phone' ? 'tel' : 'name'}
                className="input"
              />
            </div>
          ))}

          {/* Wilaya */}
          <div>
            <label
              className="block text-sm font-semibold mb-1.5"
              style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
            >
              الولاية
            </label>
            <WilayaSelector value={wilaya} onChange={w => setWilaya(w?.id ?? null)} />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="reg-password"
              className="block text-sm font-semibold mb-1.5"
              style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
            >
              كلمة المرور <span style={{ color: '#E8431A' }}>*</span>
            </label>
            <div className="relative">
              <input
                id="reg-password"
                type={showPw ? 'text' : 'password'}
                value={form.password}
                onChange={e => set('password', e.target.value)}
                placeholder="••••••••  (8 أحرف على الأقل)"
                required
                minLength={8}
                dir="ltr"
                autoComplete="new-password"
                className="input pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPw(s => !s)}
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: '#999999' }}
              >
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p
              className="text-sm p-3 rounded-xl"
              style={{ backgroundColor: '#FFF0ED', color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}
            >
              ⚠️ {error}
            </p>
          )}

          {/* Terms */}
          <p className="text-xs" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
            بالتسجيل توافق على{' '}
            <Link href="#terms" style={{ color: '#E8431A' }}>شروط الاستخدام</Link>
            {' '}و{' '}
            <Link href="#privacy" style={{ color: '#E8431A' }}>سياسة الخصوصية</Link>
          </p>

          {/* Submit */}
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
        </form>

        <p
          className="text-center mt-5 text-sm"
          style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}
        >
          عندك حساب؟{' '}
          <Link href="/auth/login" className="font-semibold" style={{ color: '#E8431A' }}>
            سجّل دخولك
          </Link>
        </p>
      </div>
    </div>
  )
}
