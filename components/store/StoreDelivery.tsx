'use client'
// ============================================================
// STORE delivery module — couriers + prices management UI.
// Store-owned, NO Confirmili coupling. Single source of truth for
// delivery_providers / delivery_declared_prices / delivery_real_prices
// / wilaya_company_map. All courier calls go through /api/delivery/*
// (credentials never touch the client). See lib/delivery/README.md.
// ============================================================
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PROVIDERS, providerMeta, validateCreds, type ProviderType } from '@/lib/delivery/types'
import { Trash2, Link2, RefreshCw, CheckCircle, X, Download, AlertTriangle, Loader2, Plus } from 'lucide-react'

const SUB_TABS = ['شركة التوصيل', 'أسعار التوصيل المعلنة', 'الولاية ⇄ شركة التوصيل', 'أسعار التوصيل الحقيقية', 'مكاتب التوصيل']

type Provider = { id: string; provider_type: ProviderType; display_name: string; is_active: boolean; is_automatic: boolean; from_wilaya_code: string; credentials: Record<string, string> }
type Wilaya = { id: number; code: string; name_ar: string }
type PriceRow = { home: number; desk: number; source: string }

export default function StoreDelivery({ storeId, setToast }: { storeId: string; setToast: (m: string) => void }) {
  const [tab, setTab] = useState(0)
  const [providers, setProviders] = useState<Provider[]>([])
  const [wilayas, setWilayas] = useState<Wilaya[]>([])
  const [loading, setLoading] = useState(true)

  const loadProviders = useCallback(async () => {
    const res = await fetch('/api/delivery/providers')
    if (res.ok) { const d = await res.json(); setProviders(d.providers ?? []) }
  }, [])

  const loadWilayas = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('wilayas').select('id,code,name_ar').order('id')
    setWilayas((data ?? []) as Wilaya[])
  }, [])

  useEffect(() => { (async () => { await Promise.all([loadProviders(), loadWilayas()]); setLoading(false) })() }, [loadProviders, loadWilayas])

  return (
    <div>
      <div className="tab-bar">
        {SUB_TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`tab-item ${tab === i ? 'active' : ''}`}>{t}</button>
        ))}
      </div>

      {tab === 0 && <ProvidersTab providers={providers} reload={loadProviders} setToast={setToast} />}
      {tab === 1 && <PricesTab target="declared" providers={providers} wilayas={wilayas} storeId={storeId} setToast={setToast} />}
      {tab === 2 && <RoutingTab providers={providers} wilayas={wilayas} storeId={storeId} setToast={setToast} />}
      {tab === 3 && <PricesTab target="real" providers={providers} wilayas={wilayas} storeId={storeId} setToast={setToast} />}
      {tab === 4 && <OfficesTab providers={providers} wilayas={wilayas} storeId={storeId} setToast={setToast} />}

      {loading && <div className="flex justify-center py-10"><Loader2 className="animate-spin" style={{color:'var(--cf-turq)'}}/></div>}
    </div>
  )
}

// ── Sub-tab 0: providers — JustSell-style integration cards ──
const PROVIDER_DESC: Record<string, string> = {
  zrexpress: 'خدمة توصيل سريعة وموثوقة عبر ZR Express.',
  yalidine:  'مزوّد التوصيل واللوجستيك الرائد في الجزائر.',
  ecotrack:  'تكامل التوصيل والتتبع عبر حسابات Ecotrack.',
  noest:     'لوجستيك وشحن احترافي عبر منصّة Noest.',
  maystro:   'خدمات توصيل احترافية مع تتبّع كامل.',
}
const PROVIDER_ICON_BG: Record<string, string> = {
  zrexpress: '#FEE2E2', yalidine: '#FEF3C7', ecotrack: '#DCFCE7', noest: '#EDE9FE', maystro: '#DBEAFE',
}

