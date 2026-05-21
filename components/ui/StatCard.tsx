'use client'
import { useCountUp } from '@/hooks/useCountUp'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label:        string
  value:        number
  prefix?:      string
  suffix?:      string
  trend?:       number    // percentage
  icon?:        LucideIcon
  iconBg?:      string
  iconColor?:   string
  loading?:     boolean
}

export default function StatCard({
  label, value, prefix = '', suffix = '', trend, icon: Icon,
  iconBg = '#EBF5FF', iconColor = '#0D6EFD', loading = false,
}: StatCardProps) {
  const { formatted, ref } = useCountUp({ end: value, prefix, suffix, duration: 1200 })

  if (loading) {
    return (
      <div className="card p-4">
        <div className="skeleton h-3 w-20 mb-3" />
        <div className="skeleton h-8 w-28 mb-2" />
        <div className="skeleton h-3 w-16" />
      </div>
    )
  }

  const TrendIcon = trend === undefined ? null : trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus
  const trendColor = trend === undefined ? '' : trend > 0 ? '#198754' : trend < 0 ? '#DC3545' : '#868E96'

  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        {Icon && (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
            <Icon size={18} style={{ color: iconColor }} strokeWidth={1.8} />
          </div>
        )}
        {TrendIcon && trend !== undefined && (
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: trendColor }}>
            <TrendIcon size={13} />
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div>
        <p ref={ref as any} className="stat-value animate-count-up">
          {formatted}
        </p>
        <p className="stat-label mt-0.5" style={{ fontFamily: 'var(--font-arabic)' }}>{label}</p>
      </div>
    </div>
  )
}
