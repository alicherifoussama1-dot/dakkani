'use client'

import { Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'
import { formatDZD } from '@/lib/utils/format'

interface YesterdaySummaryCardProps {
  label?: string
  totalOrders: number
  ordersChange: number
  totalRevenue: number
  revenueChange: number
}

export default function YesterdaySummaryCard({
  label = 'أمس',
  totalOrders,
  ordersChange,
  totalRevenue,
  revenueChange,
}: YesterdaySummaryCardProps) {
  const isOrdersUp = ordersChange >= 0
  const isRevenueUp = revenueChange >= 0

  // Mini smooth wave data for visual flare
  const waveData = [
    { val: 10 }, { val: 25 }, { val: 18 }, { val: 35 }, { val: 28 }, { val: 45 }, { val: 40 }, { val: 55 }
  ]

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-col justify-between relative overflow-hidden h-full">
      <div>
        {/* Title Bar */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Calendar size={15} className="text-[#0D6EFD]" />
            <span>ملخص {label}</span>
          </h3>
        </div>

        {/* Orders metric */}
        <div className="space-y-1 mb-4">
          <span className="text-xs font-medium text-gray-500">عدد الطلبات</span>
          <div className="flex items-center gap-3">
            <span className="text-3xl font-black text-gray-900 font-mono tracking-tight">
              {totalOrders.toLocaleString()}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-bold font-mono ${
                isOrdersUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
              }`}
            >
              {isOrdersUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isOrdersUp ? '+' : ''}{ordersChange}%
            </span>
          </div>
        </div>

        {/* Revenue metric */}
        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-500">إجمالي الدخل</span>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-black text-emerald-700 font-mono tracking-tight">
              {formatDZD(totalRevenue)}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-xs font-bold font-mono ${
                isRevenueUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'
              }`}
            >
              {isRevenueUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isRevenueUp ? '+' : ''}{revenueChange}%
            </span>
          </div>
        </div>
      </div>

      {/* Decorative Smooth Curve at Bottom */}
      <div className="w-full h-16 -mb-5 -mx-5 inset-x-0 mt-4 opacity-80 pointer-events-none">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={waveData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="yesterdayGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="val"
              stroke="#10B981"
              strokeWidth={2.5}
              fill="url(#yesterdayGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