function ProvidersTab({ providers, reload, setToast }: { providers: Provider[]; reload: () => Promise<void>; setToast: (m: string) => void }) {
  const [form, setForm] = useState<any | null>(null)
  const [syncing, setSyncing] = useState<string | null>(null)

  const toggleActive = async (p: Provider) => {
    await fetch('/api/delivery/providers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, is_active: !p.is_active }) })
    reload()
  }
  const remove = async (id: string) => {
    if (!confirm('فصل شركة التوصيل؟')) return
    await fetch(`/api/delivery/providers?id=${id}`, { method: 'DELETE' })
    setToast('تم فصل الشركة'); reload()
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
    } catch { setToast('تعذّرت المزامنة') }
    finally { setSyncing(null) }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        اربط متجرك بشركة التوصيل، ثم فعّل «مزامنة الأسعار» لاستيرادها تلقائياً. عند تأكيد الطلب يمكن إرساله تلقائياً للشركة.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {PROVIDERS.map(meta => {
          const p = providers.find(x => x.provider_type === meta.type)
          const connected = !!p
          return (
            <div key={meta.type}
              className="relative rounded-2xl border bg-white p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
              style={{ borderColor: 'var(--color-border)' }}>
              {connected && (
                <button onClick={() => remove(p!.id)} className="absolute top-3 left-3 p-1 rounded hover:bg-red-50" title="فصل">
                  <Trash2 size={13} style={{ color: '#DC3545' }} />
                </button>
              )}
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: PROVIDER_ICON_BG[meta.type] ?? '#F1F3F5' }}>
                  {meta.logo}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm leading-tight" style={{ color: 'var(--color-text-primary)' }}>{meta.label}</p>
                  <p className="text-[11px] leading-snug mt-0.5 line-clamp-2" style={{ color: 'var(--color-text-muted)' }}>{PROVIDER_DESC[meta.type] ?? ''}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 mt-auto border-t" style={{ borderColor: 'var(--color-border)' }}>
                {connected ? (
                  <button onClick={() => setForm({ id: p!.id, provider_type: p!.provider_type, display_name: p!.display_name, json: '', is_automatic: p!.is_automatic, from_wilaya_code: p!.from_wilaya_code })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg"
                    style={{ background: p!.is_active ? '#DCFCE7' : '#F1F3F5', color: p!.is_active ? '#16A34A' : '#6C757D' }}>
                    <CheckCircle size={12} /> {p!.is_active ? 'متصل — إدارة' : 'موقوف — إدارة'}
                  </button>
                ) : (
                  <button onClick={() => setForm({ provider_type: meta.type, json: '', is_automatic: false, from_wilaya_code: '16' })}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg" style={{ background: '#E7F0FF', color: '#0D6EFD' }}>
                    <Link2 size={12} /> ربط
                  </button>
                )}
                <button
                  onClick={() => connected ? toggleActive(p!) : setForm({ provider_type: meta.type, json: '', is_automatic: false, from_wilaya_code: '16' })}
                  className="w-10 h-5 rounded-full relative transition-colors shrink-0"
                  style={{ background: connected && p!.is_active ? '#0D6EFD' : '#DEE2E6' }} title={connected ? (p!.is_active ? 'مفعّل' : 'موقوف') : 'غير مربوط'}>
                  <span className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ [connected && p!.is_active ? 'right' : 'left']: '2px' } as any} />
                </button>
              </div>

              {connected && meta.hasRatesApi && (
                <button onClick={() => sync(p!)} disabled={syncing === p!.id}
                  className="inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold h-8 rounded-lg border disabled:opacity-60"
                  style={{ borderColor: 'var(--color-border)', color: '#0D6EFD' }}>
                  {syncing === p!.id ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  مزامنة الأسعار تلقائياً
                </button>
              )}
            </div>
          )
        })}
      </div>

      {form && <ProviderModal form={form} setForm={setForm} onSaved={reload} setToast={setToast} />}
    </div>
  )
}

