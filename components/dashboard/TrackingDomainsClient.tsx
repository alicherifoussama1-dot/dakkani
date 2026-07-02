'use client'
// ============================================================
// Settings → Tracking & Domains
// Two simple sections: a reusable Tracking Library (grouped by
// provider) and Custom Domains. CRUD runs through the browser
// Supabase client (RLS-scoped to the owner). Test Connection
// and domain Verify use server routes.
// ============================================================
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Star, Globe, CheckCircle2, AlertTriangle, XCircle, Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { PROVIDER_LIST, getProvider, type ProviderKey } from '@/lib/tracking/registry'

interface Integration {
  id: string; store_id: string; provider: ProviderKey; name: string; pixel_id: string
  credentials: Record<string, any>; is_active: boolean; is_default: boolean
  last_test_at: string | null; last_test_status: 'healthy' | 'warning' | 'error' | null
}
interface Domain {
  id: string; store_id: string; hostname: string
  status: 'pending' | 'verified' | 'ssl_active' | 'error'
  verification: Record<string, any>; is_default: boolean
}
interface Props { storeId: string; storeSlug: string; schemaReady?: boolean; integrations: Integration[]; domains: Domain[] }

const HEALTH = {
  healthy: { Icon: CheckCircle2, color: '#1D9E75', label: 'سليم' },
  warning: { Icon: AlertTriangle, color: '#E0A400', label: 'تحذير' },
  error:   { Icon: XCircle,       color: '#D93A3A', label: 'خطأ' },
} as const

function healthOf(i: Integration): keyof typeof HEALTH {
  if (!i.is_active) return 'warning'
  if (i.last_test_status === 'error') return 'error'
  if (i.last_test_status === 'healthy') return 'healthy'
  return 'warning'
}

const DOMAIN_STATUS = {
  pending:    { color: '#E0A400', label: 'بانتظار التحقق' },
  verified:   { color: '#1D9E75', label: 'تم التحقق' },
  ssl_active: { color: '#1D9E75', label: 'SSL مفعّل' },
  error:      { color: '#D93A3A', label: 'خطأ' },
} as const

