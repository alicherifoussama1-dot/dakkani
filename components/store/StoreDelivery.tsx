'use client'
// ============================================================
// STORE delivery module — Premium SaaS-style Delivery Control Center.
// Visual redesign only, NO logic refactoring, NO API updates, NO DB changes.
// Stripe / Linear / Vercel aesthetics: card-based grid, dashboard metrics,
// sliding side drawer, sync timeline, logs terminal, searchable previews.
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PROVIDERS, providerMeta, validateCreds, type ProviderType } from '@/lib/delivery/types'
import { 
  Trash2, Link2, RefreshCw, CheckCircle, X, Download, AlertTriangle, 
  Loader2, Plus, Eye, EyeOff, Copy, Check, ShieldAlert, History, 
  KeyRound, Globe, FileText, Landmark, Search, Filter, Settings, 
  Activity, ArrowLeftRight, Coins, HelpCircle, ExternalLink
} from 'lucide-react'

const SUB_TABS = ['قنوات التوصيل', 'أسعار التوصيل المعلنة', 'توجيه الولايات ⇄ الشركات', 'أسعار التوصيل الحقيقية', 'مكاتب التوصيل']

type Provider = { 
  id: string; 
  provider_type: ProviderType; 
  display_name: string; 
  is_active: boolean; 
  is_automatic: boolean; 
  from_wilaya_code: string; 
  credentials: Record<string, string> 
}
type Wilaya = { id: number; code: string; name_ar: string }
type PriceRow = { home: number; desk: number; source: string }

// ============================================================
// Official Brand Identity Mapping (SVGs & Brand Color Systems)
// ============================================================
const BRAND_METRICS: Record<string, { logo: React.ReactNode; color: string; bg: string; text: string; apiVer: string; desc: string }> = {
  yalidine: {
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="45" fill="#FFC000"/>
        <path d="M35 30H45L55 55L65 30H75L58 70H47L35 30Z" fill="#111111"/>
      </svg>
    ),
    color: '#FFC000',
    bg: 'bg-[#FFFDF0]',
    text: 'text-[#111111]',
    apiVer: 'API v2',
    desc: 'موزع الخدمات واللوجستيك الرائد في الجزائر مع تغطية شاملة لـ 58 ولاية.'
  },
  zrexpress: {
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#E23024"/>
        <path d="M30 35H60C68 35 68 47 60 47H42V65H30V35ZM42 45H58C60 45 60 37 58 37H42V45Z" fill="#FFFFFF"/>
        <path d="M72 40L80 50L72 60" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    color: '#E23024',
    bg: 'bg-[#FFF5F5]',
    text: 'text-[#E23024]',
    apiVer: 'Token API v1',
    desc: 'خدمة توصيل سريعة وموثوقة مع تحديثات فورية ومزامنة مكاتب تلقائية.'
  },
  ecotrack: {
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#10B981"/>
        <path d="M35 65L48 35L62 50L75 25" stroke="#FFFFFF" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="75" cy="25" r="8" fill="#FFFFFF"/>
      </svg>
    ),
    color: '#10B981',
    bg: 'bg-[#F0FDF4]',
    text: 'text-[#10B981]',
    apiVer: 'Ecotrack API',
    desc: 'تكامل التوصيل والتتبع اللوجستي المتقدم مع نظام إيكوتراك للمتاجر.'
  },
  maystro: {
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#0D6EFD"/>
        <path d="M30 35L50 55L70 35V65H60V48L50 58L40 48V65H30V35Z" fill="#FFFFFF"/>
      </svg>
    ),
    color: '#0D6EFD',
    bg: 'bg-[#F0F6FF]',
    text: 'text-[#0D6EFD]',
    apiVer: 'Maystro Delivery',
    desc: 'منصة لوجستية احترافية لتوصيل وإدارة شحنات التجارة الإلكترونية.'
  },
  noest: {
    logo: (
      <svg className="w-8 h-8" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="100" height="100" rx="20" fill="#7C3AED"/>
        <path d="M35 35H45L65 65H55L35 35Z" fill="#FFFFFF"/>
        <path d="M65 35V65H55V35H65Z" fill="#FFFFFF"/>
      </svg>
    ),
    color: '#7C3AED',
    bg: 'bg-[#F9F5FF]',
    text: 'text-[#7C3AED]',
    apiVer: 'Noest API',
    desc: 'توصيل شحن سريع واحترافي عبر بوابات منصة نويست الوطنية.'
  }
}

