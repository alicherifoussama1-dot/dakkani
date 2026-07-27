'use client'

import { useState } from 'react'
import { Calendar, ChevronDown, Check } from 'lucide-react'
import type { DatePreset } from '@/lib/utils/timezone'

interface GlobalDateFilterProps {
  preset: DatePreset
  startDate?: string
  endDate?: string
  onChange: (preset: DatePreset, startDate?: string, endDate?: string) => void
  disabled?: boolean
}

const PRESETS: { id: DatePreset; label: string }[] = [
  { id: 'today',     label: 'اليوم' },
  { id: 'yesterday', label: 'أمس' },
  { id: '7d',        label: 'آخر 7 أيام' },
  { id: '30d',       label: 'آخر 30 يوم' },
  { id: 'custom',    label: 'مخصص' },
]

export default function GlobalDateFilter({
  preset,
  startDate,
  endDate,
  onChange,
  disabled = false,
}: GlobalDateFilterProps) {
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customStartInput, setCustomStartInput] = useState(startDate || new Date().toISOString().slice(0, 10))
  const [customEndInput, setCustomEndInput] = useState(endDate || new Date().toISOString().slice(0, 10))

  const handleSelectPreset = (id: DatePreset) => {
    if (id === 'custom') {
      setShowCustomModal(true)
    } else {
      setShowCustomModal(false)
      onChange(id)
    }
  }

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault()
    setShowCustomModal(false)
    onChange('custom', customStartInput, customEndInput)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Pills Group */}
      <div className="inline-flex items-center p-1 bg-gray-100/90 rounded-2xl border border-gray-200 shadow-xs">
        {PRESETS.map((p) => {
          const active = preset === p.id
          return (
            <button
              key={p.id}
              type="button"
              disabled={disabled}
              onClick={() => handleSelectPreset(p.id)}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                active
                  ? 'bg-white text-[#0D6EFD] shadow-sm scale-[1.02]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
              }`}
            >
              {p.id === 'custom' && <Calendar size={13} className={active ? 'text-[#0D6EFD]' : 'text-gray-400'} />}
              <span>{p.label}</span>
            </button>
          )
        })}
      </div>

      {/* Date Display Pill / Custom Selector */}
      {preset === 'custom' && startDate && endDate && (
        <button
          type="button"
          onClick={() => setShowCustomModal(true)}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-800 shadow-xs hover:border-[#0D6EFD] transition cursor-pointer"
          dir="ltr"
        >
          <Calendar size={13} className="text-[#0D6EFD]" />
          <span>{startDate} — {endDate}</span>
          <ChevronDown size={13} className="text-gray-400" />
        </button>
      )}

      {/* Custom Date Modal / Popover */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md border border-gray-100 shadow-2xl space-y-5" dir="rtl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-[#0D6EFD]" />
                <span>تحديد فترة مخصصة</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleApplyCustom} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    تاريخ البداية
                  </label>
                  <input
                    type="date"
                    value={customStartInput}
                    onChange={(e) => setCustomStartInput(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50 focus:bg-white focus:border-[#0D6EFD] outline-none"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    تاريخ النهاية
                  </label>
                  <input
                    type="date"
                    value={customEndInput}
                    onChange={(e) => setCustomEndInput(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs font-mono bg-gray-50 focus:bg-white focus:border-[#0D6EFD] outline-none"
                    dir="ltr"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#0D6EFD] hover:bg-[#0B5ED7] shadow-sm transition flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>تطبيق</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
