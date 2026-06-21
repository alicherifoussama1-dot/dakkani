'use client'
// ============================================================
// Google Sheets via Service Account — merchant settings UI.
// Merchant shares their sheet with our service-account email (Editor),
// pastes Sheet ID + tab, tests, and assigns per product elsewhere.
// ============================================================
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileSpreadsheet, Plus, Trash2, Check, Loader2, Star, X, Copy, CheckCircle,
  AlertTriangle, Pencil, ShieldCheck,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const ROUTING_OPTIONS = [
  { value: 'confirmili_only', label: 'Confirmili فقط', desc: 'الطلبات تظهر في إدارة الطلبات فقط', color: '#0D6EFD' },
  { value: 'sheet_only',      label: 'قوقل شيت فقط',   desc: 'تُرسل للشيت ولا تظهر في Confirmili', color: '#198754' },
  { value: 'both',            label: 'الاثنين معاً',     desc: 'تظهر في Confirmili ونسخة للشيت',     color: '#6F42C1' },
]

interface Sheet {
  id: string; sheet_name: string; sheet_id: string; sheet_page_name: string
  is_active: boolean; is_default?: boolean; product_count?: number; last_sync?: string | null
}
interface Props {
  storeId: string
  serviceAccountEmail: string | null
  requiredHeaders: string[]
  initialSheets: Sheet[]
  initialRouting: string
  migrationMissing: boolean
}

function CopyBtn({ text }: { text: string }) {
  const [done, setDone] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500) }}
      className="shrink-0 p-1.5 rounded-lg hover:bg-black/5 transition-colors" title="نسخ">
      {done ? <CheckCircle size={15} style={{ color: '#198754' }} /> : <Copy size={15} style={{ color: '#6C757D' }} />}
    </button>
  )
}

