'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import GlobalDateFilter from '@/components/dashboard/GlobalDateFilter'
import KpiCardsRow from '@/components/dashboard/KpiCardsRow'
import YesterdaySummaryCard from '@/components/dashboard/YesterdaySummaryCard'
import AlgeriaMapGeoCard from '@/components/dashboard/AlgeriaMapGeoCard'
import TodayHourlyChart from '@/components/dashboard/TodayHourlyChart'
import PeriodAnalyticsChart from '@/components/dashboard/PeriodAnalyticsChart'
import ProductPerformanceTable from '@/components/dashboard/ProductPerformanceTable'
import type { DatePreset } from '@/lib/utils/timezone'

interface Props {
  storeName: string
  userName: string
  plan: string
  initialData: any
}

export default function DashboardHome({ storeName, userName, plan, initialData }: Props) {
  const [preset, setPreset] = useState<DatePreset>('today')
  const [startDate, setStartDate] = useState<string | undefined>(undefined)
  const [endDate, setEndDate] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [analytics, setAnalytics] = useState<any>(initialData)

  const fetchAnalytics = useCallback(async (p: DatePreset, sDate?: string, eDate?: string) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      query.set('preset', p)
      if (sDate) query.set('startDate', sDate)
      if (eDate) query.set('endDate', eDate)

      const res = await fetch(`/api/dashboard/analytics?${query.toString()}`)
      const json = await res.json()

      if (json.ok) {
        setAnalytics(json)
      }
    } catch (err) {
      console.error('Failed to update analytics:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const handleDateChange = (newPreset: DatePreset, newStart?: string, newEnd?: string) => {
    setPreset(newPreset)
    setStartDate(newStart)
    setEndDate(newEnd)
    fetchAnalytics(newPreset, newStart, newEnd)
  }

  // Extract analytics values with fallback to initial server state
  const kpis = analytics?.kpis ?? initialData?.kpis ?? {
    totalOrders: { value: 0, change: 0, sparkline: [] },
    abandonedOrders: { value: 0, change: 0, sparkline: [] },
    normalOrders: { value: 0, change: 0, sparkline: [] },
    facebookOrders: { value: 0, change: 0, sparkline: [] },
    tiktokOrders: { value: 0, change: 0, sparkline: [] },
    otherOrders: { value: 0, change: 0, sparkline: [] },
    revenue: { value: 0, change: 0 },
  }

  const hourlyData = analytics?.hourlyData ?? initialData?.hourlyData ?? []
  const wilayaDistribution = analytics?.wilayaDistribution ?? initialData?.wilayaDistribution ?? {
    totalOrders: 0,
    wilayaCounts: {},
    sortedWilayas: [],
  }
  const periodSeries = analytics?.periodSeries ?? initialData?.periodSeries ?? []
  const productPerformance = analytics?.productPerformance ?? initialData?.productPerformance ?? []
  const dateRange = analytics?.dateRange ?? initialData?.dateRange ?? { label: 'اليوم' }

  return (
    <div className="p-4 md:p-6 mx-auto space-y-5 max-w-[1400px] font-sans" dir="rtl">
      {/* ── TOP HEADER & GLOBAL DATE FILTER ── */}
      <header className="bg-white p-5 rounded-2xl border border-gray-150 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">
              {storeName || 'CPMMERCO'} 👏
            </h1>
            <span className="bg-blue-50 text-[#0D6EFD] text-xs px-2.5 py-0.5 rounded-full font-bold">
              مباشر 🟢
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            نظرة عامة على أداء متجرك (<strong className="text-gray-700">{dateRange.label}</strong>) · بتوقيت الجزائر (Africa/Algiers)
          </p>
        </div>

        {/* Global Date Filter Controls */}
        <div className="flex items-center gap-3">
          <GlobalDateFilter
            preset={preset}
            startDate={startDate}
            endDate={endDate}
            onChange={handleDateChange}
            disabled={loading}
          />
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-[#0D6EFD] font-bold">
              <Loader2 size={14} className="animate-spin" />
              <span>جاري التحديث...</span>
            </div>
          )}
        </div>
      </header>

      {/* ── ROW 1: 6 KPI CARDS WITH SPARKLINES ── */}
      <section>
        <KpiCardsRow data={kpis} />
      </section>

      {/* ── ROW 2: 3 CARDS (SUMMARY + ALGERIA MAP + HOURLY ENTRY) ── */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Yesterday/Period Summary Card (3 cols) */}
        <div className="lg:col-span-3">
          <YesterdaySummaryCard
            label={dateRange.label}
            totalOrders={kpis.totalOrders?.value ?? 0}
            ordersChange={kpis.totalOrders?.change ?? 0}
            totalRevenue={kpis.revenue?.value ?? 0}
            revenueChange={kpis.revenue?.change ?? 0}
          />
        </div>

        {/* Algeria Geographic Distribution Map (5 cols) */}
        <div className="lg:col-span-5">
          <AlgeriaMapGeoCard
            totalOrders={wilayaDistribution.totalOrders ?? 0}
            wilayaCounts={wilayaDistribution.wilayaCounts ?? {}}
            sortedWilayas={wilayaDistribution.sortedWilayas ?? []}
          />
        </div>

        {/* Today's Hourly Order Entry Line Chart (4 cols) */}
        <div className="lg:col-span-4">
          <TodayHourlyChart
            data={hourlyData}
            label={preset === 'today' ? 'أوقات دخول الطلبات (اليوم)' : `أوقات دخول الطلبات (${dateRange.label})`}
          />
        </div>
      </section>

      {/* ── ROW 3: PERIOD ANALYTICS MULTI-LINE CHART ── */}
      <section>
        <PeriodAnalyticsChart
          data={periodSeries}
          presetLabel={dateRange.label}
        />
      </section>

      {/* ── ROW 4: PRODUCT PERFORMANCE TABLE ── */}
      <section>
        <ProductPerformanceTable products={productPerformance} />
      </section>
    </div>
  )
}
