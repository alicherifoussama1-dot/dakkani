// ============================================================
// DASHBOARD — the default screen after login.
//
// Layout is a direct port of components/dashboard/DashboardHome.tsx:
//   header card → 6 KPI cards → period summary → wilaya distribution
//   → hourly chart → period chart → product performance
// in that order, with the same p-4 / space-y-5 rhythm.
//
// Data comes from /api/mobile/v1/dashboard, which is a RE-EXPORT of the
// web dashboard handler, so the numbers can never drift from the site.
// Africa/Algiers is handled server-side (getAlgiersDateRange), so "today"
// resets at 00:00 Algeria time without any client date math.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  ShoppingBag, ShoppingCart, CheckCircle2, ThumbsUp, Globe, Music2, Bell, User,
} from 'lucide-react-native'
import { api, type DatePreset, type Analytics } from '../../src/lib/api'
import { Chips, ListSkeleton, ErrorState } from '../../src/components/ui'
import {
  KpiCard, SummaryCard, DistributionList, ColumnChart, ProductPerformance,
  Panel, type KpiSpec,
} from '../../src/components/dashboard'
import TopBar from '../../src/components/TopBar'
import { web, webRadius } from '../../src/theme/legacy'
import { fontFamily, fmtNum } from '../../src/theme/tokens'

/** GlobalDateFilter's presets, in the website's order. */
const PRESETS: Array<{ key: DatePreset; label: string }> = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'أمس' },
  { key: '7d', label: 'آخر 7 أيام' },
  { key: '30d', label: 'آخر 30 يوم' },
]

