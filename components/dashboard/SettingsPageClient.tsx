'use client'
// COMMERCO SETTINGS — cobalt DS redesign.
// Every save/upload/password/toggle handler is preserved 1:1; only the
// visual layer + progressive disclosure + toasts are new. Data contracts,
// autosave-on-change wiring, migration-fallback text, upload URL, and the
// abandoned-window semantics are unchanged.
import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/ui/toast'
import {
  Store, Shield, Truck, Bell, CreditCard, Loader2, Eye, EyeOff, Camera,
  ShoppingCart, Globe, Copy, Share2, ChevronDown, GripVertical, Plus, X, Check,
  MessageSquare, RotateCcw,
} from 'lucide-react'
import { DEFAULT_WHATSAPP_TEMPLATE, buildWhatsAppMessage } from '@/lib/utils/whatsapp'

// ── Tab identity — icons carry meaning, labels lead ─────────
const TABS = [
  { id: 'store',      label: 'المتجر',            icon: Store },
  { id: 'languages',  label: 'اللغات',            icon: Globe },
  { id: 'security',   label: 'الأمان',            icon: Shield },
  { id: 'delivery',   label: 'التوصيل',           icon: Truck },
  { id: 'whatsapp',   label: 'صفحة الشكر',       icon: MessageSquare },
  { id: 'notifs',     label: 'الإشعارات',         icon: Bell },
  { id: 'checkout',   label: 'صفحة الدفع',        icon: ShoppingCart },
  { id: 'billing',    label: 'الاشتراك',          icon: CreditCard },
] as const
type TabId = typeof TABS[number]['id']

const WHATSAPP_VARIABLES = [
  { varName: '{store_name}',      label: 'اسم المتجر' },
  { varName: '{order_number}',    label: 'رقم الطلب' },
  { varName: '{customer_name}',   label: 'اسم العميل' },
  { varName: '{phone}',           label: 'رقم الهاتف' },
  { varName: '{product_name}',    label: 'اسم المنتج' },
  { varName: '{variant}',         label: 'خيار/متغير المنتج' },
  { varName: '{quantity}',        label: 'الكمية' },
  { varName: '{total}',           label: 'المبلغ الإجمالي' },
  { varName: '{wilaya}',          label: 'الولاية' },
  { varName: '{commune}',         label: 'البلدية' },
  { varName: '{delivery_method}', label: 'طريقة التوصيل' },
  { varName: '{address}',         label: 'العنوان التفصيلي' },
  { varName: '{stopdesk}',        label: 'اسم مكتب التوصيل' },
]

const DAYS_AR = ['الإثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت','الأحد']

const ALL_CHECKOUT_FIELDS = [
  { id: 'name',    label: 'الاسم واللقب',      icon: '👤', deletable: false },
  { id: 'wilaya',  label: 'الولاية',           icon: '🌏', deletable: false },
  { id: 'baladia', label: 'البلدية / المكتب',  icon: '📍', deletable: true  },
  { id: 'phone',   label: 'رقم الهاتف',        icon: '📞', deletable: false },
  { id: 'phone2',  label: 'هاتف بديل',         icon: '📱', deletable: true  },
  { id: 'address', label: 'العنوان التفصيلي',  icon: '🏠', deletable: true  },
  { id: 'notes',   label: 'ملاحظات الطلب',    icon: '📝', deletable: true  },
]

interface Props { store: any; user: any; wilayas: { id: number; name_ar: string }[]; storeHostname?: string | null }

