'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Store, Shield, Truck, Bell, CreditCard, Loader2, Check, Eye, EyeOff } from 'lucide-react'
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

  const saveStore = async () => {
    setLoading(true)
    const sb = createClient()
    await sb.from('stores').update(storeForm).eq('id', store.id)
    setLoading(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
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
              <div className="w-16 h-16 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer overflow-hidden"
                style={{ borderColor: 'var(--color-border)' }}>
                {store.logo_url
                  ? <img src={store.logo_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-black" style={{ color: 'var(--color-accent)' }}>{storeForm.name[0]}</span>
                }
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>شعار المتجر</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>PNG أو JPG — 200×200px مناسب</p>
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
            <button className="btn btn-primary btn-sm" style={{ fontFamily: 'var(--font-arabic)' }}>تحديث كلمة المرور</button>
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
            <input type="number" placeholder="مثال: 5000" className="input text-sm w-48" dir="ltr" />
          </div>
          <button className="btn btn-primary" style={{ fontFamily: 'var(--font-arabic)' }}>حفظ إعدادات التوصيل</button>
        </div>
      )}

      {/* ── NOTIFICATIONS ── */}
      {tab === 'notifs' && (
        <div className="card p-5 space-y-3">
          <h2 className="font-semibold text-sm mb-2" style={{ color: 'var(--color-text-primary)' }}>إعدادات الإشعارات</h2>
          {[
            { label: 'إشعار بريد إلكتروني عند كل طلب', key: 'order_email' },
            { label: 'إشعار SMS عند كل طلب',           key: 'order_sms' },
            { label: 'تنبيه المخزون المنخفض',           key: 'low_stock_alert' },
          ].map(n => (
            <div key={n.key} className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{n.label}</span>
              <div className="w-9 h-5 rounded-full relative cursor-pointer" style={{ background: 'var(--color-accent)' }}>
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full shadow" />
              </div>
            </div>
          ))}
          <button className="btn btn-primary mt-2" style={{ fontFamily: 'var(--font-arabic)' }}>حفظ الإشعارات</button>
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