export default function TrackingDomainsClient({ storeId, storeSlug, schemaReady = true, integrations, domains }: Props) {
  const router = useRouter()
  const sb = createClient()

  // ── Integration modal state ──
  const blank = { id: '', provider: 'meta' as ProviderKey, name: '', pixel_id: '', credentials: {} as Record<string, any>, is_active: true }
  const [intOpen, setIntOpen] = useState(false)
  const [intForm, setIntForm] = useState(blank)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState<string | null>(null)

  // ── Domain modal state ──
  const [domOpen, setDomOpen] = useState(false)
  const [domHost, setDomHost] = useState('')
  const [domBusy, setDomBusy] = useState(false)

  const provMeta = getProvider(intForm.provider)!

  const openNew = () => { setIntForm(blank); setIntOpen(true) }
  const openEdit = (i: Integration) => {
    setIntForm({ id: i.id, provider: i.provider, name: i.name, pixel_id: i.pixel_id, credentials: i.credentials ?? {}, is_active: i.is_active })
    setIntOpen(true)
  }

  const saveIntegration = async () => {
    if (!intForm.pixel_id || !intForm.name) return
    setSaving(true)
    const payload = {
      store_id: storeId, provider: intForm.provider, name: intForm.name,
      pixel_id: intForm.pixel_id, credentials: intForm.credentials, is_active: intForm.is_active,
    }
    if (intForm.id) await sb.from('tracking_integrations').update(payload).eq('id', intForm.id)
    else await sb.from('tracking_integrations').insert(payload)
    setSaving(false); setIntOpen(false); router.refresh()
  }

  const removeIntegration = async (id: string) => {
    if (!confirm('حذف هذا التتبع؟')) return
    await sb.from('tracking_integrations').delete().eq('id', id); router.refresh()
  }

  const toggleActive = async (i: Integration) => {
    await sb.from('tracking_integrations').update({ is_active: !i.is_active }).eq('id', i.id); router.refresh()
  }

  const setDefault = async (i: Integration) => {
    // Unset other defaults of same provider first (partial-unique index).
    await sb.from('tracking_integrations').update({ is_default: false }).eq('store_id', storeId).eq('provider', i.provider)
    await sb.from('tracking_integrations').update({ is_default: true }).eq('id', i.id); router.refresh()
  }

  const testConnection = async (i: Integration) => {
    setTesting(i.id)
    try {
      const res = await fetch('/api/tracking/test', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: i.provider, pixel_id: i.pixel_id, credentials: i.credentials ?? {} }),
      })
      const r = await res.json()
      await sb.from('tracking_integrations').update({ last_test_status: r.status, last_test_at: new Date().toISOString() }).eq('id', i.id)
      alert(r.message)
    } finally { setTesting(null); router.refresh() }
  }

  // ── Domains ──
  const addDomain = async () => {
    const host = domHost.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!host) return
    setDomBusy(true)
    const token = 'dakkani-verify-' + (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2))
    await sb.from('domains').insert({
      store_id: storeId, hostname: host, status: 'pending',
      verification: { method: 'txt', token, record_host: `_dakkani.${host}` },
    })
    setDomBusy(false); setDomOpen(false); setDomHost(''); router.refresh()
  }
  const verifyDomain = async (id: string) => {
    setDomBusy(true)
    const res = await fetch('/api/tracking/domains/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    const r = await res.json(); alert(r.message ?? ''); setDomBusy(false); router.refresh()
  }
  const removeDomain = async (id: string) => {
    if (!confirm('حذف هذا الدومين؟')) return
    await sb.from('domains').delete().eq('id', id); router.refresh()
  }
  const setDomainDefault = async (id: string) => {
    await sb.from('domains').update({ is_default: false }).eq('store_id', storeId)
    await sb.from('domains').update({ is_default: true }).eq('id', id); router.refresh()
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      <div className="mb-6">
        <h1 className="page-title">التتبع والدومينات</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          أنشئ بكسلات التتبع وأضف دوميناتك المخصّصة. كل منتج يختار تتبعه ودومينه بشكل مستقل.
        </p>
      </div>

      {!schemaReady && (
        <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <AlertTriangle size={18} style={{ color: '#B45309', marginTop: 2 }} />
          <div>
            <p className="font-bold text-sm" style={{ color: '#92400E' }}>يلزم تفعيل قاعدة البيانات</p>
            <p className="text-xs mt-1" style={{ color: '#92400E' }} dir="rtl">
              نظام التتبع والدومينات جاهز في التطبيق، لكن جداول قاعدة البيانات لم تُنشأ بعد. شغّل ملف الترحيل
              <span className="font-mono mx-1" dir="ltr">supabase/migrations/025_tracking_domains.sql</span>
              من Supabase SQL Editor ثم أعد تحميل الصفحة. بعدها ستعمل جميع الميزات مباشرة.
            </p>
          </div>
        </div>
      )}

      {/* ── TRACKING LIBRARY ── */}
      <section className="card mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>مكتبة التتبع</span>
          <button onClick={openNew} className="btn btn-primary btn-sm gap-1.5"><Plus size={14} />إضافة تتبع</button>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {PROVIDER_LIST.map(p => {
            const rows = integrations.filter(i => i.provider === p.key)
            return (
              <div key={p.key} className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />
                  <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>{p.labelAr}</span>
                  <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>({rows.length})</span>
                </div>
                {rows.length === 0 ? (
                  <p className="text-xs pr-4" style={{ color: 'var(--color-text-muted)' }}>لا يوجد تتبع بعد.</p>
                ) : (
                  <div className="space-y-1.5">
                    {rows.map(i => {
                      const h = HEALTH[healthOf(i)]
                      return (
                        <div key={i.id} className="flex items-center gap-2 flex-wrap rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-2, #F8F9FA)' }}>
                          <h.Icon size={15} style={{ color: h.color }} />
                          <span className="font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>{i.name}</span>
                          <span className="font-mono text-xs" dir="ltr" style={{ color: 'var(--color-text-muted)' }}>{i.pixel_id}</span>
                          {i.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#FEF3C7', color: '#B45309' }}>افتراضي</span>}
                          {!i.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F1F3F5', color: '#868E96' }}>معطّل</span>}
                          <div className="mr-auto flex items-center gap-1">
                            <button title="اختبار الاتصال" onClick={() => testConnection(i)} disabled={testing === i.id}
                              className="p-1.5 rounded hover:bg-black/5"><Zap size={13} style={{ color: testing === i.id ? '#ADB5BD' : 'var(--color-accent)' }} /></button>
                            <button title="افتراضي" onClick={() => setDefault(i)} className="p-1.5 rounded hover:bg-black/5"><Star size={13} style={{ color: i.is_default ? '#F59E0B' : '#CED4DA', fill: i.is_default ? '#F59E0B' : 'none' }} /></button>
                            <button title={i.is_active ? 'تعطيل' : 'تفعيل'} onClick={() => toggleActive(i)} className="text-xs px-2 py-1 rounded hover:bg-black/5" style={{ color: 'var(--color-text-secondary)' }}>{i.is_active ? 'تعطيل' : 'تفعيل'}</button>
                            <button title="تعديل" onClick={() => openEdit(i)} className="p-1.5 rounded hover:bg-black/5"><Pencil size={13} style={{ color: 'var(--color-accent)' }} /></button>
                            <button title="حذف" onClick={() => removeIntegration(i.id)} className="p-1.5 rounded hover:bg-black/5"><Trash2 size={13} style={{ color: '#D93A3A' }} /></button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── DOMAINS ── */}
      <section className="card">
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>الدومينات</span>
          <button onClick={() => setDomOpen(true)} className="btn btn-primary btn-sm gap-1.5"><Plus size={14} />إضافة دومين</button>
        </div>

        <div className="px-4 py-3 space-y-2">
          {/* Platform fallback — always present, never removable */}
          <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-2, #F8F9FA)' }}>
            <Globe size={15} style={{ color: '#1D9E75' }} />
            <span className="font-mono text-sm" dir="ltr" style={{ color: 'var(--color-text-primary)' }}>{storeSlug}.dakkani.app</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#DCFCE7', color: '#15803D' }}>دومين المنصّة (افتراضي تلقائي)</span>
          </div>

          {domains.map(d => {
            const s = DOMAIN_STATUS[d.status]
            return (
              <div key={d.id} className="rounded-lg px-3 py-2" style={{ background: 'var(--color-surface-2, #F8F9FA)' }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                  <span className="font-mono text-sm" dir="ltr" style={{ color: 'var(--color-text-primary)' }}>{d.hostname}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F1F3F5', color: s.color }}>{s.label}</span>
                  {d.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ background: '#FEF3C7', color: '#B45309' }}>افتراضي</span>}
                  <div className="mr-auto flex items-center gap-1">
                    {d.status !== 'verified' && d.status !== 'ssl_active' && (
                      <button onClick={() => verifyDomain(d.id)} disabled={domBusy} className="text-xs px-2 py-1 rounded btn-ghost">تحقّق</button>
                    )}
                    <button title="افتراضي" onClick={() => setDomainDefault(d.id)} className="p-1.5 rounded hover:bg-black/5"><Star size={13} style={{ color: d.is_default ? '#F59E0B' : '#CED4DA', fill: d.is_default ? '#F59E0B' : 'none' }} /></button>
                    <button title="حذف" onClick={() => removeDomain(d.id)} className="p-1.5 rounded hover:bg-black/5"><Trash2 size={13} style={{ color: '#D93A3A' }} /></button>
                  </div>
                </div>
                {(d.status === 'pending' || d.status === 'error') && d.verification?.token && (
                  <div className="mt-2 text-xs rounded-lg p-2.5" dir="ltr" style={{ background: '#fff', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}>
                    <p className="mb-1" dir="rtl" style={{ color: 'var(--color-text-muted)' }}>أضف سجل TXT التالي لدى مزوّد الدومين ثم اضغط «تحقّق»:</p>
                    <div className="font-mono">Type: TXT</div>
                    <div className="font-mono">Host: {d.verification.record_host}</div>
                    <div className="font-mono break-all">Value: {d.verification.token}</div>
                  </div>
                )}
              </div>
            )
          })}
          {domains.length === 0 && (
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>لا يوجد دومين مخصّص — يُستخدم دومين المنصّة تلقائياً.</p>
          )}
        </div>
      </section>

      {/* ── Integration modal ── */}
      {intOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setIntOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-base">{intForm.id ? 'تعديل التتبع' : 'إضافة تتبع'}</h3>
              <button onClick={() => setIntOpen(false)} className="p-1.5 rounded hover:bg-[#F8F9FA]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>المنصّة</label>
                <select disabled={!!intForm.id} value={intForm.provider} onChange={e => setIntForm(f => ({ ...f, provider: e.target.value as ProviderKey, credentials: {} }))} className="input text-sm">
                  {PROVIDER_LIST.map(p => <option key={p.key} value={p.key}>{p.labelAr}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>الاسم</label>
                <input value={intForm.name} onChange={e => setIntForm(f => ({ ...f, name: e.target.value }))} className="input text-sm" placeholder="مثال: Pixel A" />
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{provMeta.idLabelAr} ({provMeta.idLabel})</label>
                <input value={intForm.pixel_id} onChange={e => setIntForm(f => ({ ...f, pixel_id: e.target.value }))} className="input text-sm font-mono" placeholder={provMeta.idPlaceholder} dir="ltr" />
              </div>
              {provMeta.credentialFields.map(cf => (
                <div key={cf.key}>
                  <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{cf.labelAr}</label>
                  <input type={cf.secret ? 'password' : 'text'} value={intForm.credentials[cf.key] ?? ''} placeholder={cf.placeholder}
                    onChange={e => setIntForm(f => ({ ...f, credentials: { ...f.credentials, [cf.key]: e.target.value } }))} className="input text-sm font-mono" dir="ltr" />
                </div>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={intForm.is_active} onChange={e => setIntForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-[#0D6EFD]" />
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>مفعّل</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button onClick={saveIntegration} disabled={saving || !intForm.pixel_id || !intForm.name} className="btn btn-primary flex-1">{saving ? 'جارٍ الحفظ...' : 'حفظ'}</button>
                <button onClick={() => setIntOpen(false)} className="btn btn-ghost flex-1">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Domain modal ── */}
      {domOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setDomOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-base">إضافة دومين</h3>
              <button onClick={() => setDomOpen(false)} className="p-1.5 rounded hover:bg-[#F8F9FA]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>الدومين</label>
                <input value={domHost} onChange={e => setDomHost(e.target.value)} className="input text-sm font-mono" placeholder="shop.mystore.com" dir="ltr" />
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={addDomain} disabled={domBusy || !domHost.trim()} className="btn btn-primary flex-1">{domBusy ? '...' : 'إضافة'}</button>
                <button onClick={() => setDomOpen(false)} className="btn btn-ghost flex-1">إلغاء</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
