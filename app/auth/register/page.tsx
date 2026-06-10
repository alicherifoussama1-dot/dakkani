import { getActiveStore } from '@/lib/supabase/server';
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import WilayaSelector from '@/components/ui/WilayaSelector'
import { slugify } from '@/lib/utils/format'

export default function AuthRegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ storeName:'', email:'', phone:'', password:'' })
  const [wilaya, setWilaya] = useState<number|null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    const sb = createClient()
    const { data: auth, error: authErr } = await sb.auth.signUp({ email: form.email, password: form.password })
    if (authErr || !auth.user) { setError(authErr?.message ?? 'خطأ'); setLoading(false); return }
    const baseSlug = slugify(form.storeName) || `store-${Date.now()}`
    let slug = baseSlug
    const { error: insertErr } = await sb.from('stores').insert({ owner_id: auth.user.id, name: form.storeName, name_ar: form.storeName, slug, phone: form.phone, currency:'DZD', plan:'free', is_active:true })
    if (insertErr?.message?.includes('unique')) {
      slug = `${baseSlug}-${Math.random().toString(36).slice(2,6)}`
      await sb.from('stores').insert({ owner_id: auth.user.id, name: form.storeName, name_ar: form.storeName, slug, phone: form.phone, currency:'DZD', plan:'free', is_active:true })
    }
    setLoading(false); router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="min-h-screen flex" dir="rtl">
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12" style={{ background:'linear-gradient(135deg,#0D6EFD 0%,#0B5ED7 100%)' }}>
        <div>
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center font-black text-white text-xl">د</div>
            <span className="font-black text-white text-xl">دكاني</span>
          </div>
          <h2 className="text-3xl font-black text-white leading-tight mb-4" style={{ fontFamily:'var(--font-arabic)' }}>انضم لآلاف<br/>التجار الجزائريين</h2>
          <ul className="space-y-3 mt-6">
            {['متجر إلكتروني احترافي في دقائق','توصيل لكل الولايات الـ 48','ردود AI بالدارجة الجزائرية','إحصائيات وتحليلات متقدمة'].map(f => (
              <li key={f} className="flex items-center gap-2 text-white/80 text-sm" style={{ fontFamily:'var(--font-arabic)' }}>
                <span className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-xs text-white flex-shrink-0">✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-white/50 text-xs" style={{ fontFamily:'var(--font-arabic)' }}>انضم لأكثر من 12,000 تاجر نشط</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-white overflow-y-auto">
        <div className="w-full max-w-sm py-6">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white" style={{ background:'var(--color-accent)' }}>د</div>
            <span className="font-black text-xl" style={{ color:'var(--color-text-primary)' }}>دكاني</span>
          </div>
          <h1 className="font-bold text-2xl mb-1" style={{ color:'var(--color-text-primary)',fontFamily:'var(--font-arabic)' }}>إنشاء حساب مجاني 🚀</h1>
          <p className="text-sm mb-6" style={{ color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)' }}>ابدأ البيع في أقل من 5 دقائق</p>
          <form onSubmit={submit} className="space-y-3.5">
            {[
              { key:'storeName', label:'اسم المتجر *',         ph:'متجري الجزائري' },
              { key:'email',     label:'البريد الإلكتروني *',  ph:'example@email.com', dir:'ltr', type:'email' },
              { key:'phone',     label:'رقم الهاتف *',         ph:'0555 xx xx xx' },
              { key:'password',  label:'كلمة المرور *',        ph:'8 أحرف على الأقل', type:'password', dir:'ltr' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium mb-1.5" style={{ color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)' }}>{f.label}</label>
                <input type={(f as any).type??'text'} value={form[f.key as keyof typeof form]} onChange={e=>set(f.key,e.target.value)}
                  placeholder={f.ph} dir={(f as any).dir??'rtl'} required className="input text-sm" minLength={f.key==='password'?8:undefined}/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color:'var(--color-text-secondary)',fontFamily:'var(--font-arabic)' }}>الولاية</label>
              <WilayaSelector value={wilaya} onChange={w=>setWilaya(w?.id??null)} />
            </div>
            {error && <div className="text-sm p-3 rounded-lg" style={{ background:'var(--color-error-soft)',color:'var(--color-error)',fontFamily:'var(--font-arabic)' }}>⚠️ {error}</div>}
            <p className="text-xs" style={{ color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)' }}>
              بالتسجيل توافق على <Link href="#" style={{ color:'var(--color-accent)' }}>شروط الاستخدام</Link> و <Link href="#" style={{ color:'var(--color-accent)' }}>سياسة الخصوصية</Link>
            </p>
            <button type="submit" disabled={loading} className="btn btn-primary w-full gap-2" style={{ fontFamily:'var(--font-arabic)' }}>
              {loading?<><Loader2 size={15} className="animate-spin"/>جارٍ الإنشاء...</>:'إنشاء حساب مجاناً ←'}
            </button>
          </form>
          <p className="text-center text-sm mt-4" style={{ color:'var(--color-text-muted)',fontFamily:'var(--font-arabic)' }}>
            لديك حساب؟ <Link href="/auth/login" style={{ color:'var(--color-accent)',fontWeight:600 }}>سجّل دخولك</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
