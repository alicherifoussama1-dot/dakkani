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
import { CheckCircle2, AlertTriangle, XCircle, Link2, ExternalLink, Eye, Globe } from 'lucide-react'
import { PROVIDER_LIST, type ProviderKey } from '@/lib/tracking/registry'
import {
  resolveProductTracking, resolveDomain,
  type TrackingIntegration, type ProductTrackingRow, type DomainRow,
} from '@/lib/tracking/resolve'

interface Props { productId: string | null; storeId: string }

// select value encodes the assignment: 'default' | 'disabled' | <integrationId>
type Selection = Record<ProviderKey, string>

export default function ProductTrackingTab({ productId, storeId }: Props) {
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
  const productUrl = product ? `https://${domain.hostname}/product/${product.slug}` : ''

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
      احفظ المنتج أولاً ثم اضبط التتبع والدومين.
    </div>
  )
  if (loading) return <div className="card p-6 text-sm" style={{ color: 'var(--color-text-muted)' }}>جارٍ التحميل…</div>

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
    <div className="space-y-5" dir="rtl">
      {/* ── Selectors ── */}
      <div className="card p-5 space-y-4">
        <h3 className="font-semibold text-sm pb-2 border-b" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>التتبع لكل منصّة</h3>
        {PROVIDER_LIST.map(p => {
          const opts = integrations.filter(i => i.provider === p.key && i.is_active)
          return (
            <div key={p.key} className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${p.color}1A` }}>
                <span className="w-3 h-3 rounded-full" style={{ background: p.color }} />
              </span>
              <label className="text-sm w-36 shrink-0 font-medium" style={{ color: 'var(--color-text-secondary)' }}>{p.labelAr}</label>
              <select value={sel[p.key]} onChange={e => setSel(s => ({ ...s, [p.key]: e.target.value }))} className="input text-sm flex-1">
                <option value="default">الافتراضي للمتجر</option>
                {opts.map(i => <option key={i.id} value={i.id}>{i.name} — {i.pixel_id}</option>)}
                <option value="disabled">معطّل</option>
              </select>
            </div>
          )
        })}

        <h3 className="font-semibold text-sm pb-2 border-b pt-2" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>الدومين</h3>
        <div className="flex items-center gap-3">
          <Link2 size={15} className="shrink-0" style={{ color: 'var(--color-text-muted)' }} />
          <label className="text-sm w-40 shrink-0" style={{ color: 'var(--color-text-secondary)' }}>دومين المنتج</label>
          <select value={domainSel} onChange={e => setDomainSel(e.target.value)} className="input text-sm flex-1">
            <option value="default">الافتراضي للمتجر ({storeSlug}.dakkani.app)</option>
            {domains.map(d => <option key={d.id} value={d.id}>{d.hostname}</option>)}
          </select>
        </div>

        <div className="pt-2">
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'جارٍ الحفظ…' : 'حفظ التتبع'}</button>
        </div>
      </div>

      {/* ── Preview ── */}
      <div className="card p-5 space-y-3">
        <h3 className="font-semibold text-sm pb-2 border-b flex items-center gap-1.5" style={{ color: 'var(--color-text-primary)', borderColor: 'var(--color-border)' }}>
          <Eye size={15} style={{ color: 'var(--color-accent)' }} />معاينة التتبع
        </h3>
        {/* Final URL — prominent */}
        <div className="rounded-xl p-3" style={{ background: 'var(--color-surface-2, #F8F9FA)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={13} style={{ color: 'var(--color-text-muted)' }} />
            <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>الرابط النهائي · {domain.source === 'platform' ? 'دومين المنصّة' : domain.source === 'product' ? 'دومين المنتج' : 'الافتراضي للمتجر'}</span>
          </div>
          <a href={productUrl} target="_blank" rel="noreferrer" className="font-mono text-xs inline-flex items-center gap-1 break-all" dir="ltr" style={{ color: 'var(--color-accent)' }}>{productUrl}<ExternalLink size={11} className="shrink-0" /></a>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
          {PROVIDER_LIST.map(p => {
            const r = resolved[p.key]
            const src = r.source === 'override' ? 'تخصيص المنتج' : r.source === 'default' ? 'الافتراضي للمتجر' : r.source === 'disabled' ? 'معطّل' : '—'
            return (
              <div key={p.key} className="flex items-center gap-2 py-2 text-sm">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
                <span className="w-40" style={{ color: 'var(--color-text-secondary)' }}>{p.labelAr}</span>
                <span className="font-medium" style={{ color: r.enabled ? 'var(--color-text-primary)' : 'var(--color-text-muted)' }}>
                  {r.enabled ? (r.integration?.name ?? '—') : 'غير مفعّل'}
                </span>
                <span className="mr-auto text-xs px-2 py-0.5 rounded-full" style={{ background: r.enabled ? '#DCFCE7' : '#F1F3F5', color: r.enabled ? '#15803D' : '#868E96' }}>
                  {r.enabled ? 'مفعّل' : 'معطّل'}
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
            حالة التتبع: {overall === 'healthy' ? 'سليم' : overall === 'error' ? 'خطأ' : 'تحذير'}
          </span>
        </div>
        <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-muted)' }}>
          {overall === 'healthy' ? 'كل المنصّات المفعّلة تم اختبارها بنجاح.' : overall === 'error' ? 'إحدى المنصّات بها خطأ — راجع مكتبة التتبع واختبر الاتصال.' : 'بعض المنصّات لم تُختبر بعد أو معطّلة.'}
        </p>
      </div>
    </div>
  )
}
