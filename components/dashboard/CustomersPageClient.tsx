'use client'
import { useState, useMemo } from 'react'
import { Search, Users, Phone, MapPin, TrendingUp } from 'lucide-react'
import { formatDZD, formatDateShort } from '@/lib/utils/format'

interface Customer {
  name: string; phone: string; wilaya?: string; commune?: string
  orders: number; lastId: string; spent: number; first: string; last: string
}

export default function CustomersPageClient({ customers }: { customers: Customer[] }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    if (!q.trim()) return customers
    const lq = q.toLowerCase()
    return customers.filter(c =>
      c.name.toLowerCase().includes(lq) ||
      c.phone.includes(lq) ||
      (c.wilaya ?? '').includes(lq) ||
      (c.commune ?? '').includes(lq)
    )
  }, [q, customers])

  return (
    <div className="space-y-4" style={{fontFamily:'var(--font-arabic)'}}>
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="stat-value">{customers.length.toLocaleString('ar-DZ')}</p>
          <p className="stat-label">إجمالي الزبائن</p>
        </div>
        <div className="card p-4">
          <p className="stat-value" style={{color:'var(--color-accent)'}}>
            {formatDZD(customers.reduce((s,c) => s + c.spent, 0))}
          </p>
          <p className="stat-label">إجمالي المبيعات</p>
        </div>
        <div className="card p-4">
          <p className="stat-value">
            {customers.length > 0 ? formatDZD(customers.reduce((s,c) => s + c.spent, 0) / customers.length) : '0 دج'}
          </p>
          <p className="stat-label">متوسط الإنفاق</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'var(--color-text-muted)'}} />
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="ابحث عن زبون، هاتف، ولاية..."
          className="input pr-8 text-sm"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['الزبون','الموقع','الطلبات','الإنفاق','آخر طلب'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-14">
                    <Users size={28} className="mx-auto mb-2" style={{color:'var(--color-text-muted)'}} />
                    <p className="text-sm" style={{color:'var(--color-text-muted)'}}>
                      {q ? 'لا توجد نتائج للبحث' : 'لا توجد بيانات زبائن'}
                    </p>
                  </td>
                </tr>
              ) : filtered.map(c => (
                <tr key={c.phone}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{background:'var(--color-accent)'}}>
                        {c.name[0]}
                      </div>
                      <div>
                        <p className="font-medium text-sm" style={{color:'var(--color-text-primary)'}}>{c.name}</p>
                        <p className="text-xs flex items-center gap-1" style={{color:'var(--color-text-muted)',fontFamily:'var(--font-primary)'}}>
                          <Phone size={10} />{c.phone}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    {c.wilaya ? (
                      <p className="text-sm flex items-center gap-1" style={{color:'var(--color-text-secondary)'}}>
                        <MapPin size={11} />{c.commune ? `${c.commune}، ${c.wilaya}` : c.wilaya}
                      </p>
                    ) : <span style={{color:'var(--color-text-muted)'}}>—</span>}
                  </td>
                  <td>
                    <p className="font-semibold text-sm" style={{fontFamily:'var(--font-primary)'}}>{c.orders}</p>
                    <p className="text-xs" style={{color:'var(--color-text-muted)'}}>#{c.lastId}</p>
                  </td>
                  <td>
                    <p className="font-semibold text-sm flex items-center gap-1" style={{color:'var(--color-accent)',fontFamily:'var(--font-primary)'}}>
                      <TrendingUp size={12} />{formatDZD(c.spent)}
                    </p>
                  </td>
                  <td>
                    <p className="text-sm" style={{fontFamily:'var(--font-primary)'}}>{formatDateShort(c.last)}</p>
                    <p className="text-xs" style={{color:'var(--color-text-muted)'}}>أول: {formatDateShort(c.first)}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t text-xs" style={{borderColor:'var(--color-border)',color:'var(--color-text-muted)'}}>
            {filtered.length} زبون{q ? ` (من ${customers.length})` : ''}
          </div>
        )}
      </div>
    </div>
  )
}
