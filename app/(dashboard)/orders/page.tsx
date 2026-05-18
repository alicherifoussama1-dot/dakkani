export const dynamic = 'force-dynamic'
export const metadata = { title: 'الطلبات' }

import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatDZD, formatDateShort } from '@/lib/utils/format'
import OrdersFilterBar from '@/components/orders/OrdersFilterBar'

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  new:        { label: 'جديد',    cls: 'bg-blue-100 text-blue-700' },
  confirmed:  { label: 'مؤكد',   cls: 'bg-green-100 text-green-700' },
  processing: { label: 'يُعالج', cls: 'bg-yellow-100 text-yellow-700' },
  shipped:    { label: 'شُحن',   cls: 'bg-purple-100 text-purple-700' },
  delivered:  { label: 'سُلّم',  cls: 'bg-emerald-100 text-emerald-700' },
  returned:   { label: 'مُرجع',  cls: 'bg-orange-100 text-orange-700' },
  cancelled:  { label: 'ملغى',   cls: 'bg-gray-100 text-gray-500' },
  failed:     { label: 'فاشل',   cls: 'bg-red-100 text-red-600' },
}

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string; page?: string }
}) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: store } = await supabase.from('stores').select('id').eq('owner_id', user!.id).single()
  if (!store) return null

  const page     = parseInt(searchParams.page ?? '1')
  const pageSize = 25
  const from     = (page - 1) * pageSize

  let query = supabase
    .from('orders')
    .select('*, wilaya:wilayas(name_ar)', { count: 'exact' })
    .eq('store_id', store.id)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)

  if (searchParams.status) query = query.eq('status', searchParams.status)
  if (searchParams.search) {
    query = query.or(
      `customer_name.ilike.%${searchParams.search}%,customer_phone.ilike.%${searchParams.search}%,order_number.ilike.%${searchParams.search}%`
    )
  }

  const { data: orders, count } = await query

  return (
    <div className="space-y-4 animate-fade-in" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">الطلبات</h1>
          <p className="text-sm text-gray-500">{count ?? 0} طلب إجمالاً</p>
        </div>
        <Link
          href="/admin/orders"
          className="text-sm text-dakkani-600 hover:underline font-medium"
        >
          الإدارة المتقدمة (OMS) ←
        </Link>
      </div>

      <OrdersFilterBar currentStatus={searchParams.status} currentSearch={searchParams.search} />

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['رقم الطلب', 'العميل', 'الولاية', 'المجموع', 'الحالة', 'التاريخ', 'الإجراءات'].map(h => (
                  <th key={h} className="px-4 py-3 text-right text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(orders ?? []).map(order => {
                const st = STATUS_CFG[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-500' }
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-dakkani-600">{order.order_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">{order.customer_phone}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {(order.wilaya as any)?.name_ar ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatDZD(order.total)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${st.cls}`}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">{formatDateShort(order.created_at)}</td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/orders/${order.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-dakkani-600 hover:text-white bg-dakkani-50 hover:bg-dakkani-500 px-3 py-1.5 rounded-lg transition border border-dakkani-100 hover:border-dakkani-500"
                      >
                        عرض التفاصيل ←
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {(!orders || orders.length === 0) && (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <p className="text-3xl mb-2">📋</p>
                    <p>لا توجد طلبات</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {count && Math.ceil(count / pageSize) > 1 && (
          <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              صفحة {page} من {Math.ceil(count / pageSize)}
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/orders?page=${page - 1}${searchParams.status ? `&status=${searchParams.status}` : ''}`}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition">
                  السابق
                </Link>
              )}
              {page < Math.ceil(count / pageSize) && (
                <Link href={`/orders?page=${page + 1}${searchParams.status ? `&status=${searchParams.status}` : ''}`}
                  className="px-3 py-1.5 text-sm bg-dakkani-500 text-white rounded-xl hover:bg-dakkani-600 transition">
                  التالي
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
