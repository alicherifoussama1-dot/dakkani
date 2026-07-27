'use client'

import Link from 'next/link'
import { Package, ArrowLeft, ExternalLink } from 'lucide-react'

export interface ProductPerformanceItem {
  id: string
  name: string
  image_url: string | null
  total_orders: number
  normal_orders: number
  abandoned_orders: number
  abandonment_rate: number
}

interface ProductPerformanceTableProps {
  products: ProductPerformanceItem[]
}

export default function ProductPerformanceTable({ products }: ProductPerformanceTableProps) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Package size={18} className="text-[#0D6EFD]" />
            <span>أداء المنتجات</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            إحصائيات إجمالي الطلبات، الطلبات العادية، المتروكة ومعدل التخلي حسب المنتج
          </p>
        </div>

        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition"
        >
          <span>عرض جميع المنتجات</span>
          <ArrowLeft size={13} className="rtl:rotate-180" />
        </Link>
      </div>

      {products.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 font-bold">
                <th className="pb-3 text-start font-semibold">المنتج</th>
                <th className="pb-3 text-center font-semibold">إجمالي الطلبات</th>
                <th className="pb-3 text-center font-semibold">الطلبات العادية</th>
                <th className="pb-3 text-center font-semibold">الطلبات المتروكة</th>
                <th className="pb-3 text-end font-semibold">معدل التخلي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products.map((item) => {
                const isHighAbandon = item.abandonment_rate > 35
                const barColor = isHighAbandon ? 'bg-red-500' : item.abandonment_rate > 20 ? 'bg-orange-500' : 'bg-emerald-500'

                return (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition group">
                    {/* Product info & Image */}
                    <td className="py-3 pr-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 border border-gray-150 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package size={18} className="text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate group-hover:text-[#0D6EFD] transition">
                            {item.name}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Total Orders */}
                    <td className="py-3 text-center font-mono font-bold text-gray-900">
                      {item.total_orders}
                    </td>

                    {/* Normal Orders */}
                    <td className="py-3 text-center font-mono font-bold text-emerald-600">
                      {item.normal_orders}
                    </td>

                    {/* Abandoned Orders */}
                    <td className="py-3 text-center font-mono font-bold text-orange-500">
                      {item.abandoned_orders}
                    </td>

                    {/* Abandonment Rate */}
                    <td className="py-3 text-end">
                      <div className="flex items-center justify-end gap-2.5">
                        <span className="font-mono font-bold text-gray-700">
                          {item.abandonment_rate}%
                        </span>
                        <div className="w-20 bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${barColor}`}
                            style={{ width: `${Math.min(100, item.abandonment_rate)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl text-gray-400 space-y-2">
          <Package size={28} className="mx-auto text-gray-300" />
          <p className="text-xs font-semibold">لا توجد بيانات أداء منتجات للفترة المحددة</p>
        </div>
      )}
    </div>
  )
}
