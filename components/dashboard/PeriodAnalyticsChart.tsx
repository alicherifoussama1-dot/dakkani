'use client'

import { BarChart2 } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { formatDZD } from '@/lib/utils/format'

interface PeriodPoint {
  label: string
  total_orders: number
  normal_orders: number
  abandoned_orders: number
  revenue: number
}

interface PeriodAnalyticsChartProps {
  data: PeriodPoint[]
  presetLabel?: string
}

export default function PeriodAnalyticsChart({ data, presetLabel = 'الفترة المختارة' }: PeriodAnalyticsChartProps) {
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900/95 text-white p-3.5 rounded-2xl shadow-xl text-xs font-sans border border-gray-800 space-y-1.5 backdrop-blur-xs min-w-[170px]" dir="rtl">
          <p className="font-bold text-gray-300 border-b border-gray-800 pb-1 font-mono text-center">
            {label}
          </p>

          {payload.map((entry: any, index: number) => {
            const isRev = entry.dataKey === 'revenue'
            return (
              <div key={`item-${index}`} className="flex items-center justify-between text-xs font-semibold">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}:
                </span>
                <span className="font-mono font-bold">
                  {isRev ? formatDZD(entry.value) : entry.value}
                </span>
              </div>
            )
          })}
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 size={18} className="text-[#0D6EFD]" />
            <span>تحليلات الفترة ({presetLabel})</span>
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">
            مقارنة إجمالي الطلبات، الطلبات العادية، المتروكة والدخل الإجمالي
          </p>
        </div>

        {/* Custom Legend Badges */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="flex items-center gap-1.5 font-bold text-emerald-600">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> إجمالي الطلبات
          </span>
          <span className="flex items-center gap-1.5 font-bold text-blue-600">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> الطلبات العادية
          </span>
          <span className="flex items-center gap-1.5 font-bold text-orange-500">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> الطلبات المتروكة
          </span>
          <span className="flex items-center gap-1.5 font-bold text-purple-600">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500" /> إجمالي الدخل (DA)
          </span>
        </div>
      </div>

      <div className="w-full h-72 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D6EFD" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#0D6EFD" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorAbandoned" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
            <XAxis dataKey="label" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={{ stroke: '#E2E8F0' }} />
            <YAxis yAxisId="left" stroke="#94A3B8" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" stroke="#8B5CF6" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
            
            <Tooltip content={<CustomTooltip />} />

            <Area yAxisId="left" type="monotone" dataKey="total_orders" name="إجمالي الطلبات" stroke="#10B981" strokeWidth={2.5} fill="url(#colorTotal)" isAnimationActive={true} />
            <Area yAxisId="left" type="monotone" dataKey="normal_orders" name="الطلبات العادية" stroke="#0D6EFD" strokeWidth={2} fill="url(#colorNormal)" isAnimationActive={true} />
            <Area yAxisId="left" type="monotone" dataKey="abandoned_orders" name="الطلبات المتروكة" stroke="#F59E0B" strokeWidth={2} fill="url(#colorAbandoned)" isAnimationActive={true} />
            <Area yAxisId="right" type="monotone" dataKey="revenue" name="إجمالي الدخل" stroke="#8B5CF6" strokeWidth={2} fill="url(#colorRevenue)" isAnimationActive={true} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
