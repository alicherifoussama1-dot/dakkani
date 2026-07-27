'use client'

import { useMemo, useState } from 'react'
import { MapPin } from 'lucide-react'
import AlgeriaMap from '@/components/dashboard/AlgeriaMap'

interface WilayaItem {
  id: number
  name: string
  count: number
  pct: number
}

interface AlgeriaMapGeoCardProps {
  totalOrders: number
  wilayaCounts: Record<number, number>
  sortedWilayas: WilayaItem[]
}

export default function AlgeriaMapGeoCard({
  totalOrders,
  wilayaCounts,
  sortedWilayas,
}: AlgeriaMapGeoCardProps) {
  const topWilayas = useMemo(() => {
    return sortedWilayas.slice(0, 7)
  }, [sortedWilayas])

  const otherCount = useMemo(() => {
    const topSum = topWilayas.reduce((sum, w) => sum + w.count, 0)
    return Math.max(0, totalOrders - topSum)
  }, [topWilayas, totalOrders])

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <MapPin size={16} className="text-[#0D6EFD]" />
            <span>التوزيع الجغرافي للطلبات</span>
          </h3>
          <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full">
            {totalOrders.toLocaleString()} طلب
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center mt-2">
          {/* Map Column */}
          <div className="md:col-span-7 flex justify-center items-center py-2">
            <AlgeriaMap counts={wilayaCounts} />
          </div>

          {/* Ranking List Column */}
          <div className="md:col-span-5 space-y-2 border-r md:border-r border-gray-100 pr-0 md:pr-4">
            {sortedWilayas.length > 0 ? (
              <>
                <div className="space-y-1.5 max-h-56 overflow-y-auto scrollbar-thin">
                  {topWilayas.map((w) => (
                    <div
                      key={w.id}
                      className="flex items-center justify-between py-1 px-2 rounded-lg hover:bg-gray-50 transition text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-gray-800">{w.name}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono font-bold">
                        <span className="text-gray-900">{w.count}</span>
                        <span className="text-gray-400 text-[10px]">({w.pct}%)</span>
                      </div>
                    </div>
                  ))}

                  {otherCount > 0 && (
                    <div className="flex items-center justify-between py-1 px-2 rounded-lg text-xs text-gray-500">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                        <span>ولايات أخرى</span>
                      </div>
                      <span className="font-mono font-bold text-gray-600">{otherCount}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-600">الإجمالي طلب</span>
                  <span className="font-mono text-emerald-700">{totalOrders.toLocaleString()}</span>
                </div>
              </>
            ) : (
              <p className="text-xs text-gray-400 text-center py-8">
                لا توجد طلبات مسجلة في هذه الفترة لعرض التوزيع الجغرافي
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
