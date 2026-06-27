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

export type Office = { id: string; name: string; commune: string }

export default function OfficeDeliveryPicker({ offices, wilayaId, lang, baladia, stopdeskCode, onChange }: {
  offices: Office[]
  wilayaId: number | null
  lang: Locale
  baladia?: string
  stopdeskCode?: string
  // Stores the commune (baladia) + the office identifier (stopdesk_code) — exactly
  // as the order submission has always expected.
  onChange: (commune: string, officeId: string) => void
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
  const fieldCls = 'dk-field dk-field-strong flex items-center justify-between text-start rtl:text-right'

  return (
    <div className="space-y-3">
      {/* 1. Municipality — only those with offices */}
      <div>
        <label className="dk-label">{translateStorefront('baladia', lang)} <span style={{ color: '#D85A30' }}>*</span></label>
        <div className="relative">
          <button type="button" onClick={() => setOpenM(o => !o)} className={fieldCls}>
            <span style={{ color: selectedCommune ? '#111111' : '#6B6A64' }}>{selectedCommune ? labelFor(selectedCommune) : translateStorefront('select_commune', lang)}</span>
            <ChevronDown size={16} style={{ color: '#57564F', transform: openM ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
          </button>
          {openM && (
            <>
              <div onClick={() => setOpenM(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
              <div className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto p-1.5 rounded-2xl" style={{ background: '#fff', border: '1px solid #BFBBB1', boxShadow: '0 12px 32px rgba(20,18,15,0.12)' }}>
                {communeKeys.map(key => (
                  <button key={key} type="button" onClick={() => pickCommune(key)}
                    className="block w-full text-start rtl:text-right px-3 py-2.5 rounded-xl text-sm transition"
                    style={selectedCommune === key ? { background: 'color-mix(in srgb, var(--pt-accent) 12%, transparent)', color: 'var(--pt-accent)', fontWeight: 700 } : { color: '#111111' }}>
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
          <label className="dk-label">{officeLabel} <span style={{ color: '#D85A30' }}>*</span></label>
          <div className="relative">
            <button type="button" onClick={() => setOpenO(o => !o)} className={fieldCls}>
              <span style={{ color: selectedOffice ? '#111111' : '#6B6A64' }}>{selectedOffice ? selectedOffice.name : chooseOffice}</span>
              <ChevronDown size={16} style={{ color: '#57564F', transform: openO ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
            </button>
            {openO && (
              <>
                <div onClick={() => setOpenO(false)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                <div className="absolute z-50 mt-1.5 w-full max-h-60 overflow-y-auto p-1.5 rounded-2xl" style={{ background: '#fff', border: '1px solid #BFBBB1', boxShadow: '0 12px 32px rgba(20,18,15,0.12)' }}>
                  {officesInCommune.map(o => (
                    <button key={o.id} type="button" onClick={() => { onChange(selectedCommune, o.id); setOpenO(false) }}
                      className="block w-full text-start rtl:text-right px-3 py-2.5 rounded-xl text-sm transition"
                      style={stopdeskCode === o.id ? { background: 'color-mix(in srgb, var(--pt-accent) 12%, transparent)', color: 'var(--pt-accent)', fontWeight: 700 } : { color: '#111111' }}>
                      {o.name}
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
        <div className="flex items-center gap-2.5 px-3.5 py-3 rounded-2xl text-sm" style={{ background: 'color-mix(in srgb, var(--pt-accent) 8%, transparent)', border: '0.5px solid #EBE8E1' }}>
          <Building2 className="w-4 h-4 shrink-0" style={{ color: 'var(--pt-accent)' }} />
          <span style={{ color: '#1B1B1F' }}>{lang === 'ar' ? 'مكتب الاستلام: ' : lang === 'fr' ? 'Bureau de retrait: ' : 'Pickup office: '}<strong>{officesInCommune[0].name}</strong></span>
        </div>
      )}
    </div>
  )
}
