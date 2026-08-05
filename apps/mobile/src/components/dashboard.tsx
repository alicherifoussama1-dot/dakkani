// ============================================================
// DASHBOARD PANELS
//
// Ported from components/dashboard/* on the website:
//   KpiCardsRow · YesterdaySummaryCard · AlgeriaMapGeoCard
//   TodayHourlyChart · PeriodAnalyticsChart · ProductPerformanceTable
//
// These panels use the legacy Tailwind palette (src/theme/legacy.ts), not
// the cobalt tokens — because that is what the website paints here. See
// the note at the top of legacy.ts.
// ============================================================
import React from 'react'
import { View, Text, StyleSheet, Image, StyleProp, ViewStyle } from 'react-native'
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg'
import { TrendingUp, TrendingDown, type LucideIcon } from 'lucide-react-native'
import { web, shadowXs, webRadius } from '../theme/legacy'
import { fontFamily, fmtNum, fmtDZD } from '../theme/tokens'

// ── Panel ───────────────────────────────────────────────────
// bg-white p-4/p-5 rounded-2xl border border-gray-150 shadow-xs
export const Panel: React.FC<{
  children: React.ReactNode; pad?: number; style?: StyleProp<ViewStyle>
}> = ({ children, pad = 16, style }) => (
  <View style={[styles.panel, { padding: pad }, style]}>{children}</View>
)

export const PanelTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text style={styles.panelTitle}>{children}</Text>
)

