'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDZD, formatDate } from '@/lib/utils/format'
import {
  Phone, PhoneOff, CheckCircle, Clock, X,
  AlertTriangle, BarChart2, User, Loader2,
  ChevronLeft, ChevronRight, Bell,
} from 'lucide-react'

interface QueueOrder {
  id: string; order_number: string; customer_name: string; customer_phone: string
  total: number; status: string; call_attempts: number; last_call_at?: string; created_at: string
  wilaya?: { name_ar: string }; items?: { product_name: string; quantity: number }[]
}
interface Stats { todayCalls: number; todayConfirmed: number; todayTotal: number; confirmRate: number }
interface Props { storeId: string; storeName: string; initialQueue: QueueOrder[]; stats: Stats }

const CALL_RESULTS = [
  { id: 'confirmed',       label: 'مؤكد ✅',             cls: 'bg-green-500 hover:bg-green-600 text-white',  hotkey: '1' },
  { id: 'recall_2h',       label: 'إعادة بعد 2 ساعة ⏰',  cls: 'bg-blue-500 hover:bg-blue-600 text-white',   hotkey: '2' },
  { id: 'recall_tomorrow', label: 'إعادة غداً 📅',         cls: 'bg-purple-500 hover:bg-purple-600 text-white', hotkey: '3' },
  { id: 'no_answer',       label: 'لا يرد 📵',             cls: 'bg-yellow-500 hover:bg-yellow-600 text-white', hotkey: '4' },
  { id: 'fake',            label: 'وهمي / مزيف ❌',        cls: 'bg-red-500 hover:bg-red-600 text-white',      hotkey: '5' },
]

