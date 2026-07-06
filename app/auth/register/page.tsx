'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import WilayaSelector from '@/components/ui/WilayaSelector'
import { slugify } from '@/lib/utils/format'
import { useT, useDir } from '@/lib/i18n/react'
import LanguageSwitcher from '@/components/i18n/LanguageSwitcher'

export default function AuthRegisterPage() {
  const router = useRouter()
  const t = useT()
  const dir = useDir()
  const [form, setForm] = useState({ storeName:'', email:'', phone:'', password:'' })
  const [wilaya, setWilaya] = useState<number|null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    const sb = createClient()
    const { data: auth, error: authErr } = await sb.auth.signUp({ email: form.email, password: form.password })
    if (authErr || !auth.user) { setError(authErr?.message ?? t('auth.error_generic')); setLoading(false); return }
    const baseSlug = slugify(form.storeName) || `store-${Date.now()}`
    let slug = baseSlug
    const { error: insertErr } = await sb.from('stores').insert({ owner_id: auth.user.id, name: form.storeName, name_ar: form.storeName, slug, phone: form.phone, currency:'DZD', plan:'free', is_active:true })
    if (insertErr?.message?.includes('unique')) {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2,6)}`
      await sb.from('stores').insert({ owner_id: auth.user.id, name: form.storeName, name_ar: form.storeName, slug, phone: form.phone, currency:'DZD', plan:'free', is_active:true })
    }
    setLoading(false); router.push('/dashboard'); router.refresh()
  }

  const fields = [
    { key:'storeName', label:t('auth.register.f_store'),    ph:t('auth.register.f_store_ph') },
    { key:'email',     label:t('auth.register.f_email'),    ph:'example@email.com', dir:'ltr', type:'email' },
    { key:'phone',     label:t('auth.register.f_phone'),    ph:t('auth.register.f_phone_ph') },
    { key:'password',  label:t('auth.register.f_password'), ph:t('auth.register.f_password_ph'), type:'password', dir:'ltr' },
  ]

  return (
    <div className="min-h-screen flex relative" dir={dir}>
      <div className="absolute top-4 left-4 z-10"><LanguageSwitcher /></div>
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12" style={{ background:'linear-gradient(135deg,#0D6EFD 0%,#0B5ED7 100%)' }}>
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center font-black text-white text-xl">C</div>
            <span className="font-black text-white text-xl">Commerco</span>
          </div>
          <h2 className="text-3xl font-black text-white leading-tight mb-4" style={{ fontFamily:'var(--font-arabic)' }}>{t('auth.register.aside_title')}</h2>
          <ul className="space-y-3 mt-6">
            {['feature_1','feature_2','feature_3','feature_4'].map(f => (
              <li key={f} className="flex items-center gap-2 text-white/80 text-sm" style={{ fontFamily:'var(--font-arabic)' }}>
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">✓</span>
                {t(`auth.register.${f}`)}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-white/50 text-xs" style={{ fontFamily:'var(--font-arabic)' }}>{t('auth.register.aside_sub')}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="w-full max-w-sm py-6">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white" style={{ background:'var(--color-accent)' }}>C</div>
            <span className="font-black text-xl" style={{ color:'var(--color-text-primary)' }}>Commerco</span>
          </div>
          <h1 className="font-bold text-2xl mb-1" style={{ color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)' }}>{t('auth.register.title')}</h1>
          <p className="text-sm mb-6" style={{ color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)' }}>{t('auth.register.subtitle')}</p>
          <form onSubmit={submit} className="space-y-3.5">
            {fields.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)' }}>{f.label}</label>
                <input type={(f as any).type??'text'} value={form[f.key as keyof typeof form]} onChange={e=>set(f.key,e.target.value)}
                  placeholder={f.ph} dir={(f as any).dir??dir} required className="input text-sm" minLength={f.key==='password'?8:undefined}/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)' }}>{t('auth.register.wilaya')}</label>
              <WilayaSelector value={wilaya} onChange={w=>setWilaya(w?.id??null)} />
            </div>
            {error && <div className="text-sm p-3 rounded-lg" style={{ background:'var(--color-error-soft)',color:'var(--color-error)',fontFamily:'var(--font-arabic)' }}>⚠️ {error}</div>}
            <p className="text-xs" style={{ color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)' }}>
              {t('auth.register.terms_pre')} <Link href="#" style={{ color:'var(--color-accent)' }}>{t('auth.register.terms')}</Link> {t('auth.register.and')} <Link href="#" style={{ color:'var(--color-accent)' }}>{t('auth.register.privacy')}</Link>
            </p>
            <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2" style={{ fontFamily:'var(--font-arabic)' }}>
              {loading?<><Loader2 size={15} className="animate-spin"/>{t('auth.register.submitting')}</>:t('auth.register.submit')}
            </button>
          </form>
          <p className="text-center text-sm mt-4" style={{ color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)' }}>
            {t('auth.register.have_account')} <Link href="/auth/login" style={{ color:'var(--color-accent)',fontWeight:600 }}>{t('auth.register.login_link')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
