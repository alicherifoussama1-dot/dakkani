'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Phone, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateA6Label, orderToLabelData } from '@/lib/labels/generator'
import type { Order, Store } from '@/types'
import { useT } from '@/lib/i18n/react'

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; bg: string }[]> = {
  new:        [
    { label: 'orders.act_confirm',   next: 'confirmed',  bg: 'bg-green-500 hover:bg-green-600' },
    { label: 'orders.act_cancel',          next: 'cancelled',  bg: 'bg-red-500 hover:bg-red-600' },
    { label: 'orders.act_failed1',       next: 'failed_1',   bg: 'bg-yellow-500 hover:bg-yellow-600' },
    { label: 'orders.act_postpone',          next: 'postponed',  bg: 'bg-purple-400 hover:bg-purple-500' },
    { label: 'orders.act_duplicate',          next: 'duplicate',  bg: 'bg-gray-500 hover:bg-gray-600' },
  ],
  confirmed:  [
    { label: 'orders.act_ship',     next: 'processing', bg: 'bg-purple-500 hover:bg-purple-600' },
    { label: 'orders.act_cancel',          next: 'cancelled',  bg: 'bg-red-400 hover:bg-red-500' },
  ],
  processing: [
    { label: 'orders.act_shipped',       next: 'shipped',    bg: 'bg-orange-500 hover:bg-orange-600' },
  ],
  shipped:    [
    { label: 'orders.act_delivered',     next: 'delivered',  bg: 'bg-green-600 hover:bg-green-700' },
    { label: 'orders.act_returned',          next: 'returned',   bg: 'bg-red-500 hover:bg-red-600' },
  ],
  failed_1:   [
    { label: 'orders.act_confirm',   next: 'confirmed',  bg: 'bg-green-500 hover:bg-green-600' },
    { label: 'orders.act_failed2',       next: 'failed_2',   bg: 'bg-yellow-600 hover:bg-yellow-700' },
    { label: 'orders.act_cancel',          next: 'cancelled',  bg: 'bg-red-500 hover:bg-red-600' },
  ],
  failed_2:   [
    { label: 'orders.act_confirm',   next: 'confirmed',  bg: 'bg-green-500 hover:bg-green-600' },
    { label: 'orders.act_failed3',       next: 'failed_3',   bg: 'bg-red-500 hover:bg-red-600' },
    { label: 'orders.act_cancel',          next: 'cancelled',  bg: 'bg-red-600 hover:bg-red-700' },
  ],
  failed_3:   [
    { label: 'orders.act_confirm',   next: 'confirmed',  bg: 'bg-green-500 hover:bg-green-600' },
    { label: 'orders.act_cancel_final',    next: 'cancelled',  bg: 'bg-red-700 hover:bg-red-800' },
  ],
  postponed:  [
    { label: 'orders.act_confirm',   next: 'confirmed',  bg: 'bg-green-500 hover:bg-green-600' },
    { label: 'orders.act_cancel',          next: 'cancelled',  bg: 'bg-red-500 hover:bg-red-600' },
  ],
}

const CANCEL_ELIGIBLE: string[] = [] // Cancel now handled in STATUS_TRANSITIONS per state

interface Props { order: Order & { wilaya?: any; commune?: any; items?: any[] }; store: Store }

export default function OrderActions({ order, store }: Props) {
  const tr = useT()
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [trackingInput, setTrackingInput] = useState(order.tracking_number ?? '')

  const supabase = createClient()

  const updateStatus = async (newStatus: string) => {
    setLoading(newStatus)
    try {
      // Use API route for history tracking
      const res = await fetch(`/api/orders/${order.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, changed_by: 'dashboard' }),
      })
      if (!res.ok) {
        // Fallback: direct DB update
        const updates: Record<string, unknown> = { status: newStatus }
        if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString()
        if (newStatus === 'shipped')   updates.shipped_at   = new Date().toISOString()
        if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString()
        await supabase.from('orders').update(updates).eq('id', order.id)
      }
    } catch {
      const updates: Record<string, unknown> = { status: newStatus }
      await supabase.from('orders').update(updates).eq('id', order.id)
    }
    router.refresh()
    setLoading(null)
  }

  const logCallAttempt = async () => {
    setLoading('call')
    await supabase.from('orders').update({
      call_attempts: (order.call_attempts ?? 0) + 1,
      last_call_at: new Date().toISOString(),
    }).eq('id', order.id)
    router.refresh()
    setLoading(null)
  }

  const saveTracking = async () => {
    setLoading('tracking')
    await supabase.from('orders').update({ tracking_number: trackingInput }).eq('id', order.id)
    router.refresh()
    setLoading(null)
  }

  const printLabel = () => {
    const label = orderToLabelData(order as any, store.name, store.phone ?? undefined)
    generateA6Label(label)
  }

  const transitions = STATUS_TRANSITIONS[order.status] ?? []
  const canCancel   = CANCEL_ELIGIBLE.includes(order.status)

  return (
    <div className="flex flex-wrap items-center gap-2" style={{fontFamily:'var(--font-arabic)'}}>
      {/* Tracking input */}
      <div className="flex items-center gap-1.5">
        <input
          value={trackingInput}
          onChange={e => setTrackingInput(e.target.value)}
          placeholder={tr('orders.tracking_ph')}
          className="input text-sm w-36 h-8"
          dir="ltr"
        />
        <button onClick={saveTracking} disabled={loading === 'tracking'}
          className="btn btn-ghost btn-sm">
          {loading === 'tracking' ? '...' : tr('common.save')}
        </button>
      </div>

      {/* Call attempt */}
      <button onClick={logCallAttempt} disabled={loading === 'call'}
        className="btn btn-sm gap-1.5" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)'}}>
        <Phone size={13} />
        {tr('orders.call', { count: order.call_attempts ?? 0 })}
      </button>

      {/* Print */}
      <button onClick={printLabel}
        className="btn btn-sm gap-1.5" style={{background:'#EBF5FF',color:'var(--color-accent)',border:'1px solid var(--color-accent-soft)'}}>
        <Printer size={13} />
        {tr('orders.print_invoice')}
      </button>

      {/* Status transitions */}
      {transitions.map(a => (
        <button key={a.next} onClick={() => updateStatus(a.next)} disabled={!!loading}
          className={`btn btn-sm gap-1.5 text-white ${a.bg} disabled:opacity-50`}
          style={{border:'none'}}>
          <CheckCircle size={13} />
          {loading === a.next ? tr('common.loading') : tr(a.label)}
        </button>
      ))}

      {/* WhatsApp */}
      {(order as any).customer_phone && (
        <a
          href={`https://wa.me/${((order as any).customer_phone ?? '').replace(/\D/g,'').replace(/^0/,'213')}?text=${encodeURIComponent(tr('orders.wa_msg', { name: (order as any).customer_name, order: order.order_number }))}`}
          target="_blank" rel="noopener noreferrer"
          className="btn btn-sm gap-1.5" style={{background:'#25D366',color:'#fff',border:'none'}}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
          {tr('orders.whatsapp')}
        </a>
      )}
    </div>
  )
}