// ── Area sparkline ──────────────────────────────────────────
// The web draws a recharts <Area type="monotone"> with a 0.35→0 vertical
// gradient and a 2px stroke. Monotone cubic keeps the curve from
// overshooting between points, which a plain bezier would.
export const AreaSparkline: React.FC<{
  data: number[]; color: string; width?: number; height?: number; id: string
}> = ({ data, color, width = 64, height = 36, id }) => {
  // A single NaN would produce "MNaN,NaN" — an invalid path that throws
  // inside the native SVG renderer on Android.
  const safe = (data ?? []).map(v => (Number.isFinite(v) ? v : 0))
  if (safe.length < 2) return <View style={{ width, height }} />

  const max = Math.max(...safe)
  const min = Math.min(...safe)
  const span = max - min || 1
  const dx = width / (safe.length - 1)
  const pt = (v: number, i: number) => [i * dx, height - 2 - ((v - min) / span) * (height - 4)] as const

  // Monotone cubic: horizontal control points at the midpoint keep each
  // segment inside its own value range.
  let line = ''
  for (let i = 0; i < safe.length; i++) {
    const [x, y] = pt(safe[i], i)
    if (!i) { line += `M${x.toFixed(2)},${y.toFixed(2)}`; continue }
    const [px, py] = pt(safe[i - 1], i - 1)
    const cx = (px + x) / 2
    line += ` C${cx.toFixed(2)},${py.toFixed(2)} ${cx.toFixed(2)},${y.toFixed(2)} ${x.toFixed(2)},${y.toFixed(2)}`
  }
  const area = `${line} L${width.toFixed(2)},${height} L0,${height} Z`

  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={`grad_${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={color} stopOpacity={0.35} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      <Path d={area} fill={`url(#grad_${id})`} />
      <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" />
    </Svg>
  )
}

// ── KPI card ────────────────────────────────────────────────
export interface KpiSpec {
  key: string
  title: string
  value: number
  change: number
  sparkline: number[]
  Icon: LucideIcon
  iconBg: string
  iconFg: string
  stroke: string
}

export const KpiCard: React.FC<{ spec: KpiSpec }> = React.memo(({ spec }) => {
  const up = spec.change >= 0
  const Icon = spec.Icon
  return (
    <View style={styles.kpi}>
      {/* Top row: icon + title */}
      <View style={styles.kpiTop}>
        <View style={[styles.kpiIcon, { backgroundColor: spec.iconBg }]}>
          <Icon size={16} color={spec.iconFg} />
        </View>
        <Text style={styles.kpiTitle} numberOfLines={1}>{spec.title}</Text>
      </View>

      {/* Value + sparkline */}
      <View style={styles.kpiBody}>
        <View style={styles.kpiValueCol}>
          <Text style={styles.kpiValue} numberOfLines={1}>{fmtNum(spec.value)}</Text>
          <View style={styles.kpiChangeRow}>
            {up
              ? <TrendingUp size={11} color={web.emerald600} />
              : <TrendingDown size={11} color={web.red500} />}
            <Text style={[styles.kpiChange, { color: up ? web.emerald600 : web.red500 }]}>
              {up ? '+' : ''}{spec.change}%
            </Text>
          </View>
          <Text style={styles.kpiCaption} numberOfLines={1}>مقارنة بالفترة السابقة</Text>
        </View>
        <AreaSparkline id={spec.key} data={spec.sparkline} color={spec.stroke} />
      </View>
    </View>
  )
})
KpiCard.displayName = 'KpiCard'

// ── Period summary ──────────────────────────────────────────
// YesterdaySummaryCard: orders and revenue for the selected range.
export const SummaryCard: React.FC<{
  label: string; totalOrders: number; ordersChange: number
  totalRevenue: number; revenueChange: number
}> = ({ label, totalOrders, ordersChange, totalRevenue, revenueChange }) => (
  <Panel pad={20}>
    <PanelTitle>ملخص {label}</PanelTitle>
    <View style={styles.summaryRow}>
      <SummaryStat label="الطلبات" value={fmtNum(totalOrders)} change={ordersChange} />
      <View style={styles.vRule} />
      <SummaryStat label="الإيرادات" value={fmtDZD(totalRevenue)} change={revenueChange} />
    </View>
  </Panel>
)

const SummaryStat: React.FC<{ label: string; value: string; change: number }> = ({ label, value, change }) => {
  const up = change >= 0
  return (
    <View style={styles.summaryStat}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{value}</Text>
      <View style={styles.kpiChangeRow}>
        {up ? <TrendingUp size={11} color={web.emerald600} /> : <TrendingDown size={11} color={web.red500} />}
        <Text style={[styles.kpiChange, { color: up ? web.emerald600 : web.red500 }]}>
          {up ? '+' : ''}{change}%
        </Text>
      </View>
    </View>
  )
}

// ── Horizontal distribution bars ────────────────────────────
// AlgeriaMapGeoCard's list half. The isometric SVG map is a desktop-only
// flourish; the ranked list is the part that carries the information and
// the part a 375px screen can actually read.
export const DistributionList: React.FC<{
  title: string
  rows: Array<{ name: string; count: number; pct: number }>
  total: number
}> = ({ title, rows, total }) => (
  <Panel pad={20}>
    <PanelTitle>{title}</PanelTitle>
    <Text style={styles.panelSub}>{fmtNum(total)} طلب موزّعة على {rows.length} ولاية</Text>
    <View style={{ gap: 10, marginTop: 14 }}>
      {rows.slice(0, 10).map(r => (
        <View key={r.name} style={styles.distRow}>
          <View style={styles.distHead}>
            <Text style={styles.distName} numberOfLines={1}>{r.name}</Text>
            <Text style={styles.distCount}>{fmtNum(r.count)}</Text>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(2, Math.min(100, r.pct))}%` }]} />
          </View>
        </View>
      ))}
    </View>
  </Panel>
)

// ── Column chart ────────────────────────────────────────────
// TodayHourlyChart / PeriodAnalyticsChart, reduced to the one series a
// phone can read without a legend crowding the plot.
export const ColumnChart: React.FC<{
  title: string; sub?: string
  bars: Array<{ label: string; value: number }>
  color?: string
}> = ({ title, sub, bars, color = web.brand }) => {
  const max = Math.max(...bars.map(b => b.value), 1)
  return (
    <Panel pad={20}>
      <PanelTitle>{title}</PanelTitle>
      {sub ? <Text style={styles.panelSub}>{sub}</Text> : null}
      <View style={styles.chart}>
        {bars.map((b, i) => (
          <View key={`${b.label}-${i}`} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.bar,
                  { height: `${Math.max(2, (b.value / max) * 100)}%`, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={styles.barLabel} numberOfLines={1}>{b.label}</Text>
          </View>
        ))}
      </View>
    </Panel>
  )
}

// ── Product performance ─────────────────────────────────────
export const ProductPerformance: React.FC<{
  rows: Array<{
    id: string; name: string; image_url: string | null
    total_orders: number; abandoned_orders: number; abandonment_rate: number
  }>
}> = ({ rows }) => (
  <Panel pad={20}>
    <PanelTitle>أداء المنتجات</PanelTitle>
    {rows.length === 0 ? (
      <Text style={styles.panelSub}>لا توجد بيانات في هذه الفترة.</Text>
    ) : (
      <View style={{ marginTop: 12 }}>
        {rows.slice(0, 8).map((p, i) => (
          <View key={p.id} style={[styles.prodRow, i === 0 && { borderTopWidth: 0 }]}>
            {p.image_url
              ? <Image source={{ uri: p.image_url }} style={styles.thumb} resizeMode="cover" alt={p.name} />
              : <View style={[styles.thumb, styles.thumbEmpty]} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.prodName} numberOfLines={1}>{p.name}</Text>
              <Text style={styles.prodMeta}>
                {fmtNum(p.total_orders)} طلب · {fmtNum(p.abandoned_orders)} متروك
              </Text>
            </View>
            <Text
              style={[
                styles.prodRate,
                { color: p.abandonment_rate > 40 ? web.red500 : web.emerald600 },
              ]}
            >
              {Math.round(p.abandonment_rate)}%
            </Text>
          </View>
        ))}
      </View>
    )}
  </Panel>
)

// ════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  panel: {
    backgroundColor: web.white,
    borderRadius: webRadius['2xl'],
    borderWidth: 1, borderColor: web.border,
    ...shadowXs,
  },
  // text-base font-bold text-gray-900
  panelTitle: { fontFamily: fontFamily.bold, fontSize: 15, color: web.gray900, letterSpacing: -0.2 },
  panelSub: { fontFamily: fontFamily.regular, fontSize: 11, color: web.gray500, marginTop: 4 },

  // ── KPI card: p-4 rounded-2xl ──
  kpi: {
    flex: 1,
    backgroundColor: web.white,
    borderRadius: webRadius['2xl'],
    borderWidth: 1, borderColor: web.border,
    padding: 16,
    ...shadowXs,
  },
  kpiTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  // w-8 h-8 rounded-xl
  kpiIcon: { width: 32, height: 32, borderRadius: webRadius.xl, alignItems: 'center', justifyContent: 'center' },
  // text-xs font-bold text-gray-600
  kpiTitle: { flex: 1, fontFamily: fontFamily.bold, fontSize: 12, color: web.gray600 },
  kpiBody: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  kpiValueCol: { flex: 1, minWidth: 0 },
  // text-2xl font-black leading-none
  kpiValue: { fontFamily: fontFamily.bold, fontSize: 24, color: web.gray900, letterSpacing: -0.5 },
  kpiChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 8 },
  kpiChange: { fontFamily: fontFamily.bold, fontSize: 11 },
  kpiCaption: { fontFamily: fontFamily.regular, fontSize: 10, color: web.gray400, marginTop: 2 },

  // ── Summary ──
  summaryRow: { flexDirection: 'row', alignItems: 'stretch', marginTop: 14, gap: 14 },
  summaryStat: { flex: 1, minWidth: 0 },
  vRule: { width: 1, backgroundColor: web.border },
  summaryLabel: { fontFamily: fontFamily.medium, fontSize: 11, color: web.gray500 },
  summaryValue: { fontFamily: fontFamily.bold, fontSize: 20, color: web.gray900, marginTop: 4, letterSpacing: -0.4 },

  // ── Distribution ──
  distRow: { gap: 5 },
  distHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  distName: { flex: 1, fontFamily: fontFamily.medium, fontSize: 12, color: web.gray600 },
  distCount: { fontFamily: fontFamily.bold, fontSize: 12, color: web.gray900 },
  track: { height: 6, borderRadius: webRadius.full, backgroundColor: web.gray100, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: webRadius.full, backgroundColor: web.brand },

  // ── Column chart ──
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 132, marginTop: 16 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barTrack: { flex: 1, width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 3 },
  barLabel: { fontFamily: fontFamily.regular, fontSize: 9, color: web.gray400 },

  // ── Product rows ──
  prodRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: web.border,
  },
  thumb: { width: 40, height: 40, borderRadius: 10, backgroundColor: web.gray100 },
  thumbEmpty: { borderWidth: 1, borderColor: web.border },
  prodName: { fontFamily: fontFamily.semibold, fontSize: 13, color: web.gray900 },
  prodMeta: { fontFamily: fontFamily.regular, fontSize: 11, color: web.gray500, marginTop: 2 },
  prodRate: { fontFamily: fontFamily.bold, fontSize: 13 },
})
