'use client'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search, MapPin } from 'lucide-react'

interface Wilaya { id: number; name: string; region: string }

const WILAYAS: Wilaya[] = [
  // الشرق
  { id: 5,  name: 'باتنة',          region: 'الشرق' },
  { id: 6,  name: 'بجاية',          region: 'الشرق' },
  { id: 7,  name: 'بسكرة',          region: 'الشرق' },
  { id: 12, name: 'تبسة',           region: 'الشرق' },
  { id: 18, name: 'جيجل',           region: 'الشرق' },
  { id: 19, name: 'سطيف',           region: 'الشرق' },
  { id: 21, name: 'سكيكدة',         region: 'الشرق' },
  { id: 23, name: 'عنابة',          region: 'الشرق' },
  { id: 24, name: 'قالمة',          region: 'الشرق' },
  { id: 25, name: 'قسنطينة',        region: 'الشرق' },
  { id: 34, name: 'برج بوعريريج',   region: 'الشرق' },
  { id: 36, name: 'الطارف',         region: 'الشرق' },
  { id: 40, name: 'خنشلة',          region: 'الشرق' },
  { id: 41, name: 'سوق أهراس',      region: 'الشرق' },
  { id: 43, name: 'ميلة',           region: 'الشرق' },
  { id: 4,  name: 'أم البواقي',     region: 'الشرق' },
  // الوسط
  { id: 9,  name: 'البليدة',        region: 'الوسط' },
  { id: 10, name: 'البويرة',        region: 'الوسط' },
  { id: 15, name: 'تيزي وزو',      region: 'الوسط' },
  { id: 16, name: 'الجزائر',        region: 'الوسط' },
  { id: 26, name: 'المدية',         region: 'الوسط' },
  { id: 35, name: 'بومرداس',        region: 'الوسط' },
  { id: 42, name: 'تيبازة',         region: 'الوسط' },
  { id: 44, name: 'عين الدفلى',     region: 'الوسط' },
  // الغرب
  { id: 2,  name: 'الشلف',          region: 'الغرب' },
  { id: 13, name: 'تلمسان',         region: 'الغرب' },
  { id: 14, name: 'تيارت',          region: 'الغرب' },
  { id: 22, name: 'سيدي بلعباس',   region: 'الغرب' },
  { id: 27, name: 'مستغانم',        region: 'الغرب' },
  { id: 29, name: 'معسكر',          region: 'الغرب' },
  { id: 31, name: 'وهران',          region: 'الغرب' },
  { id: 38, name: 'تيسمسيلت',       region: 'الغرب' },
  { id: 45, name: 'النعامة',        region: 'الغرب' },
  { id: 46, name: 'عين تموشنت',     region: 'الغرب' },
  { id: 48, name: 'غليزان',         region: 'الغرب' },
  // الجنوب
  { id: 1,  name: 'أدرار',          region: 'الجنوب' },
  { id: 3,  name: 'الأغواط',        region: 'الجنوب' },
  { id: 8,  name: 'بشار',           region: 'الجنوب' },
  { id: 11, name: 'تمنراست',        region: 'الجنوب' },
  { id: 17, name: 'الجلفة',         region: 'الجنوب' },
  { id: 28, name: 'المسيلة',        region: 'الجنوب' },
  { id: 30, name: 'ورقلة',          region: 'الجنوب' },
  { id: 32, name: 'البيض',          region: 'الجنوب' },
  { id: 33, name: 'إليزي',          region: 'الجنوب' },
  { id: 37, name: 'تندوف',          region: 'الجنوب' },
  { id: 39, name: 'الوادي',         region: 'الجنوب' },
  { id: 47, name: 'غرداية',         region: 'الجنوب' },
]

const REGIONS = ['الشرق', 'الوسط', 'الغرب', 'الجنوب']

interface WilayaSelectorProps {
  value?:    number | null
  onChange?: (wilaya: Wilaya | null) => void
  placeholder?: string
  className?: string
}

export default function WilayaSelector({
  value,
  onChange,
  placeholder = 'اختر ولايتك',
  className   = '',
}: WilayaSelectorProps) {
  const [open,   setOpen]   = useState(false)
  const [search, setSearch] = useState('')
  const dropRef = useRef<HTMLDivElement>(null)

  const selected = WILAYAS.find(w => w.id === value) ?? null

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = search
    ? WILAYAS.filter(w => w.name.includes(search))
    : WILAYAS

  const grouped = REGIONS.map(region => ({
    region,
    wilayas: filtered.filter(w => w.region === region),
  })).filter(g => g.wilayas.length > 0)

  return (
    <div ref={dropRef} className={`relative ${className}`} dir="rtl">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className="input flex items-center justify-between gap-2 text-right"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2 min-w-0">
          <MapPin size={15} style={{ color: selected ? '#E8431A' : '#999999', flexShrink: 0 }} />
          <span
            className="truncate text-sm"
            style={{
              color: selected ? '#111111' : '#999999',
              fontFamily: 'var(--font-tajawal)',
            }}
          >
            {selected ? selected.name : placeholder}
          </span>
        </div>
        <ChevronDown
          size={15}
          style={{
            color: '#999999',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 200ms ease',
          }}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-1.5 right-0 left-0 z-50 rounded-xl overflow-hidden"
          style={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #EBEBEB',
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            maxHeight: '300px',
          }}
          role="listbox"
          aria-label="قائمة الولايات"
        >
          {/* Search */}
          <div className="p-2 border-b" style={{ borderColor: '#EBEBEB' }}>
            <div className="relative">
              <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#999999' }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="ابحث عن ولاية..."
                className="w-full h-9 rounded-lg text-sm pr-8 pl-3 outline-none"
                style={{
                  backgroundColor: '#F3F3F3',
                  border: 'none',
                  color: '#111111',
                  fontFamily: 'var(--font-tajawal)',
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Clear option */}
          {selected && (
            <button
              type="button"
              className="w-full text-right px-4 py-2.5 text-sm transition-colors"
              style={{ color: '#E8431A', fontFamily: 'var(--font-tajawal)' }}
              onClick={() => { onChange?.(null); setOpen(false) }}
            >
              × مسح الاختيار
            </button>
          )}

          {/* Grouped wilayas */}
          <div className="overflow-y-auto" style={{ maxHeight: '220px' }}>
            {grouped.map(({ region, wilayas }) => (
              <div key={region}>
                <div
                  className="px-4 py-1.5 text-xs font-bold sticky top-0"
                  style={{
                    color: '#999999',
                    backgroundColor: '#F9F9F9',
                    fontFamily: 'var(--font-tajawal)',
                  }}
                >
                  {region}
                </div>
                {wilayas.map(w => (
                  <button
                    key={w.id}
                    type="button"
                    role="option"
                    aria-selected={w.id === value}
                    className="w-full text-right px-4 py-2.5 text-sm transition-colors"
                    style={{
                      backgroundColor: w.id === value ? '#FFF0ED' : 'transparent',
                      color: w.id === value ? '#E8431A' : '#111111',
                      fontFamily: 'var(--font-tajawal)',
                    }}
                    onMouseEnter={e => {
                      if (w.id !== value) {
                        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F9F9F9'
                      }
                    }}
                    onMouseLeave={e => {
                      if (w.id !== value) {
                        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                      }
                    }}
                    onClick={() => { onChange?.(w); setOpen(false); setSearch('') }}
                  >
                    {w.name}
                  </button>
                ))}
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center py-8 text-sm" style={{ color: '#999999', fontFamily: 'var(--font-tajawal)' }}>
                ما لقيناش ولاية
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
