'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState } from 'react'
import { Search, X } from 'lucide-react'

const STATUSES = [
  { value: '',          label: 'الكل' },
  { value: 'new',       label: 'جديد' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'processing',label: 'يُعالج' },
  { value: 'shipped',   label: 'شُحن' },
  { value: 'delivered', label: 'سُلّم' },
  { value: 'returned',  label: 'مُرجع' },
  { value: 'cancelled', label: 'ملغى' },
]

export default function OrdersFilterBar({
  currentStatus,
  currentSearch,
}: { currentStatus?: string; currentSearch?: string }) {
  const router   = useRouter()
  const pathname = usePathname()
  const [search, setSearch] = useState(currentSearch ?? '')

  const push = (status?: string, q?: string) => {
    const p = new URLSearchParams()
    if (status) p.set('status', status)
    if (q)      p.set('search', q)
    router.push(`${pathname}?${p}`)
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && push(currentStatus, search)}
          placeholder="ابحث باسم العميل، الهاتف، أو رقم الطلب..."
          className="w-full border border-gray-200 rounded-xl pr-10 pl-4 py-2.5 text-sm focus:ring-2 focus:ring-[#0D6EFD] focus:border-transparent outline-none"
        />
        {search && (
          <button
            onClick={() => { setSearch(''); push(currentStatus, '') }}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {STATUSES.map(s => (
          <button
            key={s.value}
            onClick={() => push(s.value, currentSearch)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
              (currentStatus ?? '') === s.value
                ? 'bg-[#0D6EFD] text-white shadow-sm'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
