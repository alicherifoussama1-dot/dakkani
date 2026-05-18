'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, Truck, Phone, CheckCircle, XCircle, ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { generateA6Label, orderToLabelData } from '@/lib/labels/generator'
import type { Order, Store } from '@/types'

const STATUS_TRANSITIONS: Record<string, { label: string; next: string; color: string }[]> = {
  new:        [{ label: 'تأكيد الطلب', next: 'confirmed', color: 'bg-green-500 hover:bg-green-600' }],
  confirmed:  [{ label: 'بدء المعالجة', next: 'processing', color: 'bg-blue-500 hover:bg-blue-600' }],
  processing: [{ label: 'تم الشحن', next: 'shipped', color: 'bg-purple-500 hover:bg-purple-600' }],
  shipped:    [{ label: 'تم التسليم', next: 'delivered', color: 'bg-green-500 hover:bg-green-600' }],
}

const CANCEL_ELIGIBLE = ['new', 'confirmed', 'processing']

interface Props { order: Order & { wilaya?: any; commune?: any; items?: any[] }; store: Store }

export default function OrderActions({ order, store }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [trackingInput, setTrackingInput] = useState(order.tracking_number ?? '')

  const supabase = createClient()

  const updateStatus = async (newStatus: string) => {
    setLoading(newStatus)
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString()
    if (newStatus === 'shipped') updates.shipped_at = new Date().toISOString()
    if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString()
    await supabase.from('orders').update(updates).eq('id', order.id)
    router.refresh()
    setLoading(null)
  }

  const logCallAttempt = async () => {
    setLoading('call')
    await supabase.from('orders').update({
      call_attempts: order.call_attempts + 1,
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
  const canCancel = CANCEL_ELIGIBLE.includes(order.status)

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Tracking number input */}
      <div className="flex items-center gap-1">
        <input
          value={trackingInput}
          onChange={e => setTrackingInput(e.target.value)}
          placeholder="رقم التتبع..."
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-36 focus:ring-2 focus:ring-dakkani-500 outline-none"
        />
        <button
          onClick={saveTracking}
          disabled={loading === 'tracking'}
          className="text-xs bg-gray-100 hover:bg-gray-200 px-2.5 py-1.5 rounded-lg text-gray-700 transition"
        >
          {loading === 'tracking' ? '...' : 'حفظ'}
        </button>
      </div>

      {/* Log call attempt */}
      <button
        onClick={logCallAttempt}
        disabled={loading === 'call'}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-gray-600"
      >
        <Phone className="w-4 h-4" />
        <span>اتصال ({order.call_attempts})</span>
      </button>

      {/* Print label */}
      <button
        onClick={printLabel}
        className="flex items-center gap-1.5 text-sm px-3 py-1.5 border border-dakkani-200 rounded-lg hover:bg-dakkani-50 transition text-dakkani-600"
      >
        <Printer className="w-4 h-4" />
        <span>طباعة الفاتورة</span>
      </button>

      {/* Status transitions */}
      {transitions.map(t => (
        <button
          key={t.next}
          onClick={() => updateStatus(t.next)}
          disabled={!!loading}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 text-white rounded-lg transition disabled:opacity-50 ${t.color}`}
        >
          <CheckCircle className="w-4 h-4" />
          {loading === t.next ? 'جارٍ...' : t.label}
        </button>
      ))}

      {/* Cancel */}
      {canCancel && (
        <button
          onClick={() => confirm('تأكيد إلغاء الطلب؟') && updateStatus('cancelled')}
          disabled={!!loading}
          className="flex items-center gap-1.5 text-sm px-3 py-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition disabled:opacity-50"
        >
          <XCircle className="w-4 h-4" />
          إلغاء
        </button>
      )}
    </div>
  )
}
