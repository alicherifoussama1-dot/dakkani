'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Phone, CheckCircle, XCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateA6Label, orderToLabelData } from '@/lib/labels/generator'
import type { Order, Store } from '@/types'

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; bg: string }[]> = {
  new:        [{ label: 'تأكيد الطلب',    next: 'confirmed',  bg: 'bg-green-500 hover:bg-green-600' }],
  confirmed:  [{ label: 'بدء المعالجة',   next: 'processing', bg: 'bg-purple-500 hover:bg-purple-600' }],
  processing: [{ label: 'تم الشحن',        next: 'shipped',    bg: 'bg-orange-500 hover:bg-orange-600' }],
  shipped:    [{ label: 'تم التسليم',      next: 'delivered',  bg: 'bg-green-600 hover:bg-green-700' }],
}

const CANCEL_ELIGIBLE = ['new', 'confirmed', 'processing']

interface Props { order: Order & { wilaya?: any; commune?: any; items?: any[] }; store: Store }

export default function OrderActions({ order, store }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [trackingInput, setTrackingInput] = useState(order.tracking_number ?? '')

  const supabase = createClient()

  const updateStatus = async (newStatus: string) => {
    setLoading(newStatus)
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString()
    if (newStatus === 'shipped')   updates.shipped_at   = new Date().toISOString()
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString()
    await supabase.from('orders').update(updates).eq('id', order.id)
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
          placeholder="رقم التتبع..."
          className="input text-sm w-36 h-8"
          dir="ltr"
        />
        <button onClick={saveTracking} disabled={loading === 'tracking'}
          className="btn btn-ghost btn-sm">
          {loading === 'tracking' ? '...' : 'حفظ'}
        </button>
      </div>

      {/* Call attempt */}
      <button onClick={logCallAttempt} disabled={loading === 'call'}
        className="btn btn-sm gap-1.5" style={{border:'1px solid var(--color-border)',background:'#fff',color:'var(--color-text-secondary)'}}>
        <Phone size={13} />
        اتصال ({order.call_attempts ?? 0})
      </button>

      {/* Print */}
      <button onClick={printLabel}
        className="btn btn-sm gap-1.5" style={{background:'#EBF5FF',color:'var(--color-accent)',border:'1px solid var(--color-accent-soft)'}}>
        <Printer size={13} />
        طباعة الفاتورة
      </button>

      {/* Status transitions */}
      {transitions.map(t => (
        <button key={t.next} onClick={() => updateStatus(t.next)} disabled={!!loading}
          className={`btn btn-sm gap-1.5 text-white ${t.bg} disabled:opacity-50`}
          style={{border:'none'}}>
          <CheckCircle size={13} />
          {loading === t.next ? 'جارٍ...' : t.label}
        </button>
      ))}

      {/* Cancel */}
      {canCancel && (
        <button
          onClick={() => { if (confirm('تأكيد إلغاء الطلب؟')) updateStatus('cancelled') }}
          disabled={!!loading}
          className="btn btn-sm gap-1.5 disabled:opacity-50" style={{background:'#FEE2E2',color:'#DC3545',border:'none'}}>
          <XCircle size={13} />إلغاء
        </button>
      )}
    </div>
  )
}
