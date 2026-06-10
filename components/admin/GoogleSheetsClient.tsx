'use client'
// ============================================================
// Google Sheets + Order Routing — merchant settings page
//   • Connect Google accounts (OAuth — token stays server-side)
//   • Register spreadsheets (paste URL → pick worksheet)
//   • Store-wide default: وجهة الطلبات (شيت / Confirmili / الاثنين)
// ============================================================
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { FileSpreadsheet, Plus, Trash2, Check, Loader2, Star, X, RefreshCw, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface GAccount { id: string; email: string; status: boolean; created_at: string }
interface GSheet {
  id: string; account_id: string; spreadsheet_id: string
  spreadsheet_name: string; worksheet_name: string
  is_default: boolean; status: boolean
}

export const ROUTING_OPTIONS = [
  { value: 'confirmili_only', label: 'Confirmili فقط', desc: 'الطلبات تظهر في تطبيق إدارة الطلبات (الوضع الحالي)', color: '#0D6EFD' },
  { value: 'sheet_only',      label: 'قوقل شيت فقط',   desc: 'الطلبات تُرسل للشيت ولا تظهر في قائمة Confirmili', color: '#198754' },
  { value: 'both',            label: 'الاثنين معاً',     desc: 'الطلب يظهر في Confirmili ويُرسل نسخة للشيت', color: '#6F42C1' },
] as const

interface Props {
  storeId: string
  initialAccounts: GAccount[]
  initialSheets: GSheet[]
  initialRouting: string
  migrationMissing: boolean
}

export default function GoogleSheetsClient({ storeId, initialAccounts, initialSheets, initialRouting, migrationMissing }: Props) {
  const supabase = useRef(createClient()).current
  const params = useSearchParams()

  const [accounts, setAccounts] = useState<GAccount[]>(initialAccounts)
  const [sheets, setSheets]     = useState<GSheet[]>(initialSheets)
  const [routing, setRouting]   = useState(initialRouting)
  const [routingSaving, setRoutingSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // "+ Sheet" modal state
  const [showAdd, setShowAdd] = useState(false)
  const [addAccountId, setAddAccountId] = useState('')
  const [addUrl, setAddUrl] = useState('')
  const [lookupLoading, setLookupLoading] = useState(false)
  const [lookup, setLookup] = useState<{ spreadsheetId: string; title: string; worksheets: string[] } | null>(null)
  const [addWorksheet, setAddWorksheet] = useState('')
  const [addDefault, setAddDefault] = useState(false)
  const [addSaving, setAddSaving] = useState(false)

  // OAuth redirect feedback
  useEffect(() => {
    if (params.get('connected') === '1') setMsg({ type: 'ok', text: 'تم ربط حساب Google بنجاح ✅' })
    const err = params.get('error')
    if (err) setMsg({ type: 'err', text: `فشل الربط: ${err}` })
    if (params.get('connected') || params.get('error')) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function refresh() {
    const res = await fetch(`/api/google/sheets?storeId=${storeId}`, { cache: 'no-store' })
    if (res.ok) {
      const d = await res.json()
      setAccounts(d.accounts ?? [])
      setSheets(d.sheets ?? [])
    }
  }

  async function saveRouting(value: string) {
    setRouting(value)
    setRoutingSaving(true)
    const { error } = await supabase.from('store_settings').update({ order_routing: value }).eq('store_id', storeId)
    setRoutingSaving(false)
    setMsg(error
      ? { type: 'err', text: 'تعذر حفظ الإعداد — تأكد من تشغيل migration 015' }
      : { type: 'ok', text: 'تم حفظ وجهة الطلبات الافتراضية ✅' })
  }

  async function doLookup() {
    if (!addAccountId || !addUrl) return
    setLookupLoading(true)
    setLookup(null)
    setMsg(null)
    const res = await fetch(`/api/google/sheets?storeId=${storeId}&lookup=${encodeURIComponent(addUrl)}&accountId=${addAccountId}`, { cache: 'no-store' })
    const d = await res.json()
    setLookupLoading(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'تعذر قراءة الشيت' }); return }
    setLookup(d)
    setAddWorksheet(d.worksheets[0] ?? '')
  }

  async function addSheet() {
    if (!lookup || !addWorksheet) return
    setAddSaving(true)
    const res = await fetch('/api/google/sheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, accountId: addAccountId, spreadsheet: lookup.spreadsheetId, worksheetName: addWorksheet, isDefault: addDefault }),
    })
    const d = await res.json()
    setAddSaving(false)
    if (!res.ok) { setMsg({ type: 'err', text: d.error ?? 'تعذر إضافة الشيت' }); return }
    setShowAdd(false)
    setAddUrl(''); setLookup(null); setAddWorksheet(''); setAddDefault(false)
    setMsg({ type: 'ok', text: `تمت إضافة الشيت "${d.sheet.spreadsheet_name}" ✅` })
    refresh()
  }

  async function patchSheet(sheetId: string, patch: Record<string, any>) {
    const res = await fetch('/api/google/sheets', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, sheetId, ...patch }),
    })
    if (res.ok) refresh()
  }

  async function deleteSheet(sheetId: string) {
    if (!confirm('حذف هذا الشيت من السجل؟ (الملف نفسه لا يُحذف من Google)')) return
    await fetch('/api/google/sheets', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeId, sheetId }),
    })
    refresh()
  }

  async function deleteAccount(accountId: string) {
    if (!confirm('فصل هذا الحساب؟ كل الشيتات المرتبطة به ستتوقف عن استقبال الطلبات.')) return
    await supabase.from('google_accounts').delete().eq('id', accountId).eq('store_id', storeId)
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
          <span>يجب تشغيل <b>migration 015</b> في Supabase SQL Editor قبل استخدام هذه الميزة (supabase/migrations/015_order_routing_google_sheets.sql)</span>
        </div>
      )}

      {msg && (
        <div className="text-sm p-3 rounded-lg" style={{
          background: msg.type === 'ok' ? '#F0FDF4' : '#FEF2F2',
          color:      msg.type === 'ok' ? '#16A34A' : '#DC2626',
          border: `1px solid ${msg.type === 'ok' ? '#BBF7D0' : '#FECACA'}`,
        }}>
          {msg.text}
        </div>
      )}

      {/* ── Store default routing ───────────────────────────── */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>وجهة الطلبات الافتراضية للمتجر</h2>
          {routingSaving && <Loader2 size={14} className="animate-spin" />}
        </div>
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          أين تذهب الطلبات الجديدة؟ يمكن تخصيص وجهة مختلفة لكل منتج من صفحة تعديل المنتج.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ROUTING_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => saveRouting(opt.value)}
              className="text-right p-3 rounded-xl border-2 transition-colors"
              style={{
                borderColor: routing === opt.value ? opt.color : 'var(--color-border)',
                background:  routing === opt.value ? `${opt.color}10` : '#fff',
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: opt.color }}>
                  {routing === opt.value && <span className="w-1.5 h-1.5 rounded-full" style={{ background: opt.color }} />}
                </span>
                <span className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>{opt.label}</span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>{opt.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ── Google accounts ─────────────────────────────────── */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>حسابات Google</h2>
          <a href={`/api/google/oauth/start?storeId=${storeId}`} className="btn btn-primary btn-sm gap-1.5">
            <Plus size={13} /> حساب Google
          </a>
        </div>
        {accounts.length === 0 ? (
          <p className="text-xs py-3 text-center" style={{ color: 'var(--color-text-muted)' }}>
            لا توجد حسابات مرتبطة — اربط حساب Google لبدء إرسال الطلبات للشيت
          </p>
        ) : (
          <div className="space-y-2">
            {accounts.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: 'var(--color-bg-soft, #F8F9FA)' }}>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: '#D1E7DD', color: '#198754' }}>G</span>
                  <span className="text-sm truncate" dir="ltr">{a.email}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{
                    background: a.status ? '#D1E7DD' : '#F8D7DA',
                    color:      a.status ? '#198754' : '#DC3545',
                  }}>
                    {a.status ? 'نشط' : 'معطّل'}
                  </span>
                </div>
                <button onClick={() => deleteAccount(a.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="فصل الحساب">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Sheets registry ─────────────────────────────────── */}
      <section className="card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>الشيتات المسجلة</h2>
          <button onClick={() => setShowAdd(true)} disabled={accounts.length === 0} className="btn btn-primary btn-sm gap-1.5">
            <Plus size={13} /> Sheet
          </button>
        </div>

        {sheets.length === 0 ? (
          <p className="text-xs py-3 text-center" style={{ color: 'var(--color-text-muted)' }}>
            {accounts.length === 0 ? 'اربط حساب Google أولاً' : 'لا توجد شيتات — أضف شيت لاستقبال الطلبات'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  <th className="text-right py-2 px-2 font-medium">الشيت</th>
                  <th className="text-right py-2 px-2 font-medium">ورقة العمل</th>
                  <th className="text-center py-2 px-2 font-medium">افتراضي</th>
                  <th className="text-center py-2 px-2 font-medium">الحالة</th>
                  <th className="py-2 px-2" />
                </tr>
              </thead>
              <tbody>
                {sheets.map(s => (
                  <tr key={s.id} className="border-t" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="py-2.5 px-2">
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${s.spreadsheet_id}`}
                        target="_blank" rel="noopener noreferrer"
                        className="font-semibold hover:underline"
                        style={{ color: '#198754' }}
                      >
                        📊 {s.spreadsheet_name || s.spreadsheet_id.slice(0, 14)}
                      </a>
                    </td>
                    <td className="py-2.5 px-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{s.worksheet_name}</td>
                    <td className="py-2.5 px-2 text-center">
                      <button onClick={() => patchSheet(s.id, { isDefault: !s.is_default })} title="تعيين كافتراضي">
                        <Star size={15} fill={s.is_default ? '#FFC107' : 'transparent'} style={{ color: s.is_default ? '#FFC107' : 'var(--color-border)' }} />
                      </button>
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <button
                        onClick={() => patchSheet(s.id, { status: !s.status })}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{
                          background: s.status ? '#D1E7DD' : '#E9ECEF',
                          color:      s.status ? '#198754' : '#6C757D',
                        }}
                      >
                        {s.status ? 'مفعّل' : 'موقوف'}
                      </button>
                    </td>
                    <td className="py-2.5 px-2 text-left">
                      <button onClick={() => deleteSheet(s.id)} className="p-1 rounded hover:bg-red-50 text-red-500"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── "+ Sheet" modal ─────────────────────────────────── */}
      {showAdd && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setShowAdd(false)} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[400px] max-w-[92vw] bg-white rounded-2xl shadow-2xl overflow-hidden" dir="rtl">
            <div className="flex items-center justify-between px-5 py-3 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <h3 className="font-bold text-sm">إضافة Google Sheet</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded hover:bg-[#F8F9FA]"><X size={16} /></button>
            </div>
            <div className="p-5 space-y-3" style={{ fontFamily: 'var(--font-arabic)' }}>
              <div>
                <label className="text-xs font-bold block mb-1">الحساب</label>
                <select className="input text-sm w-full" value={addAccountId} onChange={e => { setAddAccountId(e.target.value); setLookup(null) }}>
                  <option value="">— اختر حساب —</option>
                  {accounts.filter(a => a.status).map(a => <option key={a.id} value={a.id}>{a.email}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold block mb-1">رابط الشيت</label>
                <div className="flex gap-2">
                  <input
                    className="input text-sm flex-1" dir="ltr"
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    value={addUrl}
                    onChange={e => { setAddUrl(e.target.value); setLookup(null) }}
                  />
                  <button onClick={doLookup} disabled={!addAccountId || !addUrl || lookupLoading} className="btn btn-sm shrink-0" style={{ border: '1px solid var(--color-border)' }}>
                    {lookupLoading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  </button>
                </div>
              </div>

              {lookup && (
                <>
                  <div className="text-xs p-2 rounded-lg" style={{ background: '#F0FDF4', color: '#16A34A' }}>
                    ✅ {lookup.title}
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1">ورقة العمل</label>
                    <select className="input text-sm w-full" value={addWorksheet} onChange={e => setAddWorksheet(e.target.value)}>
                      {lookup.worksheets.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={addDefault} onChange={e => setAddDefault(e.target.checked)} />
                    تعيين كشيت افتراضي للمتجر
                  </label>
                </>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={addSheet} disabled={!lookup || !addWorksheet || addSaving} className="btn btn-primary btn-sm flex-1 gap-1.5">
                  {addSaving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} حفظ
                </button>
                <button onClick={() => setShowAdd(false)} className="btn btn-sm flex-1" style={{ border: '1px solid var(--color-border)' }}>إلغاء</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