export default function StoreDelivery({ storeId, setToast }: { storeId: string; setToast: (m: string) => void }) {
  const [tab, setTab] = useState(0)
  const [providers, setProviders] = useState<Provider[]>([])
  const [wilayas, setWilayas] = useState<Wilaya[]>([])
  const [loading, setLoading] = useState(true)
  const [officesCount, setOfficesCount] = useState(0)
  const [pricesCount, setPricesCount] = useState(0)

  const loadProviders = useCallback(async () => {
    const res = await fetch('/api/delivery/providers')
    if (res.ok) { const d = await res.json(); setProviders(d.providers ?? []) }
  }, [])

  const loadWilayas = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('wilayas').select('id,code,name_ar').order('id')
    setWilayas((data ?? []) as Wilaya[])
  }, [])

  // Load summary metrics safely in the background
  const loadMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/store/delivery/offices?storeId=${storeId}`)
      if (res.ok) {
        const d = await res.json()
        setOfficesCount(d.offices?.length ?? 0)
      }
      const sb = createClient()
      const { count } = await sb.from('delivery_declared_prices').select('id', { count: 'exact', head: true })
      setPricesCount(count ?? 0)
    } catch {}
  }, [storeId])

  useEffect(() => { 
    (async () => { 
      await Promise.all([loadProviders(), loadWilayas(), loadMetrics()]); 
      setLoading(false) 
    })() 
  }, [loadProviders, loadWilayas, loadMetrics])

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6" dir="rtl">
      {/* Tab Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-4" style={{ borderColor: 'var(--color-border)' }}>
        <div>
          <h2 className="text-xl font-bold text-gray-900">مركز التحكم بـشركات التوصيل</h2>
          <p className="text-xs text-gray-500 mt-1">قم بربط حسابات شركات الشحن الخاصة بك، وإدارة الأسعار وتوجيه الطرود لكل ولاية.</p>
        </div>
        <div className="flex flex-wrap gap-1 bg-gray-100/85 p-1 rounded-xl w-full sm:w-auto">
          {SUB_TABS.map((t, i) => (
            <button 
              key={t} 
              onClick={() => setTab(i)} 
              className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${tab === i ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin" size={32} style={{ color: 'var(--cf-turq)' }} />
        </div>
      ) : (
        <>
          {tab === 0 && (
            <ProvidersTab 
              providers={providers} 
              reload={async () => { await loadProviders(); await loadMetrics() }} 
              setToast={setToast} 
              officesCount={officesCount}
              pricesCount={pricesCount}
              wilayas={wilayas}
            />
          )}
          {tab === 1 && <PricesTab target="declared" providers={providers} wilayas={wilayas} storeId={storeId} setToast={setToast} />}
          {tab === 2 && <RoutingTab providers={providers} wilayas={wilayas} storeId={storeId} setToast={setToast} />}
          {tab === 3 && <PricesTab target="real" providers={providers} wilayas={wilayas} storeId={storeId} setToast={setToast} />}
          {tab === 4 && <OfficesTab providers={providers} wilayas={wilayas} storeId={storeId} setToast={setToast} />}
        </>
      )}
    </div>
  )
}

// ============================================================
// SUB-TAB 0: Providers Tab (Control Center & Dashboard Cards)
// ============================================================
function ProvidersTab({ 
  providers, 
  reload, 
  setToast, 
  officesCount, 
  pricesCount,
  wilayas
}: { 
  providers: Provider[]; 
  reload: () => Promise<void>; 
  setToast: (m: string) => void;
  officesCount: number;
  pricesCount: number;
  wilayas: Wilaya[];
}) {
  const [activeForm, setActiveForm] = useState<any | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)

  const toggleActive = async (p: Provider) => {
    await fetch('/api/delivery/providers', { 
      method: 'PATCH', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ id: p.id, is_active: !p.is_active }) 
    })
    reload()
  }

  const remove = async (id: string) => {
    if (!confirm('هل أنت متأكد من فصل شركة التوصيل تماماً؟ ستفقد جميع الأسعار والمكاتب المرتبطة بها.')) return
    await fetch(`/api/delivery/providers?id=${id}`, { method: 'DELETE' })
    setToast('تم فصل الشركة بنجاح')
    reload()
  }

  const sync = async (p: Provider) => {
    setSyncing(p.id)
    try {
      const res = await fetch(`/api/delivery/import-rates/${p.id}`, { method: 'POST' })
      const d = await res.json().catch(() => ({}))
      let msg = `✓ تمت مزامنة ${d.imported ?? d.count ?? ''} سعر توصيل`
      if (d.officesImported) {
        msg += ` و ${d.officesImported} مكتب`
      }
      setToast(res.ok ? msg : (d.error ?? 'تعذّرت المزامنة'))
      reload()
    } catch { 
      setToast('تعذّرت المزامنة') 
    } finally { 
      setSyncing(null) 
    }
  }

  const connectedCount = providers.length
  const activeCount = providers.filter(p => p.is_active).length

  return (
    <div className="space-y-8 animate-fade-in">
      {/* SaaS Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-2xl p-5 flex items-center justify-between shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">القنوات المتصلة</p>
            <p className="text-2xl font-bold text-gray-900">{connectedCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Link2 size={20} />
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 flex items-center justify-between shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">القنوات النشطة</p>
            <p className="text-2xl font-bold text-gray-900">{activeCount}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl">
            <Activity size={20} />
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 flex items-center justify-between shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">أسعار التوصيل</p>
            <p className="text-2xl font-bold text-gray-900">{pricesCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Coins size={20} />
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-5 flex items-center justify-between shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
          <div className="space-y-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">مكاتب الاستلام</p>
            <p className="text-2xl font-bold text-gray-900">{officesCount}</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Landmark size={20} />
          </div>
        </div>
      </div>

      {/* Global Status Banner */}
      <div className="p-4 bg-gray-50/70 border rounded-2xl flex items-center gap-3" style={{ borderColor: 'var(--color-border)' }}>
        <CheckCircle className="text-teal-500 shrink-0" size={18} />
        <div className="text-xs text-gray-600 leading-relaxed">
          <span className="font-bold text-gray-900">نظام توجيه الشحنات نشط:</span> يتم قراءة بيانات المكاتب والأسعار محلياً بشكل كامل (Local-First) دون إبطاء العميل أثناء الشراء.
        </div>
      </div>

      {/* Grid of Providers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {PROVIDERS.map(meta => {
          const p = providers.find(x => x.provider_type === meta.type)
          const connected = !!p
          const profile = BRAND_METRICS[meta.type]

          return (
            <div 
              key={meta.type}
              className="bg-white border rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md hover:border-gray-300"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Header Info */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`p-3 rounded-2xl ${profile?.bg ?? 'bg-gray-100'} ${profile?.text ?? 'text-gray-700'} shrink-0`}>
                    {profile?.logo ?? <Globe size={24} />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                      {profile?.apiVer ?? 'API'}
                    </span>
                    {connected ? (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p!.is_active ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-500'}`}>
                        {p!.is_active ? 'نشط' : 'موقوف'}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-50 text-gray-400 border border-dashed">
                        غير متصل
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">{p?.display_name ?? meta.label}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed min-h-[36px]">{profile?.desc ?? ''}</p>
                </div>

                {connected && (
                  <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] text-gray-500">
                    <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <span className="block text-gray-400 text-[9px] uppercase font-bold">الإرسال التلقائي</span>
                      <span className="font-semibold text-gray-700">{p.is_automatic ? 'مفعّل' : 'يدوي'}</span>
                    </div>
                    <div className="bg-gray-50 p-2 rounded-xl border border-gray-100">
                      <span className="block text-gray-400 text-[9px] uppercase font-bold">ولاية الإرسال</span>
                      <span className="font-semibold text-gray-700">{p.from_wilaya_code ?? '16'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 bg-gray-50/50 border-t flex items-center justify-between gap-2" style={{ borderColor: 'var(--color-border)' }}>
                {connected ? (
                  <>
                    <button 
                      onClick={() => setActiveForm({ 
                        id: p.id, 
                        provider_type: p.provider_type, 
                        display_name: p.display_name, 
                        credentials: p.credentials, 
                        is_automatic: p.is_automatic, 
                        from_wilaya_code: p.from_wilaya_code 
                      })}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white border px-3.5 py-2 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                      style={{ borderColor: 'var(--color-border)' }}
                    >
                      <Settings size={13} /> إعدادات الربط
                    </button>
                    {meta.hasRatesApi && (
                      <button 
                        onClick={() => sync(p)} 
                        disabled={syncing === p.id}
                        className="inline-flex items-center justify-center p-2 text-gray-500 bg-white border rounded-xl hover:bg-gray-50 hover:text-gray-900 transition-all shadow-sm disabled:opacity-50"
                        style={{ borderColor: 'var(--color-border)' }}
                        title="مزامنة فورية للأسعار والمكاتب"
                      >
                        {syncing === p.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setActiveForm({ provider_type: meta.type, credentials: {}, is_automatic: false, from_wilaya_code: '16' })}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50 px-3.5 py-2 rounded-xl hover:bg-blue-100 transition-colors"
                    >
                      <Link2 size={13} /> ربط الحساب الآن
                    </button>
                    <span className="text-[10px] text-gray-400 font-medium">غير متصل</span>
                  </>
                )}

                {/* Inline Toggle */}
                {connected && (
                  <button
                    onClick={() => toggleActive(p)}
                    className="w-10 h-5.5 rounded-full relative transition-colors shrink-0 outline-none"
                    style={{ background: p.is_active ? 'var(--cf-turq)' : '#E5E7EB' }}
                  >
                    <span 
                      className="absolute top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow transition-all"
                      style={{ [p.is_active ? 'right' : 'left']: '2px' } as any}
                    />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Custom Slide-over Drawer Settings */}
      {activeForm && (
        <ProviderDrawer 
          form={activeForm} 
          setForm={setActiveForm} 
          onSaved={reload} 
          onDelete={remove}
          setToast={setToast}
          wilayas={wilayas}
        />
      )}
    </div>
  )
}

// ============================================================
// Sliding Side-Drawer Panel (ProviderDrawer Component)
// ============================================================
function ProviderDrawer({ 
  form, 
  setForm, 
  onSaved, 
  onDelete, 
  setToast,
  wilayas 
}: { 
  form: any; 
  setForm: (f: any) => void; 
  onSaved: () => Promise<void>; 
  onDelete: (id: string) => Promise<void>;
  setToast: (m: string) => void;
  wilayas: Wilaya[];
}) {
  const meta = providerMeta(form.provider_type)!
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; msg: string; raw?: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [copiedField, setCopiedField] = useState<string>('')
  const [drawerTab, setDrawerTab] = useState<'settings' | 'rates' | 'offices' | 'logs'>('settings')

  // Inline preview lists
  const [drawerRates, setDrawerRates] = useState<any[]>([])
  const [drawerRatesSearch, setDrawerRatesSearch] = useState('')
  const [drawerOffices, setDrawerOffices] = useState<any[]>([])
  const [drawerOfficesSearch, setDrawerOfficesSearch] = useState('')
  const [syncLogs, setSyncLogs] = useState<string[]>([])

  // Load actual sync log mockups and database records
  const addLog = useCallback((txt: string) => {
    const time = new Date().toLocaleTimeString('ar-DZ', { hour12: false })
    setSyncLogs(prev => [`[${time}] ${txt}`, ...prev])
  }, [])

  useEffect(() => {
    addLog(`تم فتح مركز الإعدادات لشركة ${meta.label}`)
    if (!form.id) return
    
    const sb = createClient()
    sb.from('delivery_declared_prices').select('*').eq('provider_id', form.id)
      .then(({ data }) => {
        setDrawerRates(data ?? [])
        addLog(`تم تحميل أسعار التوصيل المحلية بنجاح (${data?.length ?? 0} سعر)`)
      })

    sb.from('store_delivery_offices').select('*').eq('provider_id', form.id)
      .then(({ data }) => {
        setDrawerOffices(data ?? [])
        addLog(`تم تحميل مكاتب الاستلام المحلية بنجاح (${data?.length ?? 0} مكتب)`)
      })
  }, [form.id, meta.label, addLog])

  // Maintain individual fields in state
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const creds = form.credentials ?? {}
    const initial: Record<string, string> = {}
    
    meta.fields.forEach(f => {
      let val = creds[f.key]
      if (val === undefined) {
        if (f.key === 'apiId') val = creds.id ?? creds.apiId
        if (f.key === 'apiToken') val = creds.token ?? creds.apiToken
        if (f.key === 'secretKey') val = creds.secretKey ?? creds.token
        if (f.key === 'tenantId') val = creds.tenantId ?? creds.id
      }
      initial[f.key] = val ?? ''
    })
    return initial
  })

  const getPayload = (): Record<string, string> => {
    const payload: Record<string, string> = {}
    meta.fields.forEach(f => {
      const val = String(fields[f.key] ?? '').trim()
      if (val) payload[f.key] = val
    })
    return payload
  }

  const copyToClipboard = (text: string, key: string) => {
    if (text.includes('•')) {
      setToast('لا يمكن نسخ البيانات المشفّرة')
      return
    }
    navigator.clipboard.writeText(text)
    setCopiedField(key)
    setToast('تم نسخ المفتاح للحافظة')
    setTimeout(() => setCopiedField(''), 2000)
  }

  const test = async () => {
    const payload = getPayload()
    const values = Object.values(payload)
    const anyMasked = values.some(v => v.includes('•'))
    
    let body: any
    if (anyMasked && form.id) {
      body = { provider_id: form.id }
      addLog(`اختبار الاتصال باستخدام المفاتيح المشفرة المخزنة مسبقاً...`)
    } else {
      const v = validateCreds(form.provider_type, payload)
      if (!v.ok) { setErr(`ينقص الحقل: ${v.missing}`); return }
      setErr(null)
      body = { provider_type: form.provider_type, credentials: payload }
      addLog(`اختبار الاتصال باستخدام مفاتيح الاتصال المكتوبة حالياً...`)
    }
    
    setTesting(true); setTestMsg(null)
    try {
      const res = await fetch('/api/delivery/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      const d = await res.json()
      setTestMsg({ ok: !!d.ok, msg: d.message, raw: d.debug?.response })
      if (d.ok) {
        addLog(`✓ نجح اختبار الاتصال بالمزود بنجاح.`)
      } else {
        addLog(`❌ فشل اختبار الاتصال: ${d.message}`)
      }
    } catch {
      addLog(`❌ خطأ في الشبكة أثناء اختبار الاتصال`)
    } finally {
      setTesting(false)
    }
  }

  const save = async () => {
    const payload = getPayload()
    const values = Object.values(payload)
    const anyMasked = values.some(v => v.includes('•'))
    const hasValues = values.length > 0

    if (!form.id && (!hasValues || anyMasked)) {
      setErr('يرجى ملء جميع الحقول المطلوبة'); return
    }

    if (hasValues && !anyMasked) {
      const v = validateCreds(form.provider_type, payload)
      if (!v.ok) { setErr(`ينقص الحقل: ${v.missing}`); return }
    }
    setErr(null)

    setSaving(true)
    addLog(`بدء حفظ إعدادات الاتصال وبيانات التوجيه...`)
    const res = await fetch('/api/delivery/providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: form.id,
        provider_type: form.provider_type,
        display_name: form.display_name || meta.label,
        credentials: payload,
        is_automatic: !!form.is_automatic,
        from_wilaya_code: form.from_wilaya_code
      })
    })
    setSaving(false)
    if (res.ok) { 
      setToast('تم حفظ الإعدادات بنجاح')
      addLog(`✓ تم تشفير وحفظ بيانات الاتصال بنجاح.`)
      setForm(null)
      await onSaved() 
    } else { 
      const d = await res.json().catch(() => ({}))
      setErr(d.error ?? 'تعذّر الحفظ') 
      addLog(`❌ تعذر الحفظ: ${d.error ?? 'خطأ داخلي'}`)
    }
  }

  // Previews Search Logic
  const filteredRates = drawerRates.filter(r => {
    const wName = wilayas.find(w => w.code === r.wilaya_code)?.name_ar ?? ''
    return r.wilaya_code.includes(drawerRatesSearch) || wName.includes(drawerRatesSearch)
  })

  const filteredOffices = drawerOffices.filter(o => {
    const wName = wilayas.find(w => w.code === o.wilaya_code)?.name_ar ?? ''
    return o.name.toLowerCase().includes(drawerOfficesSearch.toLowerCase()) || 
           (o.address && o.address.toLowerCase().includes(drawerOfficesSearch.toLowerCase())) ||
           wName.includes(drawerOfficesSearch)
  })

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/55 backdrop-blur-xs z-50 transition-opacity duration-300" onClick={() => setForm(null)} />
      
      {/* Drawer */}
      <div 
        className="fixed inset-y-0 left-0 w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transition-all duration-300 ease-out animate-slide-in"
        dir="rtl"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white z-20" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${BRAND_METRICS[form.provider_type]?.bg ?? 'bg-gray-100'} ${BRAND_METRICS[form.provider_type]?.text ?? 'text-gray-700'}`}>
              {BRAND_METRICS[form.provider_type]?.logo}
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900">{form.id ? `إدارة قناة ${meta.label}` : `ربط قناة ${meta.label}`}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">تهيئة بيانات الاتصال، مزامنة الأسعار وتوجيه المكاتب محلياً.</p>
            </div>
          </div>
          <button onClick={() => setForm(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900">
            <X size={18} />
          </button>
        </div>

        {/* Inner Tab Bar inside Drawer */}
        {form.id && (
          <div className="px-6 border-b flex gap-4 bg-gray-50/50" style={{ borderColor: 'var(--color-border)' }}>
            {([
              ['settings', 'إعدادات الاتصال', <KeyRound size={13} key="settings" />],
              ['rates', 'الأسعار المستوردة', <Coins size={13} key="rates" />],
              ['offices', 'مكاتب الاستلام', <Landmark size={13} key="offices" />],
              ['logs', 'سجل العمليات', <History size={13} key="logs" />],
            ] as const).map(([k, label, icon]) => (
              <button
                key={k}
                onClick={() => setDrawerTab(k)}
                className={`py-3 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-all ${drawerTab === k ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-500 hover:text-gray-900'}`}
              >
                {icon}{label}
              </button>
            ))}
          </div>
        )}

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {drawerTab === 'settings' && (
            <>
              {/* Card Section: Connection details */}
              <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">الإعدادات العامة للقناة</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">الاسم المعروض</label>
                    <input 
                      className="input text-sm w-full" 
                      placeholder="مثال: ياليدين للتوصيل" 
                      value={form.display_name ?? ''} 
                      onChange={e => setForm((f: any) => ({ ...f, display_name: e.target.value }))} 
                    />
                  </div>

                  {form.provider_type === 'yalidine' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">ولاية الإرسال (المصدر)</label>
                      <input 
                        className="input text-sm w-full font-mono" 
                        dir="ltr" 
                        placeholder="16" 
                        value={form.from_wilaya_code ?? '16'} 
                        onChange={e => setForm((f: any) => ({ ...f, from_wilaya_code: e.target.value }))} 
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <input 
                    type="checkbox" 
                    id="drawer_is_automatic" 
                    checked={!!form.is_automatic} 
                    onChange={e => setForm((f: any) => ({ ...f, is_automatic: e.target.checked }))} 
                    className="w-4 h-4 accent-teal-600 cursor-pointer" 
                  />
                  <label htmlFor="drawer_is_automatic" className="text-xs font-bold text-gray-700 cursor-pointer select-none leading-relaxed">
                    إرسال الطرود تلقائياً (Auto-Shipping)
                    <span className="block text-[10px] font-normal text-gray-500 mt-0.5">
                      بمجرد تأكيد الطلب من لوحة التحكم، سيتم إنشاء الشحنة تلقائياً لدى الشركة.
                    </span>
                  </label>
                </div>
              </div>

              {/* Card Section: Credentials */}
              <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">بيانات الاتصال بالحساب</h4>
                
                <div className="space-y-4">
                  {meta.fields.map(f => {
                    const isPass = f.type === 'password'
                    const showTxt = showPasswords[f.key]
                    return (
                      <div key={f.key} className="space-y-1">
                        <label className="block text-xs font-bold text-gray-600">{f.label}</label>
                        <div className="relative flex items-center">
                          <input
                            type={isPass && !showTxt ? 'password' : 'text'}
                            dir="ltr"
                            className="input text-sm w-full font-mono pl-20 pr-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                            placeholder={f.placeholder}
                            value={fields[f.key]}
                            onChange={e => {
                              setFields(prev => ({ ...prev, [f.key]: e.target.value }))
                              setErr(null)
                            }}
                          />
                          <div className="absolute left-2 flex items-center gap-1.5">
                            {isPass && (
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                                className="p-1 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-100"
                              >
                                {showTxt ? <EyeOff size={14} /> : <Eye size={14} />}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fields[f.key], f.key)}
                              className="p-1 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-100"
                              title="نسخ للمحافظة"
                            >
                              {copiedField === f.key ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {form.id && (
                  <p className="text-[10px] text-gray-400 leading-relaxed">
                    🔒 حماية متقدمة: يتم تخزين بيانات الاتصال مشفّرة تماماً (AES-256-GCM) على الخادم. الحقول التي تحتوي على النقاط اتركها كما هي للمحافظة عليها.
                  </p>
                )}
                {err && <p className="text-xs text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={12} />{err}</p>}
              </div>

              {/* Sync stepper timeline (visual logic validation) */}
              {form.id && (
                <div className="bg-white border rounded-2xl p-5 space-y-4 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">مخطط حالة المزامنة والربط</h4>
                  <div className="relative pl-6 space-y-6 before:absolute before:right-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
                    <div className="relative flex items-start gap-4">
                      <span className="absolute right-0 w-4.5 h-4.5 rounded-full bg-green-50 border-2 border-green-500 flex items-center justify-center shrink-0 z-10">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      </span>
                      <div className="mr-6 space-y-0.5">
                        <p className="text-xs font-bold text-gray-900">ربط القناة بنجاح</p>
                        <p className="text-[10px] text-gray-400">تم تسجيل القناة المحلية وتأمين المفاتيح في قاعدة البيانات.</p>
                      </div>
                    </div>

                    <div className="relative flex items-start gap-4">
                      <span className={`absolute right-0 w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 z-10 ${drawerRates.length ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50 border-2 border-gray-200'}`}>
                        {drawerRates.length && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                      </span>
                      <div className="mr-6 space-y-0.5">
                        <p className="text-xs font-bold text-gray-900">توطين أسعار التوصيل</p>
                        <p className="text-[10px] text-gray-500">
                          {drawerRates.length ? `تمت مزامنة وحفظ ${drawerRates.length} سعر للولايات بنجاح.` : 'لم يتم استيراد أي أسعار بعد.'}
                        </p>
                      </div>
                    </div>

                    <div className="relative flex items-start gap-4">
                      <span className={`absolute right-0 w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 z-10 ${drawerOffices.length ? 'bg-green-50 border-2 border-green-500' : 'bg-gray-50 border-2 border-gray-200'}`}>
                        {drawerOffices.length && <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />}
                      </span>
                      <div className="mr-6 space-y-0.5">
                        <p className="text-xs font-bold text-gray-900">مكاتب الاستلام المهيأة</p>
                        <p className="text-[10px] text-gray-500">
                          {drawerOffices.length ? `تم تفعيل وتوطين ${drawerOffices.length} مكتب شحن للعملاء.` : 'لا توجد مكاتب استلام مسجلة للقناة.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              {form.id && (
                <div className="border border-red-100 bg-red-50/20 rounded-2xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={14} /> منطقة الخطر (إلغاء الربط)
                  </h4>
                  <p className="text-[11px] text-red-600 leading-relaxed">
                    عند إلغاء ربط شركة التوصيل، سيتم مسح جميع بيانات الاتصال وأسعار الشحن المرتبطة بها ولن يتم التوجيه إليها تلقائياً.
                  </p>
                  <button
                    onClick={() => { onDelete(form.id); setForm(null) }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-xl transition-all shadow-sm"
                  >
                    <Trash2 size={13} /> فصل شركة التوصيل تماماً
                  </button>
                </div>
              )}
            </>
          )}

          {/* Rates Preview Tab (Searchable preview in Drawer) */}
          {drawerTab === 'rates' && (
            <div className="bg-white border rounded-2xl p-4 space-y-4 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute right-3 top-3 text-gray-400" />
                  <input
                    className="input text-xs w-full pr-8 h-9"
                    placeholder="البحث باسم الولاية أو الرمز..."
                    value={drawerRatesSearch}
                    onChange={e => setDrawerRatesSearch(e.target.value)}
                  />
                </div>
                <span className="text-[11px] text-gray-400 font-bold shrink-0">
                  {filteredRates.length} ولاية مفعّلة
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-[10px] uppercase font-bold text-gray-400" style={{ borderColor: 'var(--color-border)' }}>
                      <th className="p-2.5">الرمز والولاية</th>
                      <th className="p-2.5 text-left">المنزل (دج)</th>
                      <th className="p-2.5 text-left">المكتب (دج)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
                    {filteredRates.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-10 text-gray-400 font-medium">
                          لا توجد نتائج مطابقة لبحثك.
                        </td>
                      </tr>
                    ) : filteredRates.map(r => {
                      const wName = wilayas.find(w => w.code === r.wilaya_code)?.name_ar ?? ''
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/50">
                          <td className="p-2.5 font-semibold">{r.wilaya_code} · {wName}</td>
                          <td className="p-2.5 text-left font-mono text-gray-900">{r.home_price} دج</td>
                          <td className="p-2.5 text-left font-mono text-gray-900">{r.stopdesk_price} DZD</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Offices Preview Tab (Searchable desks in Drawer) */}
          {drawerTab === 'offices' && (
            <div className="bg-white border rounded-2xl p-4 space-y-4 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search size={14} className="absolute right-3 top-3 text-gray-400" />
                  <input
                    className="input text-xs w-full pr-8 h-9"
                    placeholder="البحث بالمكتب، البلدية أو الولاية..."
                    value={drawerOfficesSearch}
                    onChange={e => setDrawerOfficesSearch(e.target.value)}
                  />
                </div>
                <span className="text-[11px] text-gray-400 font-bold shrink-0">
                  {filteredOffices.length} مكتب شحن
                </span>
              </div>

              <div className="border rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-[10px] uppercase font-bold text-gray-400" style={{ borderColor: 'var(--color-border)' }}>
                      <th className="p-2.5">الولاية والمكتب</th>
                      <th className="p-2.5">العنوان بالتفصيل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
                    {filteredOffices.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center py-10 text-gray-400 font-medium">
                          لا توجد مكاتب استلام مطابقة.
                        </td>
                      </tr>
                    ) : filteredOffices.map(o => {
                      const wName = wilayas.find(w => w.code === o.wilaya_code)?.name_ar ?? ''
                      return (
                        <tr key={o.id} className="hover:bg-gray-50/50">
                          <td className="p-2.5">
                            <span className="block font-semibold text-gray-900">{o.name}</span>
                            <span className="block text-[10px] text-gray-400 mt-0.5">{wName} ({o.wilaya_code})</span>
                          </td>
                          <td className="p-2.5 text-gray-500 text-[11px] max-w-[200px] truncate" title={o.address ?? ''}>
                            {o.address ?? '—'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Sync Logs Tab (Terminal layout) */}
          {drawerTab === 'logs' && (
            <div className="bg-gray-950 text-emerald-400 font-mono text-[11px] p-5 rounded-2xl border border-gray-800 shadow-inner h-[400px] overflow-y-auto space-y-2 leading-relaxed" dir="ltr">
              <p className="text-gray-500 select-none border-b border-gray-800 pb-2 mb-3"># Dakkani Delivery Console Logs v1.0.0</p>
              {syncLogs.map((log, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gray-600 select-none">&gt;</span>
                  <span className="break-all">{log}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Test Connection Results Alert */}
        {testMsg && (
          <div className="px-6 py-3 border-t bg-gray-50" style={{ borderColor: 'var(--color-border)' }}>
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${testMsg.ok ? 'bg-green-50/50 border-green-200 text-green-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
              {testMsg.ok ? <CheckCircle size={16} className="text-green-600 shrink-0 mt-0.5" /> : <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-bold">{testMsg.msg}</p>
                {testMsg.raw && <pre dir="ltr" className="mt-2 p-2 rounded text-[10px] overflow-x-auto font-mono bg-white border" style={{ color: '#495057', maxHeight: 80 }}>{testMsg.raw}</pre>}
              </div>
            </div>
          </div>
        )}

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3 sticky bottom-0" style={{ borderColor: 'var(--color-border)' }}>
          <button 
            onClick={test} 
            disabled={testing} 
            className="btn btn-sm px-4 font-bold bg-white border hover:bg-gray-100 shadow-sm"
            style={{ color: '#0A6E66', borderColor: 'var(--cf-turq)' }}
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : 'اختبار الاتصال'}
          </button>
          <div className="flex gap-2">
            <button 
              onClick={save} 
              disabled={saving} 
              className="btn btn-sm font-bold bg-teal-600 text-white hover:bg-teal-700 shadow-sm px-6"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : 'حفظ الإعدادات'}
            </button>
            <button 
              onClick={() => setForm(null)} 
              className="btn btn-sm font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 px-4"
            >
              إلغاء
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

// ============================================================
// SUB-TAB 1 & 3: Prices Tab (Beautiful Searchable Grid)
// ============================================================
function PricesTab({ 
  target, 
  providers, 
  wilayas, 
  storeId, 
  setToast 
}: { 
  target: 'declared' | 'real'; 
  providers: Provider[]; 
  wilayas: Wilaya[]; 
  storeId: string; 
  setToast: (m: string) => void;
}) {
  const table = target === 'real' ? 'delivery_real_prices' : 'delivery_declared_prices'
  const active = providers.filter(p => p.is_active)
  const [providerId, setProviderId] = useState('')
  const [prices, setPrices] = useState<Record<string, PriceRow>>({})
  const [view, setView] = useState<'all' | 'desk' | 'home'>('all')
  const [importing, setImporting] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { if (!providerId && active.length) setProviderId(active[0].id) }, [active, providerId])

  const load = useCallback(async () => {
    if (!providerId) return
    const sb = createClient()
    const { data } = await sb.from(table).select('wilaya_code,home_price,stopdesk_price,source').eq('provider_id', providerId)
    const map: Record<string, PriceRow> = {}
    ;(data ?? []).forEach((r: any) => { map[r.wilaya_code] = { home: Number(r.home_price), desk: Number(r.stopdesk_price), source: r.source } })
    setPrices(map)
  }, [providerId, table])
  
  useEffect(() => { load() }, [load])

  const doImport = async () => {
    if (!providerId) return
    setImporting(true)
    const res = await fetch(`/api/delivery/import-rates/${providerId}?target=${target}`, { method: 'POST' })
    const d = await res.json(); setImporting(false)
    if (res.ok) { setToast(`تم استيراد ${d.imported} ولاية`); load() }
    else setToast(d.error ?? 'تعذّر الاستيراد')
  }

  const savePrice = async (code: string, field: 'home' | 'desk', value: number) => {
    const cur = prices[code] ?? { home: 0, desk: 0, source: 'manual' }
    const next = { ...cur, [field]: value, source: 'manual' }
    setPrices(p => ({ ...p, [code]: next }))
    const sb = createClient()
    await sb.from(table).upsert(
      { store_id: storeId, provider_id: providerId, wilaya_code: code, home_price: next.home, stopdesk_price: next.desk, source: 'manual', updated_at: new Date().toISOString() },
      { onConflict: 'provider_id,wilaya_code' }
    )
  }

  const meta = providerMeta(active.find(p => p.id === providerId)?.provider_type ?? 'yalidine')

  const filteredWilayas = wilayas.filter(w => w.code.includes(search) || w.name_ar.includes(search))

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 rounded-2xl border flex items-start gap-3 bg-red-50/30 border-red-100">
        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
        <div className="text-xs text-red-800 leading-relaxed">
          {target === 'real'
            ? 'الأسعار الحقيقية (المقاصة مع شركة التوصيل) تُستخدم فقط لحساب أرباح المتجر في لوحة التحكم، ولا يتم إضافتها إلى الفاتورة النهائية للزبون.'
            : 'الأسعار المعلنة هي أسعار التوصيل التي تظهر للزبائن في صفحة إنهاء الشراء ويتم إضافتها إلى مجموع الفاتورة النهائي.'}
        </div>
      </div>

      {/* Pricing Header Actions */}
      <div className="bg-white border rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select 
            className="input text-sm h-10 w-full sm:w-56" 
            value={providerId} 
            onChange={e => setProviderId(e.target.value)}
          >
            {active.length === 0 ? <option value="">لا توجد شركات مُفعّلة</option> : active.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
          <button 
            onClick={doImport} 
            disabled={!providerId || importing || (meta && !meta.hasRatesApi)} 
            className="btn btn-primary h-10 px-4 gap-2 flex items-center justify-center w-full sm:w-auto"
          >
            {importing ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} استيراد أسعار الشركة
          </button>
        </div>

        {/* View filters */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto justify-end">
          {([['all', 'عرض الكل'], ['desk', 'توصيل المكتب'], ['home', 'توصيل المنزل']] as const).map(([v, l]) => (
            <button 
              key={v} 
              onClick={() => setView(v)} 
              className={`h-8 px-4 text-xs font-bold rounded-lg border transition-all ${view === v ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table search utility */}
      <div className="relative">
        <Search size={14} className="absolute right-3.5 top-3.5 text-gray-400" />
        <input 
          className="input text-sm w-full pr-9 h-11"
          placeholder="البحث عن أسعار ولاية معينة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Main Prices Table */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ borderColor: 'var(--color-border)' }}>
                <th className="p-3">الرمز والولاية</th>
                {view !== 'home' && <th className="p-3 text-left">توصيل للمكتب (دج)</th>}
                {view !== 'desk' && <th className="p-3 text-left">توصيل للمنزل (دج)</th>}
                <th className="p-3 text-center">مصدر التسعير</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
              {filteredWilayas.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-20 text-gray-400">
                    <div className="space-y-2">
                      <HelpCircle className="mx-auto text-gray-300" size={32} />
                      <p className="font-bold">لا توجد نتائج مطابقة</p>
                      <p className="text-xs text-gray-400">تأكد من كتابة اسم الولاية بشكل صحيح.</p>
                    </div>
                  </td>
                </tr>
              ) : filteredWilayas.map(w => {
                const row = prices[w.code]
                return (
                  <tr key={w.id} className="hover:bg-gray-50/50">
                    <td className="p-3 font-semibold text-gray-900">{w.code} · {w.name_ar}</td>
                    {view !== 'home' && (
                      <td className="p-3 text-left">
                        <PriceInput value={row?.desk ?? 0} onSave={v => savePrice(w.code, 'desk', v)} />
                      </td>
                    )}
                    {view !== 'desk' && (
                      <td className="p-3 text-left">
                        <PriceInput value={row?.home ?? 0} onSave={v => savePrice(w.code, 'home', v)} />
                      </td>
                    )}
                    <td className="p-3 text-center">
                      {row ? (
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold ${row.source === 'imported' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                          {row.source === 'imported' ? 'مستورد تلقائي' : 'يدوي'}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SUB-TAB 2: Wilaya → Provider Routing (Automatic dispatching)
// ============================================================
function RoutingTab({ 
  providers, 
  wilayas, 
  storeId, 
  setToast 
}: { 
  providers: Provider[]; 
  wilayas: Wilaya[]; 
  storeId: string; 
  setToast: (m: string) => void;
}) {
  const [enabled, setEnabled] = useState(false)
  const [map, setMap] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const active = providers.filter(p => p.is_active)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data } = await sb.from('wilaya_company_map').select('wilaya_code,provider_id').eq('store_id', storeId)
      const m: Record<string, string> = {}; (data ?? []).forEach((r: any) => { m[r.wilaya_code] = r.provider_id })
      setMap(m); if (Object.keys(m).length) setEnabled(true)
    })()
  }, [storeId])

  const assign = async (code: string, providerId: string) => {
    setMap(m => ({ ...m, [code]: providerId }))
    const sb = createClient()
    if (!providerId) { 
      await sb.from('wilaya_company_map').delete().eq('store_id', storeId).eq('wilaya_code', code)
      setToast('تم إلغاء التوجيه الخاص للولاية')
      return 
    }
    await sb.from('wilaya_company_map').upsert({ store_id: storeId, wilaya_code: code, provider_id: providerId }, { onConflict: 'store_id,wilaya_code' })
    setToast('تم تخصيص الموفر للولاية')
  }

  const filteredWilayas = wilayas.filter(w => w.code.includes(search) || w.name_ar.includes(search))

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="bg-white border rounded-2xl p-4 flex items-center justify-between shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-gray-900">نظام توجيه الولايات التلقائي (Auto-Routing)</h4>
          <p className="text-xs text-gray-500">اختر شركة شحن مخصصة لولايات معينة ليتم تحويل الطلبات وتوليد الأسعار لها بمجرد اختيار العميل للولاية.</p>
        </div>
        <button 
          onClick={() => setEnabled(v => !v)} 
          className="w-11 h-6 rounded-full relative transition-colors outline-none shrink-0" 
          style={{ background: enabled ? 'var(--cf-turq)' : '#DEE2E6' }}
        >
          <span 
            className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all" 
            style={{ [enabled ? 'right' : 'left']: '2px' } as any} 
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute right-3.5 top-3.5 text-gray-400" />
            <input 
              className="input text-sm w-full pr-9 h-11"
              placeholder="البحث في الولايات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="p-3">الولاية والمفتاح</th>
                    <th className="p-3 text-left">شركة التوصيل الموجهة</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
                  {filteredWilayas.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50/50">
                      <td className="p-3 font-semibold text-gray-900">{w.code} · {w.name_ar}</td>
                      <td className="p-3 text-left">
                        <select 
                          className="input text-xs h-9 w-48 font-bold" 
                          value={map[w.code] ?? ''} 
                          onChange={e => assign(w.code, e.target.value)}
                        >
                          <option value="">شركة التوصيل الافتراضية</option>
                          {active.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// SUB-TAB 4: Custom Offices Tab (Add Manual Stops)
// ============================================================
function OfficesTab({ 
  providers, 
  wilayas, 
  storeId, 
  setToast 
}: { 
  providers: Provider[]; 
  wilayas: Wilaya[]; 
  storeId: string; 
  setToast: (m: string) => void;
}) {
  const [offices, setOffices] = useState<any[]>([])
  const [form, setForm] = useState({ provider_id: '', wilaya_code: '', name: '', address: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    const res = await fetch(`/api/store/delivery/offices?storeId=${storeId}`)
    if (res.ok) setOffices((await res.json()).offices ?? [])
  }, [storeId])
  
  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!form.wilaya_code || !form.name.trim()) { setToast('اختر الولاية واكتب اسم المكتب'); return }
    setSaving(true)
    const res = await fetch('/api/store/delivery/offices', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        storeId, 
        provider_id: form.provider_id || null, 
        wilaya_code: form.wilaya_code, 
        name: form.name.trim(), 
        address: form.address.trim() || undefined 
      }),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setToast(d.error ?? 'تعذّر الحفظ'); return }
    setForm(f => ({ ...f, name: '', address: '' }))
    setToast('تمت إضافة المكتب بنجاح')
    load()
  }

  const del = async (id: string) => {
    if (!confirm('حذف هذا المكتب من النظام؟')) return
    await fetch('/api/store/delivery/offices', { 
      method: 'DELETE', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ storeId, id }) 
    })
    setToast('تم حذف المكتب')
    load()
  }

  const wName = (code: string) => wilayas.find(w => w.code === code)?.name_ar ?? code
  const pName = (id?: string) => id ? (providers.find(p => p.id === id)?.display_name ?? '—') : 'كل الشركات'

  const filteredOffices = offices.filter(o => 
    o.name.toLowerCase().includes(search.toLowerCase()) || 
    (o.address && o.address.toLowerCase().includes(search.toLowerCase())) ||
    wName(o.wilaya_code).includes(search)
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="p-4 bg-gray-50 border rounded-2xl flex items-start gap-3" style={{ borderColor: 'var(--color-border)' }}>
        <HelpCircle className="text-gray-500 shrink-0 mt-0.5" size={16} />
        <p className="text-xs text-gray-500 leading-relaxed">
          أضف مكاتب الاستلام المخصصة للولايات — تظهر للعملاء في خانة «مكتب التوصيل» عند اختيارهم خيار «التوصيل للمكتب». (مزودي Yalidine يزودون مكاتبهم تلقائياً، ويمكن إضافة مكاتب ZR Express وZR مكاتب مخصصة هنا.)
        </p>
      </div>

      {/* Office creation card */}
      <div className="bg-white border rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
        <div className="sm:col-span-3">
          <label className="block text-xs font-bold text-gray-600 mb-1">الشركة</label>
          <select className="input text-sm w-full h-10" value={form.provider_id} onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))}>
            <option value="">كل الشركات</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-bold text-gray-600 mb-1">الولاية</label>
          <select className="input text-sm w-full h-10" value={form.wilaya_code} onChange={e => setForm(f => ({ ...f, wilaya_code: e.target.value }))}>
            <option value="">اختر الولاية</option>
            {wilayas.map(w => <option key={w.code} value={w.code}>{w.code} — {w.name_ar}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs font-bold text-gray-600 mb-1">اسم مكتب الشحن</label>
          <input className="input text-sm w-full h-10" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: مكتب شاطئ الشراقة" />
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs font-bold text-gray-600 mb-1">العنوان بالتفصيل (اختياري)</label>
          <input className="input text-sm w-full h-10" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="الشارع أو المبنى..." />
        </div>
        <div className="sm:col-span-1">
          <button onClick={add} disabled={saving} className="btn btn-primary h-10 w-full flex items-center justify-center rounded-xl">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {/* Office Search Utility */}
      <div className="relative">
        <Search size={14} className="absolute right-3.5 top-3.5 text-gray-400" />
        <input 
          className="input text-sm w-full pr-9 h-11"
          placeholder="البحث في قائمة مكاتب الشحن المسجلة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Offices Table */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase tracking-wider" style={{ borderColor: 'var(--color-border)' }}>
              <th className="p-3 w-16">إجراء</th>
              <th className="p-3">الشركة المربوطة</th>
              <th className="p-3">الولاية والمفتاح</th>
              <th className="p-3">اسم مكتب التوصيل</th>
              <th className="p-3">العنوان بالتفصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y text-sm text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
            {filteredOffices.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-20 text-gray-400">
                  <div className="space-y-2">
                    <Landmark className="mx-auto text-gray-300" size={32} />
                    <p className="font-bold">لا توجد مكاتب شحن مضافة</p>
                    <p className="text-xs text-gray-400">قم بإضافة مكتب شحن للولاية باستخدام النموذج أعلاه.</p>
                  </div>
                </td>
              </tr>
            ) : filteredOffices.map(o => (
              <tr key={o.id} className="hover:bg-gray-50/50">
                <td className="p-3">
                  <button onClick={() => del(o.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
                <td className="p-3 font-semibold text-gray-800">{pName(o.provider_id)}</td>
                <td className="p-3">{wName(o.wilaya_code)} ({o.wilaya_code})</td>
                <td className="p-3 font-semibold text-gray-900">{o.name}</td>
                <td className="p-3 text-xs text-gray-500">{o.address ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ============================================================
// price input component that saves on blur (unchanged behavior)
// ============================================================
function PriceInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  useEffect(() => { setV(String(value)) }, [value])
  return (
    <input 
      type="number" 
      className="input text-xs w-24 h-9 font-mono text-left focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
      dir="ltr" 
      value={v} 
      onChange={e => setV(e.target.value)} 
      onBlur={() => onSave(+v || 0)} 
    />
  )
}
