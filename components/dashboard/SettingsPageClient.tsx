'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Store, Shield, Truck, Bell, CreditCard, Loader2, Check, Eye, EyeOff, Camera, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

const TABS = [
  { id:'store',   label:'معلومات المتجر', icon: Store },
  { id:'security',label:'الأمان',          icon: Shield },
  { id:'delivery',label:'التوصيل',         icon: Truck },
  { id:'notifs',  label:'الإشعارات',       icon: Bell },
  { id:'checkout',label:'صفحة الدفع',      icon: ShoppingCart },
  { id:'billing', label:'الاشتراك',        icon: CreditCard },
]

const DAYS_AR = ['الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد']

interface Props { store: any; user: any; wilayas: { id: number; name_ar: string }[] }

export default function SettingsPageClient({ store, user, wilayas }: Props) {
  const router  = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [tab,   setTab]   = useState(tabParam || 'store')

  // ── Normalize store_settings: Supabase returns it as an array via store_settings(*) ──
  const rawSettings = store.store_settings
  const storeSettings = Array.isArray(rawSettings) ? (rawSettings[0] ?? null) : (rawSettings ?? null)

  useEffect(() => {
    if (tabParam) {
      setTab(tabParam)
    }
  }, [tabParam])
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
  const [freeThreshold, setFreeThreshold] = useState<string>(String(storeSettings?.free_delivery_threshold ?? ''))
  const [notifSettings, setNotifSettings] = useState({
    order_email: storeSettings?.order_email ?? true,
    order_sms:   storeSettings?.order_sms ?? false,
    low_stock_alert: storeSettings?.low_stock_alert ?? true,
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

  // ── Checkout Customization States ──
  const [checkoutTheme, setCheckoutTheme] = useState<string>(storeSettings?.checkout_theme ?? 'default')
  const [checkoutSectionOrder, setCheckoutSectionOrder] = useState<string[]>(
    storeSettings?.checkout_section_order ?? ['customer_info', 'delivery_info', 'payment_info', 'coupon']
  )
  const [checkoutFields, setCheckoutFields] = useState<any>(
    storeSettings?.checkout_fields ?? {
      phone2: { visible: true, required: false },
      address: { visible: true, required: false },
      notes: { visible: true, required: false }
    }
  )
  const [checkoutSaved, setCheckoutSaved] = useState(false)

  const saveCheckout = async () => {
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.from('store_settings').upsert({
      store_id: store.id,
      checkout_theme: checkoutTheme,
      checkout_section_order: checkoutSectionOrder,
      checkout_fields: checkoutFields,
    }, { onConflict: 'store_id' })
    
    setLoading(false)
    if (error) {
      alert('خطأ في الحفظ: يرجى التأكد من تشغيل ملف الهجرة (Migration 021) في قاعدة البيانات لتحديث الجداول.\n\nتفاصيل الخطأ: ' + error.message)
      return
    }
    setCheckoutSaved(true)
    setTimeout(() => setCheckoutSaved(false), 3000)
    router.refresh()
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

      {/* ── CHECKOUT CUSTOMIZATION ── */}
      {tab === 'checkout' && (
        <div className="space-y-6">
          {/* Themes */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>ثيم صفحة الدفع 🎨</h2>
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-muted)' }}>اختر المظهر البصري المناسب لصفحة الدفع لزيادة المبيعات</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'default', label: 'الكلاسيكي', desc: 'بسيط وهادئ ومناسب لكل المنتجات', icon: '📝', colors: 'from-gray-100 to-gray-200 text-gray-700' },
                { id: 'modern', label: 'العصري', desc: 'تصميم جذاب بظلال ناعمة وزوايا مستديرة', icon: '✨', colors: 'from-amber-100 to-orange-200 text-orange-700' },
                { id: 'glassmorphism', label: 'الزجاجي الفاخر', desc: 'ثيم داكن شفاف وتأثيرات مضيئة', icon: '🔮', colors: 'from-indigo-900 to-slate-800 text-indigo-300' },
                { id: 'compact', label: 'المدمج السريع', desc: 'تصميم مكثف لتقليل التمرير وزيادة التحويل', icon: '⚡', colors: 'from-blue-100 to-teal-200 text-teal-700' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCheckoutTheme(t.id)}
                  className={`flex flex-col text-right p-4 rounded-2xl border-2 transition relative overflow-hidden h-full ${
                    checkoutTheme === t.id ? 'border-[#0D6EFD] bg-[#EBF5FF]' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 bg-gradient-to-br ${t.colors}`}>
                    {t.icon}
                  </div>
                  <p className="text-xs font-bold text-gray-900">{t.label}</p>
                  <p className="text-[10px] text-gray-500 mt-1 line-clamp-3 leading-relaxed">{t.desc}</p>
                  {checkoutTheme === t.id && (
                    <span className="absolute top-2 left-2 text-[#0D6EFD] font-black text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Section Ordering */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>ترتيب أقسام صفحة الدفع ↕️</h2>
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-muted)' }}>رتب الأقسام الأساسية لصفحة الدفع بالطريقة التي تناسب عملائك</p>

            <div className="space-y-2 max-w-md">
              {checkoutSectionOrder.map((sec, idx) => {
                const label =
                  sec === 'customer_info' ? 'معلومات العميل 👤' :
                  sec === 'delivery_info' ? 'معلومات التوصيل 🚚' :
                  sec === 'payment_info' ? 'طريقة الدفع 💳' :
                  sec === 'coupon' ? 'كوبون الخصم 🏷️' : sec

                const move = (direction: -1 | 1) => {
                  const newOrder = [...checkoutSectionOrder]
                  const targetIdx = idx + direction
                  if (targetIdx < 0 || targetIdx >= newOrder.length) return
                  ;[newOrder[idx], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[idx]]
                  setCheckoutSectionOrder(newOrder)
                }

                return (
                  <div key={sec} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <span className="text-xs font-bold text-gray-700">{label}</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => move(-1)}
                        disabled={idx === 0}
                        className="w-7 h-7 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center text-xs font-bold"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(1)}
                        disabled={idx === checkoutSectionOrder.length - 1}
                        className="w-7 h-7 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-30 flex items-center justify-center text-xs font-bold"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Fields Customization */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>تخصيص حقول المدخلات ⚙️</h2>
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-muted)' }}>اختر الحقول الاختيارية أو المطلوبة لتبسيط عملية إتمام الطلب</p>

            <div className="space-y-3 max-w-lg">
              {/* Phone 2 */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800">حقل الهاتف البديل (هاتف 2)</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">حقل إضافي للعميل لكتابة رقم هاتف احتياطي</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkoutFields.phone2?.visible ?? true}
                      onChange={e => setCheckoutFields((f: any) => ({
                        ...f,
                        phone2: { ...f.phone2, visible: e.target.checked }
                      }))}
                      className="w-3.5 h-3.5 accent-[#0D6EFD]"
                    />
                    مفعّل ومظهر
                  </label>
                </div>
              </div>

              {/* Address */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800">حقل العنوان التفصيلي</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">الحي، الشارع، ورقم البناية (لالتوصيل المنزلي)</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkoutFields.address?.visible ?? true}
                      onChange={e => setCheckoutFields((f: any) => ({
                        ...f,
                        address: { ...f.address, visible: e.target.checked }
                      }))}
                      className="w-3.5 h-3.5 accent-[#0D6EFD]"
                    />
                    مفعّل ومظهر
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkoutFields.address?.required ?? false}
                      disabled={!(checkoutFields.address?.visible ?? true)}
                      onChange={e => setCheckoutFields((f: any) => ({
                        ...f,
                        address: { ...f.address, required: e.target.checked }
                      }))}
                      className="w-3.5 h-3.5 accent-[#0D6EFD]"
                    />
                    مطلوب إجباري
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-xs font-bold text-gray-800">حقل ملاحظات الطلب</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">أي تعليمات خاصة بالطلب أو التوصيل</p>
                </div>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkoutFields.notes?.visible ?? true}
                      onChange={e => setCheckoutFields((f: any) => ({
                        ...f,
                        notes: { ...f.notes, visible: e.target.checked }
                      }))}
                      className="w-3.5 h-3.5 accent-[#0D6EFD]"
                    />
                    مفعّل ومظهر
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Action button */}
          <button onClick={saveCheckout} disabled={loading} className="btn btn-primary gap-2" style={{ fontFamily: 'var(--font-arabic)' }}>
            {loading ? <><Loader2 size={14} className="animate-spin" />جارٍ الحفظ...</>
              : checkoutSaved ? <><Check size={14} />تم الحفظ</>
              : 'حفظ إعدادات صفحة الدفع'}
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
