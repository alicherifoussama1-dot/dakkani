'use client'

import { Clock } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface HourlyDataItem {
  hour: string
  hourNum: number
  orders: number
  abandoned: number
  normal: number
}

interface TodayHourlyChartProps {
  data: HourlyDataItem[]
  label?: string
}

export default function TodayHourlyChart({ data, label = 'أوقات دخول الطلبات' }: TodayHourlyChartProps) {
  const currentAlgiersHour = new Date().getHours() // Current Algiers hour

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as HourlyDataItem
      return (
        <div className="bg-gray-900/95 text-white p-3 rounded-2xl shadow-xl text-xs font-sans border border-gray-800 space-y-1 backdrop-blur-xs" dir="rtl">
          <div className="flex items-center justify-between gap-3 text-gray-300 border-b border-gray-800 pb-1 font-mono">
            <span>⏰ الساعة: {d.hour}</span>
            {d.hourNum === currentAlgiersHour && (
              <span className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded-md font-sans">الساعة الحالية</span>
            )}
          </div>
          <p className="font-bold text-sm text-emerald-400 font-mono">
            {d.orders} طلب
          </p>
          <div className="flex items-center gap-3 text-[11px] text-gray-300 pt-0.5">
            <span>عادية: <strong className="text-white font-mono">{d.normal}</strong></span>
            <span>متروكة: <strong className="text-orange-400 font-mono">{d.abandoned}</strong></span>
          </div>
        </div>
      )
    }
    return null
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
            <Clock size={16} className="text-[#0D6EFD]" />
            <span>{label}</span>
          </h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-lg border border-gray-100">
            توقيت الجزائر (Africa/Algiers)
          </span>
        </div>

        <div className="w-full h-60 mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="hourlyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
              <XAxis
                dataKey="hour"
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: '#E2E8F0' }}
                tickFormatter={(v, i) => (i % 4 === 0 || i === 23 ? v : '')}
              />
              <YAxis
                stroke="#94A3B8"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#hourlyGrad)"
                dot={{ r: 3, fill: '#10B981', stroke: '#ffffff', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: '#10B981', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={true}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