export default function SheetsServiceAccountClient({
  storeId, serviceAccountEmail, requiredHeaders, initialSheets, initialRouting, migrationMissing,
}: Props) {
  const router = useRouter()
  const [sheets, setSheets] = useState<Sheet[]>(initialSheets)
  const [routing, setRouting] = useState(initialRouting)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // add/edit modal
  const [modal, setModal] = useState<null | { edit?: Sheet }>(null)
  const [form, setForm] = useState({ sheet_name: '', sheet_id: '', sheet_page_name: 'Sheet1', isDefault: false })
  const [testing, setTesting] = useState(false)
  const [test, setTest] = useState<{ ok: boolean; text: string } | null>(null)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    const res = await fetch(`/api/sheets?storeId=${storeId}`, { cache: 'no-store' })
    if (res.ok) setSheets((await res.json()).sheets ?? [])
  }

  async function saveRouting(value: string) {
    setRouting(value)
    const sb = createClient()
    const { error } = await sb.from('store_settings').update({ order_routing: value }).eq('store_id', storeId)
    setMsg(error ? { type: 'err', text: 'تعذّر حفظ الإعداد' } : { type: 'ok', text: 'تم حفظ وجهة الطلبات ✅' })
  }

  function openAdd() { setForm({ sheet_name: '', sheet_id: '', sheet_page_name: 'Sheet1', isDefault: false }); setTest(null); setModal({}) }
  function openEdit(s: Sheet) {
    setForm({ sheet_name: s.sheet_name, sheet_id: s.sheet_id, sheet_page_name: s.sheet_page_name, isDefault: !!s.is_default })
    setTest(null); setModal({ edit: s })
  }

  async function runTest() {
    if (!form.sheet_id) return
    setTesting(true); setTest(null)
    const res = await fetch('/api/sheets/test', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet_id: form.sheet_id, sheet_page_name: form.sheet_page_name, writeHeaders: false }),
    })
    const d = await res.json().catch(() => ({}))
    setTesting(false)
    setTest(d.ok ? { ok: true, text: d.message ?? 'نجح الاتصال ✓' } : { ok: false, text: d.error ?? 'فشل الاتصال' })
  }

  async function save() {
    if (!form.sheet_name || !form.sheet_id) return
    setSaving(true)
    const editing = modal?.edit
    const res = await fetch('/api/sheets', {
      method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing
        ? { storeId, id: editing.id, sheet_name: form.sheet_name, sheet_page_name: form.sheet_page_name, isDefault: form.isDefault }
        : { storeId, sheet_name: form.sheet_name, sheet_id: form.sheet_id, sheet_page_name: form.sheet_page_name, isDefault: form.isDefault }),
    })
    const d = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'تعذّر الحفظ' }); return }
    setModal(null); setMsg({ type: 'ok', text: editing ? 'تم تحديث الشيت ✅' : 'تمت إضافة الشيت ✅' })
    refresh()
  }

  async function setDefault(s: Sheet) {
    await fetch('/api/sheets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId, id: s.id, isDefault: true }) })
    refresh()
  }
  async function toggleActive(s: Sheet) {
    await fetch('/api/sheets', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId, id: s.id, is_active: !s.is_active }) })
    refresh()
  }
  async function del(s: Sheet) {
    if (!confirm('حذف هذا الشيت من السجل؟ (الملف نفسه لا يُحذف من Google)')) return
    const res = await fetch('/api/sheets', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ storeId, id: s.id }) })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'تعذّر الحذف' }); return }
    refresh()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={20} style={{ color: '#198754' }} />
        <h1 className="page-title">قوقل شيت — وجهة الطلبات</h1>
      </div>

      {migrationMissing && (
        <div className="flex items-start gap-2 text-sm p-3 rounded-lg" style={{ background: '#FFF3CD', color: '#856404', border: '1px solid #FFECB5' }}>
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <span>شغّل <b>ترحيل 020_sheets_service_account.sql</b> في Supabase SQL Editor قبل استخدام هذه الميزة.</span>
        </div>
      )}
      {msg && (
        <div className="text-sm p-3 rounded-lg" style={{ background: msg.type === 'ok' ? '#F0FDF4' : '#FEF2F2', color: msg.type === 'ok' ? '#16A34A' : '#DC2626', border: `1px solid ${msg.type === 'ok' ? '#BBF7D0' : '#FECACA'}` }}>
          {msg.text}
        </div>
      )}

      {/* ── How to connect (service account) ── */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} style={{ color: '#198754' }} />
          <h2 className="font-bold text-sm">كيف تربط شيتك (مرة واحدة)</h2>
        </div>
        <ol className="text-xs space-y-1.5 leading-relaxed list-decimal pr-4" style={{ color: 'var(--color-text-secondary)' }}>
          <li>افتح Google Sheet ديالك.</li>
          <li>اضغط <b>Share</b> → الصق هذا البريد كـ <b>Editor</b>:</li>
        </ol>
        <div className="flex items-center gap-2 p-2.5 rounded-lg" style={{ background: '#F8F9FA', border: '1px solid var(--color-border)' }}>
          <span className="font-mono text-xs flex-1 truncate" dir="ltr" style={{ color: '#198754' }}>
            {serviceAccountEmail ?? '⚠️ حساب الخدمة غير مُهيّأ على الخادم (GOOGLE_SERVICE_ACCOUNT_EMAIL)'}
          </span>
          {serviceAccountEmail && <CopyBtn text={serviceAccountEmail} />}
        </div>
        <ol className="text-xs space-y-1.5 leading-relaxed list-decimal pr-4" start={3} style={{ color: 'var(--color-text-secondary)' }}>
          <li>حُط أسماء الأعمدة التالية في <b>الصف الأول</b> (بالترتيب):</li>
        </ol>
        <div className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: '#F8F9FA', border: '1px solid var(--color-border)' }}>
          <span className="text-xs flex-1" style={{ color: 'var(--color-text-secondary)' }}>{requiredHeaders.join(' | ')}</span>
          <CopyBtn text={requiredHeaders.join('\t')} />
        </div>
        <ol className="text-xs space-y-1.5 leading-relaxed list-decimal pr-4" start={4} style={{ color: 'var(--color-text-secondary)' }}>
          <li>انسخ <b>Sheet ID</b> من الرابط واسم الورقة، ثم أضِفه بالأسفل واضغط «التحقق من الاتصال».</li>
        </ol>
      </section>

      {/* ── Store default routing ── */}
      <section className="card p-5 space-y-3">
        <h2 className="font-bold text-sm">وجهة الطلبات الافتراضية للمتجر</h2>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>يمكن تخصيص وجهة مختلفة لكل منتج من صفحة تعديل المنتج.</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ROUTING_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => saveRouting(opt.value)} className="text-right p-3 rounded-xl border-2 transition-colors"
              style={{ borderColor: routing === opt.value ? opt.color : 'var(--color-border)', background: routing === opt.value ? `${opt.color}10` : '#fff' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: opt.color }}>
                  {routing === opt.value && <span className="w-1.5 h-1.5 rounded-full" style={{ background: opt.color }} />}
                </span>
                <span className="text-sm font-bold">{opt.label}</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Sheets registry ── */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm">الشيتات المسجلة</h2>
          <button onClick={openAdd} className="btn btn-primary btn-sm gap-1.5"><Plus size={13} /> شيت</button>
        </div>
        {sheets.length === 0 ? (
          <p className="text-xs py-3 text-center" style={{ color: 'var(--color-text-muted)' }}>لا توجد شيتات — أضف شيت لاستقبال الطلبات</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  {['الاسم', 'الورقة', 'منتجات مرتبطة', 'افتراضي', 'الحالة', ''].map(h => <th key={h} className="text-right py-2 px-2 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {sheets.map(s => (
                  <tr key={s.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="py-2.5 px-2">
                      <a href={`https://docs.google.com/spreadsheets/d/${s.sheet_id}`} target="_blank" rel="noopener noreferrer" className="font-semibold hover:underline" style={{ color: '#198754' }}>
                        📊 {s.sheet_name}
                      </a>
                    </td>
                    <td className="py-2.5 px-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.sheet_page_name}</td>
                    <td className="py-2.5 px-2 text-center text-xs">{s.product_count ?? 0}</td>
                    <td className="py-2.5 px-2 text-center">
                      <button onClick={() => setDefault(s)} title="تعيين كافتراضي">
                        <Star size={15} fill={s.is_default ? '#FFC107' : 'transparent'} style={{ color: s.is_default ? '#FFC107' : 'var(--color-border)' }} />
                      </button>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button onClick={() => toggleActive(s)} className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.is_active ? '#D1E7DD' : '#E9ECEF', color: s.is_active ? '#198754' : '#6C757D' }}>
                        {s.is_active ? 'مفعّل' : 'موقوف'}
                      </button>
                    </td>
                    <td className="py-2.5 px-2 text-left whitespace-nowrap">
                      <button onClick={() => openEdit(s)} className="p-1 rounded hover:bg-[#EBF5FF] text-[#0D6EFD]"><Pencil size={13} /></button>
                      <button onClick={() => del(s)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Add / Edit modal ── */}
      {modal && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setModal(null)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[420px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-sm">{modal.edit ? 'تعديل الشيت' : 'إضافة Google Sheet'}</h3>
              <button onClick={() => setModal(null)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">اسم الشيت (تسمية لك)</label>
                <input className="input text-sm w-full" value={form.sheet_name} onChange={e => setForm(f => ({ ...f, sheet_name: e.target.value }))} placeholder="مثال: طلبات الحجاب" />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">Sheet ID (من رابط الشيت)</label>
                <input className="input text-sm w-full font-mono" dir="ltr" disabled={!!modal.edit} value={form.sheet_id}
                  onChange={e => { setForm(f => ({ ...f, sheet_id: e.target.value })); setTest(null) }} placeholder="https://docs.google.com/spreadsheets/d/..." />
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">اسم الورقة (Sheet Page Name)</label>
                <input className="input text-sm w-full" dir="ltr" value={form.sheet_page_name}
                  onChange={e => { setForm(f => ({ ...f, sheet_page_name: e.target.value })); setTest(null) }} placeholder="Sheet1" />
              </div>

              <button onClick={runTest} disabled={testing || !form.sheet_id} className="btn btn-sm w-full gap-1.5" style={{ border: '1px solid #198754', color: '#198754' }}>
                {testing ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} التحقق من الاتصال
              </button>
              {test && (
                <div className="text-xs p-2.5 rounded-lg flex items-start gap-1.5" style={{ background: test.ok ? '#F0FDF4' : '#FEF2F2', color: test.ok ? '#16A34A' : '#DC2626' }}>
                  {test.ok ? <CheckCircle size={14} className="mt-0.5 shrink-0" /> : <AlertTriangle size={14} className="mt-0.5 shrink-0" />}
                  <span>{test.text}</span>
                </div>
              )}

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} />
                تعيين كشيت افتراضي للمتجر
              </label>

              <div className="flex gap-2 pt-1">
                <button onClick={save} disabled={saving || !form.sheet_name || !form.sheet_id} className="btn btn-primary btn-sm flex-1 gap-1.5">
                  {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} حفظ
                </button>
                <button onClick={() => setModal(null)} className="btn btn-sm flex-1" style={{ border: '1px solid var(--color-border)' }}>إلغاء</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
