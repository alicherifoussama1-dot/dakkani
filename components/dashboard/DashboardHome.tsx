'use client'
// COMMERCO HOME — design-system rebuild.
// UX rethink: one composed "today" overview (revenue is the hero,
// sources as integrated bars) replaces four identical KPI boxes;
// the fake video block became real quick-actions; the dead stub
// table was removed. All data contracts and i18n keys unchanged.
import { useT, useDir } from '@/lib/i18n/react'
import { useState } from 'react'
import Link from 'next/link'
import { Calendar, Plus, Facebook, Chrome, Store, Truck, Navigation2, Package } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatDZD } from '@/lib/utils/format'
import RecentOrders from '@/components/dashboard/RecentOrders'

// TikTok icon (not in lucide)
const TikTokIcon = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.31a8.16 8.16 0 004.77 1.52V7.39a4.85 4.85 0 01-1-.7z"/>
  </svg>
)

// Demo hourly data (unchanged behavior)
const generateHourlyData = (total: number) => {
  const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
  return hours.map(h => ({ hour: h, orders: Math.floor(Math.random() * (total / hours.length * 2)) }))
}

interface Props {
  storeName: string
  storeId: string
  userName: string
  todayStats: { total: number; facebook: number; tiktok: number; other: number; revenue: number; productCount?: number }
}

export default function DashboardHome({ storeName, storeId, userName, todayStats }: Props) {
  const t = useT()
  const dir = useDir()
  const DATE_LABELS: Record<string, string> = { 'اليوم': t('home.today'), 'الأمس': t('home.yesterday'), 'أسبوع': t('home.week'), 'شهر': t('home.month') }
  const [dateFilter, setDateFilter] = useState('اليوم')

  const chartData = generateHourlyData(todayStats.total)
  const noProducts = (todayStats.productCount ?? 0) === 0

  const SOURCES = [
    { label: t('home.fb'),    value: todayStats.facebook, icon: <Facebook size={13} aria-hidden />, bar: 'var(--chart-1)' },
    { label: t('home.tt'),    value: todayStats.tiktok,   icon: <TikTokIcon size={12} />,           bar: 'var(--chart-4)' },
    { label: t('home.other'), value: todayStats.other,    icon: <Chrome size={13} aria-hidden />,   bar: 'var(--chart-6)' },
  ]

  const QUICK_ACTIONS = [
    { href: '/products/new',              label: t('home.add_first'),          icon: Plus },
    { href: '/store-builder',             label: t('nav.store_builder'),       icon: Store },
    { href: '/store/delivery',            label: t('nav.delivery'),            icon: Truck },
    { href: '/settings/tracking-domains', label: t('nav.tracking_domains'),    icon: Navigation2 },
  ]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5" dir={dir} style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* ── Page header ── */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {t('home.hello', { name: userName })}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            {storeName} · {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="c-field" style={{ minWidth: 130 }}>
          <label className="sr-only" htmlFor="home-range">{t('home.today')}</label>
          <div className="relative">
            <Calendar size={14} className="absolute top-1/2 -translate-y-1/2 start-3 pointer-events-none" style={{ color: 'var(--text-muted)' }} aria-hidden />
            <select id="home-range" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
              className="c-select ps-9" style={{ blockSize: 'var(--control-h-sm)', fontSize: 'var(--text-sm)' }}>
              {['اليوم','الأمس','أسبوع','شهر'].map(d => <option key={d} value={d}>{DATE_LABELS[d] ?? d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Today overview: revenue hero + orders + integrated source split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="c-card lg:col-span-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('home.today_sales')}</p>
              <p className="mt-1 text-3xl font-extrabold leading-tight"
                style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-primary)' }}>
                {formatDZD(todayStats.revenue)}
              </p>
            </div>
            <div className="text-end">
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('home.stat_today')}</p>
              <p className="mt-1 text-3xl font-extrabold leading-tight"
                style={{ color: 'var(--color-primary-700)', fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-primary)' }}>
                {todayStats.total.toLocaleString()}
              </p>
            </div>
          </div>
          {/* source split — integrated, not four boxes */}
          <div className="mt-5 space-y-2.5">
            {SOURCES.map(row => {
              const pct = todayStats.total > 0 ? (row.value / todayStats.total) * 100 : 0
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 w-24 flex-shrink-0 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                    {row.icon}{row.label}
                  </span>
                  <div className="c-progress flex-1" aria-hidden>
                    <div className="c-progress__fill" style={{ inlineSize: `${pct}%`, background: row.bar }} />
                  </div>
                  <span className="w-8 flex-shrink-0 text-xs text-end font-semibold"
                    style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {row.value}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick actions — replaces the fake video block */}
        <div className="c-card lg:col-span-2">
          <div className="c-card__title" style={{ fontSize: 'var(--text-base)' }}>{t('home.setup')}</div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(a => (
              <Link key={a.href} href={a.href}
                className="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border p-4 text-center transition-colors hover:bg-[var(--surface-sunken)]"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)', minHeight: 84 }}>
                <span className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--color-primary-50)', color: 'var(--color-primary-600)' }}>
                  <a.icon size={17} aria-hidden />
                </span>
                <span className="text-xs font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── First-run empty state ── */}
      {noProducts && (
        <div className="c-card" style={{ padding: 0 }}>
          <div className="c-empty">
            <div className="c-empty__icon"><Package size={24} aria-hidden /></div>
            <div className="c-empty__title">{t('home.product_orders')}</div>
            <div className="c-empty__sub">{t('home.join_sub')}</div>
            <Link href="/products/new" className="c-btn c-btn--primary" style={{ marginBlockStart: 'var(--space-3)' }}>
              <Plus size={15} aria-hidden />{t('home.add_first')}
            </Link>
          </div>
        </div>
      )}

      {/* ── Orders by hour ── */}
      <div className="c-card">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)' }}>{t('home.overview')}</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{t('home.by_hour')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="c-badge c-badge--info">{t('home.orders_badge', { count: todayStats.total })}</span>
            <span className="c-badge c-badge--neutral">{t('home.fake_blocked')}</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData} margin={{ top: 4, left: 0, right: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid)" vertical={false} />
            <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} tickLine={false} axisLine={{ stroke: 'var(--chart-grid)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--chart-axis)' }} allowDecimals={false} tickLine={false} axisLine={false} width={28} />
            <Tooltip
              contentStyle={{
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)',
                background: 'var(--surface-raised)', color: 'var(--text-primary)', fontSize: 12,
                boxShadow: 'var(--shadow-md)',
              }}
              formatter={(v: number) => [v, t('home.orders_unit')]}
            />
            <Line type="monotone" dataKey="orders" stroke="var(--chart-1)" strokeWidth={2} dot={false} name={t('home.orders_series')} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Recent orders ── */}
      {todayStats.total > 0 && (
        <div className="c-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)' }}>{t('home.latest')}</h2>
            <Link href="/orders" className="text-sm font-semibold" style={{ color: 'var(--text-link)' }}>
              {t('common.view_all')}
            </Link>
          </div>
          <RecentOrders storeId={storeId} />
        </div>
      )}
    </div>
  )
}
