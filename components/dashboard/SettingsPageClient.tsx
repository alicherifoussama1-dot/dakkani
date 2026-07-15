'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Store, Shield, Truck, Bell, CreditCard, Loader2, Check, Eye, EyeOff, Camera, ShoppingCart, Globe } from 'lucide-react'
import Link from 'next/link'

const TABS = [
  { id:'store',   label:'معلومات المتجر', icon: Store },
  { id:'languages',label:'اللغات والترجمة',icon: Globe },
  { id:'security',label:'الأمان',          icon: Shield },
  { id:'delivery',label:'التوصيل',         icon: Truck },
  { id:'notifs',  label:'الإشعارات',       icon: Bell },
  { id:'checkout',label:'صفحة الدفع',      icon: ShoppingCart },
  { id:'billing', label:'الاشتراك',        icon: CreditCard },
]

const DAYS_AR = ['الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد']

const ALL_CHECKOUT_FIELDS = [
  { id: 'name',    label: 'الاسم واللقب',      icon: '👤', deletable: false },
  { id: 'wilaya',  label: 'الولاية',          icon: '🌏', deletable: false },
  { id: 'baladia', label: 'البلدية / المكتب', icon: '📍', deletable: true },
  { id: 'phone',   label: 'رقم الهاتف',       icon: '📞', deletable: false },
  { id: 'phone2',  label: 'هاتف بديل',        icon: '📱', deletable: true },
  { id: 'address', label: 'العنوان التفصيلي', icon: '🏠', deletable: true },
  { id: 'notes',   label: 'ملاحظات الطلب',   icon: '📝', deletable: true },
]

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

  // ── Abandoned-checkout window (migration 028/029). The Pixel/Sheet
  // toggles are PER PRODUCT (product editor → وجهة الطلبات); only the
  // abandonment window stays store-wide here.
  const [abandonedWindow, setAbandonedWindow] = useState<number>(storeSettings?.abandoned_window_minutes ?? 5)
  const [abandonedSaved, setAbandonedSaved] = useState(false)

  const saveAbandoned = async () => {
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.from('store_settings').upsert({
      store_id: store.id,
      abandoned_window_minutes: Math.min(1440, Math.max(1, Number(abandonedWindow) || 5)),
    }, { onConflict: 'store_id' })
    setLoading(false)
    if (error) {
      alert('خطأ في حفظ إعدادات الطلبات المتروكة — تأكد من تشغيل الهجرة 028.\n\n' + error.message)
      return
    }
    setAbandonedSaved(true)
    setTimeout(() => setAbandonedSaved(false), 3000)
    router.refresh()
  }

  // Language settings state
  const [storeLanguages, setStoreLanguages] = useState<string[]>(storeSettings?.languages ?? ['ar'])
  const [defaultLanguage, setDefaultLanguage] = useState<string>(storeSettings?.default_language ?? 'ar')
  const [langSaved, setLangSaved] = useState(false)

  const saveLanguages = async () => {
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.from('store_settings').upsert({
      store_id: store.id,
      languages: storeLanguages,
      default_language: defaultLanguage,
    }, { onConflict: 'store_id' })
    setLoading(false)
    if (error) {
      alert('خطأ في حفظ إعدادات اللغة: ' + error.message)
      return
    }
    setLangSaved(true)
    setTimeout(() => setLangSaved(false), 3000)
    router.refresh()
  }

  const saveNotifications = async () => {
    setLoading(true)
    const sb = createClient()
    await sb.from('store_settings').upsert({ store_id: store.id, ...notifSettings }, { onConflict: 'store_id' })
    setLoading(false)
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 3000)
  }

  // ── Checkout Customization States ──
  // theme picker deprecated (Phase 1); value preserved for backward-compatible saves
  const [checkoutTheme] = useState<string>(storeSettings?.checkout_theme ?? 'default')
  const [checkoutSectionOrder, setCheckoutSectionOrder] = useState<string[]>(
    storeSettings?.checkout_section_order ?? ['customer_info', 'delivery_info', 'payment_info', 'coupon']
  )
  const defaultCheckoutFields = {
    name:    { visible: true },
    wilaya:  { visible: true },
    baladia: { visible: true },
    phone:   { visible: true },
    phone2:  { visible: false, required: false },
    address: { visible: true, required: false },
    notes:   { visible: false, required: false },
  }
  const [checkoutFields, setCheckoutFields] = useState<any>({
    ...defaultCheckoutFields,
    ...(storeSettings?.checkout_fields ?? {}),
  })
  const savedFieldOrder: string[] = storeSettings?.checkout_field_order ?? []
  // Always ensure baladia is in the list (backward compat)
  const defaultFieldOrder = ['name', 'wilaya', 'baladia', 'phone', 'address']
  const mergedFieldOrder = savedFieldOrder.length > 0
    ? (savedFieldOrder.includes('baladia') ? savedFieldOrder : [...savedFieldOrder, 'baladia'])
    : defaultFieldOrder
  const [checkoutFieldOrder, setCheckoutFieldOrder] = useState<string[]>(mergedFieldOrder)
  const [checkoutSaved, setCheckoutSaved] = useState(false)

  // ── Drag state refs (section order) ──
  const dragSectionItem    = useRef<number | null>(null)
  const dragSectionOverItem = useRef<number | null>(null)

  const handleSectionDragEnd = () => {
    if (dragSectionItem.current === null || dragSectionOverItem.current === null) return
    if (dragSectionItem.current === dragSectionOverItem.current) return
    const arr = [...checkoutSectionOrder]
    const dragged = arr.splice(dragSectionItem.current, 1)[0]
    arr.splice(dragSectionOverItem.current, 0, dragged)
    setCheckoutSectionOrder(arr)
    autoSaveSectionOrder(arr)
    dragSectionItem.current = null
    dragSectionOverItem.current = null
  }

  // ── Drag state refs (field order) ──
  const dragFieldItem    = useRef<number | null>(null)
  const dragFieldOverItem = useRef<number | null>(null)

  const handleFieldDragEnd = () => {
    if (dragFieldItem.current === null || dragFieldOverItem.current === null) return
    if (dragFieldItem.current === dragFieldOverItem.current) return
    const arr = [...checkoutFieldOrder]
    const dragged = arr.splice(dragFieldItem.current, 1)[0]
    arr.splice(dragFieldOverItem.current, 0, dragged)
    autoSaveFieldOrder(arr)
    dragFieldItem.current = null
    dragFieldOverItem.current = null
  }

  const saveCheckout = async () => {
    setLoading(true)
    const sb = createClient()
    const { error } = await sb.from('store_settings').upsert({
      store_id: store.id,
      checkout_theme: checkoutTheme,
      checkout_section_order: checkoutSectionOrder,
      checkout_fields: checkoutFields,
      checkout_field_order: checkoutFieldOrder,
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

  // ── Auto-save field order immediately ──
  const autoSaveFieldOrder = async (newOrder: string[]) => {
    const sb = createClient()
    await sb.from('store_settings').upsert({
      store_id: store.id,
      checkout_field_order: newOrder,
    }, { onConflict: 'store_id' })
    setCheckoutFieldOrder(newOrder)
  }

  // ── Auto-save field visibility immediately ──
  const autoSaveFieldVisible = async (fieldId: string, visible: boolean) => {
    const newFields = { ...checkoutFields, [fieldId]: { ...checkoutFields[fieldId], visible } }
    setCheckoutFields(newFields)
    const sb = createClient()
    await sb.from('store_settings').upsert({
      store_id: store.id,
      checkout_fields: newFields,
    }, { onConflict: 'store_id' })
  }

  // ── Auto-save field required status immediately ──
  const autoSaveFieldRequired = async (fieldId: string, required: boolean) => {
    const newFields = { ...checkoutFields, [fieldId]: { ...checkoutFields[fieldId], required } }
    setCheckoutFields(newFields)
    const sb = createClient()
    await sb.from('store_settings').upsert({
      store_id: store.id,
      checkout_fields: newFields,
    }, { onConflict: 'store_id' })
  }

  // Checkout theme auto-save removed (Phase 1 deprecation). `checkout_theme`
  // remains in the saved payload as its existing/'default' value for compatibility.

  // ── Auto-save section order immediately ──
  const autoSaveSectionOrder = async (newOrder: string[]) => {
    const sb = createClient()
    await sb.from('store_settings').upsert({
      store_id: store.id,
      checkout_section_order: newOrder,
    }, { onConflict: 'store_id' })
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

    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordForm.new })
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok || data.error) {
        setPwError(data.error || 'فشلت عملية تغيير كلمة المرور.')
        return
      }
      setPwSaved(true)
      setPasswordForm({ current: '', new: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 3000)
    } catch (err) {
      setLoading(false)
      setPwError('حدث خطأ أثناء الاتصال بالخادم. يرجى المحاولة لاحقاً.')
    }
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

      {/* ── LANGUAGES TAB ── */}
      {tab === 'languages' && (
        <div className="space-y-5">
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>إعدادات اللغات والترجمة للمتجر</h2>
            
            <div className="space-y-3">
              <label className="block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>ألسنة العرض المدعومة في متجرك (الزبائن):</label>
              <div className="space-y-2">
                {[
                  { id: 'ar', label: 'العربية (RTL)' },
                  { id: 'fr', label: 'الفرنسية (LTR)' },
                  { id: 'en', label: 'الإنجليزية (LTR)' },
                ].map(langOpt => {
                  const checked = storeLanguages.includes(langOpt.id)
                  return (
                    <label key={langOpt.id} className="flex items-center gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={langOpt.id === 'ar'} // Arabic must be enabled by default/cannot be disabled
                        onChange={e => {
                          if (e.target.checked) {
                            setStoreLanguages(prev => [...prev, langOpt.id])
                          } else {
                            setStoreLanguages(prev => prev.filter(l => l !== langOpt.id))
                            // If default language was this one, reset it to 'ar'
                            if (defaultLanguage === langOpt.id) {
                              setDefaultLanguage('ar')
                            }
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 text-[#0D6EFD] focus:ring-[#0D6EFD] accent-[#0D6EFD]"
                      />
                      <span className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>{langOpt.label}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="w-1/2">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>اللغة الافتراضية للمتجر (اللغة الأساسية عند فتح الرابط):</label>
              <select
                value={defaultLanguage}
                onChange={e => setDefaultLanguage(e.target.value)}
                className="input text-sm"
              >
                {storeLanguages.map(l => (
                  <option key={l} value={l}>
                    {l === 'ar' ? 'العربية' : l === 'fr' ? 'الفرنسية' : 'الإنجليزية'}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={saveLanguages}
                disabled={loading}
                className="btn btn-primary btn-sm"
                style={{ fontFamily: 'var(--font-arabic)' }}
              >
                {loading ? 'جارٍ الحفظ...' : 'حفظ إعدادات اللغات'}
              </button>
              {langSaved && <span className="text-green-600 font-bold text-sm">✓ تم الحفظ بنجاح!</span>}
            </div>
          </div>
        </div>
      )}

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
                  <a href={`https://wa.me/?text=${encodeURIComponent(`زور متجري على Commerco: https://dakkani.vercel.app/store/${store.slug}`)}`}
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
          {/* Checkout Theme picker DEPRECATED (Phase 1): the checkout now follows
              the ONE global design system (--pt-* tokens). `checkout_theme` is
              kept in store_settings for backward compatibility, but is no longer
              merchant-configurable and will be ignored by the forms in Phase 2. */}

          {/* Abandoned checkout (الطلبات المتروكة) — window only; the Pixel
              and Sheet options are configured PER PRODUCT (migration 029) */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>الطلبات المتروكة 🛒</h2>
            <p className="text-xs -mt-1" style={{ color: 'var(--color-text-muted)' }}>
              عندما يُدخل الزبون رقم هاتفه ثم يغادر دون إتمام الطلب، يُسجَّل الطلب فوراً بحالة &quot;مهجور&quot; مع كل المعلومات التي أدخلها
            </p>
            <div className="rounded-xl p-3 text-xs" style={{ background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}>
              خيارا «احتساب التحويلات» و«الإرسال إلى قوقل شيت» أصبحا لكل منتج على حدة —
              تجدهما في محرر المنتج ← تبويب «وجهة الطلبات» 📬
            </div>
            <div className="flex items-center justify-between py-2.5">
              <div>
                <span className="text-sm block" style={{ color: 'var(--color-text-secondary)' }}>مهلة اعتبار الطلب متروكاً (بالدقائق)</span>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>احتياط فقط — مغادرة الصفحة تُنهي الطلب المتروك فوراً</span>
              </div>
              <input
                type="number" min={1} max={1440} dir="ltr"
                value={abandonedWindow}
                onChange={e => setAbandonedWindow(parseInt(e.target.value) || 5)}
                className="input text-sm w-24 text-center"
              />
            </div>
            <button onClick={saveAbandoned} disabled={loading} className="btn btn-primary btn-sm" style={{ fontFamily: 'var(--font-arabic)' }}>
              {loading ? 'جارٍ الحفظ...' : abandonedSaved ? '✓ تم الحفظ' : 'حفظ إعدادات الطلبات المتروكة'}
            </button>
          </div>

          {/* Section Ordering */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>ترتيب أقسام صفحة الدفع</h2>
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-muted)' }}>اسحب الأقسام وأعد ترتيبها بالطريقة التي تناسب عملائك</p>

            <div className="space-y-2 max-w-md">
              {checkoutSectionOrder.map((sec, idx) => {
                const label =
                  sec === 'customer_info' ? 'معلومات العميل 👤' :
                  sec === 'delivery_info' ? 'معلومات التوصيل 🚚' :
                  sec === 'payment_info' ? 'طريقة الدفع 💳' :
                  sec === 'coupon' ? 'كوبون الخصم 🏷️' : sec

                return (
                  <div
                    key={sec}
                    draggable
                    onDragStart={() => { dragSectionItem.current = idx }}
                    onDragEnter={() => { dragSectionOverItem.current = idx }}
                    onDragEnd={handleSectionDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100 cursor-grab active:cursor-grabbing select-none transition-all hover:bg-blue-50 hover:border-blue-200 hover:shadow-sm"
                    style={{ userSelect: 'none' }}
                  >
                    <span className="text-gray-300 text-lg leading-none" title="اسحب للترتيب">⠿</span>
                    <span className="text-xs font-bold text-gray-700 flex-1">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Field Ordering + Visibility + Add/Delete */}
          <div className="card p-5 space-y-5">
            <div>
              <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>تخصيص حقول الشاكوت 📋</h2>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>اسحب لترتيب • 👁 لإخفاء حقل • ✕ لحذفه • كل تغيير يُحفظ تلقائيًا</p>
            </div>

            {/* Active fields list (draggable) */}
            <div className="space-y-2">
              {checkoutFieldOrder.map((fieldId, idx) => {
                const fieldDef = ALL_CHECKOUT_FIELDS.find(f => f.id === fieldId)
                if (!fieldDef) return null
                const isVisible = checkoutFields[fieldId]?.visible ?? true

                return (
                  <div
                    key={fieldId}
                    draggable
                    onDragStart={() => { dragFieldItem.current = idx }}
                    onDragEnter={() => { dragFieldOverItem.current = idx }}
                    onDragEnd={handleFieldDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all cursor-grab active:cursor-grabbing select-none ${
                      isVisible
                        ? 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-sm'
                        : 'bg-gray-50 border-dashed border-gray-200 opacity-60'
                    }`}
                    style={{ userSelect: 'none' }}
                  >
                    {/* Drag handle */}
                    <span className="text-gray-300 text-lg flex-shrink-0 cursor-grab">⠿</span>

                    {/* Icon + Label */}
                    <span className="text-lg flex-shrink-0">{fieldDef.icon}</span>
                    <span className="text-sm font-semibold text-gray-700 flex-1">{fieldDef.label}</span>

                    {!isVisible && (
                      <span className="text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">مخفي</span>
                    )}

                    {/* Visibility toggle */}
                    <button
                      type="button"
                      title={isVisible ? 'إخفاء الحقل' : 'إظهار الحقل'}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        autoSaveFieldVisible(fieldId, !isVisible)
                      }}
                      className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center text-sm transition-all flex-shrink-0 ${
                        isVisible
                          ? 'border-blue-200 bg-blue-50 text-blue-500 hover:bg-blue-100 hover:border-blue-300'
                          : 'border-gray-200 bg-gray-100 text-gray-400 hover:bg-gray-200'
                      }`}
                    >
                      {isVisible ? '👁️' : '🙅'}
                    </button>

                    {/* Delete button */}
                    {fieldDef.deletable && (
                      <button
                        type="button"
                        title="حذف الحقل"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          autoSaveFieldOrder(checkoutFieldOrder.filter(id => id !== fieldId))
                        }}
                        className="w-8 h-8 rounded-lg border-2 border-red-200 bg-red-50 text-red-400 hover:bg-red-100 hover:border-red-300 hover:text-red-600 flex items-center justify-center text-sm flex-shrink-0 transition-all"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Add field — show fields not in list */}
            {ALL_CHECKOUT_FIELDS.filter(f => !checkoutFieldOrder.includes(f.id)).length > 0 && (
              <div className="pt-3 border-t border-dashed border-gray-200">
                <p className="text-xs text-gray-500 mb-2">➕ إضافة حقل جديد:</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_CHECKOUT_FIELDS
                    .filter(f => !checkoutFieldOrder.includes(f.id))
                    .map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          autoSaveFieldOrder([...checkoutFieldOrder, f.id])
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-dashed border-blue-300 text-blue-600 text-xs rounded-xl hover:bg-blue-50 transition-colors font-medium"
                      >
                        <span>{f.icon}</span>
                        <span>+ {f.label}</span>
                      </button>
                    ))
                  }
                </div>
              </div>
            )}
          </div>

          {/* Fields Required Settings */}
          <div className="card p-5 space-y-3">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>الحقول الإجبارية ⚠️</h2>
            <p className="text-xs -mt-2" style={{ color: 'var(--color-text-muted)' }}>حدد الحقول التي يجب أن يملأها العميل إجباريًا (لا يمكنه تكميل الطلب بدونها)</p>
            <div className="space-y-2 max-w-md">
              {[
                { id: 'address', label: 'العنوان التفصيلي إجباري', icon: '🏠' },
                { id: 'phone2',  label: 'الهاتف البديل إجباري',    icon: '📱' },
              ].map(({ id, label, icon }) => (
                <div key={id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{icon}</span>
                    <span className="text-xs font-medium text-gray-700">{label}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => autoSaveFieldRequired(id, !(checkoutFields[id]?.required ?? false))}
                    className="w-9 h-5 rounded-full relative transition-colors duration-200 flex-shrink-0"
                    style={{ background: (checkoutFields[id]?.required ?? false) ? 'var(--color-accent)' : '#DEE2E6' }}
                  >
                    <span
                      className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
                      style={{ right: (checkoutFields[id]?.required ?? false) ? '2px' : 'calc(100% - 18px)' }}
                    />
                  </button>
                </div>
              ))}
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
