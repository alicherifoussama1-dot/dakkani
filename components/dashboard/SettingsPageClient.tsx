'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Store, Shield, Truck, Bell, CreditCard, Loader2, Check, Eye, EyeOff, Camera } from 'lucide-react'
import Link from 'next/link'

const TABS = [
  { id:'store',   label:'معلومات المتجر', icon: Store },
  { id:'security',label:'الأمان',          icon: Shield },
  { id:'delivery',label:'التوصيل',         icon: Truck },
  { id:'notifs',  label:'الإشعارات',       icon: Bell },
  { id:'billing', label:'الاشتراك',        icon: CreditCard },
]

const DAYS_AR = ['الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد']

interface Props { store: any; user: any; wilayas: { id: number; name_ar: string }[] }

export default function SettingsPageClient({ store, user, wilayas }: Props) {
  const router  = useRouter()
  const [tab,   setTab]   = useState('store')
  const [saved, setSaved] = useState(false)
  const [loading,setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const [storeForm, setStoreForm] = useState({
    name:    store.name ?? '',
    name_ar: store.name_ar ?? '',
    description_ar: store.description_ar ?? '',
    phone:   store.phone ?? '',
    whatsapp: store.whatsapp ?? '',
    email:   store.email ?? '',
    address: store.address ?? '',
  })

  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [freeThreshold, setFreeThreshold] = useState<string>(String(store.store_settings?.free_delivery_threshold ?? ''))
  const [notifSettings, setNotifSettings] = useState({
    order_email: store.store_settings?.order_email ?? true,
    order_sms:   store.store_settings?.order_sms ?? false,
    low_stock_alert: store.store_settings?.low_stock_alert ?? true,
  })
  const [notifSaved, setNotifSaved] = useState(false)

  const saveNotifications = async () => {
    setLoading(true)
    const sb = createClient()
    await sb.from('store_settings').upsert({ store_id: store.id, ...notifSettings }, { onConflict: 'store_id' })
    setLoading(false)
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }
  const [delivSaved, setDelivSaved] = useState(false)

  const saveDelivery = async () => {
    setLoading(true)
    const sb = createClient()
    await sb.from('store_settings').upsert({
      store_id: store.id,
      free_delivery_threshold: freeThreshold ? parseFloat(freeThreshold) : null,
    }, { onConflict: 'store_id' })
    setLoading(false)
    setDelivSaved(true)
    setTimeout(() => setDelivSaved(false), 3000)
    router.refresh()
  }
  const [pwError, setPwError]       = useState(''), [pwSaved, setPwSaved] = useState(false)
  const [logoLoading, setLogoLoading] = useState(false)
  const [logoUrl, setLogoUrl]         = useState<string | null>(store.logo_url ?? null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoLoading(true)
    const form = new FormData()
    form.append('file', file)
    form.append('folder', 'logos')
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    if (res.ok) {
      const data = await res.json()
      setLogoUrl(data.url)
      const sb = createClient()
      await sb.from('stores').update({ logo_url: data.url }).eq('id', store.id)
      router.refresh()
    }
    setLogoLoading(false)
  }

  const saveStore = async () => {
    setLoading(true)
    const sb = createClient()
    await sb.from('stores').update(storeForm).eq('id', store.id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  const changePassword = async () => {
    setPwError('')
    if (passwordForm.new.length < 8) { setPwError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return }
    if (passwordForm.new !== passwordForm.confirm) { setPwError('كلمتا المرور غير متطابقتين'); return }
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.auth.updateUser({ password: passwordForm.new })
    setLoading(false)
    if (error) { setPwError(error.message); return }
    setPwSaved(true)
    setPasswordForm({ current: '', new: '', confirm: '' })
    setTimeout(() => setPwSaved(false), 3000)
  }

  const Field = ({ label, name, type = 'text', placeholder = '', dir: d = 'rtl' }: any) => (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-arabic)' }}>{label}</label>
      <input
        type={type} placeholder={placeholder} dir={d}
        value={storeForm[name as keyof typeof storeForm] ?? ''}
        onChange={e => setStoreForm(f => ({ ...f, [name]: e.target.value }))}
        className="input text-sm"
      />
    </div>
  )

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <h1 className="page-title mb-5">الإعدادات</h1>

      {/* Tabs */}
      <div className="tab-bar mb-6">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`tab-item flex items-center gap-1.5 ${tab === t.id ? 'active' : ''}`}>
            <t.icon size={13} />{t.label}
          </button>
        ))}
      </div>

      {/* ── STORE INFO ── */}
      {tab === 'store' && (
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>معلومات المتجر</h2>

            {/* Logo */}
            <div className="flex items-center gap-4">
              <div
                onClick={() => logoInputRef.current?.click()}
                className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden relative group transition-colors hover:border-[#0D6EFD]"
                style={{ borderColor: 'var(--color-border)' }}>
                {logoLoading
                  ? <Loader2 size={20} className="animate-spin" style={{color:'var(--color-accent)'}}/>
                  : logoUrl
                    ? <img src={logoUrl} alt="" className="w-full h-full object-cover" />
                    : <span className="text-2xl font-black" style={{ color: 'var(--color-accent)' }}>{(storeForm.name[0] ?? '').toUpperCase()}</span>
                }
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera size={16} className="text-white" />
                </div>
              </div>
              <input ref={logoInputRef} type="file" accept="image/*" className="sr-only" onChange={uploadLogo} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>شعار المتجر</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>اضغط للتغيير — PNG/JPG (max 5MB)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="اسم المتجر (عربي)" name="name_ar" />
              <Field label="Store Name (FR/EN)" name="name" dir="ltr" />
              <Field label="رقم الهاتف" name="phone" />
              <Field label="رقم واتساب" name="whatsapp" />
              <Field label="البريد الإلكتروني" name="email" type="email" dir="ltr" />
              <Field label="العنوان" name="address" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>وصف المتجر</label>
              <textarea
                value={storeForm.description_ar}
                onChange={e => setStoreForm(f => ({ ...f, description_ar: e.target.value }))}
                rows={3} className="input text-sm h-auto py-2" style={{ resize: 'none' }}
                placeholder="وصف مختصر عن متجرك..."
              />
            </div>

            {/* Store URL */}
            {store.slug && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>رابط المتجر</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://dakkani.vercel.app'}/store/${store.slug}`}
                    className="input text-sm flex-1" dir="ltr" style={{ background: 'var(--color-bg-soft)' }} />
                  <button
                    onClick={() => navigator.clipboard.writeText(`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://dakkani.vercel.app'}/store/${store.slug}`)}
                    className="btn btn-sm btn-outline">نسخ</button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`زور متجري على دكاني: https://dakkani.vercel.app/store/${store.slug}`)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn btn-sm" style={{background:'#25D366',color:'#fff',border:'none'}}>
                    مشاركة
                  </a>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>أيام العمل</label>
              <div className="flex flex-wrap gap-2">
                {DAYS_AR.map(d => (
                  <label key={d} className="flex items-center gap-1.5 cursor-pointer text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#0D6EFD]" />
                    {d}
                  </label>
                ))}
              </div>
            </div>
          </div>

          <button onClick={saveStore} disabled={loading} className="btn btn-primary gap-2" style={{ fontFamily: 'var(--font-arabic)' }}>
            {loading ? <><Loader2 size={14} className="animate-spin" />جارٍ الحفظ...</>
              : saved ? <><Check size={14} />تم الحفظ</>
              : 'حفظ التغييرات'}
          </button>
        </div>
      )}

      {/* ── SECURITY ── */}
      {tab === 'security' && (
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>معلومات الحساب</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>البريد الإلكتروني</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={user.email ?? ''} dir="ltr" className="input text-sm flex-1" style={{ background: 'var(--color-bg-soft)' }} />
                  <span className="badge badge-green text-[10px]">مفعّل</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>رقم الهاتف</label>
                <input value={storeForm.phone} onChange={e => setStoreForm(f => ({ ...f, phone: e.target.value }))} className="input text-sm" />
              </div>
            </div>
          </div>

          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>تغيير كلمة المرور</h2>
            {[
              { label: 'كلمة المرور الحالية', key: 'current' },
              { label: 'كلمة المرور الجديدة', key: 'new' },
              { label: 'تأكيد كلمة المرور',  key: 'confirm' },
            ].map(f => (
              <div key={f.key} className="relative">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>{f.label}</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={passwordForm[f.key as keyof typeof passwordForm]}
                  onChange={e => setPasswordForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="input text-sm pl-10" dir="ltr"
                />
                <button onClick={() => setShowPw(s => !s)} className="absolute left-3 bottom-2.5 text-gray-400 hover:text-[#495057]">
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            ))}
            {pwError && <div className="text-xs p-2 rounded-lg" style={{background:'var(--color-error-soft)',color:'var(--color-error)',fontFamily:'var(--font-arabic)'}}>⚠️ {pwError}</div>}
            {pwSaved && <div className="text-xs p-2 rounded-lg" style={{background:'var(--color-success-soft)',color:'var(--color-success)',fontFamily:'var(--font-arabic)'}}>✓ تم تحديث كلمة المرور</div>}
            <button onClick={changePassword} disabled={loading || !passwordForm.new} className="btn btn-primary btn-sm" style={{ fontFamily: 'var(--font-arabic)' }}>
              {loading ? 'جارٍ التحديث...' : pwSaved ? '✓ تم' : 'تحديث كلمة المرور'}
            </button>
          </div>

          <div className="card p-5 border-red-200" style={{ border: '1px solid #FCA5A5' }}>
            <h2 className="font-semibold text-sm mb-2" style={{ color: '#DC3545' }}>منطقة الخطر</h2>
            <p className="text-xs mb-3" style={{ color: 'var(--color-text-muted)' }}>بمجرد حذف حسابك لا يمكن التراجع عن ذلك.</p>
            <button className="btn btn-danger btn-sm" style={{ fontFamily: 'var(--font-arabic)' }}>حذف الحساب</button>
          </div>
        </div>
      )}

      {/* ── DELIVERY ── */}
      {tab === 'delivery' && (
        <div className="card p-5 space-y-4">
          <h2 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>تغطية الولايات</h2>
          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>حدد الولايات التي تغطيها وأسعار التوصيل لكل واحدة</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {wilayas.map(w => (
              <label key={w.id} className="flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer hover:bg-[#F8F9FA] transition-colors"
                style={{ borderColor: 'var(--color-border)' }}>
                <input type="checkbox" defaultChecked className="w-3.5 h-3.5 accent-[#0D6EFD]" />
                <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>{w.name_ar}</span>
              </label>
            ))}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>حد التوصيل المجاني (دج)</label>
            <input type="number" value={freeThreshold} onChange={e => setFreeThreshold(e.target.value)} placeholder="مثال: 5000" className="input text-sm w-48" dir="ltr" />
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>
              الطلبات التي تتجاوز هذا المبلغ يُعفى من رسوم التوصيل
            </p>
          </div>
          <button onClick={saveDelivery} disabled={loading} className="btn btn-primary btn-sm" style={{ fontFamily: 'var(--font-arabic)' }}>
            {loading ? 'جارٍ الحفظ...' : delivSaved ? '✓ تم الحفظ' : 'حفظ إعدادات التوصيل'}
          </button>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab === 'notifs' && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>إعدادات الإشعارات</h2>
          {[
            { label: 'إشعار بريد إلكتروني عند كل طلب', key: 'order_email' as const },
            { label: 'إشعار SMS عند كل طلب',           key: 'order_sms' as const },
            { label: 'تنبيه المخزون المنخفض',           key: 'low_stock_alert' as const },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{n.label}</span>
              <button
                onClick={() => setNotifSettings(s => ({ ...s, [n.key]: !s[n.key] }))}
                className="w-9 h-5 rounded-full relative transition-colors duration-200 cursor-pointer"
                style={{ background: notifSettings[n.key] ? 'var(--color-accent)' : '#DEE2E6' }}>
                <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                  style={{ right: notifSettings[n.key] ? '2px' : 'calc(100% - 18px)' }} />
              </button>
            </div>
          ))}
          <button onClick={saveNotifications} disabled={loading} className="btn btn-primary btn-sm mt-2" style={{ fontFamily: 'var(--font-arabic)' }}>
            {loading ? 'جارٍ الحفظ...' : notifSaved ? '✓ تم الحفظ' : 'حفظ الإشعارات'}
          </button>
        </div>
      )}

      {/* ── BILLING ── */}
      {tab === 'billing' && (
        <div className="space-y-4">
          <div className="card p-5 flex items-center justify-between flex-wrap gap-4" style={{ background: 'linear-gradient(135deg,#EBF5FF,#F8F9FA)' }}>
            <div>
              <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{store.name_ar ?? store.name}</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>خطة <strong className="text-accent">{store.plan === 'pro' ? 'Pro' : 'أساسي'}</strong></p>
            </div>
            <Link href="/billing/plans" className="btn btn-primary btn-sm" style={{ fontFamily: 'var(--font-arabic)' }}>
              ترقية الخطة
            </Link>
          </div>
          <Link href="/billing/history" className="btn btn-sm w-full justify-center" style={{ border: '1px solid var(--color-border)', background: '#fff', fontFamily: 'var(--font-arabic)' }}>
            سجل الفواتير
          </Link>
        </div>
      )}
    </div>
  )
}
