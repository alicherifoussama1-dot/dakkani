'use client'
// COMMERCO ORDER ACTIONS — cobalt DS redesign.
// Same handlers, same API, same STATUS_TRANSITIONS. Only styling +
// toasts + a11y are new.
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Phone, CheckCircle2, XCircle, Truck, Clock, RotateCw, Copy as CopyIcon, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from '@/lib/ui/toast'
import { generateA6Label, orderToLabelData } from '@/lib/labels/generator'
import type { Order, Store } from '@/types'
import { useT } from '@/lib/i18n/react'

// Per-status transitions. Variant class + icon chosen per intent (not per
// hue) so the palette stays disciplined.
type TVariant = 'primary' | 'secondary' | 'danger' | 'success'
interface Transition { label: string; next: string; variant: TVariant; Icon: typeof CheckCircle2 }

const STATUS_TRANSITIONS: Record<string, Transition[]> = {
  new: [
    { label: 'orders.act_confirm',   next: 'confirmed', variant: 'primary',   Icon: CheckCircle2 },
    { label: 'orders.act_failed1',   next: 'failed_1',  variant: 'secondary', Icon: Clock },
    { label: 'orders.act_postpone',  next: 'postponed', variant: 'secondary', Icon: Clock },
    { label: 'orders.act_duplicate', next: 'duplicate', variant: 'secondary', Icon: CopyIcon },
    { label: 'orders.act_cancel',    next: 'cancelled', variant: 'danger',    Icon: XCircle },
  ],
  confirmed:  [
    { label: 'orders.act_ship',      next: 'processing', variant: 'primary',   Icon: Truck },
    { label: 'orders.act_cancel',    next: 'cancelled',  variant: 'danger',    Icon: XCircle },
  ],
  processing: [
    { label: 'orders.act_shipped',   next: 'shipped',    variant: 'primary',   Icon: Truck },
  ],
  shipped: [
    { label: 'orders.act_delivered', next: 'delivered', variant: 'success',   Icon: CheckCircle2 },
    { label: 'orders.act_returned',  next: 'returned',  variant: 'danger',    Icon: RotateCw },
  ],
  failed_1: [
    { label: 'orders.act_confirm',   next: 'confirmed', variant: 'primary',   Icon: CheckCircle2 },
    { label: 'orders.act_failed2',   next: 'failed_2',  variant: 'secondary', Icon: Clock },
    { label: 'orders.act_cancel',    next: 'cancelled', variant: 'danger',    Icon: XCircle },
  ],
  failed_2: [
    { label: 'orders.act_confirm',   next: 'confirmed', variant: 'primary',   Icon: CheckCircle2 },
    { label: 'orders.act_failed3',   next: 'failed_3',  variant: 'secondary', Icon: Clock },
    { label: 'orders.act_cancel',    next: 'cancelled', variant: 'danger',    Icon: XCircle },
  ],
  failed_3: [
    { label: 'orders.act_confirm',      next: 'confirmed', variant: 'primary', Icon: CheckCircle2 },
    { label: 'orders.act_cancel_final', next: 'cancelled', variant: 'danger',  Icon: XCircle },
  ],
  postponed: [
    { label: 'orders.act_confirm',   next: 'confirmed', variant: 'primary', Icon: CheckCircle2 },
    { label: 'orders.act_cancel',    next: 'cancelled', variant: 'danger',  Icon: XCircle },
  ],
}

interface Props { order: Order & { wilaya?: any; commune?: any; items?: any[] }; store: Store }