export default function SettingsPageClient({ store, user, wilayas, storeHostname }: Props) {
  const router  = useRouter()
  const searchParams = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [tab, setTab] = useState<TabId>((tabParam as TabId) || 'store')
  useEffect(() => { if (tabParam) setTab(tabParam as TabId) }, [tabParam])

  const rawSettings = store.store_settings
  const storeSettings = Array.isArray(rawSettings) ? (rawSettings[0] ?? null) : (rawSettings ?? null)

  // ── STATE (identical to prior version) ──────────────────────
  const [loading, setLoading] = useState(false)
  const [showPw,  setShowPw]  = useState(false)

  const [storeForm, setStoreForm] = useState({
    name: store.name ?? '', name_ar: store.name_ar ?? '',
    description_ar: store.description_ar ?? '',
    phone: store.phone ?? '', whatsapp: store.whatsapp ?? '',
    email: store.email ?? '', address: store.address ?? '',
  })
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [freeThreshold, setFreeThreshold] = useState<string>(String(storeSettings?.free_delivery_threshold ?? ''))
  const [notifSettings, setNotifSettings] = useState({
    order_email: storeSettings?.order_email ?? true,
    order_sms:   storeSettings?.order_sms ?? false,
    low_stock_alert: storeSettings?.low_stock_alert ?? true,
  })
  const [abandonedWindow, setAbandonedWindow] = useState<number>(storeSettings?.abandoned_window_minutes ?? 5)
  const [storeLanguages, setStoreLanguages]   = useState<string[]>(storeSettings?.languages ?? ['ar'])
  const [defaultLanguage, setDefaultLanguage] = useState<string>(storeSettings?.default_language ?? 'ar')

  const [checkoutTheme] = useState<string>(storeSettings?.checkout_theme ?? 'default')
  const [checkoutSectionOrder, setCheckoutSectionOrder] = useState<string[]>(
    storeSettings?.checkout_section_order ?? ['customer_info', 'delivery_info', 'payment_info', 'coupon'],
  )
  const defaultCheckoutFields = {
    name: { visible: true }, wilaya: { visible: true }, baladia: { visible: true },
    phone: { visible: true }, phone2: { visible: false, required: false },
    address: { visible: true, required: false }, notes: { visible: false, required: false },
  }
  const [checkoutFields, setCheckoutFields] = useState<any>({ ...defaultCheckoutFields, ...(storeSettings?.checkout_fields ?? {}) })
  const savedFieldOrder: string[] = storeSettings?.checkout_field_order ?? []
  const defaultFieldOrder = ['name', 'wilaya', 'baladia', 'phone', 'address']
  const mergedFieldOrder = savedFieldOrder.length > 0
    ? (savedFieldOrder.includes('baladia') ? savedFieldOrder : [...savedFieldOrder, 'baladia'])
    : defaultFieldOrder
  const [checkoutFieldOrder, setCheckoutFieldOrder] = useState<string[]>(mergedFieldOrder)

  const [whatsappTemplate, setWhatsappTemplate] = useState<string>(
    storeSettings?.whatsapp_template ?? DEFAULT_WHATSAPP_TEMPLATE
  )
  const [whatsappNumber, setWhatsappNumber] = useState<string>(storeSettings?.whatsapp_number ?? '')
  const [callNumber, setCallNumber] = useState<string>(storeSettings?.call_number ?? '')
  const [thankyouWaEnabled, setThankyouWaEnabled] = useState<boolean>(storeSettings?.thankyou_wa_enabled ?? true)
  const [thankyouCallEnabled, setThankyouCallEnabled] = useState<boolean>(storeSettings?.thankyou_call_enabled ?? true)

  const waTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  const saveWhatsAppTemplate = async () => {
    setLoading(true)
    const { error } = await createClient().from('store_settings').upsert({
      store_id: store.id,
      whatsapp_number: whatsappNumber,
      call_number: callNumber,
      whatsapp_template: whatsappTemplate,
      thankyou_wa_enabled: thankyouWaEnabled,
      thankyou_call_enabled: thankyouCallEnabled,
    }, { onConflict: 'store_id' })
    setLoading(false)
    if (error) return toast.error(`فشل حفظ إعدادات صفحة الشكر: ${error.message}`)
    toast.success('تم حفظ إعدادات صفحة الشكر الافتراضية بنجاح')
    router.refresh()
  }

  const restoreDefaultWhatsAppTemplate = () => {
    setWhatsappTemplate(DEFAULT_WHATSAPP_TEMPLATE)
    toast.success('تم استعادة الرسالة الافتراضية')
  }

  const insertWhatsAppVariable = (varName: string) => {
    if (waTextareaRef.current) {
      const el = waTextareaRef.current
      const start = el.selectionStart
      const end = el.selectionEnd
      const text = whatsappTemplate
      const newText = text.substring(0, start) + varName + text.substring(end)
      setWhatsappTemplate(newText)
      setTimeout(() => {
        el.focus()
        el.setSelectionRange(start + varName.length, start + varName.length)
      }, 0)
    } else {
      setWhatsappTemplate(prev => prev + ' ' + varName)
    }
  }

  // ── Drag refs (identical) ───────────────────────────────────
  const dragSectionItem = useRef<number | null>(null)
  const dragSectionOverItem = useRef<number | null>(null)
  const dragFieldItem = useRef<number | null>(null)
  const dragFieldOverItem = useRef<number | null>(null)

  const handleSectionDragEnd = () => {
    if (dragSectionItem.current === null || dragSectionOverItem.current === null) return
    if (dragSectionItem.current === dragSectionOverItem.current) return
    const arr = [...checkoutSectionOrder]
    const dragged = arr.splice(dragSectionItem.current, 1)[0]
    arr.splice(dragSectionOverItem.current, 0, dragged)
    setCheckoutSectionOrder(arr)
    autoSaveSectionOrder(arr)
    dragSectionItem.current = null; dragSectionOverItem.current = null
  }
  const handleFieldDragEnd = () => {
    if (dragFieldItem.current === null || dragFieldOverItem.current === null) return
    if (dragFieldItem.current === dragFieldOverItem.current) return
    const arr = [...checkoutFieldOrder]
    const dragged = arr.splice(dragFieldItem.current, 1)[0]
    arr.splice(dragFieldOverItem.current, 0, dragged)
    autoSaveFieldOrder(arr)
    dragFieldItem.current = null; dragFieldOverItem.current = null
  }

  // ── SAVES (unchanged data flow; alert → toast) ──────────────
  const saveLanguages = async () => {
    setLoading(true)
    const { error } = await createClient().from('store_settings').upsert(
      { store_id: store.id, languages: storeLanguages, default_language: defaultLanguage },
      { onConflict: 'store_id' })
    setLoading(false)
    if (error) return toast.error(`فشل حفظ إعدادات اللغة: ${error.message}`)
    toast.success('تم حفظ إعدادات اللغة')
    router.refresh()
  }

  const saveNotifications = async () => {
    setLoading(true)
    const { error } = await createClient().from('store_settings').upsert(
      { store_id: store.id, ...notifSettings }, { onConflict: 'store_id' })
    setLoading(false)
    if (error) return toast.error(`فشل حفظ الإشعارات: ${error.message}`)
    toast.success('تم حفظ الإشعارات')
  }

  const saveCheckout = async () => {
    setLoading(true)
    const { error } = await createClient().from('store_settings').upsert({
      store_id: store.id, checkout_theme: checkoutTheme,
      checkout_section_order: checkoutSectionOrder,
      checkout_fields: checkoutFields, checkout_field_order: checkoutFieldOrder,
    }, { onConflict: 'store_id' })
    setLoading(false)
    if (error) return toast.error('فشل الحفظ. تأكّد من تنفيذ migration 021 في Supabase. ' + error.message)
    toast.success('تم حفظ إعدادات صفحة الدفع')
    router.refresh()
  }

  const autoSaveFieldOrder = async (newOrder: string[]) => {
    setCheckoutFieldOrder(newOrder)
    await createClient().from('store_settings').upsert(
      { store_id: store.id, checkout_field_order: newOrder }, { onConflict: 'store_id' })
  }
  const autoSaveFieldVisible = async (fieldId: string, visible: boolean) => {
    const newFields = { ...checkoutFields, [fieldId]: { ...checkoutFields[fieldId], visible } }
    setCheckoutFields(newFields)
    await createClient().from('store_settings').upsert(
      { store_id: store.id, checkout_fields: newFields }, { onConflict: 'store_id' })
  }
  const autoSaveFieldRequired = async (fieldId: string, required: boolean) => {
    const newFields = { ...checkoutFields, [fieldId]: { ...checkoutFields[fieldId], required } }
    setCheckoutFields(newFields)
    await createClient().from('store_settings').upsert(
      { store_id: store.id, checkout_fields: newFields }, { onConflict: 'store_id' })
  }
  const autoSaveSectionOrder = async (newOrder: string[]) => {
    await createClient().from('store_settings').upsert(
      { store_id: store.id, checkout_section_order: newOrder }, { onConflict: 'store_id' })
  }

  const saveDelivery = async () => {
    setLoading(true)
    const { error } = await createClient().from('store_settings').upsert(
      { store_id: store.id, free_delivery_threshold: freeThreshold ? parseFloat(freeThreshold) : null },
      { onConflict: 'store_id' })
    setLoading(false)
    if (error) return toast.error(`فشل حفظ التوصيل: ${error.message}`)
    toast.success('تم حفظ إعدادات التوصيل')
    router.refresh()
  }

  const saveAbandoned = async () => {
    setLoading(true)
    const { error } = await createClient().from('store_settings').upsert(
      { store_id: store.id, abandoned_window_minutes: Math.min(1440, Math.max(1, Number(abandonedWindow) || 5)) },
      { onConflict: 'store_id' })
    setLoading(false)
    if (error) return toast.error('فشل. نفّذ migration 028 في Supabase أولاً. ' + error.message)
    toast.success('تم حفظ مهلة الطلبات المتروكة')
    router.refresh()
  }

  const [logoLoading, setLogoLoading] = useState(false)
  const [logoUrl, setLogoUrl] = useState<string | null>(store.logo_url ?? null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const uploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    setLogoLoading(true)
    const form = new FormData(); form.append('file', file); form.append('folder', 'logos')
    const res = await fetch('/api/upload', { method: 'POST', body: form })
    if (res.ok) {
      const data = await res.json()
      setLogoUrl(data.url)
      await createClient().from('stores').update({ logo_url: data.url }).eq('id', store.id)
      toast.success('تم تحديث الشعار')
      router.refresh()
    } else {
      toast.error('تعذّر رفع الشعار')
    }
    setLogoLoading(false)
  }

  const saveStore = async () => {
    setLoading(true)
    const { error } = await createClient().from('stores').update(storeForm).eq('id', store.id)
    setLoading(false)
    if (error) return toast.error(`فشل الحفظ: ${error.message}`)
    toast.success('تم حفظ معلومات المتجر')
    router.refresh()
  }

  const changePassword = async () => {
    if (passwordForm.new.length < 8)         return toast.error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
    if (passwordForm.new !== passwordForm.confirm) return toast.error('كلمتا المرور غير متطابقتين')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/update-password', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordForm.new }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok || data.error) return toast.error(data.error || 'فشل تغيير كلمة المرور')
      toast.success('تم تحديث كلمة المرور')
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch { setLoading(false); toast.error('حدث خطأ أثناء الاتصال بالخادم') }
  }

  // Prefer the store's active custom domain; fall back to the internal platform URL.
  const storeUrl = storeHostname
    ? `https://${storeHostname}/`
    : `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://dakkani.vercel.app'}/store/${store.slug}`
  const copyStoreUrl = () => { navigator.clipboard.writeText(storeUrl); toast.success('نُسخ الرابط') }

  // ── shared UI atoms ─────────────────────────────────────────
  const SectionTitle = ({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) => (
    <div className="flex items-start justify-between gap-4 mb-5">
      <div>
        <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', letterSpacing: '-0.005em' }}>{title}</h2>
        {hint && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBlockStart: 4 }}>{hint}</p>}
      </div>
      {action}
    </div>
  )
  const FormRow = ({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor?: string }) => (
    <div className="c-field">
      <label className="c-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="c-hint">{hint}</span>}
    </div>
  )
  const InlineField = ({ name, dir: d = 'rtl', type = 'text', placeholder }: { name: keyof typeof storeForm; dir?: 'ltr' | 'rtl'; type?: string; placeholder?: string }) => (
    <input
      id={`field-${String(name)}`} type={type} dir={d} placeholder={placeholder}
      value={storeForm[name] ?? ''}
      onChange={e => setStoreForm(f => ({ ...f, [name]: e.target.value }))}
      className="c-input"
    />
  )

  return (
    <div className="p-4 md:p-6 mx-auto" style={{ maxInlineSize: 960, fontFamily: 'var(--font-sans)' }} dir="rtl">
      {/* Header */}
      <header className="mb-6">
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>الإعدادات</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBlockStart: 4 }}>
          كلّ ما يخصّ متجرك — احفظ لتتفعّل التغييرات على الفور
        </p>
      </header>

      {/* Tab strip — chips, cobalt selection */}
      <nav className="mb-6 flex gap-1.5 overflow-x-auto scrollbar-none pb-1" role="tablist" aria-label="أقسام الإعدادات">
        {TABS.map(t => {
          const active = tab === t.id
          const Icon = t.icon
          return (
            <button key={t.id} type="button" role="tab" aria-selected={active}
              onClick={() => setTab(t.id)}
              className="c-chip flex-shrink-0"
              aria-pressed={active}
              style={{ gap: 6 }}>
              <Icon size={13} aria-hidden />{t.label}
            </button>
          )
        })}
      </nav>

      {/* ── STORE INFO ───────────────────────────────────────── */}
      {tab === 'store' && (
        <div className="space-y-4">
          <div className="c-card">
            <SectionTitle title="معلومات المتجر" hint="ما يراه زبائنك عند فتح رابط المتجر" />

            {/* Logo — quiet, single obvious action */}
            <div className="flex items-center gap-4 pb-5 mb-5" style={{ borderBlockEnd: '1px solid var(--border-default)' }}>
              <button type="button" onClick={() => logoInputRef.current?.click()}
                className="relative group focus:outline-none"
                style={{
                  inlineSize: 64, blockSize: 64, borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-strong)', display: 'grid', placeItems: 'center',
                  overflow: 'hidden', background: 'var(--surface-sunken)',
                  transition: 'border-color var(--duration-fast) var(--ease-standard)',
                }}
                aria-label="تغيير شعار المتجر">
                {logoLoading
                  ? <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary-600)' }} />
                  : logoUrl
                    ? <img src={logoUrl} alt="" style={{ inlineSize: '100%', blockSize: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontWeight: 'var(--font-bold)', color: 'var(--color-primary-600)', fontSize: 'var(--text-2xl)' }}>{(storeForm.name[0] ?? 'C').toUpperCase()}</span>
                }
                <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100"
                  style={{ background: 'rgb(15 23 42 / 0.42)', color: '#fff', transition: 'opacity var(--duration-fast) var(--ease-standard)' }}>
                  <Camera size={16} aria-hidden />
                </span>
              </button>
              <input ref={logoInputRef} type="file" accept="image/*" className="sr-only" onChange={uploadLogo} />
              <div>
                <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>شعار المتجر</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockStart: 2 }}>PNG أو JPG، حتى 5 ميجابايت</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormRow label="اسم المتجر (عربي)" htmlFor="field-name_ar"><InlineField name="name_ar" /></FormRow>
              <FormRow label="Store name (Latin)" htmlFor="field-name"><InlineField name="name" dir="ltr" /></FormRow>
              <FormRow label="رقم الهاتف" htmlFor="field-phone"><InlineField name="phone" dir="ltr" /></FormRow>
              <FormRow label="واتساب" htmlFor="field-whatsapp"><InlineField name="whatsapp" dir="ltr" /></FormRow>
              <FormRow label="البريد الإلكتروني" htmlFor="field-email"><InlineField name="email" type="email" dir="ltr" /></FormRow>
              <FormRow label="العنوان" htmlFor="field-address"><InlineField name="address" /></FormRow>
            </div>

            <div className="c-field" style={{ marginBlockStart: 'var(--space-4)' }}>
              <label className="c-label" htmlFor="field-desc">وصف المتجر</label>
              <textarea id="field-desc" rows={3}
                value={storeForm.description_ar}
                onChange={e => setStoreForm(f => ({ ...f, description_ar: e.target.value }))}
                placeholder="جملة أو اثنتان يقرأهما الزبون في الصفحة الرئيسية للمتجر"
                className="c-textarea" />
            </div>

            {store.slug && (
              <div className="c-field" style={{ marginBlockStart: 'var(--space-4)' }}>
                <label className="c-label">رابط المتجر</label>
                <div className="flex items-stretch gap-2">
                  <input readOnly value={storeUrl} dir="ltr" className="c-input" style={{ flex: 1, background: 'var(--surface-sunken)' }} />
                  <button type="button" onClick={copyStoreUrl} className="c-btn c-btn--secondary" title="نسخ">
                    <Copy size={14} aria-hidden />نسخ
                  </button>
                  <a href={`https://wa.me/?text=${encodeURIComponent(`زور متجري على Commerco: ${storeUrl}`)}`}
                    target="_blank" rel="noopener noreferrer" className="c-btn c-btn--secondary">
                    <Share2 size={14} aria-hidden />مشاركة
                  </a>
                </div>
              </div>
            )}

            {/* Working days — collapsed by default (progressive disclosure) */}
            <AdvancedRow label="أيام العمل" summary={`${DAYS_AR.length}/${DAYS_AR.length} أيام مفعّلة`}>
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                {DAYS_AR.map(d => (
                  <label key={d} className="inline-flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" defaultChecked
                      style={{ accentColor: 'var(--interactive-primary)', inlineSize: 14, blockSize: 14 }} />
                    {d}
                  </label>
                ))}
              </div>
            </AdvancedRow>
          </div>

          <SaveBar onSave={saveStore} loading={loading} label="حفظ التغييرات" />
        </div>
      )}

      {/* ── LANGUAGES ────────────────────────────────────────── */}
      {tab === 'languages' && (
        <div className="space-y-4">
          <div className="c-card">
            <SectionTitle title="لغات المتجر" hint="اللغات المتاحة للزبون في المتجر — العربية دائماً مفعّلة" />
            <div className="space-y-2 max-w-md">
              {[
                { id: 'ar', label: 'العربية', tag: 'RTL' },
                { id: 'fr', label: 'الفرنسية', tag: 'LTR' },
                { id: 'en', label: 'الإنجليزية', tag: 'LTR' },
              ].map(opt => {
                const checked = storeLanguages.includes(opt.id)
                const disabled = opt.id === 'ar'
                return (
                  <label key={opt.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] cursor-pointer transition-colors"
                    style={{ border: '1px solid var(--border-default)', background: checked ? 'var(--color-primary-50)' : 'var(--surface-raised)' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}>
                    <input type="checkbox" checked={checked} disabled={disabled}
                      onChange={e => {
                        if (e.target.checked) setStoreLanguages(p => [...p, opt.id])
                        else { setStoreLanguages(p => p.filter(l => l !== opt.id)); if (defaultLanguage === opt.id) setDefaultLanguage('ar') }
                      }}
                      style={{ accentColor: 'var(--interactive-primary)', inlineSize: 16, blockSize: 16 }} />
                    <span className="flex-1" style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{opt.label}</span>
                    <span className="c-badge c-badge--neutral">{opt.tag}</span>
                    {disabled && <span className="c-badge c-badge--info">افتراضي</span>}
                  </label>
                )
              })}
            </div>
            <div className="c-field mt-6" style={{ maxInlineSize: 320 }}>
              <label className="c-label" htmlFor="default-lang">اللغة الافتراضية للمتجر</label>
              <select id="default-lang" value={defaultLanguage} onChange={e => setDefaultLanguage(e.target.value)} className="c-select">
                {storeLanguages.map(l => (
                  <option key={l} value={l}>
                    {l === 'ar' ? 'العربية' : l === 'fr' ? 'الفرنسية' : 'الإنجليزية'}
                  </option>
                ))}
              </select>
              <span className="c-hint">تُستخدم عند فتح الرابط لأول مرة</span>
            </div>
          </div>
          <SaveBar onSave={saveLanguages} loading={loading} label="حفظ إعدادات اللغة" />
        </div>
      )}

      {/* ── SECURITY ─────────────────────────────────────────── */}
      {tab === 'security' && (
        <div className="space-y-4">
          <div className="c-card">
            <SectionTitle title="معلومات الحساب" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="c-field">
                <label className="c-label">البريد الإلكتروني</label>
                <div className="flex items-stretch gap-2">
                  <input readOnly value={user.email ?? ''} dir="ltr" className="c-input" style={{ flex: 1, background: 'var(--surface-sunken)' }} />
                  <span className="c-badge c-badge--success" style={{ paddingInline: 10 }}>مفعّل</span>
                </div>
              </div>
              <FormRow label="رقم الهاتف">
                <input dir="ltr" value={storeForm.phone}
                  onChange={e => setStoreForm(f => ({ ...f, phone: e.target.value }))}
                  className="c-input" />
              </FormRow>
            </div>
          </div>

          <div className="c-card">
            <SectionTitle title="تغيير كلمة المرور" hint="8 أحرف على الأقل" />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3" style={{ maxInlineSize: 640 }}>
              {[
                { key: 'current', label: 'الحالية' },
                { key: 'new',     label: 'الجديدة' },
                { key: 'confirm', label: 'تأكيد' },
              ].map(f => (
                <div key={f.key} className="c-field">
                  <label className="c-label" htmlFor={`pw-${f.key}`}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input id={`pw-${f.key}`}
                      type={showPw ? 'text' : 'password'}
                      value={passwordForm[f.key as keyof typeof passwordForm]}
                      onChange={e => setPasswordForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="c-input" dir="ltr"
                      style={{ paddingInlineEnd: 40 }} />
                    {f.key === 'new' && (
                      <button type="button" onClick={() => setShowPw(s => !s)}
                        aria-label={showPw ? 'إخفاء' : 'إظهار'}
                        style={{
                          position: 'absolute', insetBlockStart: '50%', insetInlineEnd: 6,
                          transform: 'translateY(-50%)', inlineSize: 30, blockSize: 30,
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: 0, color: 'var(--text-muted)', cursor: 'pointer', borderRadius: 'var(--radius-sm)',
                        }}>
                        {showPw ? <EyeOff size={14} aria-hidden /> : <Eye size={14} aria-hidden />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <button onClick={changePassword} disabled={loading || !passwordForm.new}
                className={`c-btn c-btn--primary ${loading ? 'is-loading' : ''}`}>
                {loading ? '' : 'تحديث كلمة المرور'}
              </button>
            </div>
          </div>

          {/* Danger zone — folded (do not front-load) */}
          <details className="c-card" style={{ padding: 0 }}>
            <summary className="flex items-center justify-between cursor-pointer" style={{ padding: 'var(--card-pad)', listStyle: 'none' }}>
              <span>
                <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--color-error-700)' }}>منطقة الخطر</span>
                <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockStart: 2 }}>عمليات لا يمكن التراجع عنها</span>
              </span>
              <ChevronDown size={16} aria-hidden style={{ color: 'var(--text-muted)' }} />
            </summary>
            <div style={{ padding: 'var(--space-2) var(--card-pad) var(--card-pad)' }}>
              <button className="c-btn c-btn--danger c-btn--sm">حذف الحساب نهائياً</button>
            </div>
          </details>
        </div>
      )}

      {/* ── DELIVERY ─────────────────────────────────────────── */}
      {tab === 'delivery' && (
        <div className="space-y-4">
          <div className="c-card">
            <SectionTitle title="حد التوصيل المجاني" hint="الطلبات فوق هذا المبلغ لا تدفع رسوم التوصيل" />
            <div className="c-field" style={{ maxInlineSize: 280 }}>
              <label className="c-label" htmlFor="free-th">المبلغ (دج)</label>
              <input id="free-th" type="number" dir="ltr" value={freeThreshold}
                onChange={e => setFreeThreshold(e.target.value)} placeholder="5000"
                className="c-input c-input--numeric" />
              <span className="c-hint">اتركه فارغاً لتعطيل الميزة</span>
            </div>
          </div>

          <AdvancedRow label="الولايات المغطاة" summary={`${wilayas.length} ولاية`} inCard>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 pt-2">
              {wilayas.map(w => (
                <label key={w.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--radius-sm)] cursor-pointer text-sm"
                  style={{ color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }}>
                  <input type="checkbox" defaultChecked
                    style={{ accentColor: 'var(--interactive-primary)', inlineSize: 13, blockSize: 13 }} />
                  <span style={{ fontSize: 'var(--text-xs)' }}>{w.name_ar}</span>
                </label>
              ))}
            </div>
          </AdvancedRow>

          <SaveBar onSave={saveDelivery} loading={loading} label="حفظ إعدادات التوصيل" />
        </div>
      )}

      {/* ── NOTIFICATIONS ────────────────────────────────────── */}
      {tab === 'notifs' && (
        <div className="space-y-4">
          <div className="c-card">
            <SectionTitle title="الإشعارات" hint="اختر متى تريد أن نُخبرك" />
            <div className="space-y-1">
              {[
                { key: 'order_email' as const,     label: 'بريد إلكتروني عند كل طلب' },
                { key: 'order_sms' as const,       label: 'رسالة SMS عند كل طلب' },
                { key: 'low_stock_alert' as const, label: 'تنبيه عند انخفاض المخزون' },
              ].map(n => (
                <ToggleRow key={n.key} label={n.label}
                  checked={notifSettings[n.key]}
                  onChange={() => setNotifSettings(s => ({ ...s, [n.key]: !s[n.key] }))} />
              ))}
            </div>
          </div>
          <SaveBar onSave={saveNotifications} loading={loading} label="حفظ الإشعارات" />
        </div>
      )}

      {/* ── CHECKOUT ─────────────────────────────────────────── */}
      {tab === 'checkout' && (
        <div className="space-y-4">
          {/* Abandoned checkout — window only; toggles are per-product */}
          <div className="c-card">
            <SectionTitle title="الطلبات المتروكة"
              hint="عندما يدخل الزبون رقم هاتفه ثم يغادر بدون إتمام الطلب، يُسجَّل تلقائياً بحالة «مهجور»" />
            <div style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)',
              padding: 'var(--space-3) var(--space-4)', borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-xs)', marginBlockEnd: 'var(--space-4)' }}>
              خيارا «احتساب التحويلات» و«الإرسال إلى قوقل شيت» أصبحا لكل منتج على حدة — تجدهما في محرر المنتج ← تبويب «وجهة الطلبات»
            </div>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>مهلة اعتبار الطلب متروكاً</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockStart: 2 }}>احتياط فقط — مغادرة الصفحة تُنهي الطلب المتروك فوراً</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="number" min={1} max={1440} dir="ltr"
                  value={abandonedWindow}
                  onChange={e => setAbandonedWindow(parseInt(e.target.value) || 5)}
                  className="c-input c-input--numeric"
                  style={{ inlineSize: 80, textAlign: 'center' }} />
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>دقيقة</span>
              </div>
            </div>
            <div className="mt-5">
              <button onClick={saveAbandoned} disabled={loading}
                className={`c-btn c-btn--secondary ${loading ? 'is-loading' : ''}`}>
                {loading ? '' : 'حفظ المهلة'}
              </button>
            </div>
          </div>

          {/* Section order (drag-drop, autosave) */}
          <div className="c-card">
            <SectionTitle title="ترتيب أقسام صفحة الدفع" hint="اسحب لإعادة الترتيب — يُحفظ تلقائياً" />
            <div className="space-y-1.5" style={{ maxInlineSize: 480 }}>
              {checkoutSectionOrder.map((sec, idx) => {
                const label =
                  sec === 'customer_info' ? 'معلومات العميل' :
                  sec === 'delivery_info' ? 'معلومات التوصيل' :
                  sec === 'payment_info'  ? 'طريقة الدفع' :
                  sec === 'coupon'        ? 'كوبون الخصم' : sec
                return (
                  <div key={sec} draggable
                    onDragStart={() => { dragSectionItem.current = idx }}
                    onDragEnter={() => { dragSectionOverItem.current = idx }}
                    onDragEnd={handleSectionDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-grab active:cursor-grabbing select-none transition-colors"
                    style={{ border: '1px solid var(--border-default)', background: 'var(--surface-raised)', userSelect: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-sunken)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface-raised)')}>
                    <GripVertical size={14} aria-hidden style={{ color: 'var(--text-muted)' }} />
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{label}</span>
                    <span style={{ marginInlineStart: 'auto', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }} className="num">{idx + 1}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Field ordering + visibility */}
          <div className="c-card">
            <SectionTitle title="حقول صفحة الدفع" hint="اسحب لإعادة الترتيب — تظهر عين لإخفاء الحقل — كل تعديل يُحفظ تلقائياً" />
            <div className="space-y-1.5">
              {checkoutFieldOrder.map((fieldId, idx) => {
                const def = ALL_CHECKOUT_FIELDS.find(f => f.id === fieldId); if (!def) return null
                const isVisible = checkoutFields[fieldId]?.visible ?? true
                return (
                  <div key={fieldId} draggable
                    onDragStart={() => { dragFieldItem.current = idx }}
                    onDragEnter={() => { dragFieldOverItem.current = idx }}
                    onDragEnd={handleFieldDragEnd}
                    onDragOver={e => e.preventDefault()}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] cursor-grab active:cursor-grabbing select-none transition-colors"
                    style={{
                      border: `1px ${isVisible ? 'solid' : 'dashed'} var(--border-default)`,
                      background: isVisible ? 'var(--surface-raised)' : 'var(--surface-sunken)',
                      opacity: isVisible ? 1 : 0.72, userSelect: 'none',
                    }}>
                    <GripVertical size={14} aria-hidden style={{ color: 'var(--text-muted)' }} />
                    <span aria-hidden style={{ fontSize: 16 }}>{def.icon}</span>
                    <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontWeight: 'var(--font-medium)' }}>{def.label}</span>
                    {!isVisible && <span className="c-badge c-badge--neutral">مخفي</span>}
                    <button type="button" onClick={e => { e.stopPropagation(); autoSaveFieldVisible(fieldId, !isVisible) }}
                      title={isVisible ? 'إخفاء' : 'إظهار'}
                      className="c-btn c-btn--ghost c-btn--sm c-btn--icon">
                      {isVisible ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />}
                    </button>
                    {def.deletable && (
                      <button type="button" onClick={e => { e.stopPropagation(); autoSaveFieldOrder(checkoutFieldOrder.filter(id => id !== fieldId)) }}
                        title="حذف الحقل"
                        className="c-btn c-btn--ghost c-btn--sm c-btn--icon" style={{ color: 'var(--color-error-600)' }}>
                        <X size={14} aria-hidden />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {ALL_CHECKOUT_FIELDS.filter(f => !checkoutFieldOrder.includes(f.id)).length > 0 && (
              <div className="mt-4 pt-4" style={{ borderBlockStart: '1px dashed var(--border-default)' }}>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockEnd: 8 }}>حقول متاحة للإضافة</p>
                <div className="flex flex-wrap gap-2">
                  {ALL_CHECKOUT_FIELDS.filter(f => !checkoutFieldOrder.includes(f.id)).map(f => (
                    <button key={f.id} type="button"
                      onClick={() => autoSaveFieldOrder([...checkoutFieldOrder, f.id])}
                      className="c-btn c-btn--secondary c-btn--sm">
                      <Plus size={13} aria-hidden />{f.icon} {f.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Required fields */}
          <div className="c-card">
            <SectionTitle title="الحقول الإجبارية" hint="حدد الحقول التي يجب أن يملأها العميل" />
            <div className="space-y-1" style={{ maxInlineSize: 480 }}>
              {[
                { id: 'address', label: 'العنوان التفصيلي' },
                { id: 'phone2',  label: 'الهاتف البديل' },
              ].map(({ id, label }) => (
                <ToggleRow key={id} label={label}
                  checked={!!(checkoutFields[id]?.required ?? false)}
                  onChange={() => autoSaveFieldRequired(id, !(checkoutFields[id]?.required ?? false))} />
              ))}
            </div>
          </div>

          <SaveBar onSave={saveCheckout} loading={loading} label="حفظ صفحة الدفع" />
        </div>
      )}

      {/* ── THANK YOU PAGE STORE DEFAULTS ─────────────────────── */}
      {tab === 'whatsapp' && (
        <div className="space-y-4">
          <div className="c-card">
            <SectionTitle
              title="إعدادات صفحة الشكر الافتراضية للمتجر (Thank You Page)"
              hint="هذه الإعدادات تعمل كخيار افتراضي لجميع منتجات المتجر التي ليس لها إعدادات خاصة"
            />

            <div className="space-y-5 mt-4">
              {/* Default Phone & WhatsApp Numbers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/70 p-4 rounded-2xl border border-gray-150">
                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    رقم WhatsApp الافتراضي للمتجر
                  </label>
                  <input
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder={store.whatsapp || store.phone || 'مثال: 0555123456'}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-mono bg-white focus:outline-none focus:border-[#0D6EFD]"
                    dir="ltr"
                  />
                  <span className="text-[11px] text-gray-500 block mt-1">
                    يستخدم هذا الرقم في زر تأكيد WhatsApp عند عدم تخصيص رقم خاص للمنتج.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-800 mb-1.5">
                    رقم الهاتف الافتراضي للمتجر (للاتصال)
                  </label>
                  <input
                    type="text"
                    value={callNumber}
                    onChange={(e) => setCallNumber(e.target.value)}
                    placeholder={store.phone || 'مثال: 0550123456'}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-xl text-sm font-mono bg-white focus:outline-none focus:border-[#0D6EFD]"
                    dir="ltr"
                  />
                  <span className="text-[11px] text-gray-500 block mt-1">
                    يستخدم هذا الرقم في زر الاتصال الهاتفي عند عدم تخصيص رقم خاص للمنتج.
                  </span>
                </div>
              </div>

              {/* Default Button Toggles */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ToggleRow
                  label="تفعيل زر تأكيد WhatsApp افتراضياً"
                  checked={thankyouWaEnabled}
                  onChange={() => setThankyouWaEnabled(!thankyouWaEnabled)}
                />
                <ToggleRow
                  label="تفعيل زر الاتصال الهاتفي افتراضياً"
                  checked={thankyouCallEnabled}
                  onChange={() => setThankyouCallEnabled(!thankyouCallEnabled)}
                />
              </div>

              {/* Default Template Editor */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  قالب رسالة تأكيد WhatsApp الافتراضي للمتجر:
                </label>
                <textarea
                  ref={waTextareaRef}
                  value={whatsappTemplate}
                  onChange={(e) => setWhatsappTemplate(e.target.value)}
                  rows={10}
                  className="w-full p-4 border border-gray-200 rounded-2xl font-mono text-sm leading-relaxed text-gray-900 bg-gray-50 focus:bg-white focus:border-[#0D6EFD] focus:ring-2 focus:ring-[#0D6EFD]/20 transition outline-none"
                  placeholder={DEFAULT_WHATSAPP_TEMPLATE}
                  dir="rtl"
                />
              </div>

              {/* Available variables helper grid */}
              <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4 space-y-2">
                <p className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                  <span>💡 المتغيرات المتاحة لاستخدامها في الرسالة:</span>
                </p>
                <p className="text-xs text-blue-700">
                  اضغط على أي متغير لإدراجه تلقائياً في نص الرسالة عند موضع المؤشر:
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {WHATSAPP_VARIABLES.map((item) => (
                    <button
                      key={item.varName}
                      type="button"
                      onClick={() => insertWhatsAppVariable(item.varName)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-blue-200 hover:border-blue-400 hover:bg-blue-50 text-blue-900 font-mono text-xs font-semibold shadow-xs transition active:scale-95 cursor-pointer"
                      title={`إدراج ${item.label}`}
                    >
                      <span className="text-[#0D6EFD] font-bold">{item.varName}</span>
                      <span className="text-gray-500 font-sans text-[11px]">({item.label})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Section */}
              <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700">👁️ معاينة فورية لرسالة المتجر الافتراضية:</span>
                  <span className="text-[11px] text-gray-400">عينة تجريبية</span>
                </div>
                <div className="bg-[#E7F8EE] border border-[#25D366]/30 rounded-2xl p-4 text-xs font-sans text-gray-800 leading-relaxed whitespace-pre-wrap shadow-xs" dir="rtl">
                  {buildWhatsAppMessage(whatsappTemplate, {
                    storeName: store.name_ar || store.name || 'متجر التجربة',
                    orderNumber: 'ORD-260726-1080',
                    customerName: 'محمد بن علي',
                    phone: '0550123456',
                    items: [{ product_name: 'عطر الملكي', variant_label: 'حجم كبير (100ml)', quantity: 1 }],
                    total: 4500,
                    deliveryType: 'home',
                    wilayaName: 'عين الدفلى',
                    communeName: 'عين الدفلى',
                    address: 'حي الشهداء عمارة 5',
                    stopdeskOfficeName: 'مكتب البوسطة المركزية',
                    lang: 'ar',
                  })}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={restoreDefaultWhatsAppTemplate}
                  className="c-btn c-btn--secondary c-btn--sm flex items-center gap-1.5 text-gray-600 hover:text-gray-900"
                >
                  <RotateCcw size={14} aria-hidden />
                  <span>إعادة ضبط الرسالة الافتراضية</span>
                </button>
                <SaveBar onSave={saveWhatsAppTemplate} loading={loading} label="حفظ إعدادات صفحة الشكر" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── BILLING ──────────────────────────────────────────── */}
      {tab === 'billing' && (
        <div className="space-y-4">
          <div className="c-card" style={{
            background: 'linear-gradient(135deg, var(--color-primary-50), var(--surface-raised))',
            borderColor: 'var(--color-primary-200)',
          }}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>
                  {store.name_ar ?? store.name}
                </p>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBlockStart: 4 }}>
                  خطة <strong style={{ color: 'var(--color-primary-700)' }}>{store.plan === 'pro' ? 'Pro' : 'أساسي'}</strong>
                </p>
              </div>
              <Link href="/billing/plans" className="c-btn c-btn--primary">ترقية الخطة</Link>
            </div>
          </div>
          <Link href="/billing/history" className="c-btn c-btn--secondary" style={{ inlineSize: '100%' }}>
            سجل الفواتير
          </Link>
        </div>
      )}
    </div>
  )
}

// ── Sub-components (composed here to keep the redesign self-contained) ──

function SaveBar({ onSave, loading, label }: { onSave: () => void; loading: boolean; label: string }) {
  return (
    <div className="flex items-center justify-end gap-2 pt-2">
      <button onClick={onSave} disabled={loading}
        className={`c-btn c-btn--primary ${loading ? 'is-loading' : ''}`}>
        {loading ? '' : <><Check size={14} aria-hidden />{label}</>}
      </button>
    </div>
  )
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3" style={{ borderBlockEnd: '1px solid var(--border-default)' }}>
      <span style={{ fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{label}</span>
      <button type="button" role="switch" aria-checked={checked} onClick={onChange}
        aria-label={label}
        style={{
          inlineSize: 36, blockSize: 20, borderRadius: 'var(--radius-full)',
          position: 'relative', flexShrink: 0, cursor: 'pointer', border: 0, padding: 0,
          background: checked ? 'var(--color-primary-600)' : 'var(--color-neutral-300)',
          transition: 'background-color var(--duration-fast) var(--ease-standard)',
        }}>
        <span aria-hidden style={{
          position: 'absolute', insetBlockStart: 2,
          insetInlineStart: checked ? 18 : 2,
          inlineSize: 16, blockSize: 16, borderRadius: 'var(--radius-full)',
          background: '#fff', boxShadow: 'var(--shadow-sm)',
          transition: 'inset-inline-start var(--duration-fast) var(--ease-standard)',
        }} />
      </button>
    </div>
  )
}

function AdvancedRow({ label, summary, inCard, children }: { label: string; summary?: string; inCard?: boolean; children: React.ReactNode }) {
  const Wrap = ({ children: c }: { children: React.ReactNode }) => inCard
    ? <details className="c-card" style={{ padding: 0 }}>{c}</details>
    : <details style={{ marginBlockStart: 'var(--space-4)', borderBlockStart: '1px solid var(--border-default)', paddingBlockStart: 'var(--space-4)' }}>{c}</details>
  return (
    <Wrap>
      <summary className="flex items-center justify-between cursor-pointer" style={{ padding: inCard ? 'var(--card-pad)' : undefined, listStyle: 'none' }}>
        <span>
          <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>{label}</span>
          {summary && <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockStart: 2 }}>{summary}</span>}
        </span>
        <ChevronDown size={16} aria-hidden style={{ color: 'var(--text-muted)' }} />
      </summary>
      <div style={{ padding: inCard ? 'var(--space-2) var(--card-pad) var(--card-pad)' : undefined }}>
        {children}
      </div>
    </Wrap>
  )
}
