'use client'
// ============================================================
// Settings → Tracking & Domains
// A reusable Tracking Library (grouped by provider, collapsible)
// and Custom Domains with professional health cards. CRUD runs
// through the browser Supabase client (RLS-scoped to the owner).
// Test Connection and domain Verify use server routes.
// Logic is unchanged — this layer only improves the experience.
// ============================================================
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Pencil, Trash2, Star, Globe, CheckCircle2, AlertTriangle, XCircle, Zap,
  ChevronDown, ChevronLeft, Copy, Check, ShieldCheck, Server, Network, Clock, BadgeCheck, RefreshCw,
} from 'lucide-react'
import { useT, useRaw, useDir } from '@/lib/i18n/react'
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
  provider?: string; cf_zone_id?: string | null; nameservers?: string[] | null
  ssl_status?: 'pending' | 'provisioning' | 'issued' | 'error'
  dns_status?: 'pending' | 'connected' | 'error'
  activated_at?: string | null; last_checked_at?: string | null
  verification: Record<string, any>; is_default: boolean
}
interface Props { storeId: string; storeSlug: string; schemaReady?: boolean; cloudflareReady?: boolean; integrations: Integration[]; domains: Domain[] }

// ── helpers ──────────────────────────────────────────────────
const fmtDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('ar-DZ', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

const countUnit = (_key: ProviderKey, _n: number) => ''

const HEALTH = {
  healthy: { Icon: CheckCircle2, color: '#1D9E75', bg: '#DCFCE7', label: 'tracking.healthy' },
  warning: { Icon: AlertTriangle, color: '#B45309', bg: '#FEF3C7', label: 'tracking.warning' },
  error:   { Icon: XCircle,       color: '#B91C1C', bg: '#FEE2E2', label: 'tracking.error' },
} as const

// Enterprise health: verification (tested) + credentials + connection.
function healthOf(i: Integration): keyof typeof HEALTH {
  if (i.last_test_status === 'error') return 'error'
  const prov = getProvider(i.provider)
  const needsToken = !!prov?.supportsServerEvents && (prov?.credentialFields.some(c => c.secret) ?? false)
  const hasToken = prov?.credentialFields.some(c => c.secret && i.credentials?.[c.key]) ?? false
  if (i.last_test_status === 'healthy') return needsToken && !hasToken ? 'warning' : 'healthy'
  return 'warning' // never tested / warning
}

const DOMAIN_STATE = {
  active:  { dot: '🟢', color: '#1D9E75', bg: '#DCFCE7', label: 'tracking.st_active' },
  pending: { dot: '🟡', color: '#B45309', bg: '#FEF3C7', label: 'tracking.st_pending' },
  error:   { dot: '🔴', color: '#B91C1C', bg: '#FEE2E2', label: 'tracking.st_error' },
} as const
const domainState = (d: Domain): keyof typeof DOMAIN_STATE =>
  d.status === 'verified' || d.status === 'ssl_active' ? 'active' : d.status === 'error' ? 'error' : 'pending'

// ── small pieces ─────────────────────────────────────────────
function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1200) } catch {} }}
      className="p-1.5 rounded-lg hover:bg-black/5 transition-colors" title="نسخ" type="button">
      {ok ? <Check size={13} style={{ color: '#1D9E75' }} /> : <Copy size={13} style={{ color: 'var(--color-text-muted)' }} />}
    </button>
  )
}

function DnsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 justify-between rounded-lg px-2.5 py-1.5" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
      <div className="min-w-0" dir="ltr">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
        <div className="font-mono text-xs truncate" style={{ color: 'var(--color-text-primary)' }}>{value}</div>
      </div>
      <CopyBtn text={value} />
    </div>
  )
}

// A compact labelled fact used inside the domain health grid.
function Fact({ Icon, label, value, color }: { Icon: any; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon size={13} style={{ color: 'var(--color-text-muted)' }} />
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      </div>
      <div className="text-xs font-semibold" style={{ color: color ?? 'var(--color-text-primary)' }}>{value}</div>
    </div>
  )
}

