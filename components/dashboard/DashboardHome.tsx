'use client'
import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar, RefreshCw, Plus, ShoppingCart, Facebook,
  Chrome, ExternalLink, Play, Search,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { formatDZD } from '@/lib/utils/format'

// TikTok icon (not in lucide)
const TikTokIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.31a8.16 8.16 0 004.77 1.52V7.39a4.85 4.85 0 01-1-.7z"/>
  </svg>
)

// Demo hourly data
const generateHourlyData = (total: number) => {
  const hours = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00']
  return hours.map((h, i) => ({
    hour: h,
    orders: Math.floor(Math.random() * (total / hours.length * 2)),
  }))
}

interface Props {
  storeName:  string
  storeId:    string
  userName:   string
  todayStats: { total: number; facebook: number; tiktok: number; other: number; revenue: number }
}

export default function DashboardHome({ storeName, storeId, userName, todayStats }: Props) {
  const [dateFilter, setDateFilter] = useState('اليوم')
  const [skuSearch,  setSkuSearch]  = useState('')
  const [perPage,    setPerPage]    = useState(10)

  const chartData = generateHourlyData(todayStats.total)

  const KPI_CARDS = [
    { label: 'طلبات اليوم',    value: todayStats.total,    iconBg: '#EBF5FF', iconColor: '#0D6EFD',
      icon: () => <div className="w-5 h-5 rounded font-black text-white text-xs flex items-center justify-center" style={{background:'#0D6EFD'}}>د</div> },
    { label: 'طلبات فيسبوك',   value: todayStats.facebook, iconBg: '#EBF5FF', iconColor: '#1877F2',
      icon: () => <Facebook size={18} style={{color:'#1877F2'}} /> },
    { label: 'طلبات تيك توك',  value: todayStats.tiktok,   iconBg: '#F1F3F5', iconColor: '#000',
      icon: () => <TikTokIcon /> },
    { label: 'طلبات أخرى',     value: todayStats.other,    iconBg: '#F1F3F5', iconColor: '#868E96',
      icon: () => <Chrome size={18} style={{color:'#868E96'}} /> },
  ]

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5" dir="rtl" style={{ fontFamily: 'var(--font-arabic)' }}>
      {/* Welcome Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-bold text-xl" style={{ color: 'var(--color-text-primary)' }}>
            مرحباً {userName}! 👋
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {storeName} · {new Date().toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <select
              value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              className="input h-9 pr-8 pl-3 text-sm"
              style={{ minWidth: '120px' }}
            >
              {['اليوم','الأمس','أسبوع','شهر'].map(d => <option key={d}>{d}</option>)}
            </select>
          </div>
          <Link href="/products/new" className="btn btn-primary btn-sm gap-1.5">
            <Plus size={14} />
            منتج جديد
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI_CARDS.map(card => (
          <div key={card.label} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: card.iconBg }}>
                <card.icon />
              </div>
            </div>
            <p className="stat-value">{card.value.toLocaleString('ar-DZ')}</p>
            <p className="stat-label mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Community Banner */}
      <div className="card p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ background: 'linear-gradient(135deg,#EBF5FF 0%,#F8F9FA 100%)' }}>
        <div className="flex items-center gap-3">
          {/* Avatars */}
          <div className="flex -space-x-1 flex-row-reverse">
            {['م','أ','ك','س','ف','ع'].map((l, i) => (
              <div key={i} className="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: ['#0D6EFD','#198754','#DC3545','#FFC107','#7B2FBE','#0DCAF0'][i] }}>
                {l}
              </div>
            ))}
          </div>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>انضم لمجتمع دكاني</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>+12,000 تاجر نشط</p>
          </div>
        </div>
        <Link href="/products" className="btn btn-primary btn-sm flex-shrink-0">
          ابدأ الآن
        </Link>
      </div>

      {/* Chart + Store Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Orders Chart */}
        <div className="card p-4 lg:col-span-3">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="font-semibold text-base" style={{ color: 'var(--color-text-primary)' }}>نظرة عامة على الطلبات</h2>
              <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>اليوم حسب الساعة</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-blue">{todayStats.total} طلب</span>
              <span className="badge badge-gray">0 طلب وهمي محجوب</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F5" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#868E96' }} />
              <YAxis tick={{ fontSize: 10, fill: '#868E96' }} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '8px', border: '1px solid #DEE2E6', fontSize: '12px' }}
                formatter={(v: number) => [v, 'طلبات']}
              />
              <Line type="monotone" dataKey="orders" stroke="#0D6EFD" strokeWidth={2} dot={false} name="الطلبات" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Store Setup */}
        <div className="card p-4 lg:col-span-2 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>اعدّ متجرك للطلبات القادمة</h2>
            <Link href="/products" className="btn btn-primary btn-sm">ابدأ</Link>
          </div>
          {/* YouTube tutorial placeholder */}
          <div className="rounded-xl overflow-hidden flex-1 flex items-center justify-center" style={{ background: '#111', minHeight: '140px' }}>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Play size={20} fill="white" className="text-white" />
              </div>
              <p className="text-xs text-white/70">شاهد الشرح</p>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: 'var(--color-border)' }}>
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>طلبات المنتجات</h2>
          <div className="relative">
            <Search size={13} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-muted)' }} />
            <input
              value={skuSearch}
              onChange={e => setSkuSearch(e.target.value)}
              placeholder="ابحث عن SKU أو المنتج..."
              className="input input-sm pr-8 w-56"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['SKU','اسم المنتج','اليوم','الأمس'].map(h => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {todayStats.total === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-10">
                    <Link href="/products/new" className="btn btn-primary btn-sm gap-1.5">
                      <Plus size={13} />أضف منتجاً للبدء
                    </Link>
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={4} className="text-center py-10 text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    <Link href="/products" style={{ color: 'var(--color-accent)' }}>عرض المنتجات ←</Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <select value={perPage} onChange={e => setPerPage(+e.target.value)} className="input h-7 text-xs px-2 w-16">
            {[5,10,20,30,50].map(n => <option key={n}>{n}</option>)}
          </select>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>لكل صفحة</span>
        </div>
      </div>

      {/* Sales Highlights */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-sm" style={{ color: 'var(--color-text-primary)' }}>مبيعات اليوم</h2>
          <div>
            <span className="font-bold text-lg" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-primary)' }}>
              {formatDZD(todayStats.revenue)}
            </span>
            <span className="text-xs mr-2" style={{ color: 'var(--color-text-muted)' }}>الكل: {formatDZD(todayStats.revenue)}</span>
          </div>
        </div>
        <div className="space-y-2">
          {[
            { label: 'فيسبوك', value: todayStats.facebook, color: '#1877F2', pct: todayStats.total > 0 ? (todayStats.facebook/todayStats.total)*100 : 0 },
            { label: 'تيك توك', value: todayStats.tiktok,  color: '#000',    pct: todayStats.total > 0 ? (todayStats.tiktok/todayStats.total)*100 : 0 },
            { label: 'أخرى',    value: todayStats.other,   color: '#868E96', pct: todayStats.total > 0 ? (todayStats.other/todayStats.total)*100 : 0 },
          ].map(row => (
            <div key={row.label} className="flex items-center gap-3">
              <span className="w-16 text-xs text-left flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>{row.label}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--color-bg-muted)' }}>
                <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${row.pct}%`, background: row.color }} />
              </div>
              <span className="w-8 text-xs text-left flex-shrink-0" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-primary)' }}>{row.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