// ── Sub-tab 4: delivery offices (stopdesk pickup points) ─────
function OfficesTab({ providers, wilayas, storeId, setToast }: { providers: Provider[]; wilayas: Wilaya[]; storeId: string; setToast: (m: string) => void }) {
  const [offices, setOffices] = useState<any[]>([])
  const [form, setForm] = useState({ provider_id: '', wilaya_code: '', name: '', address: '' })
  const [saving, setSaving] = useState(false)
  const LBL = 'block text-[11px] mb-1 font-medium'
  const lblStyle = { color: 'var(--color-text-muted)' } as const

  const load = useCallback(async () => {
    const res = await fetch(`/api/store/delivery/offices?storeId=${storeId}`)
    if (res.ok) setOffices((await res.json()).offices ?? [])
  }, [storeId])
  useEffect(() => { load() }, [load])

  const add = async () => {
    if (!form.wilaya_code || !form.name.trim()) { setToast('اختر الولاية واكتب اسم المكتب'); return }
    setSaving(true)
    const res = await fetch('/api/store/delivery/offices', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, provider_id: form.provider_id || null, wilaya_code: form.wilaya_code, name: form.name.trim(), address: form.address.trim() || undefined }),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setToast(d.error ?? 'تعذّر الحفظ'); return }
    setForm(f => ({ ...f, name: '', address: '' })); setToast('تمت إضافة المكتب'); load()
  }
  const del = async (id: string) => {
    await fetch('/api/store/delivery/offices', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId, id }) })
    load()
  }
  const wName = (code: string) => wilayas.find(w => w.code === code)?.name_ar ?? code
  const pName = (id?: string) => id ? (providers.find(p => p.id === id)?.display_name ?? '—') : 'كل الشركات'

  return (
    <div className="space-y-4">
      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
        أضِف مكاتب الاستلام لكل ولاية — تظهر للزبون في خانة «مكتب التوصيل» عند اختيار «التوصيل للمكتب». (شركة Yalidine تجلب مكاتبها تلقائياً، أمّا ZR وغيرها فتُدخل مكاتبها هنا.)
      </p>

      <div className="card p-4 grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
        <div className="sm:col-span-3">
          <label className={LBL} style={lblStyle}>الشركة</label>
          <select className="input text-sm w-full" value={form.provider_id} onChange={e => setForm(f => ({ ...f, provider_id: e.target.value }))}>
            <option value="">كل الشركات</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={LBL} style={lblStyle}>الولاية</label>
          <select className="input text-sm w-full" value={form.wilaya_code} onChange={e => setForm(f => ({ ...f, wilaya_code: e.target.value }))}>
            <option value="">اختر</option>
            {wilayas.map(w => <option key={w.code} value={w.code}>{w.code} — {w.name_ar}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className={LBL} style={lblStyle}>اسم المكتب</label>
          <input className="input text-sm w-full" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مكتب ZR وسط المدينة" />
        </div>
        <div className="sm:col-span-2">
          <label className={LBL} style={lblStyle}>العنوان (اختياري)</label>
          <input className="input text-sm w-full" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
        </div>
        <div className="sm:col-span-1">
          <button onClick={add} disabled={saving} className="btn btn-primary btn-sm w-full h-9 gap-1"><Plus size={13} /></button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <table className="data-table">
          <thead><tr>{['', 'العنوان', 'المكتب', 'الولاية', 'الشركة'].map(h => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {offices.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>لا توجد مكاتب — أضف مكاتب الشركة لكل ولاية</td></tr>
            ) : offices.map(o => (
              <tr key={o.id}>
                <td><button onClick={() => del(o.id)} className="p-1.5 rounded hover:bg-red-50" title="حذف"><Trash2 size={12} style={{ color: '#DC3545' }} /></button></td>
                <td className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{o.address ?? '—'}</td>
                <td className="font-medium text-sm">{o.name}</td>
                <td className="text-sm">{wName(o.wilaya_code)}</td>
                <td className="text-xs">{pName(o.provider_id)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ProviderModal({ form, setForm, onSaved, setToast }: { form: any; setForm: (f: any) => void; onSaved: () => Promise<void>; setToast: (m: string) => void }) {
  const meta = providerMeta(form.provider_type)!
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; msg: string; raw?: string } | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const template = JSON.stringify(meta.credTemplate, null, 2)

  // Has the merchant typed real, fresh JSON? (Empty or masked = "keep existing".)
  const freshJson = (): string | null => {
    const txt = String(form.json ?? '').trim()
    if (!txt || txt.includes('•')) return null   // U+2022 = masked placeholder
    return txt
  }

  // Parse + validate fresh JSON → credentials object (Arabic errors).
  const parseCreds = (txt: string): Record<string, string> | null => {
    let creds: any
    try { creds = JSON.parse(txt) } catch { setErr('JSON غير صحيح'); return null }
    if (typeof creds !== 'object' || creds === null || Array.isArray(creds)) { setErr('JSON غير صحيح'); return null }
    const v = validateCreds(form.provider_type, creds)
    if (!v.ok) { setErr(`ينقص المفتاح: ${v.missing}`); return null }
    setErr(null)
    return creds
  }

  const test = async () => {
    const txt = freshJson()
    // Edit + no fresh paste → test the STORED (decrypted server-side) credentials.
    let body: any
    if (!txt) {
      if (!form.id) { setErr('أدخل بيانات الدخول (JSON)'); return }
      body = { provider_id: form.id }
    } else {
      const creds = parseCreds(txt); if (!creds) return
      body = { provider_type: form.provider_type, credentials: creds }
    }
    setTesting(true); setTestMsg(null)
    const res = await fetch('/api/delivery/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const d = await res.json(); setTestMsg({ ok: !!d.ok, msg: d.message, raw: d.debug?.response }); setTesting(false)
  }
  const save = async () => {
    const txt = freshJson()
    let creds: Record<string, string> = {}
    if (txt) {
      const parsed = parseCreds(txt); if (!parsed) return
      creds = parsed
    } else if (!form.id) {
      setErr('أدخل بيانات الدخول (JSON)'); return   // creating requires creds
    }
    // Edit with empty/masked json → creds {} → server keeps existing creds.
    setSaving(true)
    const res = await fetch('/api/delivery/providers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: form.id, provider_type: form.provider_type, display_name: form.display_name || meta.label, credentials: creds, is_automatic: !!form.is_automatic, from_wilaya_code: form.from_wilaya_code }) })
    setSaving(false)
    if (res.ok) { setToast('تم حفظ الشركة'); setForm(null); await onSaved() }
    else { const d = await res.json().catch(() => ({})); setErr(d.error ?? 'تعذّر الحفظ') }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setForm(null)} />
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[440px] max-h-[88vh] overflow-y-auto bg-white rounded-2xl shadow-2xl" dir="rtl">
        <div className="flex items-center justify-between px-5 py-3 border-b sticky top-0 bg-white" style={{ borderColor: 'var(--color-border)' }}>
          <h3 className="font-bold text-sm">{form.id ? 'تعديل شركة التوصيل' : 'إضافة شركة توصيل'}</h3>
          <button onClick={() => setForm(null)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16} /></button>
        </div>
        <div className="p-5 space-y-3">
          {/* Provider dropdown */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>الشركة</label>
            <select className="input text-sm w-full" value={form.provider_type}
              onChange={e => setForm((f: any) => ({ ...f, provider_type: e.target.value, json: f.id ? f.json : '' }))}>
              {PROVIDERS.map(p => <option key={p.type} value={p.type}>{p.logo} {p.label}</option>)}
            </select>
          </div>

          {/* Display name */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>الاسم</label>
            <input className="input text-sm w-full" placeholder="اسم الشركة المعروض" value={form.display_name ?? ''} onChange={e => setForm((f: any) => ({ ...f, display_name: e.target.value }))} />
          </div>

          {/* JSON credentials */}
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>API Credentials (JSON)</label>
            <textarea dir="ltr" rows={5} spellCheck={false}
              className="input text-xs w-full font-mono" style={{ height: 'auto', lineHeight: 1.6, resize: 'vertical' }}
              placeholder={template}
              value={form.json ?? ''} onChange={e => { setForm((f: any) => ({ ...f, json: e.target.value })); setErr(null) }} />
            {form.id && (
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                🔒 البيانات محفوظة ومشفّرة — اتركها فارغة للإبقاء عليها، أو الصق JSON جديداً لتغييرها.
              </p>
            )}
          </div>

          {/* Origin wilaya — only Yalidine uses it (from_wilaya_id for fees + parcel) */}
          {form.provider_type === 'yalidine' && (
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>ولاية الإرسال (المصدر)</label>
              <input className="input text-sm w-full" dir="ltr" placeholder="رمز الولاية، مثل 16" value={form.from_wilaya_code ?? '16'} onChange={e => setForm((f: any) => ({ ...f, from_wilaya_code: e.target.value }))} />
              <p className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>الولاية التي تُرسل منها الطرود — تستخدمها Yalidine لحساب السعر وإنشاء الشحنة.</p>
            </div>
          )}

          {/* Automatic */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={!!form.is_automatic} onChange={e => setForm((f: any) => ({ ...f, is_automatic: e.target.checked }))} className="w-4 h-4 accent-[#3CC6B9]" />
            التلقائية؟ <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>(إرسال الطلبات المؤكدة لهذه الشركة تلقائياً)</span>
          </label>

          {!meta.hasRatesApi && <p className="text-[11px]" style={{ color: '#C76B00' }}>⚠️ هذه الشركة لا توفّر استيراد الأسعار تلقائياً — أدخل الأسعار يدوياً.</p>}
          {err && <p className="text-xs flex items-center gap-1" style={{ color: '#DC3545' }}><AlertTriangle size={12} />{err}</p>}
          {testMsg && (
            <div>
              <p className="text-xs flex items-center gap-1" style={{ color: testMsg.ok ? '#198754' : '#DC3545' }}>{testMsg.ok ? <CheckCircle size={12} /> : <AlertTriangle size={12} />}{testMsg.msg}</p>
              {testMsg.raw && <pre dir="ltr" className="mt-1 p-2 rounded text-[10px] overflow-x-auto" style={{ background: '#F8F9FA', color: '#495057', maxHeight: 80 }}>{testMsg.raw}</pre>}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={test} disabled={testing} className="btn btn-sm" style={{ border: '1px solid var(--cf-turq)', color: '#0A6E66' }}>{testing ? <Loader2 size={13} className="animate-spin" /> : 'اختبار الاتصال'}</button>
            <button onClick={save} disabled={saving} className="btn btn-sm flex-1" style={{ background: '#22C55E', color: '#fff' }}>{saving ? <Loader2 size={13} className="animate-spin" /> : 'حفظ'}</button>
            <button onClick={() => setForm(null)} className="btn btn-sm flex-1" style={{ background: '#FDECEA', color: '#E23024' }}>إلغاء</button>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Price sub-tabs (declared / real) ─────────────────────────
function PricesTab({ target, providers, wilayas, storeId, setToast }: { target: 'declared' | 'real'; providers: Provider[]; wilayas: Wilaya[]; storeId: string; setToast: (m: string) => void }) {
  const table = target === 'real' ? 'delivery_real_prices' : 'delivery_declared_prices'
  const active = providers.filter(p => p.is_active)
  const [providerId, setProviderId] = useState('')
  const [prices, setPrices] = useState<Record<string, PriceRow>>({})
  const [view, setView] = useState<'all' | 'desk' | 'home'>('all')
  const [importing, setImporting] = useState(false)

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

  return (
    <div className="space-y-3">
      <div className="p-3 rounded-lg border flex items-start gap-2" style={{ borderColor: '#E23024', background: '#FDECEA' }}>
        <AlertTriangle size={14} style={{ color: '#E23024', flexShrink: 0, marginTop: 1 }} />
        <p className="text-xs" style={{ color: '#E23024' }}>
          {target === 'real'
            ? 'الأسعار الحقيقية تُستخدم لحساب الأرباح فقط، ولا تُضاف إلى مجموع الطلب.'
            : 'الأسعار المعلنة تظهر للزبون وتُضاف إلى مجموع الطلب.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select className="input text-sm" style={{ width: 200 }} value={providerId} onChange={e => setProviderId(e.target.value)}>
          {active.length === 0 ? <option value="">لا توجد شركات مُفعّلة</option> : active.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
        </select>
        <button onClick={doImport} disabled={!providerId || importing || (meta && !meta.hasRatesApi)} className="btn btn-primary btn-sm gap-1.5">
          {importing ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}استيراد الأسعار
        </button>
        {meta && !meta.hasRatesApi && <span className="text-[11px]" style={{ color: '#C76B00' }}>الاستيراد التلقائي غير متاح — أدخل يدوياً</span>}
        <div className="flex gap-1 mr-auto">
          {([['all', 'الكل'], ['desk', 'المكتب'], ['home', 'المنزل']] as const).map(([v, l]) => (
            <button key={v} onClick={() => setView(v)} className="h-7 px-3 text-xs rounded-full border" style={{ borderColor: 'var(--cf-turq)', background: view === v ? 'var(--cf-teal)' : '#fff', color: view === v ? '#fff' : '#0A6E66' }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: 460, overflowY: 'auto' }}>
          <table className="data-table">
            <thead><tr>
              <th>الولاية</th>
              {view !== 'home' && <th>المكتب (دج)</th>}
              {view !== 'desk' && <th>المنزل (دج)</th>}
              <th>المصدر</th>
            </tr></thead>
            <tbody>
              {wilayas.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-8 text-sm" style={{ color: 'var(--color-text-muted)' }}>جارٍ التحميل…</td></tr>
              ) : wilayas.map(w => {
                const row = prices[w.code]
                return (
                  <tr key={w.id}>
                    <td className="text-sm font-medium">{w.code} · {w.name_ar}</td>
                    {view !== 'home' && <td><PriceInput value={row?.desk ?? 0} onSave={v => savePrice(w.code, 'desk', v)} /></td>}
                    {view !== 'desk' && <td><PriceInput value={row?.home ?? 0} onSave={v => savePrice(w.code, 'home', v)} /></td>}
                    <td>{row ? <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: row.source === 'imported' ? '#E0F5F2' : '#FFF3CD', color: row.source === 'imported' ? '#0A6E66' : '#997404' }}>{row.source === 'imported' ? 'مستورد' : 'يدوي'}</span> : '—'}</td>
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

// ── Sub-tab 2: wilaya → provider routing ─────────────────────
function RoutingTab({ providers, wilayas, storeId, setToast }: { providers: Provider[]; wilayas: Wilaya[]; storeId: string; setToast: (m: string) => void }) {
  const [enabled, setEnabled] = useState(false)
  const [map, setMap] = useState<Record<string, string>>({})
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
    if (!providerId) { await sb.from('wilaya_company_map').delete().eq('store_id', storeId).eq('wilaya_code', code); return }
    await sb.from('wilaya_company_map').upsert({ store_id: storeId, wilaya_code: code, provider_id: providerId }, { onConflict: 'store_id,wilaya_code' })
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between card p-3">
        <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>تخصيص شركة توصيل لكل ولاية (التوجيه التلقائي)</span>
        <button onClick={() => setEnabled(v => !v)} className="w-9 h-5 rounded-full flex items-center transition-colors" style={{ background: enabled ? 'var(--cf-turq)' : '#DEE2E6' }}>
          <span className="w-4 h-4 bg-white rounded-full shadow transition-transform" style={{ transform: enabled ? 'translateX(-2px)' : 'translateX(-18px)' }} />
        </button>
      </div>
      {enabled && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto" style={{ maxHeight: 460, overflowY: 'auto' }}>
            <table className="data-table">
              <thead><tr><th>الولاية</th><th>شركة التوصيل</th></tr></thead>
              <tbody>
                {wilayas.map(w => (
                  <tr key={w.id}>
                    <td className="text-sm font-medium">{w.code} · {w.name_ar}</td>
                    <td>
                      <select className="input text-xs" value={map[w.code] ?? ''} onChange={e => assign(w.code, e.target.value)}>
                        <option value="">الافتراضية</option>
                        {active.map(p => <option key={p.id} value={p.id}>{p.display_name}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ── price input that saves on blur ───────────────────────────
function PriceInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value))
  useEffect(() => { setV(String(value)) }, [value])
  return <input type="number" className="input text-xs w-24" dir="ltr" value={v} onChange={e => setV(e.target.value)} onBlur={() => onSave(+v || 0)} />
}