// Read-only "input field" (JustSell-style) with optional copy button + status dot.
function Field({ label, value, mono, copy, dot }: { label: string; value: string; mono?: boolean; copy?: boolean; dot?: string }) {
  return (
    <div>
      <label className="block text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>{label}</label>
      <div className="flex items-center gap-2 rounded-lg px-3 h-10" style={{ background: '#fff', border: '1px solid var(--color-border)' }}>
        {dot && <span className="w-2 h-2 rounded-full shrink-0" style={{ background: dot }} />}
        <span className={`flex-1 truncate text-sm ${mono ? 'font-mono' : ''}`} dir={mono ? 'ltr' : undefined} style={{ color: 'var(--color-text-secondary)' }}>{value}</span>
        {copy && !!value && <CopyBtn text={value} />}
      </div>
    </div>
  )
}

export default function TrackingDomainsClient({ storeId, storeSlug, schemaReady = true, cloudflareReady = false, integrations, domains }: Props) {
  const t = useT()
  const dir = useDir()
  const router = useRouter()
  const sb = createClient()
  const [advancedOpen, setAdvancedOpen] = useState<Record<string, boolean>>({})

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

  // ── UI-only state: collapsed provider groups ──
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggleGroup = (k: string) => setCollapsed(c => ({ ...c, [k]: !c[k] }))

  const provMeta = getProvider(intForm.provider)!

  const openNew = (provider?: ProviderKey) => { setIntForm({ ...blank, provider: provider ?? 'meta' }); setIntOpen(true) }
  const openEdit = (i: Integration) => {
    setIntForm({ id: i.id, provider: i.provider, name: i.name, pixel_id: i.pixel_id, credentials: i.credentials ?? {}, is_active: i.is_active })
    setIntOpen(true)
  }

  // ─────────── handlers (unchanged logic) ───────────
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
    if (!confirm(t('tracking.confirm_del_int'))) return
    await sb.from('tracking_integrations').delete().eq('id', id); router.refresh()
  }
  const toggleActive = async (i: Integration) => {
    await sb.from('tracking_integrations').update({ is_active: !i.is_active }).eq('id', i.id); router.refresh()
  }
  const setDefault = async (i: Integration) => {
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
  const addDomain = async () => {
    const host = domHost.trim()
    if (!host) return
    setDomBusy(true)
    try {
      const res = await fetch('/api/tracking/domains/provision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ hostname: host }),
      })
      const r = await res.json()
      if (!res.ok) { alert(r.error ?? 'تعذّر إضافة الدومين'); return }
      if (r.message) alert(r.message)
      setDomOpen(false); setDomHost('')
    } finally { setDomBusy(false); router.refresh() }
  }
  const verifyDomain = async (id: string, silent = false) => {
    if (!silent) setDomBusy(true)
    const res = await fetch('/api/tracking/domains/verify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
    })
    const r = await res.json().catch(() => ({}))
    if (!silent) { alert(r.message ?? ''); setDomBusy(false) }
    router.refresh()
    return r
  }

  // Auto-detect nameserver propagation: quietly re-check pending Cloudflare
  // domains every 30s while the page is open (no popups).
  const polling = useRef(false)
  useEffect(() => {
    const pending = domains.filter(d => d.cf_zone_id && d.status !== 'ssl_active' && d.status !== 'error')
    if (pending.length === 0) return
    const t = setInterval(async () => {
      if (polling.current) return
      polling.current = true
      try { for (const d of pending) await verifyDomain(d.id, true) }
      finally { polling.current = false }
    }, 30000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [domains])
  const removeDomain = async (id: string) => {
    if (!confirm(t('tracking.confirm_del_dom'))) return
    await sb.from('domains').delete().eq('id', id); router.refresh()
  }
  const setDomainDefault = async (id: string) => {
    await sb.from('domains').update({ is_default: false }).eq('store_id', storeId)
    await sb.from('domains').update({ is_default: true }).eq('id', id); router.refresh()
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto" dir={dir} style={{ fontFamily: 'var(--font-arabic)' }}>
      <div className="mb-6">
        <h1 className="page-title">{t('tracking.title')}</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {t('tracking.subtitle')}
        </p>
      </div>

      {!schemaReady && (
        <div className="rounded-xl p-4 mb-5 flex items-start gap-3" style={{ background: '#FEF3C7', border: '1px solid #FCD34D' }}>
          <AlertTriangle size={18} style={{ color: '#B45309', marginTop: 2 }} />
          <div>
            <p className="font-bold text-sm" style={{ color: '#92400E' }}>{t('tracking.db_banner_title')}</p>
            <p className="text-xs mt-1" style={{ color: '#92400E' }} dir="rtl">
              نظام التتبع والدومينات جاهز في التطبيق، لكن جداول قاعدة البيانات لم تُنشأ بعد. شغّل ملف الترحيل
              <span className="font-mono mx-1" dir="ltr">supabase/migrations/025_tracking_domains.sql</span>
              من Supabase SQL Editor ثم أعد تحميل الصفحة. بعدها ستعمل جميع الميزات مباشرة.
            </p>
          </div>
        </div>
      )}

      {/* ══ TRACKING LIBRARY ══ */}
      <section className="card mb-6 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Zap size={16} style={{ color: 'var(--color-accent)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('tracking.lib')}</span>
          </div>
          <button onClick={() => openNew()} className="btn btn-primary btn-sm gap-1.5"><Plus size={14} />{t('tracking.add')}</button>
        </div>

        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {PROVIDER_LIST.map(p => {
            const rows = integrations.filter(i => i.provider === p.key)
            const isCollapsed = collapsed[p.key]
            return (
              <div key={p.key}>
                {/* Provider header — click to expand/collapse */}
                <button type="button" onClick={() => toggleGroup(p.key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.015] transition-colors text-right">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${p.color}1A` }}>
                    <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-tight" style={{ color: 'var(--color-text-primary)' }}>{p.labelAr}</p>
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {rows.length}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--color-surface-2, #F1F3F5)', color: 'var(--color-text-secondary)' }}>{rows.length}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); openNew(p.key) }} className="p-1.5 rounded-lg hover:bg-black/5" title="إضافة">
                    <Plus size={14} style={{ color: 'var(--color-accent)' }} />
                  </button>
                  {isCollapsed ? <ChevronLeft size={16} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />}
                </button>

                {/* Integrations */}
                {!isCollapsed && (
                  <div className="px-4 pb-3 space-y-2">
                    {rows.length === 0 ? (
                      <div className="rounded-xl border border-dashed px-4 py-5 text-center" style={{ borderColor: 'var(--color-border)' }}>
                        <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>{t('tracking.none_yet', { name: p.labelAr })}</p>
                        <button onClick={() => openNew(p.key)} className="btn btn-ghost btn-sm gap-1"><Plus size={13} />{t('tracking.add_first')}</button>
                      </div>
                    ) : rows.map(i => {
                      const h = HEALTH[healthOf(i)]
                      return (
                        <div key={i.id} className="rounded-xl px-3.5 py-3" style={{ background: 'var(--color-surface-2, #F8F9FA)', border: '1px solid var(--color-border)' }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: h.bg, color: h.color }}>
                              <h.Icon size={12} />{t(h.label)}
                            </span>
                            <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{i.name}</span>
                            <span className="font-mono text-xs" dir="ltr" style={{ color: 'var(--color-text-muted)' }}>{i.pixel_id}</span>
                            {i.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold inline-flex items-center gap-0.5" style={{ background: '#FEF3C7', color: '#B45309' }}><Star size={9} fill="#B45309" />{t('tracking.default')}</span>}
                            {!i.is_active && <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: '#F1F3F5', color: '#868E96' }}>{t('tracking.disabled_badge')}</span>}
                            <div className="mr-auto flex items-center gap-0.5">
                              <button title={t('tracking.test')} onClick={() => testConnection(i)} disabled={testing === i.id}
                                className="p-1.5 rounded-lg hover:bg-black/5"><Zap size={14} style={{ color: testing === i.id ? '#ADB5BD' : 'var(--color-accent)' }} /></button>
                              <button title={t('tracking.set_default')} onClick={() => setDefault(i)} className="p-1.5 rounded-lg hover:bg-black/5"><Star size={14} style={{ color: i.is_default ? '#F59E0B' : '#CED4DA', fill: i.is_default ? '#F59E0B' : 'none' }} /></button>
                              <button title={i.is_active ? t('tracking.disable') : t('tracking.enable')} onClick={() => toggleActive(i)} className="text-xs px-2 py-1 rounded-lg hover:bg-black/5" style={{ color: 'var(--color-text-secondary)' }}>{i.is_active ? t('tracking.disable') : t('tracking.enable')}</button>
                              <button title={t('tracking.edit')} onClick={() => openEdit(i)} className="p-1.5 rounded-lg hover:bg-black/5"><Pencil size={13} style={{ color: 'var(--color-accent)' }} /></button>
                              <button title={t('tracking.delete')} onClick={() => removeIntegration(i.id)} className="p-1.5 rounded-lg hover:bg-black/5"><Trash2 size={13} style={{ color: '#D93A3A' }} /></button>
                            </div>
                          </div>
                          {/* test timeline */}
                          <div className="flex items-center gap-4 mt-2 pt-2 border-t flex-wrap" style={{ borderColor: 'var(--color-border)' }}>
                            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t('tracking.last_test')} <span style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(i.last_test_at)}</span></span>
                            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t('tracking.last_ok')} <span style={{ color: i.last_test_status === 'healthy' ? '#1D9E75' : 'var(--color-text-muted)' }}>{i.last_test_status === 'healthy' ? fmtDate(i.last_test_at) : '—'}</span></span>
                            <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t('tracking.last_fail')} <span style={{ color: i.last_test_status === 'error' ? '#D93A3A' : 'var(--color-text-muted)' }}>{i.last_test_status === 'error' ? fmtDate(i.last_test_at) : '—'}</span></span>
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

      {/* ══ DOMAINS ══ */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <Globe size={16} style={{ color: 'var(--color-accent)' }} />
            <span className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{t('tracking.domains')}</span>
          </div>
          <button onClick={() => setDomOpen(true)} className="btn btn-primary btn-sm gap-1.5"><Plus size={14} />{t('tracking.add_domain')}</button>
        </div>

        <div className="px-4 py-4 space-y-3">
          {!cloudflareReady && (
            <div className="rounded-xl px-3.5 py-2.5 flex items-start gap-2 text-xs" style={{ background: '#FEF3C7', border: '1px solid #FCD34D', color: '#92400E' }}>
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <span>تزويد Cloudflare غير مُفعّل على المنصّة. إضافة الدومينات تتطلّب Cloudflare — أضف <span className="font-mono" dir="ltr">CLOUDFLARE_API_TOKEN</span> و <span className="font-mono" dir="ltr">CLOUDFLARE_ACCOUNT_ID</span> صالحين في إعدادات الاستضافة. بدونهما ستظهر رسالة «Cloudflare API configuration error» عند الإضافة.</span>
            </div>
          )}

          {/* Platform fallback — always present, never removable */}
          <div className="rounded-xl px-3.5 py-3 flex items-center gap-2.5" style={{ background: '#DCFCE7', border: '1px solid #86EFAC' }}>
            <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#fff' }}><Globe size={16} style={{ color: '#15803D' }} /></span>
            <div className="flex-1 min-w-0">
              <p className="font-mono text-sm" dir="ltr" style={{ color: '#14532D' }}>{storeSlug}.dakkani.app</p>
              <p className="text-[11px]" style={{ color: '#15803D' }}>{t('tracking.platform_domain')}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: '#fff', color: '#15803D' }}>{t('tracking.always_active')}</span>
          </div>

          {domains.map(d => {
            const st = DOMAIN_STATE[domainState(d)]
            const active = domainState(d) === 'active'
            const isError = d.status === 'error'
            const nameservers: string[] = Array.isArray(d.nameservers) ? d.nameservers : []
            const cfStatusLabel = active ? t('tracking.st_active') : isError ? 'Configuration error' : t('tracking.st_pending')
            const sslLabel = d.ssl_status === 'issued' ? t('tracking.ssl_issued') : d.ssl_status === 'provisioning' ? t('tracking.ssl_provisioning') : d.ssl_status === 'error' ? t('tracking.error') : '—'
            const dnsLabel = d.dns_status === 'connected' ? t('tracking.dns_connected') : d.dns_status === 'error' ? t('tracking.dns_off') : t('tracking.waiting')
            const verifLabel = active ? t('tracking.done') : isError ? t('tracking.failed') : t('tracking.waiting')
            return (
              <div key={d.id} className="rounded-xl p-4 space-y-4" style={{ border: '1px solid var(--color-border)' }}>
                {/* Header: "Domain Details" pill + actions */}
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--color-surface-2, #F1F3F5)', color: 'var(--color-text-primary)' }}>
                    <Globe size={14} />{t('tracking.domain_details')}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <button title={t('tracking.set_default')} onClick={() => setDomainDefault(d.id)} className="p-1.5 rounded-lg hover:bg-black/5"><Star size={15} style={{ color: d.is_default ? '#F59E0B' : '#94A3B8', fill: d.is_default ? '#F59E0B' : 'none' }} /></button>
                    <button title={t('tracking.delete')} onClick={() => removeDomain(d.id)} className="p-1.5 rounded-lg hover:bg-black/5"><Trash2 size={14} style={{ color: '#D93A3A' }} /></button>
                  </div>
                </div>

                {/* Domain Name */}
                <div>
                  <Field label={t('tracking.domain_name')} value={d.hostname} mono />
                  <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    {t('tracking.domain_note')}
                    {d.is_default && t('tracking.domain_note_default')}
                  </p>
                </div>

                {/* Cloudflare Status + Nameservers (exactly JustSell) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Field label={t('tracking.cf_status')} value={cfStatusLabel} dot={st.color} />
                  <Field label="Nameserver 1" value={nameservers[0] ?? '—'} mono copy={!!nameservers[0]} />
                  <Field label="Nameserver 2" value={nameservers[1] ?? '—'} mono copy={!!nameservers[1]} />
                </div>

                {/* Status feedback (config error is required; active/pending kept minimal) */}
                {isError && (
                  <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: '#FEE2E2', color: '#B91C1C', border: '1px solid #FCA5A5' }}>
                    <XCircle size={14} />
                    <span><span className="font-bold" dir="ltr">Cloudflare API configuration error</span> {t('tracking.cfg_err')}</span>
                  </div>
                )}
                {active && (
                  <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>
                    <BadgeCheck size={14} />
                    <span>{t('tracking.active_since', { since: d.activated_at ? t('tracking.since', { date: fmtDate(d.activated_at) }) : '' })}</span>
                  </div>
                )}
                {!active && !isError && nameservers.length > 0 && (
                  <div className="flex items-start gap-2 text-xs rounded-lg px-3 py-2" style={{ background: '#EFF6FF', color: '#1E40AF', border: '1px solid #BFDBFE' }}>
                    <Server size={14} className="mt-0.5 shrink-0" />
                    <span>{t('tracking.ns_hint')}</span>
                  </div>
                )}

                {/* Update (JustSell) + Advanced toggle */}
                <div className="flex items-center justify-between pt-1">
                  <button type="button" onClick={() => setAdvancedOpen(a => ({ ...a, [d.id]: !a[d.id] }))}
                    className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--color-text-muted)' }}>
                    {advancedOpen[d.id] ? <ChevronDown size={13} /> : <ChevronLeft size={13} />}{t('tracking.adv_dns')}
                  </button>
                  <button onClick={() => verifyDomain(d.id)} disabled={domBusy} className="btn btn-primary btn-sm gap-1.5">
                    <RefreshCw size={13} className={domBusy ? 'animate-spin' : ''} />{t('tracking.update')}
                  </button>
                </div>

                {/* Advanced — health details + TXT fallback (troubleshooting only) */}
                {advancedOpen[d.id] && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <Fact Icon={ShieldCheck} label="SSL" value={sslLabel} color={d.ssl_status === 'issued' ? '#1D9E75' : d.ssl_status === 'error' ? '#D93A3A' : undefined} />
                      <Fact Icon={Network} label="DNS" value={dnsLabel} color={d.dns_status === 'connected' ? '#1D9E75' : d.dns_status === 'error' ? '#D93A3A' : undefined} />
                      <Fact Icon={BadgeCheck} label={t('tracking.verification')} value={verifLabel} color={active ? '#1D9E75' : isError ? '#D93A3A' : undefined} />
                      <Fact Icon={Clock} label={t('tracking.last_check')} value={d.last_checked_at ? fmtDate(d.last_checked_at) : '—'} />
                    </div>
                    {d.verification?.token && (
                      <div className="space-y-1.5">
                        <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{t('tracking.adv_txt')}</p>
                        <DnsRow label="Type" value="TXT" />
                        <DnsRow label="Host / Name" value={d.verification.record_host} />
                        <DnsRow label="Value" value={d.verification.token} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {domains.length === 0 && (
            <div className="rounded-xl border border-dashed px-4 py-8 text-center" style={{ borderColor: 'var(--color-border)' }}>
              <Globe size={22} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>{t('tracking.empty_domains_title')}</p>
              <p className="text-xs mt-1 mb-3" style={{ color: 'var(--color-text-muted)' }}>{t('tracking.empty_domains_sub')}</p>
              <button onClick={() => setDomOpen(true)} className="btn btn-primary btn-sm gap-1.5"><Plus size={14} />{t('tracking.add_first_domain')}</button>
            </div>
          )}
        </div>
      </section>

      {/* ── Integration modal ── */}
      {intOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setIntOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-base">{intForm.id ? t('tracking.modal_edit') : t('tracking.modal_add')}</h3>
              <button onClick={() => setIntOpen(false)} className="p-1.5 rounded hover:bg-[#F8F9FA]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('tracking.platform')}</label>
                <select disabled={!!intForm.id} value={intForm.provider} onChange={e => setIntForm(f => ({ ...f, provider: e.target.value as ProviderKey, credentials: {} }))} className="input text-sm">
                  {PROVIDER_LIST.map(p => <option key={p.key} value={p.key}>{p.labelAr}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('tracking.name')}</label>
                <input value={intForm.name} onChange={e => setIntForm(f => ({ ...f, name: e.target.value }))} className="input text-sm" placeholder={t('tracking.name_ph')} />
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
                <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{t('tracking.enabled')}</span>
              </label>
              <div className="flex gap-3 pt-1">
                <button onClick={saveIntegration} disabled={saving || !intForm.pixel_id || !intForm.name} className="btn btn-primary flex-1">{saving ? t('tracking.saving') : t('tracking.save')}</button>
                <button onClick={() => setIntOpen(false)} className="btn btn-ghost flex-1">{t('tracking.cancel')}</button>
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
              <h3 className="font-bold text-base">{t('tracking.add_domain')}</h3>
              <button onClick={() => setDomOpen(false)} className="p-1.5 rounded hover:bg-[#F8F9FA]">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs mb-1.5 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{t('tracking.domain_label')}</label>
                <input value={domHost} onChange={e => setDomHost(e.target.value)} className="input text-sm font-mono" placeholder="example.com" dir="ltr" />
                <p className="text-[11px] mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  {cloudflareReady
                    ? t('tracking.domain_hint_cf')
                    : t('tracking.domain_hint')}
                </p>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={addDomain} disabled={domBusy || !domHost.trim()} className="btn btn-primary flex-1">{domBusy ? '...' : t('tracking.add_btn')}</button>
                <button onClick={() => setDomOpen(false)} className="btn btn-ghost flex-1">{t('tracking.cancel')}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
