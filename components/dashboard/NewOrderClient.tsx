'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Minus, Trash2, Loader2 } from 'lucide-react'
import { formatDZD } from '@/lib/utils/format'

interface Props {
  storeId: string
  products: { id: string; name: string; name_ar?: string | null; price: number; sku?: string | null }[]
  wilayas: { id: number; name_ar: string; delivery_fee_home: number; delivery_fee_stopdesk: number }[]
}

interface Item { productId: string; name: string; price: number; qty: number }

export default function NewOrderClient({ storeId, products, wilayas }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [items,  setItems]  = useState<Item[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')

  const [form, setForm] = useState({
    customer_name: '', customer_phone: '', customer_phone2: '',
    wilaya_id: '', delivery_type: 'home', address: '', notes: '',
  })
  const set = (k: string, v: string) => setForm(f => ({...f, [k]: v}))

  const wilaya = wilayas.find(w => w.id === +form.wilaya_id)
  const deliveryFee = wilaya ? (form.delivery_type === 'stopdesk' ? wilaya.delivery_fee_stopdesk : wilaya.delivery_fee_home) : 0
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0)
  const total = subtotal + deliveryFee

  const addItem = () => {
    const p = products.find(p => p.id === selectedProduct)
    if (!p) return
    const exists = items.find(i => i.productId === p.id)
    if (exists) { setItems(ii => ii.map(i => i.productId === p.id ? {...i, qty: i.qty + 1} : i)); return }
    setItems(ii => [...ii, { productId: p.id, name: p.name_ar ?? p.name, price: p.price, qty: 1 }])
    setSelectedProduct('')
  }

  const save = async () => {
    if (!form.customer_name || !form.customer_phone || !form.wilaya_id || items.length === 0) return
    setSaving(true)

    try {
      // Use /api/orders for proper notifications, history, stock decrement
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_id: storeId,
          customer_name: form.customer_name,
          customer_phone: form.customer_phone,
          customer_phone2: form.customer_phone2 || undefined,
          wilaya_id: +form.wilaya_id,
          delivery_type: form.delivery_type,
          address: form.address || undefined,
          notes: form.notes || undefined,
          source: 'manual',
          payment_method: 'cod',
          items: items.map(i => ({
            product_id: i.productId,
            quantity: i.qty,
            variant_key: 'default',
          })),
        }),
      })
      const data = await res.json()
      if (data.success && data.order_id) {
        router.push(`/orders/${data.order_id}`)
        return
      }

      // Fallback: direct insert if API fails
      const sb = createClient()
      const orderNum = `ORD-${Date.now().toString(36).toUpperCase()}`
      const { data: order, error } = await sb.from('orders').insert({
        store_id: storeId, order_number: orderNum,
        customer_name: form.customer_name, customer_phone: form.customer_phone,
        customer_phone2: form.customer_phone2 || null,
        wilaya_id: +form.wilaya_id, delivery_type: form.delivery_type,
        address: form.address || null, notes: form.notes || null,
        subtotal, delivery_fee: deliveryFee, discount_amount: 0,
        total, status: 'new', source: 'manual',
      }).select('id').single()

    if (!error && order) {
      await sb.from('order_items').insert(
        items.map(i => ({
          order_id: order.id, store_id: storeId,
          product_id: i.productId, product_name: i.name,
          quantity: i.qty, unit_price: i.price, total_price: i.price * i.qty,
        }))
      )
      router.push(`/orders/${order.id}`)
    }
    } catch (e) {
      console.error('Order creation error:', e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4" style={{fontFamily:'var(--font-arabic)'}}>
      {/* Customer */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>معلومات العميل</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الاسم *</label>
            <input value={form.customer_name} onChange={e=>set('customer_name',e.target.value)} className="input text-sm" placeholder="أحمد محمد" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الهاتف *</label>
            <input value={form.customer_phone} onChange={e=>set('customer_phone',e.target.value)} className="input text-sm" placeholder="0555xxxxxx" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>هاتف 2</label>
            <input value={form.customer_phone2} onChange={e=>set('customer_phone2',e.target.value)} className="input text-sm" placeholder="اختياري" dir="ltr" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الولاية *</label>
            <select value={form.wilaya_id} onChange={e=>set('wilaya_id',e.target.value)} className="input text-sm">
              <option value="">اختر الولاية</option>
              {wilayas.map(w => <option key={w.id} value={w.id}>{w.id} - {w.name_ar}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>نوع التوصيل</label>
            <select value={form.delivery_type} onChange={e=>set('delivery_type',e.target.value)} className="input text-sm">
              <option value="home">توصيل للمنزل</option>
              <option value="stopdesk">نقطة توزيع</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>العنوان</label>
            <input value={form.address} onChange={e=>set('address',e.target.value)} className="input text-sm" placeholder="اختياري" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>ملاحظات</label>
          <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} className="input text-sm h-16 py-2" placeholder="ملاحظات العميل..." />
        </div>
      </div>

      {/* Products */}
      <div className="card p-4 space-y-3">
        <h2 className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>المنتجات</h2>
        <div className="flex gap-2">
          <select value={selectedProduct} onChange={e=>setSelectedProduct(e.target.value)} className="input text-sm flex-1">
            <option value="">اختر منتجاً</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name_ar ?? p.name} — {formatDZD(p.price)}</option>)}
          </select>
          <button onClick={addItem} disabled={!selectedProduct} className="btn btn-primary btn-sm gap-1.5">
            <Plus size={14} />إضافة
          </button>
        </div>

        {items.length > 0 && (
          <table className="data-table">
            <thead><tr>{['المنتج','السعر','الكمية','المجموع',''].map(h=><th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {items.map(item => (
                <tr key={item.productId}>
                  <td className="text-sm font-medium">{item.name}</td>
                  <td className="text-sm" style={{fontFamily:'var(--font-primary)'}}>{formatDZD(item.price)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button onClick={()=>setItems(ii=>ii.map(i=>i.productId===item.productId?{...i,qty:Math.max(1,i.qty-1)}:i))} className="w-6 h-6 rounded border flex items-center justify-center" style={{borderColor:'var(--color-border)'}}>
                        <Minus size={10}/>
                      </button>
                      <span className="text-sm w-6 text-center" style={{fontFamily:'var(--font-primary)'}}>{item.qty}</span>
                      <button onClick={()=>setItems(ii=>ii.map(i=>i.productId===item.productId?{...i,qty:i.qty+1}:i))} className="w-6 h-6 rounded border flex items-center justify-center" style={{borderColor:'var(--color-border)'}}>
                        <Plus size={10}/>
                      </button>
                    </div>
                  </td>
                  <td className="text-sm font-semibold" style={{fontFamily:'var(--font-primary)'}}>{formatDZD(item.price*item.qty)}</td>
                  <td><button onClick={()=>setItems(ii=>ii.filter(i=>i.productId!==item.productId))} className="p-1 rounded hover:bg-red-50"><Trash2 size={13} className="text-red-400"/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Summary */}
      <div className="card p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between" style={{color:'var(--color-text-secondary)'}}>
            <span>المجموع الفرعي</span>
            <span style={{fontFamily:'var(--font-primary)'}}>{formatDZD(subtotal)}</span>
          </div>
          <div className="flex justify-between" style={{color:'var(--color-text-secondary)'}}>
            <span>رسوم التوصيل</span>
            <span style={{fontFamily:'var(--font-primary)'}}>{formatDZD(deliveryFee)}</span>
          </div>
          <div className="flex justify-between font-black text-base pt-2 border-t" style={{borderColor:'var(--color-border)',color:'var(--color-accent)'}}>
            <span>المجموع الكلي</span>
            <span style={{fontFamily:'var(--font-primary)'}}>{formatDZD(total)}</span>
          </div>
        </div>
        <button onClick={save} disabled={saving || !form.customer_name || !form.customer_phone || !form.wilaya_id || items.length===0}
          className="btn btn-primary w-full mt-4 gap-2">
          {saving ? <><Loader2 size={15} className="animate-spin"/>جارٍ الحفظ...</> : 'حفظ الطلب'}
        </button>
      </div>
    </div>
  )
}
