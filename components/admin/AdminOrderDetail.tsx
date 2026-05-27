'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDZD, formatDate } from '@/lib/utils/format'
import { generateA6Label, orderToLabelData } from '@/lib/labels/generator'
import {
  Phone, Printer, Truck, CheckCircle, X, Clock,
  AlertTriangle, ShieldAlert, MessageSquare, FileText,
  ChevronDown, Loader2, ExternalLink,
} from 'lucide-react'

const STATUS_STEPS = ['new', 'confirmed', 'processing', 'shipped', 'delivered']
const STATUS_LABELS: Record<string, string> = {
  new: 'جديد', confirmed: 'مؤكد', processing: 'يُعالج',
  shipped: 'شُحن', delivered: 'سُلّم', returned: 'مُرجع', cancelled: 'ملغى',
}

interface Props { order: any; store: any; wilayas: { id: number; name_ar: string }[] }

export default function AdminOrderDetail({ order, store, wilayas }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [status,       setStatus]       = useState(order.status)
  const [tracking,     setTracking]     = useState(order.tracking_number ?? '')
  const [provider,     setProvider]     = useState(order.delivery_partner ?? 'yalidine')
  const [internalNote, setNote]         = useState(order.internal_notes ?? '')
  const [aiScript,     setAiScript]     = useState<string | null>(null)
  const [loading,      setLoading]      = useState<string | null>(null)
  const [callResult,   setCallResult]   = useState<string | null>(null)

  const fraudScore = order.fraud_score ?? 0
  const fraudLevel = fraudScore >= 70 ? 'high' : fraudScore >= 40 ? 'medium' : 'low'

  // ── Actions ───────────────────────────────────────────
  const updateStatus = async (newStatus: string) => {
    setLoading(newStatus)
    const updates: Record<string, unknown> = { status: newStatus }
    if (newStatus === 'confirmed') updates.confirmed_at = new Date().toISOString()
    if (newStatus === 'shipped')   updates.shipped_at   = new Date().toISOString()
    if (newStatus === 'delivered') updates.delivered_at  = new Date().toISOString()
    await supabase.from('orders').update(updates).eq('id', order.id)
    setStatus(newStatus)
    router.refresh()
    setLoading(null)
  }

  const saveTracking = async () => {
    setLoading('tracking')
    await supabase.from('orders').update({ tracking_number: tracking, delivery_partner: provider }).eq('id', order.id)
    setLoading(null)
    router.refresh()
  }

  const sendToDelivery = async () => {
    setLoading('delivery')
    const res = await fetch('/api/delivery/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: order.id, provider }),
    })
    const data = await res.json()
    if (data.ok) setTracking(data.trackingId)
    setLoading(null)
    router.refresh()
  }

  const logCall = async (result: string) => {
    setLoading('call-' + result)
    const recallAt = result === 'recall_2h' ? new Date(Date.now() + 2*60*60*1000).toISOString()
      : result === 'recall_tomorrow' ? new Date(Date.now() + 24*60*60*1000).toISOString() : null

    await supabase.from('orders').update({
      call_attempts: order.call_attempts + 1,
      last_call_at: new Date().toISOString(),
      ...(result === 'confirmed' ? { status: 'confirmed', confirmed_at: new Date().toISOString() } : {}),
      ...(result === 'fake'      ? { status: 'cancelled' } : {}),
    }).eq('id', order.id)

    setCallResult(result)
    router.refresh()
    setLoading(null)
  }

  const saveNote = async () => {
    setLoading('note')
    await supabase.from('orders').update({ internal_notes: internalNote }).eq('id', order.id)
    setLoading(null)
  }

  const generateAiScript = async () => {
    setLoading('ai')
    const productNames = order.items?.map((i: any) => i.product_name).join(', ') ?? ''
    const prompt = `أنت موظف مركز اتصال في متجر "${store.name}". اكتب نص اتصال قصير بالدارجة الجزائرية لتأكيد طلب العميل ${order.customer_name} رقم ${order.order_number}. المنتجات: ${productNames}. المبلغ: ${order.total} دج. الولاية: ${order.wilaya?.name_ar}. النص يجب أن يكون ودياً، قصيراً (3-4 جمل)، ويتضمن تأكيد المعلومات والسؤال عن أفضل وقت للتوصيل.`

    try {
      const res = await fetch('/api/ai/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, orderId: order.id }),
      })
      const data = await res.json()
      setAiScript(data.script ?? 'تعذر توليد النص')
    } catch {
      setAiScript('السلام عليكم، تكلمت مع ' + order.customer_name + '؟ عندنا طلب رقم ' + order.order_number + ' نحتاجو نأكدوه معاك.')
    }
    setLoading(null)
  }

  const printLabel = () => {
    const label = orderToLabelData(order, store.name, store.phone)
    generateA6Label(label)
  }

  // ── Section wrapper ───────────────────────────────────
  const Section = ({ title, icon: Icon, children, defaultOpen = true }: any) => {
    const [open, setOpen] = useState(defaultOpen)
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-800/50 transition"
        >
          <div className="flex items-center gap-2 text-gray-300 font-semibold text-sm">
            <Icon className="w-4 h-4 text-[#0D6EFD]" />
            {title}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-600 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
      </div>
    )
  }

  const stepIdx = STATUS_STEPS.indexOf(status)

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-white">{order.order_number}</h1>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${
              status === 'delivered' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
              status === 'cancelled' ? 'bg-gray-500/20 text-gray-400' :
              'bg-[#0D6EFD]/20 text-[#60A5FA] border border-[#0D6EFD]/30'
            }`}>
              {STATUS_LABELS[status] ?? status}
            </span>
            {order.is_blacklisted && (
              <span className="text-xs bg-red-900/50 text-red-400 border border-red-700/50 px-2 py-0.5 rounded-full">⛔ محظور</span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">{formatDate(order.created_at)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={printLabel} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg transition">
            <Printer className="w-3.5 h-3.5" />ملصق التوصيل
          </button>
          {status !== 'delivered' && status !== 'cancelled' && (
            <>
              {STATUS_STEPS.indexOf(status) < STATUS_STEPS.length - 1 && (
                <button
                  onClick={() => updateStatus(STATUS_STEPS[stepIdx + 1])}
                  disabled={!!loading}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 bg-[#0D6EFD] text-white hover:bg-[#0B5ED7] rounded-lg transition disabled:opacity-50"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  {STATUS_LABELS[STATUS_STEPS[stepIdx + 1]]}
                </button>
              )}
              <button
                onClick={() => confirm('إلغاء الطلب؟') && updateStatus('cancelled')}
                className="flex items-center gap-1.5 text-xs px-3 py-2 bg-red-900/30 text-red-400 hover:bg-red-900/50 rounded-lg transition"
              >
                <X className="w-3.5 h-3.5" />إلغاء
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Progress bar ── */}
      {!['returned','cancelled','failed'].includes(status) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex-1 flex items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    i < stepIdx ? 'bg-green-500 text-white' :
                    i === stepIdx ? 'bg-[#0D6EFD] text-white ring-2 ring-[#60A5FA]/30' :
                    'bg-gray-800 text-gray-600'
                  }`}>
                    {i < stepIdx ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs ${i <= stepIdx ? 'text-gray-300' : 'text-gray-600'}`}>
                    {STATUS_LABELS[step]}
                  </span>
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < stepIdx ? 'bg-green-500' : 'bg-gray-800'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer Info */}
          <Section title="معلومات العميل" icon={Phone}>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ['الاسم', order.customer_name],
                ['الهاتف', order.customer_phone],
                ['هاتف بديل', order.customer_phone2],
                ['الولاية', order.wilaya?.name_ar],
                ['البلدية', order.commune?.name_ar],
                ['العنوان', order.address],
              ].filter(([,v]) => v).map(([label, val]) => (
                <div key={label as string}>
                  <p className="text-xs text-gray-600 mb-0.5">{label}</p>
                  <p className="text-gray-200 font-medium">{val}</p>
                </div>
              ))}
            </div>
            {order.notes && (
              <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-3">
                <p className="text-xs text-yellow-500">ملاحظة العميل</p>
                <p className="text-sm text-yellow-300 mt-1">{order.notes}</p>
              </div>
            )}
          </Section>

          {/* Products */}
          <Section title="المنتجات" icon={FileText}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  {['المنتج', 'الكمية', 'السعر', 'المجموع'].map(h => (
                    <th key={h} className="text-right text-xs text-gray-600 pb-2">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {order.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="py-2">
                      <p className="text-gray-200">{item.product_name}</p>
                      {item.variant_label && <p className="text-xs text-gray-500">{item.variant_label}</p>}
                    </td>
                    <td className="py-2 text-gray-400">{item.quantity}</td>
                    <td className="py-2 text-gray-400">{formatDZD(item.unit_price)}</td>
                    <td className="py-2 text-gray-200 font-semibold">{formatDZD(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Totals */}
            <div className="space-y-1.5 pt-2 border-t border-gray-800 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>المجموع الفرعي</span><span>{formatDZD(order.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>رسوم التوصيل</span><span>{formatDZD(order.delivery_fee)}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-500">
                  <span>خصم {order.coupon_code}</span><span>-{formatDZD(order.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-white text-base border-t border-gray-700 pt-2">
                <span>المجموع الكلي</span>
                <span className="text-[#60A5FA]">{formatDZD(order.total)}</span>
              </div>
            </div>
          </Section>

          {/* Shipping section */}
          <Section title="الشحن والتوصيل" icon={Truck}>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">شركة التوصيل</label>
                <select
                  value={provider}
                  onChange={e => setProvider(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
                >
                  {['yalidine', 'zrexpress', 'maystro'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">رقم التتبع</label>
                <input
                  value={tracking}
                  onChange={e => setTracking(e.target.value)}
                  placeholder="tracking..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 font-mono focus:ring-1 focus:ring-[#0D6EFD] outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={sendToDelivery}
                  disabled={loading === 'delivery'}
                  className="flex items-center justify-center gap-1.5 text-xs py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition disabled:opacity-50"
                >
                  {loading === 'delivery' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
                  إرسال للتوصيل
                </button>
                <button
                  onClick={saveTracking}
                  disabled={loading === 'tracking'}
                  className="text-xs py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition disabled:opacity-50"
                >
                  {loading === 'tracking' ? '...' : 'حفظ التتبع'}
                </button>
              </div>
            </div>
            {/* Delivery timeline */}
            {order.logs?.length > 0 && (
              <div className="space-y-2 mt-2">
                {order.logs.slice(-5).reverse().map((log: any, i: number) => (
                  <div key={i} className="flex items-start gap-3 text-xs">
                    <div className="w-2 h-2 bg-[#0D6EFD] rounded-full mt-1 flex-shrink-0" />
                    <div>
                      <span className="text-gray-300 font-medium">{log.status}</span>
                      {log.description && <span className="text-gray-500 ml-2">{log.description}</span>}
                      <p className="text-gray-600">{formatDate(log.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-4">
          {/* Fraud Score */}
          <Section title="تقييم الاحتيال" icon={ShieldAlert}>
            <div className={`text-center p-4 rounded-xl ${
              fraudLevel === 'high'   ? 'bg-red-900/20 border border-red-700/30' :
              fraudLevel === 'medium' ? 'bg-yellow-900/20 border border-yellow-700/30' :
              'bg-green-900/20 border border-green-700/30'
            }`}>
              <p className={`text-4xl font-black ${
                fraudLevel === 'high' ? 'text-red-400' :
                fraudLevel === 'medium' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {fraudScore}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {fraudLevel === 'high' ? 'خطر عالٍ — راجع الطلب قبل التأكيد' :
                 fraudLevel === 'medium' ? 'خطر متوسط — تحقق من العميل' :
                 'خطر منخفض'}
              </p>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div className="flex justify-between">
                <span>محاولات الاتصال</span>
                <span className="text-gray-300">{order.call_attempts}</span>
              </div>
              <div className="flex justify-between">
                <span>نوع الدفع</span>
                <span className="text-gray-300">{order.payment_method?.toUpperCase()}</span>
              </div>
              {order.utm_source && (
                <div className="flex justify-between">
                  <span>المصدر</span>
                  <span className="text-gray-300">{order.utm_source}</span>
                </div>
              )}
            </div>
          </Section>

          {/* Call center panel */}
          <Section title="مركز الاتصال" icon={Phone}>
            <div className="space-y-2">
              <a
                href={`tel:${order.customer_phone}`}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition text-sm"
              >
                <Phone className="w-4 h-4" />
                اتصال بـ {order.customer_phone}
              </a>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'confirmed',       label: '✅ مؤكد',             cls: 'bg-green-900/30 text-green-400 border-green-700/30' },
                  { id: 'recall_2h',       label: '⏰ إعادة بعد 2 ساعة', cls: 'bg-blue-900/30 text-blue-400 border-blue-700/30' },
                  { id: 'recall_tomorrow', label: '📅 إعادة غداً',        cls: 'bg-purple-900/30 text-purple-400 border-purple-700/30' },
                  { id: 'fake',            label: '❌ وهمي',              cls: 'bg-red-900/30 text-red-400 border-red-700/30' },
                ].map(r => (
                  <button
                    key={r.id}
                    onClick={() => logCall(r.id)}
                    disabled={!!loading}
                    className={`text-xs py-2 border rounded-lg transition ${r.cls} ${
                      callResult === r.id ? 'ring-2 ring-offset-1 ring-offset-gray-900 ring-current' : ''
                    } disabled:opacity-50`}
                  >
                    {loading === 'call-' + r.id ? '...' : r.label}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          {/* AI Darija Script */}
          <Section title="نص الاتصال (AI)" icon={MessageSquare} defaultOpen={false}>
            {aiScript ? (
              <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 leading-relaxed">
                {aiScript}
              </div>
            ) : (
              <button
                onClick={generateAiScript}
                disabled={loading === 'ai'}
                className="w-full py-2 text-xs bg-[#0D6EFD]/20 text-[#60A5FA] border border-[#0D6EFD]/30 hover:bg-[#0D6EFD]/30 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading === 'ai' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '✨'}
                توليد نص بالدارجة الجزائرية
              </button>
            )}
          </Section>

          {/* Internal Notes */}
          <Section title="ملاحظات داخلية" icon={FileText} defaultOpen={false}>
            <textarea
              value={internalNote}
              onChange={e => setNote(e.target.value)}
              rows={4}
              placeholder="ملاحظات خاصة بالفريق..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:ring-1 focus:ring-[#0D6EFD] outline-none resize-none"
            />
            <button
              onClick={saveNote}
              disabled={loading === 'note'}
              className="w-full text-xs py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition disabled:opacity-50"
            >
              {loading === 'note' ? 'جارٍ الحفظ...' : 'حفظ الملاحظة'}
            </button>
          </Section>
        </div>
      </div>
    </div>
  )
}