export default function CallCenterPage({ storeId, storeName, initialQueue, stats }: Props) {
  const router  = useRouter()
  const supabase = createClient()

  const [queue,       setQueue]       = useState<QueueOrder[]>(initialQueue)
  const [activeIdx,   setActiveIdx]   = useState(0)
  const [aiScript,    setAiScript]    = useState<string>('')
  const [loadingAI,   setLoadingAI]   = useState(false)
  const [loadingCall, setLoadingCall] = useState<string | null>(null)
  const [callNote,    setCallNote]    = useState('')
  const [sessionStats, setSession]    = useState({ calls: 0, confirmed: 0, recalled: 0, fake: 0 })

  const activeOrder = queue[activeIdx] ?? null

  // ── Realtime: add new orders to queue ────────────────
  useEffect(() => {
    const channel = supabase
      .channel('call-center-queue')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        const o = payload.new as QueueOrder
        if (['new', 'confirmed'].includes(o.status)) {
          setQueue(prev => [...prev, o])
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`,
      }, (payload) => {
        const updated = payload.new as QueueOrder
        // Remove from queue if status changed to non-callable
        if (!['new', 'confirmed'].includes(updated.status)) {
          setQueue(prev => prev.filter(o => o.id !== updated.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId])

  // ── Auto-generate script when order changes ──────────
  useEffect(() => {
    if (!activeOrder) return
    generateScript(activeOrder)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx])

  const generateScript = async (order: QueueOrder) => {
    setLoadingAI(true)
    const products = order.items?.map(i => `${i.product_name} ×${i.quantity}`).join('، ') ?? ''

    // Darija script template (fallback if AI endpoint not configured)
    const fallback = `السلام عليكم، تكلمت مع ${order.customer_name}؟
أنا نتصل من متجر "${storeName}"، بغينا نأكدو معاك طلب رقم ${order.order_number}.
عندك طلب: ${products}.
المبلغ الإجمالي مع التوصيل: ${order.total.toLocaleString()} دج — الدفع عند الاستلام.
الولاية: ${order.wilaya?.name_ar}.
واش المعلومات صحيحة؟ واش نقدرو نوصلو ليك؟`

    try {
      const res = await fetch('/api/ai/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          prompt: `اكتب نص اتصال بالدارجة الجزائرية لتأكيد طلب من متجر "${storeName}":
- اسم العميل: ${order.customer_name}
- رقم الطلب: ${order.order_number}
- المنتجات: ${products}
- المبلغ: ${order.total.toLocaleString()} دج
- الولاية: ${order.wilaya?.name_ar}
- طريقة الدفع: عند الاستلام
النص يجب أن يكون طبيعي، ودي، وقصير (4-5 جمل). لا تستخدم كلمات إنجليزية.`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAiScript(data.script ?? fallback)
      } else {
        setAiScript(fallback)
      }
    } catch {
      setAiScript(fallback)
    }
    setLoadingAI(false)
  }

  // ── Log call result ───────────────────────────────────
  const logResult = async (result: string) => {
    if (!activeOrder) return
    setLoadingCall(result)

    const updates: Record<string, unknown> = {
      call_attempts: (activeOrder.call_attempts ?? 0) + 1,
      last_call_at: new Date().toISOString(),
    }

    if (result === 'confirmed') {
      updates.status = 'confirmed'
      updates.confirmed_at = new Date().toISOString()
      if (callNote) updates.internal_notes = callNote
    } else if (result === 'fake') {
      updates.status = 'cancelled'
      if (callNote) updates.internal_notes = `وهمي: ${callNote}`
    } else if (result === 'no_answer') {
      // keep status, increment attempts
    }

    await supabase.from('orders').update(updates).eq('id', activeOrder.id)

    // Update session stats
    setSession(s => ({
      ...s,
      calls: s.calls + 1,
      confirmed: result === 'confirmed' ? s.confirmed + 1 : s.confirmed,
      recalled:  result.startsWith('recall') ? s.recalled + 1 : s.recalled,
      fake:      result === 'fake' ? s.fake + 1 : s.fake,
    }))

    // Move to next order
    setCallNote('')
    const nextIdx = Math.min(activeIdx + 1, queue.length - 1)

    // Remove from queue if terminal
    if (['confirmed', 'fake'].includes(result)) {
      setQueue(prev => prev.filter(o => o.id !== activeOrder.id))
      setActiveIdx(Math.max(0, nextIdx - 1))
    } else {
      // Move to end of queue (will retry later)
      const updated = { ...activeOrder, call_attempts: (activeOrder.call_attempts ?? 0) + 1 }
      setQueue(prev => [...prev.filter(o => o.id !== activeOrder.id), updated])
      setActiveIdx(0)
    }

    setLoadingCall(null)
  }

  // ── Keyboard shortcuts ────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return
      const result = CALL_RESULTS.find(r => r.hotkey === e.key)
      if (result) logResult(result.id)
      if (e.key === 'ArrowRight') setActiveIdx(i => Math.max(0, i - 1))
      if (e.key === 'ArrowLeft')  setActiveIdx(i => Math.min(queue.length - 1, i + 1))
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOrder, queue])

  const waitTime = activeOrder
    ? Math.round((Date.now() - new Date(activeOrder.created_at).getTime()) / 60000)
    : 0

  return (
    <div className="flex h-full" dir="rtl">
      {/* ── LEFT: Queue ─────────────────────────────── */}
      <div className="w-72 bg-gray-900 border-l border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-300">قائمة الانتظار</h2>
            <span className="text-xs bg-[#0D6EFD]/20 text-[#F96540] px-2 py-0.5 rounded-full">{queue.length}</span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {queue.map((order, idx) => (
            <button
              key={order.id}
              onClick={() => setActiveIdx(idx)}
              className={`w-full text-right px-4 py-3 border-b border-gray-800/50 hover:bg-gray-800/50 transition ${
                idx === activeIdx ? 'bg-[#0D6EFD]/10 border-r-2 border-r-[#0D6EFD]' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-mono text-[#F96540]">{order.order_number}</span>
                {(order.call_attempts ?? 0) > 0 && (
                  <span className="text-xs bg-yellow-900/30 text-yellow-500 px-1.5 rounded">
                    {order.call_attempts}× محاولة
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-300 font-medium truncate">{order.customer_name}</p>
              <p className="text-xs text-gray-500">{order.customer_phone}</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-[#0D6EFD] font-bold">{formatDZD(order.total)}</span>
                <span className="text-xs text-gray-600">{order.wilaya?.name_ar}</span>
              </div>
            </button>
          ))}
          {queue.length === 0 && (
            <div className="text-center py-12 text-gray-600 text-sm">
              <CheckCircle className="w-8 h-8 mx-auto mb-2 opacity-30" />
              قائمة الانتظار فارغة 🎉
            </div>
          )}
        </div>
      </div>

      {/* ── CENTER: Active Call Interface ───────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeOrder ? (
          <>
            {/* Call header */}
            <div className="px-6 py-4 border-b border-gray-800 bg-gray-900/50">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#0D6EFD]/20 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-[#F96540]" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-white">{activeOrder.customer_name}</h2>
                      <p className="text-gray-400 text-sm">{activeOrder.customer_phone}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {waitTime > 30 && (
                    <div className="flex items-center gap-1.5 text-xs text-orange-400 bg-orange-900/20 px-3 py-1.5 rounded-lg">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      انتظر {waitTime} دقيقة
                    </div>
                  )}
                  <a
                    href={`tel:${activeOrder.customer_phone}`}
                    className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm transition"
                  >
                    <Phone className="w-4 h-4" />
                    اتصال الآن
                  </a>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-5">
              {/* Order summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">رقم الطلب</p>
                  <p className="font-mono font-bold text-[#F96540]">{activeOrder.order_number}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">المجموع</p>
                  <p className="font-black text-white">{formatDZD(activeOrder.total)}</p>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 mb-1">المحاولات</p>
                  <p className="font-bold text-yellow-400">{activeOrder.call_attempts ?? 0}</p>
                </div>
              </div>

              {/* Products */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">المنتجات</p>
                {activeOrder.items?.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span className="text-gray-300">{item.product_name}</span>
                    <span className="text-gray-500">×{item.quantity}</span>
                  </div>
                ))}
              </div>

              {/* AI Darija Script */}
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    ✨ نص الاتصال بالدارجة
                  </p>
                  <button
                    onClick={() => generateScript(activeOrder)}
                    className="text-xs text-gray-500 hover:text-gray-300 transition"
                  >
                    إعادة توليد
                  </button>
                </div>
                {loadingAI ? (
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جارٍ توليد النص...
                  </div>
                ) : (
                  <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line bg-gray-800/50 rounded-lg p-3">
                    {aiScript}
                  </p>
                )}
              </div>

              {/* Call note */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ملاحظة الاتصال</label>
                <textarea
                  value={callNote}
                  onChange={e => setCallNote(e.target.value)}
                  rows={2}
                  placeholder="ملاحظات اختيارية..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-300 focus:ring-1 focus:ring-[#0D6EFD] outline-none resize-none"
                />
              </div>

              {/* Result buttons */}
              <div>
                <p className="text-xs text-gray-500 mb-2">نتيجة الاتصال</p>
                <div className="grid grid-cols-2 gap-2">
                  {CALL_RESULTS.map(r => (
                    <button
                      key={r.id}
                      onClick={() => logResult(r.id)}
                      disabled={!!loadingCall}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition ${r.cls} disabled:opacity-50`}
                    >
                      {loadingCall === r.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <span className="text-xs opacity-60 bg-black/20 px-1.5 rounded">{r.hotkey}</span>
                      )}
                      {r.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-2 text-center">
                  اختصارات لوحة المفاتيح: 1-5 | → ← للتنقل
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-600">
              <PhoneOff className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-bold">قائمة الانتظار فارغة</p>
              <p className="text-sm mt-1">لا توجد طلبات تنتظر التأكيد</p>
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT: Agent Stats ───────────────────────── */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="text-sm font-bold text-gray-300 flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#0D6EFD]" />
            إحصائيات الجلسة
          </h2>
        </div>

        <div className="p-4 space-y-3">
          {/* Session stats */}
          {[
            { label: 'مكالمات الجلسة',  value: sessionStats.calls,     cls: 'text-white' },
            { label: 'تم تأكيدها',       value: sessionStats.confirmed,  cls: 'text-green-400' },
            { label: 'لإعادة الاتصال',   value: sessionStats.recalled,   cls: 'text-blue-400' },
            { label: 'وهمي / ملغى',      value: sessionStats.fake,       cls: 'text-red-400' },
          ].map(s => (
            <div key={s.label} className="flex justify-between items-center">
              <span className="text-xs text-gray-500">{s.label}</span>
              <span className={`text-lg font-black ${s.cls}`}>{s.value}</span>
            </div>
          ))}

          {sessionStats.calls > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-1">معدل التأكيد</p>
              <div className="relative h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 right-0 bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.round((sessionStats.confirmed / sessionStats.calls) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-green-400 mt-1 font-bold">
                {Math.round((sessionStats.confirmed / sessionStats.calls) * 100)}%
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800 space-y-3">
          <p className="text-xs text-gray-500 font-bold">إحصائيات اليوم (الكل)</p>
          {[
            { label: 'طلبات اليوم',       value: stats.todayTotal,     cls: 'text-white' },
            { label: 'مؤكدة',             value: stats.todayConfirmed, cls: 'text-green-400' },
            { label: 'إجمالي المكالمات', value: stats.todayCalls,     cls: 'text-blue-400' },
            { label: 'معدل التحويل',      value: `${stats.confirmRate}%`, cls: 'text-[#F96540]' },
          ].map(s => (
            <div key={s.label} className="flex justify-between items-center">
              <span className="text-xs text-gray-600">{s.label}</span>
              <span className={`text-sm font-bold ${s.cls}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
