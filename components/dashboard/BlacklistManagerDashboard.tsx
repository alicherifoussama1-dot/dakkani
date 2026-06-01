'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, Trash2, Shield } from 'lucide-react'
import { formatDateShort } from '@/lib/utils/format'

interface BlacklistEntry {
  id: string
  customer_phone: string
  customer_name?: string
  reason?: string
  created_at: string
  cancel_count?: number
}

export default function BlacklistManagerDashboard({ storeId, initialList }: { storeId: string; initialList: BlacklistEntry[] }) {
  const router = useRouter()
  const [list, setList] = useState(initialList)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ phone: '', name: '', reason: '' })
  const [loading, setLoading] = useState(false)

  const add = async () => {
    if (!form.phone) return
    setLoading(true)
    const sb = createClient()
    const { data } = await sb.from('blacklisted_customers').insert({
      store_id: storeId,
      phone: form.phone,
      customer_name: form.name || null,
      reason: form.reason || 'حظر يدوي',
    }).select().single()
    if (data) {
      setList(prev => [data, ...prev])
      setForm({ phone: '', name: '', reason: '' })
      setShowAdd(false)
    }
    setLoading(false)
  }

  const remove = async (id: string) => {
    if (!confirm('إلغاء الحظر؟')) return
    const sb = createClient()
    await sb.from('blacklisted_customers').delete().eq('id', id)
    setList(prev => prev.filter(e => e.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-primary btn-sm gap-1.5">
          <Plus size={14}/>إضافة للقائمة
        </button>
      </div>

      {showAdd && (
        <div className="card p-5 space-y-3">
          <h3 className="font-semibold text-sm" style={{color:'var(--color-text-primary)'}}>إضافة عميل للقائمة السوداء</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>رقم الهاتف *</label>
              <input value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} className="input text-sm" placeholder="0555xxxxxx" dir="ltr"/>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>الاسم</label>
              <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} className="input text-sm" placeholder="اختياري"/>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium mb-1.5" style={{color:'var(--color-text-secondary)'}}>سبب الحظر</label>
              <input value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} className="input text-sm" placeholder="مثال: إلغاء متكرر"/>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={add} disabled={loading || !form.phone} className="btn btn-primary btn-sm">حفظ</button>
            <button onClick={() => setShowAdd(false)} className="btn btn-ghost btn-sm">إلغاء</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {list.length === 0 ? (
          <div className="text-center py-12">
            <Shield size={28} className="mx-auto mb-2" style={{color:'var(--color-text-muted)',opacity:0.4}}/>
            <p className="text-sm" style={{color:'var(--color-text-muted)'}}>القائمة السوداء فارغة</p>
            <p className="text-xs mt-1" style={{color:'var(--color-text-muted)'}}>العملاء المحظورون تُرفض طلباتهم تلقائياً</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>{['الهاتف','الاسم','السبب','تاريخ الحظر','إجراءات'].map(h=><th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {list.map(e => (
                <tr key={e.id}>
                  <td className="font-mono text-sm" style={{color:'var(--color-accent)'}}>{e.customer_phone}</td>
                  <td className="text-sm">{e.customer_name ?? '—'}</td>
                  <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{e.reason ?? '—'}</td>
                  <td className="text-xs" style={{color:'var(--color-text-muted)'}}>{formatDateShort(e.created_at)}</td>
                  <td>
                    <button onClick={() => remove(e.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                      <Trash2 size={13} style={{color:'#DC3545'}}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
