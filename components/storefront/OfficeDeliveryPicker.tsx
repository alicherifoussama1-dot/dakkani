'use client'
// Provider-agnostic office (stop-desk) delivery picker.
// Consumes the normalized office list from /api/store/delivery/desks (which
// abstracts every provider: Yalidine API, ZR bundled list, merchant-managed),
// then drives a two-step flow:
//   1. Municipality selector — ONLY municipalities that actually contain offices.
//   2. Office selector — appears after a municipality is chosen.
//      one office → auto-selected · multiple offices → customer chooses.
// It never references a specific provider; it only groups the normalized list.
import { useMemo, useState } from 'react'
import { ChevronDown, Building2 } from 'lucide-react'
import { formatCommuneBilingual } from '@/lib/algeria-baladias'
import { translateStorefront, type Locale } from '@/lib/utils/translations'

export type Office = { id: string; name: string; commune: string; address?: string }

export default function OfficeDeliveryPicker({ offices, wilayaId, lang, baladia, stopdeskCode, onChange, theme }: {
  offices: Office[]
  wilayaId: number | null
  lang: Locale
  baladia?: string
  stopdeskCode?: string
  // Stores the commune (baladia) + the office identifier (stopdesk_code) — exactly
  // as the order submission has always expected.
  onChange: (commune: string, officeId: string) => void
  theme?: string
}) {
  const [openM, setOpenM] = useState(false)
  const [openO, setOpenO] = useState(false)

  // Group offices by municipality. Offices without a commune fall back to their
  // own name so none are ever dropped (e.g. merchant-managed lists).
  const groups = useMemo(() => {
    const m = new Map<string, Office[]>()
    for (const o of offices) {
      const key = (o.commune && o.commune.trim()) || o.name
      const arr = m.get(key) ?? []
      arr.push(o)
      m.set(key, arr)
    }
    return m
  }, [offices])

  const communeKeys = useMemo(() => Array.from(groups.keys()).sort((a, b) => a.localeCompare(b)), [groups])
  const selectedCommune = baladia && groups.has(baladia) ? baladia : ''
  const officesInCommune = selectedCommune ? (groups.get(selectedCommune) ?? []) : []
  const selectedOffice = officesInCommune.find(o => o.id === stopdeskCode)

  // Bilingual "French - Arabic" municipality label (falls back to the raw value).
  const labelFor = (key: string) => formatCommuneBilingual(wilayaId, key) || key

  const pickCommune = (key: string) => {
    setOpenM(false)
    const list = groups.get(key) ?? []
    // one office → auto-select it · multiple → clear and let the customer choose
    onChange(key, list.length === 1 ? list[0].id : '')
  }

  const officeLabel = lang === 'ar' ? 'المكتب' : lang === 'fr' ? 'Bureau' : 'Office'
  const chooseOffice = lang === 'ar' ? 'اختر المكتب' : lang === 'fr' ? 'Choisir le bureau' : 'Choose office'

  // Dynamic styles based on theme
  const labelCls = theme === 'compact'
    ? 'block text-xs font-semibold text-gray-600 mb-0.5'
    : theme === 'modern'
    ? 'block text-sm font-semibold text-slate-700 mb-1'
    : theme === 'glassmorphism'
    ? 'block text-sm font-medium text-slate-300 mb-1'
    : theme === 'default'
    ? 'block text-sm font-medium text-gray-700 mb-1'
    : 'dk-label'

  const starColor = theme === 'modern'
    ? '#f59e0b'
    : theme === 'glassmorphism'
    ? '#818cf8'
    : theme === 'compact'
    ? '#2563eb'
    : theme === 'default'
    ? '#ef4444'
    : '#D85A30'

  const fieldCls = theme === 'compact'
    ? 'w-full border border-gray-305 rounded-lg px-3 py-2 text-sm focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 outline-none bg-white text-gray-800 flex items-center justify-between text-start rtl:text-right'
    : theme === 'modern'
    ? 'w-full border-2 border-slate-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:border-amber-500 focus:ring-0 outline-none transition-all text-slate-805 shadow-sm focus:shadow-md flex items-center justify-between text-start rtl:text-right'
    : theme === 'glassmorphism'
    ? 'w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all flex items-center justify-between text-start rtl:text-right'
    : theme === 'default'
    ? 'w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] outline-none bg-white text-gray-900 flex items-center justify-between text-start rtl:text-right'
    : 'dk-field dk-field-strong flex items-center justify-between text-start rtl:text-right w-full'

  const dropdownCls = theme === 'compact'
    ? 'absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto p-1 rounded-lg bg-white border border-gray-200 shadow-md'
    : theme === 'modern'
    ? 'absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto p-1.5 rounded-2xl bg-white border border-slate-100 shadow-md'
    : theme === 'glassmorphism'
    ? 'absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto p-1.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-xl'
    : theme === 'default'
    ? 'absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto p-1.5 rounded-2xl bg-white border border-gray-200 shadow-md'
    : 'absolute z-50 mt-1.5 w-full max-h-72 overflow-y-auto p-1.5 rounded-2xl'

  const dropdownStyle = theme ? {} : { background: '#fff', border: '1.5px solid #B0AA9C', boxShadow: '0 12px 32px rgba(20,18,15,0.12)' }

  const textStyle = (selected: boolean) => {
    if (theme) return {}
    return { color: selected ? '#111111' : '#5C594F' }
  }

  const getItemCls = (active: boolean) => {
    if (!theme) return 'block w-full text-start rtl:text-right px-3.5 py-3 rounded-xl text-base transition'
    if (theme === 'compact') {
      return `block w-full text-start rtl:text-right px-2.5 py-2 rounded text-xs transition ${
        active ? 'font-bold text-blue-600 bg-blue-50' : 'text-gray-700 hover:bg-gray-50'
      }`
    }
    if (theme === 'modern') {
      return `block w-full text-start rtl:text-right px-3 py-2.5 rounded-xl text-sm transition ${
        active ? 'font-bold text-amber-500 bg-amber-50' : 'text-slate-800 hover:bg-slate-50'
      }`
    }
    if (theme === 'glassmorphism') {
      return `block w-full text-start rtl:text-right px-3 py-2.5 rounded-xl text-sm transition ${
        active ? 'font-bold text-indigo-300 bg-indigo-950/40' : 'text-slate-200 hover:bg-slate-800'
      }`
    }
    return `block w-full text-start rtl:text-right px-3 py-2.5 rounded-xl text-sm transition ${
      active ? 'font-bold text-[#0D6EFD] bg-blue-50' : 'text-gray-800 hover:bg-gray-50'
    }`
  }

  const itemStyle = (active: boolean) => {
    if (theme) return {}
    return active
      ? { background: 'color-mix(in srgb, var(--pt-accent) 12%, transparent)', color: 'var(--pt-accent)', fontWeight: 700 }
      : { color: '#111111' }
  }

  const confirmCardCls = theme === 'compact'
    ? 'flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs border border-blue-100 bg-blue-50/30 text-blue-800'
    : theme === 'modern'
    ? 'flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-sm border-2 border-dashed border-amber-300 bg-amber-50/50 text-amber-900'
    : theme === 'glassmorphism'
    ? 'flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-sm border border-indigo-500/20 bg-indigo-950/20 text-indigo-200'
    : theme === 'default'
    ? 'flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-sm border border-blue-100 bg-blue-50/50 text-[#0B5ED7]'
    : 'flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-base'

  const confirmCardStyle = theme ? {} : { background: 'color-mix(in srgb, var(--pt-accent) 8%, transparent)', border: '0.5px solid #EBE8E1' }

  const confirmIconColor = theme === 'compact'
    ? '#2563eb'
    : theme === 'modern'
    ? '#f59e0b'
    : theme === 'glassmorphism'
    ? '#818cf8'
    : theme === 'default'
    ? '#0d6efd'
    : 'var(--pt-accent)'

  const confirmTextColor = theme ? '' : '#1B1B1F'

  return (
    <div className="space-y-3">
      {/* 1. Municipality — only those with offices */}
      <div>
        <label className={labelCls}>
          {translateStorefront('baladia', lang)} <span style={{ color: starColor }}>*</span>
        </label>
        <div className="relative">
          <button type="button" onClick={() => setOpenM(o => !o)} className={fieldCls}>
            <span style={textStyle(!!selectedCommune)} className={selectedCommune ? '' : (theme === 'glassmorphism' ? 'text-slate-505' : 'text-gray-400')}>
              {selectedCommune ? labelFor(selectedCommune) : translateStorefront('select_commune', lang)}
            </span>
            <ChevronDown size={16} style={{ color: theme === 'glassmorphism' ? '#94a3b8' : '#57564F', transform: openM ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {openM && (
            <>
              <div onClick={() => setOpenM(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div className={dropdownCls} style={dropdownStyle}>
                {communeKeys.map(key => (
                  <button key={key} type="button" onClick={() => pickCommune(key)}
                    className={getItemCls(selectedCommune === key)}
                    style={itemStyle(selectedCommune === key)}>
                    {labelFor(key)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2a. Multiple offices → choose */}
      {selectedCommune && officesInCommune.length > 1 && (
        <div>
          <label className={labelCls}>
            {officeLabel} <span style={{ color: starColor }}>*</span>
          </label>
          <div className="relative">
            <button type="button" onClick={() => setOpenO(o => !o)} className={fieldCls}>
              <span style={textStyle(!!selectedOffice)} className={selectedOffice ? '' : (theme === 'glassmorphism' ? 'text-slate-505' : 'text-gray-400')}>
                {selectedOffice ? selectedOffice.name : chooseOffice}
              </span>
              <ChevronDown size={16} style={{ color: theme === 'glassmorphism' ? '#94a3b8' : '#57564F', transform: openO ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
            {openO && (
              <>
                <div onClick={() => setOpenO(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div className={dropdownCls} style={dropdownStyle}>
                  {officesInCommune.map(o => (
                    <button key={o.id} type="button" onClick={() => { onChange(selectedCommune, o.id); setOpenO(false) }}
                      className={getItemCls(stopdeskCode === o.id)}
                      style={itemStyle(stopdeskCode === o.id)}>
                      <span style={{ display: 'block' }}>{o.name}</span>
                      {o.address && <span style={{ display: 'block', fontSize: 13, opacity: 0.75, marginTop: 3 }}>{o.address}</span>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 2b. Single office → auto-selected, shown as a confirmation card */}
      {selectedCommune && officesInCommune.length === 1 && (
        <div className={confirmCardCls} style={confirmCardStyle}>
          <Building2 className="w-4 h-4 shrink-0" style={{ color: confirmIconColor }} />
          <span className={confirmTextColor}>
            {lang === 'ar' ? 'مكتب الاستلام: ' : lang === 'fr' ? 'Bureau de retrait: ' : 'Pickup office: '}<strong>{officesInCommune[0].name}</strong>
            {officesInCommune[0].address && <span style={{ display: 'block', fontSize: 13, opacity: 0.8, marginTop: 3 }}>{officesInCommune[0].address}</span>}
          </span>
        </div>
      )}
    </div>
  )
}
