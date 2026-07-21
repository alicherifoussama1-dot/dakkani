'use client'
// COMMERCO HOME — Mirocho-parity layout, cobalt identity.
// 5 status cards (+%change), gross value, estimated revenue, funnel,
// attention-needed, Algeria distribution map, 7-day period analytics.
// All data is REAL (passed from the server query). Cobalt #2952E3 is the
// single accent; status colors are semantic tokens. RTL + mobile-first.
import { useMemo } from 'react'
import Link from 'next/link'
import {
  ShoppingCart, CheckCircle2, Truck, PackageCheck, XCircle, DollarSign,
  TrendingUp, TrendingDown, AlertCircle, Facebook, Chrome, ArrowLeft,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { formatDZD } from '@/lib/utils/format'
import RecentOrders from '@/components/dashboard/RecentOrders'
import AlgeriaMap from '@/components/dashboard/AlgeriaMap'

const TikTok = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V9.31a8.16 8.16 0 004.77 1.52V7.39a4.85 4.85 0 01-1-.7z"/>
  </svg>
)

interface StatusCard { today: number; change: number }
interface Props {
  storeName: string
  userName: string
  plan: string
  data: {
    statusCards: { new: StatusCard; confirmed: StatusCard; shipped: StatusCard; completed: StatusCard; abandoned: StatusCard }
    grossValue: number; grossCount: number
    deliveredRevenue: number; revenueChange: number
    funnel: { orders: number; confirmed: number; shipped: number; delivered: number; sources: { facebook: number; tiktok: number; other: number } }
    wilayaCounts: Record<number, number>
    period: { date: string; label: string; orders: number; revenue: number }[]
    periodRevenue: number; periodOrders: number
    productCount: number
    storeReady: boolean
  }
}

const STATUS_META = [
  { key: 'new',       label: 'طلبات جديدة',  Icon: ShoppingCart, tone: 'primary' },
  { key: 'confirmed', label: 'مؤكدة',         Icon: CheckCircle2, tone: 'info' },
  { key: 'shipped',   label: 'مشحونة',        Icon: Truck,        tone: 'warning' },
  { key: 'completed', label: 'مكتملة',        Icon: PackageCheck, tone: 'success' },
  { key: 'abandoned', label: 'متروكة',        Icon: XCircle,      tone: 'danger' },
] as const

const TONE: Record<string, { fg: string; bg: string }> = {
  primary: { fg: 'var(--color-primary-600)',  bg: 'var(--color-primary-50)' },
  info:    { fg: 'var(--color-primary-700)',  bg: 'var(--color-primary-50)' },
  warning: { fg: 'var(--color-warning-600)',  bg: 'var(--color-warning-50)' },
  success: { fg: 'var(--color-success-600)',  bg: 'var(--color-success-50)' },
  danger:  { fg: 'var(--color-error-600)',    bg: 'var(--color-error-50)' },
}

