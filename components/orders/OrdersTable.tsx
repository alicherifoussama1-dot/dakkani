'use client'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { formatDZD, formatDateShort } from '@/lib/utils/format'
import type { Order } from '@/types'

const STATUS_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'new', label: 'جديد' },
  { value: 'confirmed', label: 'مؤكد' },
  { value: 'processing', label: 'يُعالج' },
  { value: 'shipped', label: 'شُحن' },
  { value: 'delivered', label: 'سُلّم' },
  { value: 'returned', label: 'مُرجع' },
  { value: 'cancelled', label: 'ملغى' },
]

const STATUS_COLORS: Record<string, string> = {
  new:        'bg-blue-100 text-blue-700',
  confirmed:  'bg-green-100 text-green-700',
  processing: 'bg-yellow-100 text-yellow-700',
  shipped:    'bg-purple-100 text-purple-700',
  delivered:  'bg-emerald-100 text-emerald-700',
  returned:   'bg-red-100 text-red-700',
  cancelled:  'bg-gray-100 text-gray-500',
  failed:     'bg-red-100 text-red-700',
}

const FRAUD_COLOR = (score: number) =>
  score >= 70 ? 'text-red-600' : score >= 40 ? 'text-yellow-600' : 'text-green-600'

interface Props { orders: Order[]; total: number; page: number; pageSize: number }

export default function OrdersTable({ orders, total, page, pageSize }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const push = (key: string, val: string) => {
    const p = new URLSearchParams(params.toString())
    val ? p.set(key, val) : p.delete(key)
    p.delete('page')
    router.push(`${pathname}?${p}`)
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <input
          defaultValue={params.get('search') ?? ''}
          onChange={e => push('search', e.target.value)}
          placeholder="بحث باسم، هاتف، رقم الطلب..."
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 min-w-48 focus:ring-2 focus:ring-dakkani-500 outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => push('status', opt.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                (params.get('status') ?? '') === opt.value
                  ? 'bg-dakkani-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['رقم الطلب', 'العميل', 'الولاية', 'المجموع', 'الحالة', 'تقييم الاحتيال', 'التاريخ', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => (
                <tr key={order.id} className="hover:bg-gray-50 transition">
                  <td className="px-4 py-3 font-mono font-semibold text-dakkani-600">{order.order_number}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-xs text-gray-500">{order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{(order.wilaya as any)?.name_ar ?? '-'}</td>
                  <td className="px-4 py-3 font-bold text-gray-900">{formatDZD(order.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] ?? ''}`}>
                      {STATUS_OPTIONS.find(s => s.value === order.status)?.label ?? order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${FRAUD_COLOR(order.fraud_score)}`}>{order.fraud_score}%</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateShort(order.created_at)}</td>
                  <td className="px-4 py-3">
                    <Link href={`/orders/${order.id}`} className="text-dakkani-600 hover:underline text-xs font-medium">
                      عرض
                    </Link>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">لا توجد طلبات</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">صفحة {page} من {totalPages}</p>
            <div className="flex gap-2">
              {page > 1 && (
                <button
                  onClick={() => push('page', String(page - 1))}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  السابق
                </button>
              )}
              {page < totalPages && (
                <button
                  onClick={() => push('page', String(page + 1))}
                  className="px-3 py-1.5 text-sm bg-dakkani-500 text-white rounded-lg hover:bg-dakkani-600"
                >
                  التالي
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
