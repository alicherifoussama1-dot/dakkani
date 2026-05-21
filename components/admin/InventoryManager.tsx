'use client'
import { useState, useRef } from 'react'
import { useRouter }         from 'next/navigation'
import { createClient }      from '@/lib/supabase/client'
import { Search, Download, Upload, ArrowLeftRight, AlertTriangle } from 'lucide-react'

interface StockRow {
  id: string; quantity: number; reserved: number; variant_key: string; low_stock_at: number
  product?: { id: string; name: string; name_ar?: string; sku?: string; images?: { url: string }[] }
  warehouse?: { name: string }
  warehouse_id: string; product_id: string
}

interface Props {
  storeId: string
  stock: StockRow[]
  warehouses: { id: string; name: string }[]
  products: { id: string; name: string; name_ar?: string; sku?: string }[]
  threshold: number
}

export default function InventoryManager({ storeId, stock, warehouses, products, threshold }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<'all' | 'low' | 'out'>('all')
  const [transfer,  setTransfer]  = useState<{ row: StockRow | null; qty: string; toWarehouse: string }>({ row: null, qty: '', toWarehouse: '' })
  const [editQty,   setEditQty]   = useState<{ id: string; val: string } | null>(null)
  const [saving,    setSaving]    = useState(false)

  const filtered = stock.filter(row => {
    const avail = row.quantity - row.reserved
    const name  = row.product?.name_ar ?? row.product?.name ?? ''
    const matchSearch = !search || name.toLowerCase().includes(search.toLowerCase()) || row.product?.sku?.includes(search)
    const matchFilter = filter === 'all' ? true : filter === 'out' ? avail <= 0 : avail > 0 && avail <= (row.low_stock_at ?? threshold)
    return matchSearch && matchFilter
  })

  const lowCount = stock.filter(r => {
    const avail = r.quantity - r.reserved
    return avail > 0 && avail <= (r.low_stock_at ?? threshold)
  }).length
  const outCount = stock.filter(r => r.quantity - r.reserved <= 0).length

  // ── Inline quantity edit ─────────────────────────────────
  const saveQty = async (row: StockRow) => {
    if (!editQty) return
    const newQty = parseInt(editQty.val)
    if (isNaN(newQty) || newQty < 0) { setEditQty(null); return }
    setSaving(true)
    await supabase.from('warehouse_stock').update({ quantity: newQty }).eq('id', row.id)
    setEditQty(null)
    setSaving(false)
    router.refresh()
  }

  // ── Stock transfer ───────────────────────────────────────
  const doTransfer = async () => {
    const { row, qty, toWarehouse } = transfer
    if (!row || !qty || !toWarehouse) return
    const amount = parseInt(qty)
    if (isNaN(amount) || amount <= 0 || amount > row.quantity - row.reserved) return
    setSaving(true)

    await Promise.all([
      supabase.from('warehouse_stock').update({ quantity: row.quantity - amount }).eq('id', row.id),
      supabase.from('warehouse_stock').upsert({
        store_id:     storeId,
        product_id:   row.product_id,
        warehouse_id: toWarehouse,
        variant_key:  row.variant_key,
        quantity:     amount,
        reserved:     0,
      }, { onConflict: 'warehouse_id,product_id,variant_key' }),
    ])

    setTransfer({ row: null, qty: '', toWarehouse: '' })
    setSaving(false)
    router.refresh()
  }

  // ── CSV Export ───────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['المنتج', 'SKU', 'المستودع', 'المتغير', 'الكمية', 'محجوز', 'متاح', 'حد التنبيه']
    const rows = stock.map(r => [
      r.product?.name_ar ?? r.product?.name ?? '',
      r.product?.sku ?? '',
      r.warehouse?.name ?? '',
      r.variant_key,
      r.quantity,
      r.reserved,
      r.quantity - r.reserved,
      r.low_stock_at ?? threshold,
    ])
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `stock-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  // ── CSV Import ───────────────────────────────────────────
  const importCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const lines = text.split('\n').slice(1) // skip header
    setSaving(true)
    for (const line of lines) {
      const cols = line.split(',')
      if (cols.length < 4) continue
      const sku  = cols[1]?.trim()
      const qty  = parseInt(cols[4] ?? '')
      if (!sku || isNaN(qty)) continue
      const prod = products.find(p => p.sku === sku)
      if (!prod) continue
      await supabase.from('warehouse_stock')
        .update({ quantity: qty })
        .eq('product_id', prod.id)
        .eq('store_id', storeId)
    }
    setSaving(false)
    router.refresh()
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {(lowCount > 0 || outCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {lowCount > 0 && (
            <div className="flex items-center gap-2 bg-yellow-900/20 border border-yellow-700/30 text-yellow-400 px-4 py-2 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4" />
              {lowCount} منتج على وشك النفاد
            </div>
          )}
          {outCount > 0 && (
            <div className="flex items-center gap-2 bg-red-900/20 border border-red-700/30 text-red-400 px-4 py-2 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4" />
              {outCount} منتج نفد مخزونه
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو SKU..."
            className="bg-gray-800 border border-gray-700 rounded-lg pr-9 pl-3 py-1.5 text-sm text-gray-300 w-52 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
          />
        </div>
        <div className="flex gap-1.5">
          {[['all','الكل'],['low','مخزون منخفض'],['out','نفد']] .map(([v,l]) => (
            <button
              key={v}
              onClick={() => setFilter(v as any)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition ${filter===v ? 'bg-[#0D6EFD]/20 text-[#F96540] border-[#0D6EFD]/30' : 'bg-gray-800 text-gray-500 border-gray-700'}`}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="mr-auto flex gap-2">
          <input ref={fileRef} type="file" accept=".csv" onChange={importCSV} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg transition">
            <Upload className="w-3.5 h-3.5" />استيراد CSV
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg transition">
            <Download className="w-3.5 h-3.5" />تصدير CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800/50 border-b border-gray-800">
            <tr>
              {['المنتج', 'المستودع', 'المتغير', 'الكمية', 'محجوز', 'متاح', 'حالة', ''].map(h => (
                <th key={h} className="px-4 py-3 text-right text-xs text-gray-500 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {filtered.map(row => {
              const avail = row.quantity - row.reserved
              const low   = avail > 0 && avail <= (row.low_stock_at ?? threshold)
              const out   = avail <= 0
              const img   = row.product?.images?.[0]?.url
              const isEditing = editQty?.id === row.id

              return (
                <tr key={row.id} className={`hover:bg-gray-800/30 transition ${out ? 'bg-red-900/10' : low ? 'bg-yellow-900/5' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                        {img ? <img src={img} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-600 text-sm">{(row.product?.name_ar ?? row.product?.name ?? '?')[0]}</div>}
                      </div>
                      <div>
                        <p className="text-gray-200 text-xs font-medium">{row.product?.name_ar ?? row.product?.name}</p>
                        {row.product?.sku && <p className="text-gray-600 text-xs font-mono">{row.product.sku}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{row.warehouse?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{row.variant_key === 'default' ? '—' : row.variant_key}</td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editQty.val}
                        onChange={e => setEditQty({ id: row.id, val: e.target.value })}
                        onBlur={() => saveQty(row)}
                        onKeyDown={e => e.key === 'Enter' && saveQty(row)}
                        className="w-20 bg-gray-700 border border-[#0D6EFD] rounded px-2 py-1 text-sm text-white outline-none"
                        type="number"
                      />
                    ) : (
                      <button
                        onClick={() => setEditQty({ id: row.id, val: String(row.quantity) })}
                        className="font-bold text-gray-200 hover:text-[#F96540] transition"
                      >
                        {row.quantity}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-yellow-500 text-sm">{row.reserved}</td>
                  <td className="px-4 py-3">
                    <span className={`font-black text-sm ${out ? 'text-red-400' : low ? 'text-yellow-400' : 'text-green-400'}`}>
                      {avail}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {out  && <span className="text-xs bg-red-900/30 text-red-400 border border-red-700/30 px-2 py-0.5 rounded-full">نفد</span>}
                    {low  && <span className="text-xs bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 px-2 py-0.5 rounded-full">منخفض</span>}
                    {!out && !low && <span className="text-xs text-green-500">✓</span>}
                  </td>
                  <td className="px-4 py-3">
                    {warehouses.length > 1 && (
                      <button
                        onClick={() => setTransfer({ row, qty: '', toWarehouse: warehouses.find(w => w.id !== row.warehouse_id)?.id ?? '' })}
                        className="p-1.5 text-gray-600 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition"
                        title="نقل المخزون"
                      >
                        <ArrowLeftRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-gray-600">لا يوجد مخزون</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Transfer modal */}
      {transfer.row && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm space-y-4" dir="rtl">
            <h3 className="font-bold text-white">نقل المخزون</h3>
            <p className="text-sm text-gray-400">{transfer.row.product?.name_ar ?? transfer.row.product?.name}</p>
            <div>
              <label className="block text-xs text-gray-500 mb-1">المستودع المقصود</label>
              <select
                value={transfer.toWarehouse}
                onChange={e => setTransfer(t => ({ ...t, toWarehouse: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
              >
                {warehouses.filter(w => w.id !== transfer.row!.warehouse_id).map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                الكمية المراد نقلها (متاح: {transfer.row.quantity - transfer.row.reserved})
              </label>
              <input
                type="number"
                min="1"
                max={transfer.row.quantity - transfer.row.reserved}
                value={transfer.qty}
                onChange={e => setTransfer(t => ({ ...t, qty: e.target.value }))}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 focus:ring-1 focus:ring-[#0D6EFD] outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={doTransfer}
                disabled={saving}
                className="flex-1 bg-[#0D6EFD] hover:bg-[#0B5ED7] text-white font-bold py-2 rounded-xl text-sm transition disabled:opacity-50"
              >
                {saving ? 'جارٍ النقل...' : 'نقل'}
              </button>
              <button onClick={() => setTransfer({ row: null, qty: '', toWarehouse: '' })} className="text-gray-500 text-sm hover:text-gray-300">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
