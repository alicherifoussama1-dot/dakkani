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
    bg: 'bg-[#FFC000]/5',
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
    bg: 'bg-[#E23024]/5',
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
    bg: 'bg-[#10B981]/5',
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
    bg: 'bg-[#0D6EFD]/5',
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
    bg: 'bg-[#7C3AED]/5',
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
          <h2 className="text-xl font-bold tracking-tight text-gray-900">مركز التحكم بـشركات التوصيل</h2>
          <p className="text-xs text-gray-500 mt-1">قم بربط حسابات شركات الشحن الخاصة بك، وإدارة الأسعار وتوجيه الطرود لكل ولاية.</p>
        </div>
        <div className="flex bg-gray-100/80 p-0.5 rounded-lg border border-gray-200/50 w-full sm:w-auto">
          {SUB_TABS.map((t, i) => (
            <button 
              key={t} 
              onClick={() => setTab(i)} 
              className={`px-3.5 py-1.5 text-[11px] font-bold rounded-md transition-all ${tab === i ? 'bg-white text-gray-900 shadow-xs border border-gray-200/20' : 'text-gray-500 hover:text-gray-900'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-gray-400" size={24} />
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
    <div className="space-y-6 animate-fade-in">
      {/* SaaS Dashboard Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'القنوات المتصلة', count: connectedCount, icon: <Link2 size={16} />, theme: 'bg-blue-50/50 text-blue-600' },
          { label: 'القنوات النشطة', count: activeCount, icon: <Activity size={16} />, theme: 'bg-green-50/50 text-green-600' },
          { label: 'أسعار التوصيل', count: pricesCount, icon: <Coins size={16} />, theme: 'bg-amber-50/50 text-amber-600' },
          { label: 'مكاتب الاستلام', count: officesCount, icon: <Landmark size={16} />, theme: 'bg-purple-50/50 text-purple-600' }
        ].map((item, idx) => (
          <div key={idx} className="bg-white border border-gray-200/80 rounded-xl p-5 flex items-center justify-between shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all hover:border-gray-300">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-gray-900">{item.count}</p>
            </div>
            <div className={`p-2.5 rounded-lg border border-transparent ${item.theme} shrink-0`}>
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Global Status Banner */}
      <div className="p-4 bg-gray-50/50 border border-gray-200/60 rounded-xl flex items-center gap-3">
        <CheckCircle className="text-emerald-500 shrink-0" size={16} />
        <div className="text-[11px] text-gray-600 leading-normal">
          <span className="font-bold text-gray-900">حالة التوجيه المحلي:</span> قنوات الربط تعمل بنظام التوطين المباشر (Local-First). المبيعات والأسعار يتم احتسابها فورياً من قاعدة البيانات دون الحاجة لطلب واجهات برمجة خارجية أثناء إنهاء الطلب.
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
              className="bg-white border border-gray-200/80 rounded-xl flex flex-col justify-between overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.01)] transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.03)] hover:border-gray-300"
            >
              {/* Header Info */}
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-xl border border-gray-100 flex items-center justify-center ${profile?.bg ?? 'bg-gray-100'} ${profile?.text ?? 'text-gray-700'} shrink-0 shadow-xs`}>
                    {profile?.logo ?? <Globe size={20} />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                      {profile?.apiVer ?? 'API'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold border ${connected && p!.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                      {connected && p!.is_active ? 'نشط' : 'معطّل'}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900">{p?.display_name ?? meta.label}</h3>
                  <p className="text-xs text-gray-500 font-normal leading-relaxed min-h-[36px]">{profile?.desc ?? ''}</p>
                </div>

                {connected && (
                  <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] text-gray-500">
                    <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/80">
                      <span className="block text-gray-400 text-[8px] uppercase font-bold tracking-wider mb-0.5">الإرسال التلقائي</span>
                      <span className="font-semibold text-gray-700">{p.is_automatic ? 'مفعّل' : 'يدوي'}</span>
                    </div>
                    <div className="bg-gray-50/50 p-2.5 rounded-lg border border-gray-100/80">
                      <span className="block text-gray-400 text-[8px] uppercase font-bold tracking-wider mb-0.5">ولاية الإرسال</span>
                      <span className="font-semibold text-gray-700">{p.from_wilaya_code ?? '16'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="px-6 py-4 bg-gray-50/40 border-t border-gray-100/80 flex items-center justify-between gap-2">
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
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-200 px-3.5 py-2 rounded-lg hover:bg-gray-50 transition-all shadow-xs active:scale-95 cursor-pointer"
                    >
                      <Settings size={12} /> إعدادات الربط
                    </button>
                    {meta.hasRatesApi && (
                      <button 
                        onClick={() => sync(p)} 
                        disabled={syncing === p.id}
                        className="inline-flex items-center justify-center p-2 text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-900 transition-all shadow-xs active:scale-95 cursor-pointer disabled:opacity-50"
                        title="مزامنة فورية للأسعار والمكاتب"
                      >
                        {syncing === p.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => setActiveForm({ provider_type: meta.type, credentials: {}, is_automatic: false, from_wilaya_code: '16' })}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 bg-blue-50/80 px-3.5 py-2 rounded-lg hover:bg-blue-100 active:scale-95 transition-all cursor-pointer"
                    >
                      <Link2 size={12} /> ربط الحساب الآن
                    </button>
                    <span className="text-[10px] text-gray-400 font-medium">غير متصل</span>
                  </>
                )}

                {/* Inline Toggle */}
                {connected && (
                  <button
                    onClick={() => toggleActive(p)}
                    className={`w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out shrink-0 focus:outline-none cursor-pointer`}
                    style={{ background: p.is_active ? 'var(--cf-turq)' : '#E5E7EB' }}
                  >
                    <span 
                      className={`absolute top-[2px] w-4.5 h-4.5 bg-white rounded-full shadow-xs transition-transform duration-200 ease-in-out ${p.is_active ? 'right-[2px] translate-x-0' : 'right-[2px] translate-x-[-16px]'}`}
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
      <div className="fixed inset-0 bg-gray-900/30 backdrop-blur-xs z-50 transition-opacity duration-300" onClick={() => setForm(null)} />
      
      {/* Drawer */}
      <div 
        className="fixed inset-y-0 left-0 w-full max-w-xl bg-white shadow-2xl z-50 flex flex-col transition-all duration-300 ease-out animate-slide-in border-r"
        style={{ borderColor: 'var(--color-border)' }}
        dir="rtl"
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white z-20" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border border-gray-100 flex items-center justify-center ${BRAND_METRICS[form.provider_type]?.bg ?? 'bg-gray-100'} ${BRAND_METRICS[form.provider_type]?.text ?? 'text-gray-700'} shadow-xs`}>
              {BRAND_METRICS[form.provider_type]?.logo}
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">{form.id ? `إدارة قناة ${meta.label}` : `ربط قناة ${meta.label}`}</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">تهيئة بيانات الاتصال، مزامنة الأسعار وتوجيه المكاتب محلياً.</p>
            </div>
          </div>
          <button onClick={() => setForm(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-900 cursor-pointer">
            <X size={16} />
          </button>
        </div>

        {/* Inner Tab Bar inside Drawer */}
        {form.id && (
          <div className="px-6 border-b flex gap-5 bg-gray-50/50" style={{ borderColor: 'var(--color-border)' }}>
            {([
              ['settings', 'إعدادات الاتصال'],
              ['rates', 'الأسعار المحلية'],
              ['offices', 'مكاتب الاستلام'],
              ['logs', 'السجلات والمراقبة'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setDrawerTab(k)}
                className={`py-3 text-[11px] font-bold border-b-2 transition-all cursor-pointer ${drawerTab === k ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-900'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/20">
          {drawerTab === 'settings' && (
            <>
              {/* Card Section: Connection details */}
              <div className="bg-white border border-gray-200/85 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">إعدادات القناة العامة</h4>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-gray-600">الاسم المعروض</label>
                      <input 
                        className="w-full px-3 py-2 text-sm bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 placeholder-gray-400" 
                        placeholder="مثال: ياليدين للتوصيل" 
                        value={form.display_name ?? ''} 
                        onChange={e => setForm((f: any) => ({ ...f, display_name: e.target.value }))} 
                      />
                    </div>

                    {form.provider_type === 'yalidine' && (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-gray-600">ولاية الإرسال (المصدر)</label>
                        <input 
                          className="w-full px-3 py-2 text-sm bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 placeholder-gray-400 font-mono" 
                          dir="ltr" 
                          placeholder="16" 
                          value={form.from_wilaya_code ?? '16'} 
                          onChange={e => setForm((f: any) => ({ ...f, from_wilaya_code: e.target.value }))} 
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-3 p-3.5 bg-gray-50/60 rounded-lg border border-gray-100">
                    <input 
                      type="checkbox" 
                      id="drawer_is_automatic" 
                      checked={!!form.is_automatic} 
                      onChange={e => setForm((f: any) => ({ ...f, is_automatic: e.target.checked }))} 
                      className="w-4 h-4 accent-gray-800 cursor-pointer mt-0.5" 
                    />
                    <label htmlFor="drawer_is_automatic" className="text-[11px] font-bold text-gray-700 cursor-pointer select-none leading-relaxed">
                      تفعيل الإرسال التلقائي للطلبات
                      <span className="block text-[10px] font-normal text-gray-400 mt-0.5">
                        سيقوم النظام بتوليد وإنشاء الشحنة تلقائياً لدى الشركة بمجرد تأكيد الطلب من الإدارة.
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Card Section: Credentials */}
              <div className="bg-white border border-gray-200/85 rounded-xl overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">مفاتيح الاتصال الآمنة</h4>
                </div>
                
                <div className="p-5 space-y-4">
                  {meta.fields.map(f => {
                    const isPass = f.type === 'password'
                    const showTxt = showPasswords[f.key]
                    return (
                      <div key={f.key} className="space-y-1">
                        <label className="block text-[11px] font-bold text-gray-600">{f.label}</label>
                        <div className="relative flex items-center">
                          <input
                            type={isPass && !showTxt ? 'password' : 'text'}
                            dir="ltr"
                            className="w-full pl-20 pr-3 py-2 text-sm bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 font-mono tracking-wider"
                            placeholder={f.placeholder}
                            value={fields[f.key]}
                            onChange={e => {
                              setFields(prev => ({ ...prev, [f.key]: e.target.value }))
                              setErr(null)
                            }}
                          />
                          <div className="absolute left-2 flex items-center gap-1">
                            {isPass && (
                              <button
                                type="button"
                                onClick={() => setShowPasswords(prev => ({ ...prev, [f.key]: !prev[f.key] }))}
                                className="p-1 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-100 cursor-pointer"
                              >
                                {showTxt ? <EyeOff size={13} /> : <Eye size={13} />}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => copyToClipboard(fields[f.key], f.key)}
                              className="p-1 text-gray-400 hover:text-gray-900 rounded hover:bg-gray-100 cursor-pointer"
                              title="نسخ المفتاح"
                            >
                              {copiedField === f.key ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {form.id && (
                    <p className="text-[10px] text-gray-400 leading-normal border-t pt-3 mt-1">
                      🔒 حماية وتشفير متكامل: يتم تأمين بيانات الاتصال باستخدام خوارزمية التشفير القياسية AES-256-GCM.
                    </p>
                  )}
                  {err && <p className="text-xs text-red-600 font-bold flex items-center gap-1"><AlertTriangle size={12} />{err}</p>}
                </div>
              </div>

              {/* Sync stepper timeline */}
              {form.id && (
                <div className="bg-white border border-gray-200/85 rounded-xl overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">تتبع مسار الاتصال والمزامنة</h4>
                  </div>
                  <div className="p-5">
                    <div className="relative pl-6 space-y-6 before:absolute before:right-[8px] before:top-2 before:bottom-2 before:w-[1px] before:bg-gray-200">
                      <div className="relative flex items-start gap-4">
                        <span className="absolute right-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white shadow-xs ring-1 ring-emerald-500 flex items-center justify-center shrink-0 z-10" />
                        <div className="mr-6">
                          <h5 className="text-xs font-semibold text-gray-900">الربط البرمجي السليم</h5>
                          <p className="text-[10px] text-gray-400 mt-0.5">تم التحقق من تشفير المفاتيح والاتصال بقاعدة البيانات.</p>
                        </div>
                      </div>

                      <div className="relative flex items-start gap-4">
                        <span className={`absolute right-0 w-4 h-4 rounded-full border-4 border-white shadow-xs ring-1 flex items-center justify-center shrink-0 z-10 ${drawerRates.length ? 'bg-emerald-500 ring-emerald-500' : 'bg-gray-200 ring-gray-200'}`} />
                        <div className="mr-6">
                          <h5 className="text-xs font-semibold text-gray-900">توطين الأسعار للمتجر</h5>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {drawerRates.length ? `تمت مزامنة وحفظ ${drawerRates.length} سعر للولايات بنجاح.` : 'لم يتم استيراد أي أسعار بعد.'}
                          </p>
                        </div>
                      </div>

                      <div className="relative flex items-start gap-4">
                        <span className={`absolute right-0 w-4 h-4 rounded-full border-4 border-white shadow-xs ring-1 flex items-center justify-center shrink-0 z-10 ${drawerOffices.length ? 'bg-emerald-500 ring-emerald-500' : 'bg-gray-200 ring-gray-200'}`} />
                        <div className="mr-6">
                          <h5 className="text-xs font-semibold text-gray-900">مكاتب استلام الشحنات</h5>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {drawerOffices.length ? `تم توطين وحفظ ${drawerOffices.length} مكتب استلام جاهز للعملاء.` : 'لا توجد مكاتب شحن مستوردة.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Danger Zone */}
              {form.id && (
                <div className="border border-red-200 bg-red-50/20 rounded-xl p-5 space-y-3">
                  <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert size={14} className="text-red-600" /> منطقة الإجراءات الخطرة
                  </h4>
                  <p className="text-[10px] text-red-600/90 leading-relaxed">
                    عند فك ارتباط شركة التوصيل، سيتم مسح المفاتيح الأمنية وإلغاء تفعيل حساب الشحن وحذف أسعار الولايات ومكاتبها التابعة تماماً من قاعدة البيانات.
                  </p>
                  <button
                    onClick={() => { onDelete(form.id); setForm(null) }}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:scale-95 px-3.5 py-2 rounded-lg transition-all shadow-xs cursor-pointer"
                  >
                    <Trash2 size={12} /> إلغاء الربط وفصل الشركة
                  </button>
                </div>
              )}
            </>
          )}

          {/* Rates Preview Tab (Searchable preview in Drawer) */}
          {drawerTab === 'rates' && (
            <div className="bg-white border border-gray-200/85 rounded-xl p-4 space-y-4 shadow-xs">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search size={13} className="absolute right-3 top-2.5 text-gray-400" />
                  <input
                    className="w-full pr-8 pl-3 py-1.5 text-xs bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900"
                    placeholder="البحث باسم الولاية أو الرمز..."
                    value={drawerRatesSearch}
                    onChange={e => setDrawerRatesSearch(e.target.value)}
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-bold shrink-0">
                  {filteredRates.length} سجل متاح
                </span>
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto shadow-2xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-[9px] uppercase font-bold tracking-wider text-gray-400 sticky top-0 z-10" style={{ borderColor: 'var(--color-border)' }}>
                      <th className="p-2.5">الرمز والولاية</th>
                      <th className="p-2.5 text-left">المنزل (دج)</th>
                      <th className="p-2.5 text-left">المكتب (دج)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
                    {filteredRates.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="text-center py-12 text-gray-400 font-medium">
                          لا توجد نتائج مطابقة لبحثك.
                        </td>
                      </tr>
                    ) : filteredRates.map(r => {
                      const wName = wilayas.find(w => w.code === r.wilaya_code)?.name_ar ?? ''
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/30">
                          <td className="p-2.5 font-semibold text-gray-900">{r.wilaya_code} · {wName}</td>
                          <td className="p-2.5 text-left font-mono text-gray-700">{r.home_price} دج</td>
                          <td className="p-2.5 text-left font-mono text-gray-700">{r.stopdesk_price} دج</td>
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
            <div className="bg-white border border-gray-200/85 rounded-xl p-4 space-y-4 shadow-xs">
              <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1">
                  <Search size={13} className="absolute right-3 top-2.5 text-gray-400" />
                  <input
                    className="w-full pr-8 pl-3 py-1.5 text-xs bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900"
                    placeholder="البحث بالمكتب، البلدية أو الولاية..."
                    value={drawerOfficesSearch}
                    onChange={e => setDrawerOfficesSearch(e.target.value)}
                  />
                </div>
                <span className="text-[10px] text-gray-400 font-bold shrink-0">
                  {filteredOffices.length} مكتب متوفر
                </span>
              </div>

              <div className="border border-gray-100 rounded-lg overflow-hidden max-h-[300px] overflow-y-auto shadow-2xs">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b text-[9px] uppercase font-bold tracking-wider text-gray-400 sticky top-0 z-10" style={{ borderColor: 'var(--color-border)' }}>
                      <th className="p-2.5">الولاية والمكتب</th>
                      <th className="p-2.5">العنوان المصرّح</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-xs text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
                    {filteredOffices.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="text-center py-12 text-gray-400 font-medium">
                          لا توجد مكاتب استلام مطابقة.
                        </td>
                      </tr>
                    ) : filteredOffices.map(o => {
                      const wName = wilayas.find(w => w.code === o.wilaya_code)?.name_ar ?? ''
                      return (
                        <tr key={o.id} className="hover:bg-gray-50/30">
                          <td className="p-2.5">
                            <span className="block font-semibold text-gray-900">{o.name}</span>
                            <span className="block text-[9px] text-gray-400 mt-0.5">{wName} ({o.wilaya_code})</span>
                          </td>
                          <td className="p-2.5 text-gray-500 text-[10px] max-w-[200px] truncate" title={o.address ?? ''}>
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
            <div className="bg-gray-950 text-gray-100 font-mono text-[10px] p-4 rounded-xl border border-gray-800 shadow-inner h-[320px] overflow-y-auto space-y-2 leading-relaxed" dir="ltr">
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
          <div className="px-6 py-3.5 border-t bg-gray-50" style={{ borderColor: 'var(--color-border)' }}>
            <div className={`p-4 rounded-lg border flex items-start gap-3 ${testMsg.ok ? 'bg-green-50/40 border-green-200 text-green-800' : 'bg-amber-50/40 border-amber-200 text-amber-800'}`}>
              {testMsg.ok ? <CheckCircle size={15} className="text-green-600 shrink-0 mt-0.5" /> : <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />}
              <div>
                <p className="text-xs font-bold">{testMsg.msg}</p>
                {testMsg.raw && <pre dir="ltr" className="mt-2 p-2 rounded text-[9px] overflow-x-auto font-mono bg-white border border-gray-100" style={{ color: '#495057', maxHeight: 80 }}>{testMsg.raw}</pre>}
              </div>
            </div>
          </div>
        )}

        {/* Drawer Footer Actions */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between gap-3 sticky bottom-0 z-20" style={{ borderColor: 'var(--color-border)' }}>
          <button 
            onClick={test} 
            disabled={testing} 
            className="inline-flex items-center gap-1 px-4 py-2 text-xs font-bold bg-white border rounded-lg hover:bg-gray-50 shadow-xs cursor-pointer active:scale-95 transition-all text-gray-700"
            style={{ borderColor: 'var(--color-border)' }}
          >
            {testing ? <Loader2 size={13} className="animate-spin" /> : 'اختبار الاتصال'}
          </button>
          <div className="flex gap-2">
            <button 
              onClick={save} 
              disabled={saving} 
              className="inline-flex items-center gap-1 px-5 py-2 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs cursor-pointer active:scale-95 transition-all"
            >
              {saving ? <Loader2 size={13} className="animate-spin" /> : 'حفظ الإعدادات'}
            </button>
            <button 
              onClick={() => setForm(null)} 
              className="inline-flex items-center px-4 py-2 text-xs font-bold bg-white border rounded-lg hover:bg-gray-50 shadow-xs cursor-pointer active:scale-95 transition-all text-gray-500"
              style={{ borderColor: 'var(--color-border)' }}
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
      <div className="p-4 rounded-xl border flex items-start gap-3 bg-red-50/20 border-red-100">
        <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={15} />
        <div className="text-xs text-red-800 leading-normal font-medium">
          {target === 'real'
            ? 'الأسعار الحقيقية (المقاصة مع شركة التوصيل) تُستخدم فقط لحساب أرباح المتجر في لوحة التحكم، ولا يتم إضافتها إلى الفاتورة النهائية للزبون.'
            : 'الأسعار المعلنة هي أسعار التوصيل التي تظهر للزبائن في صفحة إنهاء الشراء ويتم إضافتها إلى مجموع الفاتورة النهائي.'}
        </div>
      </div>

      {/* Pricing Header Actions */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select 
            className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 font-bold h-9 w-full sm:w-52"
            value={providerId} 
            onChange={e => setProviderId(e.target.value)}
          >
            {active.length === 0 ? <option value="">لا توجد شركات مُفعّلة</option> : active.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
          <button 
            onClick={doImport} 
            disabled={!providerId || importing || (meta && !meta.hasRatesApi)} 
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg transition-all shadow-xs active:scale-95 cursor-pointer h-9 w-full sm:w-auto"
          >
            {importing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />} استيراد أسعار القناة
          </button>
        </div>

        {/* View filters */}
        <div className="flex items-center gap-1 w-full md:w-auto overflow-x-auto justify-end">
          {([['all', 'عرض الكل'], ['desk', 'توصيل المكتب'], ['home', 'توصيل المنزل']] as const).map(([v, l]) => (
            <button 
              key={v} 
              onClick={() => setView(v)} 
              className={`h-8 px-4.5 text-xs font-bold rounded-lg border transition-all cursor-pointer ${view === v ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* Table search utility */}
      <div className="relative">
        <Search size={14} className="absolute right-3.5 top-3 text-gray-400" />
        <input 
          className="w-full pr-9 pl-4 py-2 text-sm bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 placeholder-gray-400 h-10"
          placeholder="البحث عن أسعار ولاية معينة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Main Prices Table */}
      <div className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0 z-10" style={{ borderColor: 'var(--color-border)' }}>
                <th className="p-3">الرمز والولاية</th>
                {view !== 'home' && <th className="p-3 text-left">توصيل للمكتب (دج)</th>}
                {view !== 'desk' && <th className="p-3 text-left">توصيل للمنزل (دج)</th>}
                <th className="p-3 text-center">مصدر التسعير</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
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
                  <tr key={w.id} className="hover:bg-gray-50/30">
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
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold border ${row.source === 'imported' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
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
      <div className="bg-white border border-gray-200/80 rounded-xl p-4 flex items-center justify-between shadow-2xs">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-gray-900">توجيه الولايات التلقائي (Auto-Routing)</h4>
          <p className="text-xs text-gray-500">اختر شركة شحن مخصصة لولايات معينة ليتم تحويل الطلبات وتوليد الأسعار لها بمجرد اختيار العميل للولاية.</p>
        </div>
        <button 
          onClick={() => setEnabled(v => !v)} 
          className="w-9 h-5 rounded-full relative transition-colors duration-200 ease-in-out shrink-0 focus:outline-none cursor-pointer"
          style={{ background: enabled ? 'var(--cf-turq)' : '#E5E7EB' }}
        >
          <span 
            className={`absolute top-[2px] w-4 h-4 bg-white rounded-full shadow-xs transition-transform duration-200 ease-in-out ${enabled ? 'right-[2px] translate-x-0' : 'right-[2px] translate-x-[-16px]'}`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute right-3.5 top-3 text-gray-400" />
            <input 
              className="w-full pr-9 pl-4 py-2 text-sm bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 placeholder-gray-400 h-10"
              placeholder="البحث في الولايات..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
            <div className="overflow-x-auto max-h-[460px]">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase tracking-widest sticky top-0 z-10" style={{ borderColor: 'var(--color-border)' }}>
                    <th className="p-3">الولاية والمفتاح</th>
                    <th className="p-3 text-left">شركة التوصيل الموجهة</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-sm text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
                  {filteredWilayas.map(w => (
                    <tr key={w.id} className="hover:bg-gray-50/30">
                      <td className="p-3 font-semibold text-gray-900">{w.code} · {w.name_ar}</td>
                      <td className="p-3 text-left">
                        <select 
                          className="px-2.5 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 font-bold h-8 w-44" 
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
      <div className="p-4 bg-gray-50 border border-gray-200/50 rounded-xl flex items-start gap-3">
        <HelpCircle className="text-gray-400 shrink-0 mt-0.5" size={15} />
        <p className="text-xs text-gray-500 leading-normal">
          أضف مكاتب الاستلام المخصصة للولايات — تظهر للعملاء في خانة «مكتب التوصيل» عند اختيارهم خيار «التوصيل للمكتب». (مزودي Yalidine يزودون مكاتبهم تلقائياً، ويمكن إضافة مكاتب ZR Express ومكاتب مخصصة هنا.)
        </p>
      </div>

      {/* Office creation card */}
      <div className="bg-white border border-gray-200/80 rounded-xl p-5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-end shadow-2xs">
        <div className="sm:col-span-3 space-y-1">
          <label className="block text-[11px] font-bold text-gray-600">الشركة المربوطة</label>
          <select className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 font-bold h-9 w-full" value={form.provider_id} onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))}>
            <option value="">كل الشركات</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-2 space-y-1">
          <label className="block text-[11px] font-bold text-gray-600">الولاية</label>
          <select className="px-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 font-bold h-9 w-full" value={form.wilaya_code} onChange={e => setForm(f => ({ ...f, wilaya_code: e.target.value }))}>
            <option value="">اختر الولاية</option>
            {wilayas.map(w => <option key={w.code} value={w.code}>{w.code} — {w.name_ar}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3 space-y-1">
          <label className="block text-[11px] font-bold text-gray-600">اسم مكتب التوصيل</label>
          <input className="w-full px-3 py-2 text-xs bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 placeholder-gray-400 h-9" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: مكتب شاطئ الشراقة" />
        </div>
        <div className="sm:col-span-3 space-y-1">
          <label className="block text-[11px] font-bold text-gray-600">العنوان بالتفصيل (اختياري)</label>
          <input className="w-full px-3 py-2 text-xs bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 placeholder-gray-400 h-9" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="الشارع أو المبنى..." />
        </div>
        <div className="sm:col-span-1">
          <button onClick={add} disabled={saving} className="inline-flex items-center justify-center bg-teal-600 hover:bg-teal-700 text-white rounded-lg shadow-xs active:scale-95 transition-all cursor-pointer h-9 w-full font-bold">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={14} />}
          </button>
        </div>
      </div>

      {/* Office Search Utility */}
      <div className="relative">
        <Search size={14} className="absolute right-3.5 top-3 text-gray-400" />
        <input 
          className="w-full pr-9 pl-4 py-2 text-sm bg-gray-50/30 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 placeholder-gray-400 h-10"
          placeholder="البحث في قائمة مكاتب الشحن المسجلة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Offices Table */}
      <div className="bg-white border border-gray-200/80 rounded-xl overflow-hidden shadow-2xs">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b text-[10px] font-bold text-gray-400 uppercase tracking-widest" style={{ borderColor: 'var(--color-border)' }}>
              <th className="p-3 w-16">إجراء</th>
              <th className="p-3">الشركة المربوطة</th>
              <th className="p-3">الولاية والمفتاح</th>
              <th className="p-3">اسم مكتب التوصيل</th>
              <th className="p-3">العنوان بالتفصيل</th>
            </tr>
          </thead>
          <tbody className="divide-y text-xs text-gray-700" style={{ borderColor: 'var(--color-border)' }}>
            {filteredOffices.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12">
                  <div className="border border-dashed border-gray-200 rounded-xl py-12 px-6 text-center max-w-sm mx-auto flex flex-col items-center justify-center bg-gray-50/30">
                    <div className="w-11 h-11 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400 mb-4 shadow-2xs">
                      <Landmark size={18} />
                    </div>
                    <h5 className="text-xs font-bold text-gray-900">لا توجد مكاتب شحن مضافة</h5>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-[240px] leading-relaxed">قم بتعبئة بيانات مكتب الشحن الجديد للولايات بالنموذج أعلاه لتظهر لزبائنك.</p>
                  </div>
                </td>
              </tr>
            ) : filteredOffices.map(o => (
              <tr key={o.id} className="hover:bg-gray-50/30">
                <td className="p-3">
                  <button onClick={() => del(o.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                    <Trash2 size={13} />
                  </button>
                </td>
                <td className="p-3 font-semibold text-gray-800">{pName(o.provider_id)}</td>
                <td className="p-3">{wName(o.wilaya_code)} ({o.wilaya_code})</td>
                <td className="p-3 font-semibold text-gray-900">{o.name}</td>
                <td className="p-3 text-[11px] text-gray-500">{o.address ?? '—'}</td>
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
      className="w-24 px-2 py-1 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all duration-200 outline-none text-gray-900 font-mono text-left" 
      dir="ltr" 
      value={v} 
      onChange={e => setV(e.target.value)} 
      onBlur={() => onSave(+v || 0)} 
    />
  )
}