export default function OrderActions({ order, store }: Props) {
  const tr = useT()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [trackingInput, setTrackingInput] = useState(order.tracking_number ?? '')
  const supabase = createClient()

  const updateStatus = async (newStatus: string, label: string) => {
    setLoading(newStatus)
    try {
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, changed_by: 'dashboard' }),
      })
      if (!res.ok) {
        const updates: Record<string, unknown> = { status: newStatus }
        if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString()
        if (newStatus === 'shipped')   updates.shipped_at   = new Date().toISOString()
        if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString()
        const { error } = await supabase.from('orders').update(updates).eq('id', order.id)
        if (error) { toast.error(`فشل: ${error.message}`); setLoading(null); return }
      }
      toast.success(`تم — ${tr(label)}`)
      router.refresh()
    } catch (e) {
      toast.error('تعذّر تحديث الحالة')
    }
    setLoading(null)
  }

  const logCallAttempt = async () => {
    setLoading('call')
    const { error } = await supabase.from('orders').update({
      call_attempts: (order.call_attempts ?? 0) + 1,
      last_call_at: new Date().toISOString(),
    }).eq('id', order.id)
    setLoading(null)
    if (error) return toast.error('تعذّر تسجيل المحاولة')
    toast.success('سُجّلت محاولة الاتصال')
    router.refresh()
  }

  const saveTracking = async () => {
    setLoading('tracking')
    const { error } = await supabase.from('orders').update({ tracking_number: trackingInput }).eq('id', order.id)
    setLoading(null)
    if (error) return toast.error('تعذّر حفظ رقم التتبع')
    toast.success('حُفظ رقم التتبع')
    router.refresh()
  }

  const printLabel = () => {
    const label = orderToLabelData(order as any, store.name, store.phone ?? undefined)
    generateA6Label(label)
    toast.success('تم توليد بطاقة الشحن')
  }

  const btnClass = (v: TVariant) =>
    v === 'primary'   ? 'c-btn c-btn--primary c-btn--sm'
    : v === 'danger'  ? 'c-btn c-btn--danger c-btn--sm'
    : v === 'success' ? 'c-btn c-btn--sm'
    : 'c-btn c-btn--secondary c-btn--sm'
  const successStyle: React.CSSProperties = { background: 'var(--color-success-600)', color: '#fff', borderColor: 'transparent' }

  const transitions = STATUS_TRANSITIONS[order.status] ?? []

  return (
    <div className="flex flex-wrap items-center gap-2" style={{ fontFamily: 'var(--font-sans)' }}>
      {/* Tracking number — inline input + save */}
      <div className="flex items-center gap-1">
        <input
          value={trackingInput}
          onChange={e => setTrackingInput(e.target.value)}
          placeholder={tr('orders.tracking_ph')}
          className="c-input c-input--numeric"
          dir="ltr"
          style={{ inlineSize: 168, blockSize: 'var(--control-h-sm)', fontSize: 'var(--text-sm)' }}
          aria-label="رقم التتبع"
        />
        <button onClick={saveTracking} disabled={loading === 'tracking' || trackingInput === (order.tracking_number ?? '')}
          className={`c-btn c-btn--ghost c-btn--sm ${loading === 'tracking' ? 'is-loading' : ''}`}
          aria-label={tr('common.save')}>
          {loading === 'tracking' ? '' : <><Save size={13} aria-hidden />{tr('common.save')}</>}
        </button>
      </div>

      {/* Call attempt counter */}
      <button onClick={logCallAttempt} disabled={loading === 'call'}
        className={`c-btn c-btn--secondary c-btn--sm ${loading === 'call' ? 'is-loading' : ''}`}>
        {loading === 'call' ? '' : <><Phone size={13} aria-hidden />{tr('orders.call', { count: order.call_attempts ?? 0 })}</>}
      </button>

      {/* Print — subtle cobalt-tinted secondary */}
      <button onClick={printLabel}
        className="c-btn c-btn--secondary c-btn--sm"
        style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-700)', borderColor: 'var(--color-primary-200)' }}>
        <Printer size={13} aria-hidden />{tr('orders.print_invoice')}
      </button>

      {/* Status transitions */}
      {transitions.map(a => {
        const isBusy = loading === a.next
        return (
          <button key={a.next} onClick={() => updateStatus(a.next, a.label)} disabled={!!loading}
            className={`${btnClass(a.variant)} ${isBusy ? 'is-loading' : ''}`}
            style={a.variant === 'success' ? successStyle : undefined}>
            {isBusy ? '' : <><a.Icon size={13} aria-hidden />{tr(a.label)}</>}
          </button>
        )
      })}

      {/* WhatsApp — brand green stays (external service colour) */}
      {(order as any).customer_phone && (
        <a
          href={`https://wa.me/${((order as any).customer_phone ?? '').replace(/\D/g,'').replace(/^0/,'213')}?text=${encodeURIComponent(tr('orders.wa_msg', { name: (order as any).customer_name, order: order.order_number }))}`}
          target="_blank" rel="noopener noreferrer"
          className="c-btn c-btn--sm"
          style={{ background: '#25D366', color: '#fff', borderColor: 'transparent' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
          </svg>
          {tr('orders.whatsapp')}
        </a>
      )}
    </div>
  )
}
