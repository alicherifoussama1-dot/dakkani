'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatDateShort } from '@/lib/utils/format'
import { ShieldOff, Shield, Plus, Download, AlertTriangle, Globe } from 'lucide-react'

interface BlacklistEntry { id: string; phone?: string; full_name?: string; reason?: string; created_at: string; store_id?: string }
interface Candidate { customer_name: string; customer_phone: string; count: number }

interface Props { storeId: string; blacklist: BlacklistEntry[]; candidates: Candidate[] }

export default function BlacklistManager({ storeId, blacklist, candidates }: Props) {
  const router   = useRouter()
  const supabase = createClient()

  const [adding,  setAdding]  = useState(false)
  const [form,    setForm]    = useState({ phone: '', name: '', reason: '' })
  const [saving,  setSaving]  = useState(false)
  const [shared,  setShared]  = useState(false) // opt-in shared network

  const addToBlacklist = async (phone: string, name: string, reason?: string, isShared = false) => {
    setSaving(true)
    await supabase.from('blacklisted_customers').upsert({
      store_id:  isShared ? null : storeId,
      phone,
      full_name: name,
      reason:    reason ?? 'إضافة يدوية',
    }, { onConflict: 'store_id,phone' })
    setSaving(false)
    setAdding(false)
    setForm({ phone: '', name: '', reason: '' })
    router.refresh()
  }

  const removeFromBlacklist = async (id: string) => {
    if (!confirm('إزالة هذا الشخص من القائمة السوداء؟')) return
    await supabase.from('blacklisted_customers').delete().eq('id', id)
    router.refresh()
  }

  const exportCSV = () => {
    const headers = ['الهاتف', 'الاسم', 'السبب', 'التاريخ', 'مشترك']
    const rows = blacklist.map(b => [
      b.phone ?? '',
      b.full_name ?? '',
      b.reason ?? '',
      formatDateShort(b.created_at),
      b.store_id ? 'لا' : 'نعم (شبكة)',
    ])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const a    = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `blacklist-${new Date().toISOString().slice(0,10)}.csv`
    a.click()
  }

  // Filter unique candidates with ≥3 cancellations
  const flaggedCandidates = (candidates as any[])
    .filter((c: any) => parseInt(c.count) >= 3)

  return (
    <div className="space-y-5">
      {/* Auto-flag candidates */}
      {flaggedCandidates.length > 0 && (
        <div className="bg-red-900/10 border border-red-700/30 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            عملاء مشبوهون تلقائياً ({flaggedCandidates.length}) — ≥ 3 طلبات ملغاة
          </div>
          <div className="space-y-2">
            {flaggedCandidates.slice(0, 5).map((c: any) => (
              <div key={c.customer_phone} className="flex items-center justify-between bg-red-900/20 border border-red-700/20 rounded-xl px-4 py-2">
                <div>
                  <p className="text-sm font-medium text-gray-200">{c.customer_name}</p>
                  <p className="text-xs text-gray-500 font-mono">{c.customer_phone}</p>
                  <p className="text-xs text-red-400">{c.count} طلبات ملغاة</p>
                </div>
                <button
                  onClick={() => addToBlacklist(c.customer_phone, c.customer_name, `${c.count} طلبات ملغاة — حظر تلقائي`)}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg transition"
                >
                  حظر
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => setAdding(!adding)}
          className="flex items-center gap-1.5 text-xs bg-[#0D6EFD]/20 text-[#F96540] border border-[#0D6EFD]/30 px-3 py-1.5 rounded-lg hover:bg-[#0D6EFD]/30 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          إضافة يدوياً
        </button>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs bg-gray-800 text-gray-400 border border-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition"
        >
          <Download className="w-3.5 h-3.5" />
          تصدير CSV
        </button>
        <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-500">
          <input type="checkbox" checked={shared} onChange={e => setShared(e.target.checked)} className="w-3.5 h-3.5 accent-[#0D6EFD]" />
          <Globe className="w-3.5 h-3.5" />
          مشاركة القائمة مع متاجر أخرى (شبكة مشتركة)
        </label>
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3" dir="rtl">
          <h3 className="text-sm font-bold text-white">إضافة رقم للقائمة السوداء</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'phone',  label: 'رقم الهاتف *', placeholder: '0555xxxxxx' },
              { key: 'name',   label: 'الاسم',         placeholder: 'اختياري' },
              { key: 'reason', label: 'السبب',         placeholder: 'مثال: رفض الاستلام 5 مرات' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                <input
                  value={form[f.key as keyof typeof form]}
                  onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
                />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => addToBlacklist(form.phone, form.name, form.reason, shared)}
              disabled={!form.phone || saving}
              className="text-xs bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {saving ? '...' : 'إضافة للقائمة'}
            </button>
            <button onClick={() => setAdding(false)} className="text-xs text-gray-500">إلغاء</button>
          </div>
        </div>
      )}

      {/* Blacklist table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-800 flex items-center justify-between">
          <p className="text-sm text-gray-400">{blacklist.length} رقم في القائمة</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50">
            <tr>
              {['الهاتف', 'الاسم', 'السبب', 'النوع', 'التاريخ', ''].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {blacklist.map(b => (
              <tr key={b.id} className="hover:bg-gray-800/30">
                <td className="px-4 py-3 font-mono text-red-400 font-bold">{b.phone}</td>
                <td className="px-4 py-3 text-gray-300">{b.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">{b.reason ?? '—'}</td>
                <td className="px-4 py-3">
                  {b.store_id
                    ? <span className="text-xs text-gray-500">متجرك</span>
                    : <span className="text-xs bg-purple-900/30 text-purple-400 border border-purple-700/30 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><Globe className="w-2.5 h-2.5" />شبكة</span>
                  }
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">{formatDateShort(b.created_at)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => removeFromBlacklist(b.id)} className="p-1.5 text-gray-600 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition" title="إزالة الحظر">
                    <Shield className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {blacklist.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-600">القائمة السوداء فارغة</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
