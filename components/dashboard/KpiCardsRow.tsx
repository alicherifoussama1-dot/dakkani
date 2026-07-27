'use client'

import { ShoppingBag, ShoppingCart, CheckCircle2, Facebook, Globe, TrendingUp, TrendingDown } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area } from 'recharts'

const TikTokIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.31a8.16 8.16 0 004.77 1.52V7.39a4.85 4.85 0 01-1-.7z"/>
  </svg>
)

export interface KpiItem {
  value: number
  change: number
  sparkline?: number[]
}

interface KpiCardsRowProps {
  data: {
    totalOrders: KpiItem
    abandonedOrders: KpiItem
    normalOrders: KpiItem
    facebookOrders: KpiItem
    tiktokOrders: KpiItem
    otherOrders: KpiItem
  }
}

export default function KpiCardsRow({ data }: KpiCardsRowProps) {
  const cards = [
    {
      key: 'totalOrders',
      title: 'إجمالي الطلبات',
      value: data.totalOrders?.value ?? 0,
      change: data.totalOrders?.change ?? 0,
      sparkline: data.totalOrders?.sparkline ?? [10, 15, 8, 20, 18, 25, 30],
      icon: ShoppingBag,
      iconBg: 'bg-blue-50 text-blue-600',
      strokeColor: '#0D6EFD',
      fillColor: '#0D6EFD',
    },
    {
      key: 'abandonedOrders',
      title: 'الطلبات المتروكة',
      value: data.abandonedOrders?.value ?? 0,
      change: data.abandonedOrders?.change ?? 0,
      sparkline: data.abandonedOrders?.sparkline ?? [5, 8, 12, 6, 14, 9, 11],
      icon: ShoppingCart,
      iconBg: 'bg-orange-50 text-orange-600',
      strokeColor: '#F59E0B',
      fillColor: '#F59E0B',
    },
    {
      key: 'normalOrders',
      title: 'الطلبات العادية',
      value: data.normalOrders?.value ?? 0,
      change: data.normalOrders?.change ?? 0,
      sparkline: data.normalOrders?.sparkline ?? [12, 18, 22, 19, 28, 32, 35],
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      strokeColor: '#10B981',
      fillColor: '#10B981',
    },
    {
      key: 'facebookOrders',
      title: 'طلبات فيسبوك',
      value: data.facebookOrders?.value ?? 0,
      change: data.facebookOrders?.change ?? 0,
      sparkline: data.facebookOrders?.sparkline ?? [8, 14, 11, 16, 20, 22, 26],
      icon: Facebook,
      iconBg: 'bg-blue-100 text-[#1877F2]',
      strokeColor: '#1877F2',
      fillColor: '#1877F2',
    },
    {
      key: 'tiktokOrders',
      title: 'طلبات تيك توك',
      value: data.tiktokOrders?.value ?? 0,
      change: data.tiktokOrders?.change ?? 0,
      sparkline: data.tiktokOrders?.sparkline ?? [4, 9, 7, 15, 12, 18, 21],
      icon: TikTokIcon,
      iconBg: 'bg-gray-100 text-gray-900',
      strokeColor: '#111827',
      fillColor: '#111827',
    },
    {
      key: 'otherOrders',
      title: 'مصادر أخرى',
      value: data.otherOrders?.value ?? 0,
      change: data.otherOrders?.change ?? 0,
      sparkline: data.otherOrders?.sparkline ?? [3, 5, 4, 8, 6, 9, 10],
      icon: Globe,
      iconBg: 'bg-gray-50 text-gray-600',
      strokeColor: '#6B7280',
      fillColor: '#6B7280',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
      {cards.map((card) => {
        const Icon = card.icon
        const isUp = card.change >= 0
        const chartData = card.sparkline.map((v, i) => ({ val: v, idx: i }))

        return (
          <div
            key={card.key}
            className="bg-white p-4 rounded-2xl border border-gray-150 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
          >
            {/* Top row: Icon & Title */}
            <div className="flex items-center gap-2.5 mb-2">
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${card.iconBg}`}>
                <Icon size={16} />
              </span>
              <span className="text-xs font-bold text-gray-600 truncate">{card.title}</span>
            </div>

            {/* Value & Sparkline Area */}
            <div className="flex items-end justify-between gap-2 mt-1">
              <div>
                <p className="text-2xl font-black text-gray-900 tracking-tight leading-none font-mono">
                  {card.value.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2 text-[11px]">
                  <span
                    className={`inline-flex items-center gap-0.5 font-bold font-mono ${
                      isUp ? 'text-emerald-600' : 'text-red-500'
                    }`}
                  >
                    {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {isUp ? '+' : ''}
                    {card.change}%
                  </span>
                  <span className="text-gray-400 text-[10px]">مقارنة بالفترة السابقة</span>
                </div>
              </div>

              {/* Mini Sparkline Chart */}
              <div className="w-16 h-9 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                    <defs>
                      <linearGradient id={`grad_${card.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={card.fillColor} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={card.fillColor} stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="val"
                      stroke={card.strokeColor}
                      strokeWidth={2}
                      fill={`url(#grad_${card.key})`}
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
