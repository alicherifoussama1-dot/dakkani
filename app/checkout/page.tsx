'use client'
import { useState } from 'react'
import Link from 'next/link'
import Navbar          from '@/components/layout/Navbar'
import MobileBottomNav from '@/components/layout/MobileBottomNav'
import WilayaSelector  from '@/components/ui/WilayaSelector'
import { ChevronRight, Truck, ShieldCheck, Banknote, Loader2 } from 'lucide-react'

const CART_ITEMS = [
  { name: 'قنادر تقليدية أنيقة', price: 3500, qty: 1, emoji: '👗' },
]

export default function CheckoutPage() {
  const [form, setForm] = useState({ name: '', phone: '', address: '', notes: '' })
  const [wilaya, setWilaya] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const subtotal    = CART_ITEMS.reduce((s, i) => s + i.price * i.qty, 0)
  const deliveryFee = wilaya ? 500 : 0
  const total       = subtotal + deliveryFee

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(r => setTimeout(r, 1500)) // simulate
    setLoading(false)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F9F9F9' }} dir="rtl">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="font-black text-2xl mb-2" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
            تم تأكيد طلبك!
          </h2>
          <p className="text-sm mb-6" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
            سنتصل بك قريباً لتأكيد التوصيل
          </p>
          <Link href="/" className="btn btn-accent px-8 h-11 text-sm" style={{ fontFamily: 'var(--font-tajawal)' }}>
            العودة للرئيسية
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      <main
        className="min-h-screen pt-24 pb-20 px-4"
        style={{ backgroundColor: '#F9F9F9' }}
        dir="rtl"
      >
        {/* Breadcrumb */}
        <div className="max-w-4xl mx-auto mb-6 flex items-center gap-2 text-xs" style={{ color: '#999999' }}>
          <Link href="/" style={{ color: '#999999' }}>الرئيسية</Link>
          <ChevronRight size={12} />
          <Link href="/products" style={{ color: '#999999' }}>المنتجات</Link>
          <ChevronRight size={12} />
          <span style={{ color: '#111111' }}>الدفع</span>
        </div>

        <div className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* ── Form ─────────────────────────────── */}
          <form onSubmit={handleSubmit} className="lg:col-span-3 space-y-5">
            {/* Delivery section */}
            <div
              className="rounded-2xl p-6 border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB' }}
            >
              <h2
                className="font-bold text-base mb-4 flex items-center gap-2"
                style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
              >
                <Truck size={18} style={{ color: '#E8431A' }} />
                معلومات التوصيل
              </h2>

              <div className="space-y-4">
                {[
                  { key: 'name',    label: 'الاسم الكامل *',    ph: 'محمد بن علي',   required: true },
                  { key: 'phone',   label: 'رقم الهاتف *',      ph: '0555 xx xx xx', required: true },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                      {f.label}
                    </label>
                    <input
                      required={f.required}
                      value={(form as any)[f.key]}
                      onChange={e => set(f.key, e.target.value)}
                      placeholder={f.ph}
                      className="input"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                    الولاية *
                  </label>
                  <WilayaSelector value={wilaya} onChange={w => setWilaya(w?.id ?? null)} />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                    العنوان التفصيلي
                  </label>
                  <input
                    value={form.address}
                    onChange={e => set('address', e.target.value)}
                    placeholder="الحي، الشارع، رقم البناية..."
                    className="input"
                  />
                </div>
              </div>
            </div>

            {/* Payment section */}
            <div
              className="rounded-2xl p-6 border"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB' }}
            >
              <h2
                className="font-bold text-base mb-4 flex items-center gap-2"
                style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
              >
                <ShieldCheck size={18} style={{ color: '#E8431A' }} />
                طريقة الدفع
              </h2>

              <label
                className="flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer"
                style={{ borderColor: '#E8431A', backgroundColor: '#FFF0ED' }}
              >
                <input type="radio" name="payment" defaultChecked className="accent-[#E8431A] w-4 h-4" />
                <div className="flex items-center gap-3">
                  <Banknote size={22} style={{ color: '#E8431A' }} />
                  <div>
                    <p className="font-bold text-sm" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                      الدفع عند الاستلام
                    </p>
                    <p className="text-xs" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
                      تدفع نقداً عند وصول طلبك
                    </p>
                  </div>
                </div>
              </label>
            </div>

            {/* Mobile submit */}
            <button
              type="submit"
              disabled={loading || !form.name || !form.phone || !wilaya}
              className="btn btn-accent w-full h-13 text-base rounded-xl lg:hidden"
              style={{ fontFamily: 'var(--font-tajawal)', height: '52px' }}
            >
              {loading ? <><Loader2 size={18} className="animate-spin ml-2" />جارٍ التأكيد...</> : `تأكيد الطلب — ${total.toLocaleString('ar-DZ')} دج`}
            </button>
          </form>

          {/* ── Order Summary (desktop sticky) ──── */}
          <div className="lg:col-span-2">
            <div
              className="rounded-2xl p-5 border lg:sticky lg:top-28"
              style={{ backgroundColor: '#FFFFFF', borderColor: '#EBEBEB' }}
            >
              <h3
                className="font-bold text-base mb-4"
                style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}
              >
                ملخص الطلب
              </h3>

              {/* Items */}
              <div className="space-y-3 mb-4">
                {CART_ITEMS.map(item => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                      style={{ backgroundColor: '#F3F3F3' }}
                    >
                      {item.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>
                        {item.name}
                      </p>
                      <p className="text-xs" style={{ color: '#999999' }}>الكمية: {item.qty}</p>
                    </div>
                    <span className="font-bold text-sm" style={{ color: '#E8431A', fontFamily: 'var(--font-inter)' }}>
                      {(item.price * item.qty).toLocaleString('ar-DZ')} دج
                    </span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2.5" style={{ borderColor: '#EBEBEB' }}>
                <div className="flex justify-between text-sm" style={{ color: '#444444' }}>
                  <span style={{ fontFamily: 'var(--font-tajawal)' }}>المجموع الجزئي</span>
                  <span style={{ fontFamily: 'var(--font-inter)' }}>{subtotal.toLocaleString('ar-DZ')} دج</span>
                </div>
                <div className="flex justify-between text-sm" style={{ color: '#444444' }}>
                  <span style={{ fontFamily: 'var(--font-tajawal)' }}>التوصيل</span>
                  <span style={{ fontFamily: 'var(--font-inter)' }}>{deliveryFee > 0 ? `${deliveryFee.toLocaleString('ar-DZ')} دج` : '—'}</span>
                </div>
                <div
                  className="flex justify-between font-black text-base pt-2 border-t"
                  style={{ borderColor: '#EBEBEB' }}
                >
                  <span style={{ color: '#111111', fontFamily: 'var(--font-tajawal)' }}>الإجمالي</span>
                  <span style={{ color: '#E8431A', fontFamily: 'var(--font-inter)' }}>
                    {total.toLocaleString('ar-DZ')} دج
                  </span>
                </div>
              </div>

              {/* Desktop submit */}
              <button
                type="button"
                onClick={() => document.querySelector('form')?.requestSubmit()}
                disabled={loading || !form.name || !form.phone || !wilaya}
                className="btn btn-accent w-full h-12 text-sm rounded-xl mt-4 hidden lg:flex"
                style={{ fontFamily: 'var(--font-tajawal)' }}
              >
                {loading ? <><Loader2 size={16} className="animate-spin ml-2" />جارٍ التأكيد...</> : 'تأكيد الطلب ←'}
              </button>
            </div>
          </div>
        </div>
      </main>
      <MobileBottomNav />
    </>
  )
}