export default function Dashboard() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const [preset, setPreset] = useState<DatePreset>('today')
  const [refreshing, setRefreshing] = useState(false)

  const boot = useQuery({ queryKey: ['bootstrap'], queryFn: () => api.bootstrap() })
  const an = useQuery({
    queryKey: ['analytics', preset],
    queryFn: () => api.analytics(preset),
    // Keep the previous period's data on screen while the new one loads —
    // avoids a jarring blank flash when switching date chips.
    placeholderData: prev => prev,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['analytics'] }),
      qc.invalidateQueries({ queryKey: ['bootstrap'] }),
    ])
    setRefreshing(false)
  }, [qc])

  const store = boot.data?.store
  const counters = boot.data?.counters
  const rangeLabel = PRESETS.find(p => p.key === preset)?.label ?? ''

  // KpiCardsRow's six cards — same order, same icons, same colours.
  const kpiSpecs = useMemo<KpiSpec[]>(() => {
    const k: Record<string, any> = an.data?.kpis ?? {}
    const at = (key: string) => ({
      value: Number(k[key]?.value ?? 0),
      change: Number(k[key]?.change ?? 0),
      sparkline: (k[key]?.sparkline ?? []) as number[],
    })
    return [
      { key: 'totalOrders',     title: 'إجمالي الطلبات',   ...at('totalOrders'),     Icon: ShoppingBag,  iconBg: web.blue50,    iconFg: web.blue600,    stroke: web.brand },
      { key: 'abandonedOrders', title: 'الطلبات المتروكة', ...at('abandonedOrders'), Icon: ShoppingCart, iconBg: web.orange50,  iconFg: web.orange600,  stroke: web.amber },
      { key: 'normalOrders',    title: 'الطلبات العادية',  ...at('normalOrders'),    Icon: CheckCircle2, iconBg: web.emerald50, iconFg: web.emerald600, stroke: web.green },
      { key: 'facebookOrders',  title: 'طلبات فيسبوك',     ...at('facebookOrders'),  Icon: ThumbsUp,     iconBg: web.blue100,   iconFg: web.facebook,   stroke: web.facebook },
      { key: 'tiktokOrders',    title: 'طلبات تيك توك',    ...at('tiktokOrders'),    Icon: Music2,       iconBg: web.gray100,   iconFg: web.gray900,    stroke: web.gray900 },
      { key: 'otherOrders',     title: 'مصادر أخرى',       ...at('otherOrders'),     Icon: Globe,        iconBg: web.gray50,    iconFg: web.gray600,    stroke: web.slate },
    ]
  }, [an.data])

  // Annotated: the optional chain widens these, so the map/reduce callbacks
  // below would infer `any` under noImplicitAny.
  const hourly: Analytics['hourlyData'] = an.data?.hourlyData ?? []
  const series: Analytics['periodSeries'] = an.data?.periodSeries ?? []
  const wilayas = an.data?.wilayaDistribution

  return (
    <View style={styles.root}>
      <TopBar
        showLogo
        actions={[
          {
            key: 'notifications', label: 'الإشعارات', Icon: Bell,
            onPress: () => router.push('/notifications'),
            dot: !!counters?.unreadNotifications,
          },
          { key: 'account', label: 'الحساب', Icon: User, onPress: () => router.push('/(tabs)/more') },
        ]}
      />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={web.brand} />}
      >
        {/* ── Header card ── */}
        <Panel pad={20}>
          <View style={styles.headRow}>
            <Text style={styles.storeName} numberOfLines={1}>{store?.name ?? '—'} 👏</Text>
            <View style={styles.liveBadge}>
              <Text style={styles.liveText}>مباشر 🟢</Text>
            </View>
          </View>
          <Text style={styles.headSub}>
            نظرة عامة على أداء متجرك (<Text style={styles.headSubStrong}>{rangeLabel}</Text>) · بتوقيت الجزائر
          </Text>
          <Chips
            items={PRESETS.map(p => ({ key: p.key, label: p.label }))}
            active={preset}
            onChange={k => setPreset(k as DatePreset)}
            style={{ marginTop: 14 }}
          />
        </Panel>

        {an.isError ? (
          <ErrorState message={(an.error as Error)?.message} onRetry={() => an.refetch()} />
        ) : an.isLoading && !an.data ? (
          <ListSkeleton rows={4} />
        ) : (
          <>
            {/* ── Row 1: 6 KPI cards. The web grid is 2-up below md. ── */}
            <View style={styles.kpiGrid}>
              {kpiSpecs.map(spec => (
                <View key={spec.key} style={styles.kpiCell}>
                  <KpiCard spec={spec} />
                </View>
              ))}
            </View>

            {/* ── Row 2: period summary ── */}
            <SummaryCard
              label={rangeLabel}
              totalOrders={kpiSpecs[0].value}
              ordersChange={kpiSpecs[0].change}
              totalRevenue={Number((an.data?.kpis as any)?.revenue?.value ?? 0)}
              revenueChange={Number((an.data?.kpis as any)?.revenue?.change ?? 0)}
            />

            {/* ── Row 2: geographic distribution ── */}
            {wilayas?.sortedWilayas?.length ? (
              <DistributionList
                title="التوزيع الجغرافي"
                rows={wilayas.sortedWilayas}
                total={wilayas.totalOrders ?? 0}
              />
            ) : null}

            {/* ── Row 2: hourly entry ── */}
            {hourly.length ? (
              <ColumnChart
                title={preset === 'today' ? 'أوقات دخول الطلبات' : `أوقات الطلبات (${rangeLabel})`}
                sub={`${fmtNum(hourly.reduce((s, h) => s + h.orders, 0))} طلب`}
                bars={hourly.map(h => ({ label: h.hour, value: h.orders }))}
              />
            ) : null}

            {/* ── Row 3: period analytics ── */}
            {series.length ? (
              <ColumnChart
                title={`تحليلات ${rangeLabel}`}
                sub="إجمالي الطلبات لكل يوم"
                bars={series.map(s => ({ label: s.label, value: s.total_orders }))}
              />
            ) : null}

            {/* ── Row 4: product performance ── */}
            <ProductPerformance rows={an.data?.productPerformance ?? []} />
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: web.gray50 },
  // DashboardHome: p-4 with space-y-5
  scroll: { padding: 16, gap: 20 },

  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // text-xl font-black tracking-tight
  storeName: { flex: 1, fontFamily: fontFamily.bold, fontSize: 20, color: web.gray900, letterSpacing: -0.4 },
  // bg-blue-50 text-[#0D6EFD] text-xs px-2.5 py-0.5 rounded-full font-bold
  liveBadge: { backgroundColor: web.blue50, paddingHorizontal: 10, paddingVertical: 2, borderRadius: webRadius.full },
  liveText: { fontFamily: fontFamily.bold, fontSize: 12, color: web.brand },
  // text-xs text-gray-500 mt-1
  headSub: { fontFamily: fontFamily.regular, fontSize: 12, color: web.gray500, marginTop: 4, lineHeight: 18 },
  headSubStrong: { fontFamily: fontFamily.bold, color: web.gray600 },

  // grid-cols-2 gap-3.5
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  kpiCell: { width: '47%', flexGrow: 1, flexDirection: 'row' },
})
