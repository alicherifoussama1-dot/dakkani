'use client'
// ============================================================
// Product Settings → "Tracking & Domain"
// One dropdown per provider (Use Store Default / a specific
// integration / Disabled) + one Domain dropdown. Live Preview
// and Health reuse the SAME resolver the storefront uses, so
// what you see is exactly what will load — isolated per product.
// ============================================================
import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle2, AlertTriangle, XCircle, ExternalLink, Eye, Globe } from 'lucide-react'
import { useT, useDir } from '@/lib/i18n/react'
import { PROVIDER_LIST, type ProviderKey } from '@/lib/tracking/registry'
import {
  resolveProductTracking, resolveDomain,
  type TrackingIntegration, type ProductTrackingRow, type DomainRow,
} from '@/lib/tracking/resolve'

interface Props { productId: string | null; storeId: string }

// select value encodes the assignment: 'default' | 'disabled' | <integrationId>
type Selection = Record<ProviderKey, string>

export default function ProductTrackingTab({ productId, storeId }: Props) {
  const t = useT()
  const dirn = useDir()
  const sb = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [integrations, setIntegrations] = useState<TrackingIntegration[]>([])
  const [domains, setDomains] = useState<DomainRow[]>([])
  const [storeSlug, setStoreSlug] = useState('')
  const [product, setProduct] = useState<{ slug: string; name: string; price: number } | null>(null)
  const [sel, setSel] = useState<Selection>({ meta: 'default', tiktok: 'default', google: 'default', snapchat: 'default' })
  const [domainSel, setDomainSel] = useState<string>('default') // 'default' | <domainId>

  useEffect(() => {
    if (!productId) { setLoading(false); return }
    ;(async () => {
      const [store, prod, ints, doms, assigns] = await Promise.all([
        sb.from('stores').select('slug').eq('id', storeId).single(),
        sb.from('products').select('slug,name,name_ar,price,domain_id').eq('id', productId).single(),
        sb.from('tracking_integrations').select('*').eq('store_id', storeId),
        sb.from('domains').select('*').eq('store_id', storeId),
        sb.from('product_tracking').select('*').eq('product_id', productId),
      ])
      setStoreSlug(store.data?.slug ?? '')
      if (prod.data) setProduct({ slug: prod.data.slug, name: prod.data.name_ar ?? prod.data.name, price: prod.data.price })
      setIntegrations((ints.data as TrackingIntegration[]) ?? [])
      setDomains((doms.data as DomainRow[]) ?? [])
      const nextSel: Selection = { meta: 'default', tiktok: 'default', google: 'default', snapchat: 'default' }
      for (const a of (assigns.data as ProductTrackingRow[]) ?? []) {
        if (a.mode === 'disabled') nextSel[a.provider] = 'disabled'
        else if (a.mode === 'integration' && a.integration_id) nextSel[a.provider] = a.integration_id
        else nextSel[a.provider] = 'default'
      }
      setSel(nextSel)
      setDomainSel(prod.data?.domain_id ?? 'default')
      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId, storeId])

  // Build assignment rows from the current selection so Preview/Health match the storefront resolver exactly.
  const assignmentsFromSel = useMemo<ProductTrackingRow[]>(() => (
    PROVIDER_LIST.map(p => {
      const v = sel[p.key]
      if (v === 'disabled') return { product_id: productId!, provider: p.key, mode: 'disabled', integration_id: null }
      if (v === 'default')  return { product_id: productId!, provider: p.key, mode: 'default', integration_id: null }
      return { product_id: productId!, provider: p.key, mode: 'integration', integration_id: v }
    })
  ), [sel, productId])

  const resolved = useMemo(() => resolveProductTracking(integrations, assignmentsFromSel), [integrations, assignmentsFromSel])
  const domain = useMemo(() => resolveDomain(domains, domainSel === 'default' ? null : domainSel, storeSlug), [domains, domainSel, storeSlug])
  const productUrl = product
    ? (domain.isCustom
        ? `https://${domain.hostname}/product/${product.slug}`
        : `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://dakkani.vercel.app'}/store/${storeSlug}/product/${product.slug}`)
    : ''

  const save = async () => {
    if (!productId) return
    setSaving(true)
    const rows = assignmentsFromSel.map(a => ({ product_id: productId, provider: a.provider, mode: a.mode, integration_id: a.integration_id }))
    await sb.from('product_tracking').upsert(rows, { onConflict: 'product_id,provider' })
    await sb.from('products').update({ domain_id: domainSel === 'default' ? null : domainSel }).eq('id', productId)
    setSaving(false)
  }

  if (!productId) return (
    <div className="card p-6 text-sm text-center" style={{ color: 'var(--color-text-muted)' }}>
      {t('tracking.save_first')}
    </div>
  )
  if (loading) return <div className="card p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>{t('tracking.loading')}</div>

  const overall = (() => {
    const states = PROVIDER_LIST.map(p => {
      const r = resolved[p.key]
      if (!r.enabled) return 'off'
      if (r.integration?.last_test_status === 'error') return 'error'
      if (r.integration?.last_test_status === 'healthy') return 'healthy'
      return 'warning'
    })
    if (states.includes('error')) return 'error'
    if (states.some(s => s === 'healthy')) return states.includes('warning') ? 'warning' : 'healthy'
    return 'warning'
  })()
  const OverallIcon = overall === 'healthy' ? CheckCircle2 : overall === 'error' ? XCircle : AlertTriangle
  const overallColor = overall === 'healthy' ? '#1D9E75' : overall === 'error' ? '#D93A3A' : '#E0A400'

  return (
    <div className="space-y-5" dir={dirn}>
      {/* ── Domains & Pixels (JustSell-style) ── */}
      <div className="card p-5 space-y-5">
        {/* Domains — toggle pills, single selection */}
        <div>
          <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--color-text-primary)' }}>{t('tracking.tab_domains')}</h3>
          <div className="flex flex-wrap gap-3">
            {/* Platform domain toggle */}
            <button type="button" onClick={() => setDomainSel('default')}
              className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
              style={{ border: `1.5px solid ${domainSel === 'default' ? 'var(--color-accent)' : 'var(--color-border)'}`, background: '#fff', minWidth: 220 }}>
              <span className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors" style={{ background: domainSel === 'default' ? 'var(--color-accent)' : '#CED4DA' }}>
                <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ right: domainSel === 'default' ? 2 : 18 }} />
              </span>
              <span className="font-mono text-sm" dir="ltr" style={{ color: 'var(--color-text-primary)' }}>{storeSlug}.dakkani.app</span>
            </button>
            {/* Custom domain toggles */}
            {domains.map(d => {
              const on = domainSel === d.id
              return (
                <button key={d.id} type="button" onClick={() => setDomainSel(on ? 'default' : d.id)}
                  className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                  style={{ border: `1.5px solid ${on ? 'var(--color-accent)' : 'var(--color-border)'}`, background: '#fff', minWidth: 220 }}>
                  <span className="relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors" style={{ background: on ? 'var(--color-accent)' : '#CED4DA' }}>
                    <span className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ right: on ? 2 : 18 }} />
                  </span>
                  <span className="font-mono text-sm" dir="ltr" style={{ color: 'var(--color-text-primary)' }}>{d.hostname}</span>
                </button>
              )
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>{t('tracking.tab_domain_note')}</p>
        </div>

        {/* Pixels — two-column dropdown grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
          {PROVIDER_LIST.map(p => {
            const opts = integrations.filter(i => i.provider === p.key && i.is_active)
            return (
              <div key={p.key}>
                <label className="flex items-center gap-2 text-sm font-bold mb-1.5" style={{ color: 'var(--color-text-primary)' }}>
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: p.color }} />{p.labelAr}
                </label>
                <select value={sel[p.key]} onChange={e => setSel(s => ({ ...s, [p.key]: e.target.value }))} className="input text-sm w-full">
                  <option value="default">{t('tracking.tab_store_default')}</option>
                  {opts.map(i => <option key={i.id} value={i.id}>{i.name} — {i.pixel_id}</option>)}
                  <option value="disabled">{t('tracking.tab_disabled')}</option>
                </select>
              </div>
            )
          })}
        </div>

        {/* Update */}
        <div className="flex justify-start pt-1 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm mt-3 px-6">{saving ? t('tracking.saving') : t('tracking.update')}</button>
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-sm pb-2 border-b flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
          <Eye size={15} style={{ color: 'var(--color-accent)' }} />{t('tracking.preview')}
        </h3>
        {/* Final URL — prominent */}
        <div className="rounded-xl p-3" style={{ background: 'var(--color-surface-2, #F8F9FA)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={13} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>{t('tracking.final_url')} · {domain.source === 'platform' ? t('tracking.src_platform') : domain.source === 'product' ? t('tracking.src_product') : t('tracking.src_store')}</span>
          </div>
          <a href={productUrl} target="_blank" rel="noreferrer" className="font-mono text-xs inline-flex items-center gap-1 break-all" dir="ltr" style={{ color: 'var(--color-accent)' }}>{productUrl}<ExternalLink size={11} className="shrink-0" /></a>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {PROVIDER_LIST.map(p => {
            const r = resolved[p.key]
            const src = r.source === 'override' ? t('tracking.src_override') : r.source === 'default' ? t('tracking.src_store') : r.source === 'disabled' ? t('tracking.src_off') : '—'
            return (
              <div key={p.key} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="w-40" style={{ color: 'var(--color-text-secondary)' }}>{p.labelAr}</span>
                <span className="font-medium" style={{ color: r.enabled ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                  {r.enabled ? (r.integration?.name ?? '—') : t('tracking.not_active')}
                </span>
                <span className="mr-auto text-xs px-2 py-0.5 rounded-full" style={{ background: r.enabled ? '#DCFCE7' : '#F1F3F5', color: r.enabled ? '#15803D' : '#868E96' }}>
                  {r.enabled ? t('tracking.on') : t('tracking.off')}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>{src}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Health ── */}
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <OverallIcon size={18} style={{ color: overallColor }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {t('tracking.health_title', { state: overall === 'healthy' ? t('tracking.healthy') : overall === 'error' ? t('tracking.error') : t('tracking.warning') })}
          </span>
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {overall === 'healthy' ? t('tracking.health_ok') : overall === 'error' ? t('tracking.health_err') : t('tracking.health_warn')}
        </p>
      </div>
    </div>
  )
}