export default function DashboardHome({ storeName, userName, plan, data }: Props) {
  const funnelRows = useMemo(() => {
    const max = Math.max(1, data.funnel.orders)
    return [
      { label: 'الطلبات',   value: data.funnel.orders,    color: 'var(--color-primary-600)', pct: (data.funnel.orders / max) * 100 },
      { label: 'المؤكدة',   value: data.funnel.confirmed, color: 'var(--color-primary-500)', pct: (data.funnel.confirmed / max) * 100 },
      { label: 'المشحونة',  value: data.funnel.shipped,   color: 'var(--color-warning-500)', pct: (data.funnel.shipped / max) * 100 },
      { label: 'المسلَّمة', value: data.funnel.delivered, color: 'var(--color-success-600)', pct: (data.funnel.delivered / max) * 100 },
    ]
  }, [data.funnel])

  const sources = [
    { label: 'فيسبوك', value: data.funnel.sources.facebook, Icon: Facebook },
    { label: 'تيك توك', value: data.funnel.sources.tiktok,   Icon: TikTok },
    { label: 'أخرى',    value: data.funnel.sources.other,    Icon: Chrome },
  ]
  const sourcesTotal = Math.max(1, sources.reduce((s, r) => s + r.value, 0))

  return (
    <div className="p-4 md:p-6 mx-auto space-y-4" style={{ maxInlineSize: 1320, fontFamily: 'var(--font-sans)' }} dir="rtl">
      {/* Header */}
      <header className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', letterSpacing: '-0.015em' }}>
            مرحباً {userName} 👋
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBlockStart: 4 }}>
            {storeName} · {new Date().toLocaleDateString('ar-DZ', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
        <span className="c-badge c-badge--neutral" style={{ paddingInline: 12, blockSize: 28 }}>
          خطة {plan === 'pro' ? 'Pro' : plan === 'elite' ? 'Elite' : 'مجانية'}
        </span>
      </header>

      {/* Online visitors + 5 status cards */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="relative flex" style={{ inlineSize: 8, blockSize: 8 }}>
            <span className="absolute inline-flex rounded-full opacity-60" style={{ inlineSize: '100%', blockSize: '100%', background: 'var(--color-success-500)', animation: 'c-ping 1.8s cubic-bezier(0,0,0.2,1) infinite' }} />
            <span className="relative inline-flex rounded-full" style={{ inlineSize: 8, blockSize: 8, background: 'var(--color-success-600)' }} />
          </span>
          <span className="num" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>0</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>زائر متصل الآن</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {STATUS_META.map(({ key, label, Icon, tone }) => {
            const card = data.statusCards[key]
            const up = card.change >= 0
            const t = TONE[tone]
            return (
              <div key={key} className="c-card" style={{ padding: 'var(--space-4)' }}>
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="flex items-center justify-center rounded-full flex-shrink-0" style={{ inlineSize: 34, blockSize: 34, background: t.bg, color: t.fg }}>
                    <Icon size={17} aria-hidden />
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--font-medium)', lineHeight: 1.2 }}>{label}</span>
                </div>
                <p className="num" style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-black)', color: 'var(--text-primary)', lineHeight: 1 }}>{card.today}</p>
                <div className="flex items-center gap-1 mt-2" style={{ fontSize: 'var(--text-xs)' }}>
                  <span className="flex items-center gap-0.5 num" style={{ color: up ? 'var(--color-success-600)' : 'var(--color-error-600)', fontWeight: 'var(--font-semibold)' }}>
                    {up ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}{Math.abs(card.change)}%
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>عن الأمس</span>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Gross value + Estimated revenue + Map */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="c-card" style={{ background: 'linear-gradient(150deg, var(--color-primary-700), var(--color-primary-900))', color: '#fff', border: 'none' }}>
          {!data.storeReady && (
            <span className="c-badge" style={{ background: 'rgb(255 255 255 / 0.16)', color: '#fff', marginBlockEnd: 'var(--space-3)' }}>
              <AlertCircle size={11} aria-hidden /> المتجر شبه جاهز
            </span>
          )}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p style={{ fontSize: 'var(--text-sm)', color: 'rgb(255 255 255 / 0.8)' }}>القيمة الإجمالية للطلبات</p>
              <p className="num" style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-black)', lineHeight: 1.1, marginBlockStart: 6 }}>{formatDZD(data.grossValue)}</p>
            </div>
            <div className="text-end">
              <p style={{ fontSize: 'var(--text-sm)', color: 'rgb(255 255 255 / 0.8)' }}>الطلبات</p>
              <p className="num" style={{ fontSize: 'var(--text-2xl)', fontWeight: 'var(--font-bold)', marginBlockStart: 4 }}>{data.grossCount}</p>
            </div>
          </div>
        </div>

        <div className="c-card">
          <div className="flex items-center gap-2.5 mb-4">
            <span className="flex items-center justify-center rounded-full" style={{ inlineSize: 34, blockSize: 34, background: 'var(--color-success-50)', color: 'var(--color-success-600)' }}>
              <DollarSign size={17} aria-hidden />
            </span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', fontWeight: 'var(--font-medium)' }}>الإيرادات المقدّرة</span>
          </div>
          <p className="num" style={{ fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-black)', color: 'var(--color-success-700)', lineHeight: 1 }}>
            {formatDZD(data.deliveredRevenue)}
          </p>
          <div className="flex items-center gap-1 mt-2" style={{ fontSize: 'var(--text-xs)' }}>
            <span className="flex items-center gap-0.5 num" style={{ color: data.revenueChange >= 0 ? 'var(--color-success-600)' : 'var(--color-error-600)', fontWeight: 'var(--font-semibold)' }}>
              {data.revenueChange >= 0 ? <TrendingUp size={12} aria-hidden /> : <TrendingDown size={12} aria-hidden />}{Math.abs(data.revenueChange)}%
            </span>
            <span style={{ color: 'var(--text-muted)' }}>عن الأمس · من المسلَّمة</span>
          </div>
        </div>

        <div className="c-card">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBlockEnd: 'var(--space-3)' }}>
            التوزيع الجغرافي
          </h2>
          <AlgeriaMap counts={data.wilayaCounts} />
        </div>
      </section>

      {/* Attention needed + Funnel */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="c-card">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}>
            يحتاج انتباهك
          </h2>
          <div className="space-y-2.5">
            {!data.storeReady && (
              <AttentionRow tone="danger" text="متجرك شبه جاهز، أضف أول منتج لاستقبال الطلبات" href="/products/new" cta="أضف منتج" />
            )}
            {data.statusCards.new.today > 0 && (
              <AttentionRow tone="primary" text={`لديك ${data.statusCards.new.today} طلب جديد بانتظار التأكيد`} href="/orders?status=new" cta="عرض" />
            )}
            {data.statusCards.abandoned.today > 0 && (
              <AttentionRow tone="warning" text={`${data.statusCards.abandoned.today} طلب متروك اليوم، تابعها قد تُنقذها`} href="/orders?status=abandoned" cta="متابعة" />
            )}
            {data.storeReady && data.statusCards.new.today === 0 && data.statusCards.abandoned.today === 0 && (
              <div className="flex items-center gap-2 py-3" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--color-success-600)' }} aria-hidden />
                كل شيء تحت السيطرة، لا يوجد ما يحتاج انتباهك الآن
              </div>
            )}
          </div>
        </div>

        <div className="c-card">
          <h2 style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}>
            قمع الأداء (اليوم)
          </h2>
          <div className="space-y-2.5">
            {funnelRows.map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="flex-shrink-0" style={{ inlineSize: 64, fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{row.label}</span>
                <div className="flex-1 c-progress" aria-hidden style={{ blockSize: 22 }}>
                  <div className="c-progress__fill" style={{ inlineSize: `${Math.max(row.value > 0 ? 8 : 0, row.pct)}%`, background: row.color, borderRadius: 'var(--radius-full)' }} />
                </div>
                <span className="num flex-shrink-0 text-end" style={{ inlineSize: 32, fontSize: 'var(--text-sm)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>{row.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 grid grid-cols-3 gap-2" style={{ borderBlockStart: '1px solid var(--border-default)' }}>
            {sources.map(({ label, value, Icon }) => (
              <div key={label} className="text-center">
                <span className="inline-flex items-center justify-center rounded-full mb-1" style={{ inlineSize: 28, blockSize: 28, background: 'var(--surface-sunken)', color: 'var(--text-secondary)' }}>
                  <Icon size={13} />
                </span>
                <p className="num" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{label} · {Math.round((value / sourcesTotal) * 100)}%</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Period analytics */}
      <section className="c-card">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>تحليلات الفترة</h2>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBlockStart: 2 }}>آخر 7 أيام</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-end">
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>الإيرادات</p>
              <p className="num" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--color-success-700)' }}>{formatDZD(data.periodRevenue)}</p>
            </div>
            <div className="text-end">
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>الطلبات</p>
              <p className="num" style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)' }}>{data.periodOrders}</p>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={data.period} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={{ stroke: 'var(--border-default)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} tickLine={false} axisLine={false} width={36} />
            <Tooltip
              contentStyle={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)', background: 'var(--surface-raised)', color: 'var(--text-primary)', fontSize: 12, boxShadow: 'var(--shadow-md)' }}
              formatter={(v: number) => [`${v} طلب`, 'الطلبات']}
              cursor={{ fill: 'var(--surface-sunken)' }}
            />
            <Bar dataKey="orders" name="orders" radius={[6, 6, 0, 0]} fill="var(--color-primary-600)" maxBarSize={42} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Recent orders */}
      {data.grossCount > 0 && (
        <section className="c-card">
          <div className="flex items-center justify-between mb-3">
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--font-semibold)', color: 'var(--text-primary)' }}>آخر الطلبات</h2>
            <Link href="/orders" className="flex items-center gap-1" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-link)' }}>
              عرض الكل <ArrowLeft size={14} aria-hidden />
            </Link>
          </div>
          <RecentOrders storeId="" />
        </section>
      )}

      <style jsx>{`@keyframes c-ping { 75%, 100% { transform: scale(2.2); opacity: 0 } }`}</style>
    </div>
  )
}

function AttentionRow({ tone, text, href, cta }: { tone: 'danger' | 'primary' | 'warning'; text: string; href: string; cta: string }) {
  const dot = tone === 'danger' ? 'var(--color-error-500)' : tone === 'warning' ? 'var(--color-warning-500)' : 'var(--color-primary-500)'
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="flex-shrink-0 rounded-full" style={{ inlineSize: 8, blockSize: 8, background: dot }} aria-hidden />
      <span className="flex-1" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{text}</span>
      <Link href={href} style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', color: 'var(--text-link)', flexShrink: 0 }}>{cta}</Link>
    </div>
  )
}
