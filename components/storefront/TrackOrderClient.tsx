'use client'
import { useState } from 'react'
import { Search, Loader2, PackageCheck, Phone, Truck, CheckCircle2, ClipboardCheck, Clock } from 'lucide-react'

interface TrackedOrder {
  order_number: string
  created_at: string
  status: string
  total: number
  tracking_number: string | null
  delivery_partner: string | null
  delivery_type: string | null
  confirmed_at: string | null
  shipped_at: string | null
  delivered_at: string | null
  first_name: string
  items: { name: string; qty: number; variant?: string | null }[]
}

// Customer wording for each internal status.
const STATUS: Record<string, { label: string; tone: string }> = {
  new:        { label: 'قيد المراجعة — سنتصل بك لتأكيد الطلب', tone: '#B45309' },
  pending:    { label: 'قيد المراجعة — سنتصل بك لتأكيد الطلب', tone: '#B45309' },
  confirmed:  { label: 'تم تأكيد طلبك ويجري تجهيزه', tone: '#0D6EFD' },
  processing: { label: 'طلبك قيد التجهيز', tone: '#0D6EFD' },
  shipped:    { label: 'طلبك في الطريق إليك', tone: '#7C3AED' },
  delivered:  { label: 'تم تسليم الطلب — شكراً لثقتك', tone: '#15803D' },
  postponed:  { label: 'تم تأجيل الطلب حسب طلبك', tone: '#B45309' },
  failed_1:   { label: 'حاولنا الاتصال بك ولم نتمكن — سنعيد المحاولة', tone: '#B45309' },
  failed_2:   { label: 'حاولنا الاتصال بك ولم نتمكن — سنعيد المحاولة', tone: '#B45309' },
  failed_3:   { label: 'تعذّر الاتصال بك — تواصل معنا لإكمال الطلب', tone: '#B91C1C' },
  cancelled:  { label: 'تم إلغاء الطلب', tone: '#6B7280' },
  returned:   { label: 'أُعيد الطرد إلى المتجر', tone: '#6B7280' },
}

const STEPS = [
  { key: 'created',   label: 'استلام الطلب', icon: ClipboardCheck },
  { key: 'confirmed', label: 'التأكيد',       icon: Phone },
  { key: 'shipped',   label: 'الشحن',         icon: Truck },
  { key: 'delivered', label: 'التسليم',       icon: CheckCircle2 },
]

function stepReached(o: TrackedOrder): number {
  if (o.status === 'delivered' || o.delivered_at) return 3
  if (o.status === 'shipped' || o.shipped_at || o.tracking_number) return 2
  if (o.status === 'confirmed' || o.status === 'processing' || o.confirmed_at) return 1
  return 0
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'long', year: 'numeric' })
const fmtPrice = (n: number) => `${Number(n).toLocaleString('fr-DZ').replace(/ |\s/g, '.')} دج`

export default function TrackOrderClient({ storeSlug, storePhone }: { storeSlug: string; storePhone: string | null }) {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [orders, setOrders] = useState<TrackedOrder[] | null>(null)

  const search = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setOrders(null); setLoading(true)
    try {
      const res = await fetch('/api/storefront/track', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeSlug, phone }),
      })
      const data = await res.json()
      if (!res.ok) setError(data.error ?? 'حدث خطأ، أعد المحاولة')
      else setOrders(data.orders ?? [])
    } catch { setError('تعذّر الاتصال، تحقق من الإنترنت وأعد المحاولة') }
    setLoading(false)
  }

  return (
    <div className="min-h-[70vh] px-4 py-10" dir="rtl" style={{ background: 'var(--pt-bg,#FAFAF8)' }}>
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <PackageCheck className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--pt-accent,#0D6EFD)' }} />
          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--pt-text,#111)' }}>تتبع طلبي</h1>
          <p className="text-sm mt-1 opacity-70">أدخل رقم الهاتف الذي استعملته عند الطلب</p>
        </div>

        <form onSubmit={search} className="flex gap-2 mb-6">
          <input
            type="tel" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="05XX XX XX XX" dir="ltr" required
            className="flex-1 rounded-xl border px-4 py-3 text-base text-center bg-white"
            style={{ borderColor: 'rgba(0,0,0,0.12)' }}
          />
          <button type="submit" disabled={loading}
            className="rounded-xl px-5 py-3 font-bold text-white flex items-center gap-2 disabled:opacity-60"
            style={{ background: 'var(--pt-accent,#0D6EFD)' }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            تتبع
          </button>
        </form>

        {error && <p className="text-center text-red-600 text-sm mb-4">{error}</p>}

        {orders && orders.length === 0 && (
          <div className="text-center rounded-2xl bg-white p-6 text-sm" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
            لم نجد طلبات بهذا الرقم. تأكد من الرقم{storePhone ? <> أو اتصل بنا على <a href={`tel:${storePhone}`} className="font-bold underline" dir="ltr">{storePhone}</a></> : null}.
          </div>
        )}

        <div className="space-y-4">
          {orders?.map(o => {
            const st = STATUS[o.status] ?? { label: 'قيد المعالجة', tone: '#374151' }
            const reached = ['cancelled', 'returned'].includes(o.status) ? -1 : stepReached(o)
            return (
              <div key={o.order_number} className="rounded-2xl bg-white p-5" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                <div className="flex items-center justify-between text-xs opacity-70 mb-2">
                  <span dir="ltr">{o.order_number}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDate(o.created_at)}</span>
                </div>
                <p className="font-bold mb-3" style={{ color: st.tone }}>{st.label}</p>

                {reached >= 0 && (
                  <div className="flex items-center justify-between mb-4">
                    {STEPS.map((s, i) => {
                      const Icon = s.icon, done = i <= reached
                      return (
                        <div key={s.key} className="flex-1 flex flex-col items-center text-center">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1"
                            style={{ background: done ? 'var(--pt-accent,#0D6EFD)' : '#E5E7EB', color: done ? '#fff' : '#9CA3AF' }}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-[11px]" style={{ opacity: done ? 1 : 0.5 }}>{s.label}</span>
                        </div>
                      )
                    })}
                  </div>
                )}

                <ul className="text-sm space-y-1 mb-3">
                  {o.items.map((it, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{it.name}{it.variant && it.variant !== 'default' ? ` — ${it.variant}` : ''}</span>
                      <span className="opacity-70">×{it.qty}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex justify-between text-sm font-bold border-t pt-3" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
                  <span>المجموع</span><span>{fmtPrice(o.total)}</span>
                </div>
                {o.tracking_number && (
                  <p className="text-xs mt-3 opacity-80">
                    رقم التتبع{o.delivery_partner ? ` (${o.delivery_partner})` : ''}: <span className="font-mono font-bold" dir="ltr">{o.tracking_number}</span>
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
