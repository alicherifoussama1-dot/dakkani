'use client'
import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

export interface Column<T> {
  key:       string
  label:     string
  sortable?: boolean
  render?:   (row: T, idx: number) => React.ReactNode
  width?:    string
}

interface DataTableProps<T> {
  columns:     Column<T>[]
  data:        T[]
  loading?:    boolean
  emptyText?:  string
  rowKey:      (row: T) => string
  onRowClick?: (row: T) => void
  perPageOptions?: number[]
  total?:      number
  page?:       number
  onPageChange?: (p: number) => void
  perPage?:    number
  onPerPageChange?: (pp: number) => void
}

export default function DataTable<T>({
  columns, data, loading = false, emptyText = 'لا توجد بيانات',
  rowKey, onRowClick, perPageOptions = [5,10,20,30,50],
  total, page = 1, onPageChange, perPage = 10, onPerPageChange,
}: DataTableProps<T>) {
  const [sortKey, setSortKey]   = useState<string | null>(null)
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('asc')

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const totalPages = total ? Math.ceil(total / perPage) : 1

  const SortIcon = ({ col }: { col: Column<T> }) => {
    if (!col.sortable) return null
    if (sortKey !== col.key) return <ChevronsUpDown size={12} style={{ color: '#CED4DA' }} />
    return sortDir === 'asc'
      ? <ChevronUp size={12} style={{ color: '#0D6EFD' }} />
      : <ChevronDown size={12} style={{ color: '#0D6EFD' }} />
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="data-table" style={{ fontFamily: 'var(--font-arabic)' }}>
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  style={{ width: col.width, cursor: col.sortable ? 'pointer' : 'default' }}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1 justify-end">
                    {col.label}
                    <SortIcon col={col} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {columns.map(col => (
                    <td key={col.key}><div className="skeleton h-4 rounded w-3/4" /></td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-10" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>
                  {emptyText}
                </td>
              </tr>
            ) : (
              data.map((row, idx) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                >
                  {columns.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(row, idx) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {(total !== undefined || onPerPageChange) && (
        <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>عرض</span>
            <select
              value={perPage}
              onChange={e => onPerPageChange?.(parseInt(e.target.value))}
              className="input text-xs h-7 px-2 w-16"
            >
              {perPageOptions.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            {total !== undefined && (
              <span className="text-sm" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-arabic)' }}>
                من {((page-1)*perPage)+1} - {Math.min(page*perPage, total)} من {total.toLocaleString('ar-DZ')}
              </span>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange?.(1)}
                disabled={page <= 1}
                className="w-7 h-7 flex items-center justify-center rounded text-xs border hover:bg-[#F8F9FA] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--color-border)' }}
              >«</button>
              <button
                onClick={() => onPageChange?.(page - 1)}
                disabled={page <= 1}
                className="w-7 h-7 flex items-center justify-center rounded text-xs border hover:bg-[#F8F9FA] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--color-border)' }}
              >‹</button>
              <span className="px-3 h-7 flex items-center text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                {page} / {totalPages}
              </span>
              <button
                onClick={() => onPageChange?.(page + 1)}
                disabled={page >= totalPages}
                className="w-7 h-7 flex items-center justify-center rounded text-xs border hover:bg-[#F8F9FA] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--color-border)' }}
              >›</button>
              <button
                onClick={() => onPageChange?.(totalPages)}
                disabled={page >= totalPages}
                className="w-7 h-7 flex items-center justify-center rounded text-xs border hover:bg-[#F8F9FA] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--color-border)' }}
              >»</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
