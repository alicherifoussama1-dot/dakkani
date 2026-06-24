'use client'
// Stopdesk البلدية picker: each option = commune (bold) + office name (smaller).
// Only the commune is saved to the order; the office name is display-only.
import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type DeskOpt = { code: string; name: string; commune: string }

export default function StopdeskPicker({ offices, value, onSelect, dark }: {
  offices: DeskOpt[]; value?: string; onSelect: (o: DeskOpt) => void; dark?: boolean
}) {
  const [open, setOpen] = useState(false)
  const sel = offices.find(o => o.code === value)
  const box = dark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
  const muted = dark ? 'text-slate-400' : 'text-gray-400'
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(o => !o)}
        className={`w-full border rounded-xl px-4 py-2.5 text-sm flex items-center justify-between text-right ${box}`}>
        <span className="truncate">
          {sel
            ? <>{sel.commune || sel.name}{sel.commune && <span className={`mr-2 text-[11px] ${muted}`}>· {sel.name}</span>}</>
            : <span className={muted}>اختر البلدية...</span>}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className={`absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-xl border shadow-lg ${box}`}>
            {offices.map(o => (
              <button type="button" key={o.code} onClick={() => { onSelect(o); setOpen(false) }}
                className={`w-full text-right px-3 py-2 flex flex-col ${dark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'} ${o.code === value ? (dark ? 'bg-slate-800' : 'bg-gray-50') : ''}`}>
                <span className="text-sm font-semibold leading-tight">{o.commune || o.name}</span>
                {o.commune && <span className={`text-[11px] leading-tight ${muted}`}>{o.name}</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
