// ============================================================
// ANALYTICS — the الإحصائيات page.
//
// This tab used to be `export { default } from './index'`, so it silently
// rendered a second copy of the Dashboard. The website has a distinct
// /analytics page with its own numbers, and none of them appear on the
// dashboard: delivery rate, average order value, cancellation rate, gross
// profit, delivery revenue and unique customers.
//
// Data comes from /api/mobile/v1/analytics, which applies that page's exact
// rules (revenue counts DELIVERED orders only, cancellation folds in
// returns). The wilaya table below is the page's "أكثر الولايات مبيعاً"
// block — with the real wilaya name instead of the page's "ولاية <id>".
// ============================================================
import React, { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  TrendingUp, DollarSign, ShoppingCart, Percent, PackageX, Truck, BarChart2, Users, Map,
} from 'lucide-react-native'
import { api, type StoreAnalytics } from '../../src/lib/api'
import { Card, Chips, ListSkeleton, ErrorState, EmptyState, Button } from '../../src/components/ui'
import TopBar from '../../src/components/TopBar'
import { Panel, PanelTitle } from '../../src/components/dashboard'
import { color, primary, space, radius, text, fontFamily, fmtDZD, fmtNum } from '../../src/theme/tokens'
import { web } from '../../src/theme/legacy'

/** The page is fixed at 30 days; the app offers the same window plus the two
 *  the API supports, because a phone is where a merchant checks "this week". */
const RANGES = [
  { key: '7', label: 'آخر 7 أيام' },
  { key: '30', label: 'آخر 30 يوم' },
  { key: '90', label: 'آخر 90 يوم' },
]

export default function Analytics() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const [days, setDays] = useState('30')
  const [refreshing, setRefreshing] = useState(false)

  const q = useQuery({
    queryKey: ['store-analytics', days],
    queryFn: () => api.storeAnalytics(Number(days)),
    // Keep the previous window on screen while the new one loads.
    placeholderData: prev => prev,
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['store-analytics'] })
    setRefreshing(false)
  }, [qc])

  const k = q.data?.kpis
  const rangeLabel = RANGES.find(r => r.key === days)?.label ?? ''

  // KPI order and semantics are the web page's, one for one.
  const cards = k ? [
    { key: 'revenue',   label: 'إجمالي الإيرادات', sub: rangeLabel,          value: fmtDZD(k.revenue),         Icon: TrendingUp,  tint: web.brand },
    { key: 'profit',    label: 'صافي الربح',        sub: 'بعد رسوم التوصيل',  value: fmtDZD(k.grossProfit),     Icon: DollarSign,  tint: web.emerald600 },
    { key: 'aov',       label: 'متوسط قيمة الطلب',  sub: 'المُسلَّمة فقط',    value: fmtDZD(k.avgOrder),        Icon: ShoppingCart, tint: '#2BBFAD' },
    { key: 'delivery',  label: 'معدل التسليم',      sub: 'من إجمالي الطلبات', value: `${k.deliveryRate}%`,      Icon: Percent,     tint: '#6F42C1' },
    { key: 'cancel',    label: 'معدل الإلغاء',      sub: 'ملغى + مُرجَع',     value: `${k.cancelRate}%`,        Icon: PackageX,    tint: web.red500 },
    { key: 'shipping',  label: 'إيرادات التوصيل',   sub: rangeLabel,          value: fmtDZD(k.deliveryRevenue), Icon: Truck,       tint: '#FFC107' },
    { key: 'orders',    label: 'إجمالي الطلبات',    sub: rangeLabel,          value: fmtNum(k.ordersCount),     Icon: BarChart2,   tint: '#17A2B8' },
    { key: 'customers', label: 'الزبائن الفريدون',  sub: rangeLabel,          value: fmtNum(k.uniqueCustomers), Icon: Users,       tint: '#6F42C1' },
  ] : []

  // Annotated: the optional chain widens this, so the map callback below
  // would infer `any` under noImplicitAny.
  const wilayas: StoreAnalytics['byWilaya'] = q.data?.byWilaya ?? []

  return (
    <View style={styles.root}>
      <TopBar title="الإحصائيات" />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 96 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary[600]} />}
      >
        <Chips items={RANGES} active={days} onChange={setDays} />

        {q.isError ? (
          <ErrorState message={(q.error as Error)?.message} onRetry={() => q.refetch()} />
        ) : q.isLoading && !q.data ? (
          <ListSkeleton rows={5} />
        ) : !k || k.ordersCount === 0 ? (
          <EmptyState
            icon={<BarChart2 size={24} color={primary[600]} />}
            title="لا توجد بيانات بعد"
            sub={`لم يصل أي طلب خلال ${rangeLabel}. ستظهر الإحصائيات هنا فور وصول أول طلب.`}
          />
        ) : (
          <>
            {q.data?.truncated ? (
              <Text style={styles.note}>
                عدد الطلبات في هذه الفترة ({fmtNum(q.data.totalOrders)}) أكبر مما يقرؤه التطبيق دفعة
                واحدة؛ الأرقام أدناه تصف أحدث {fmtNum(k.ordersCount)} طلب.
              </Text>
            ) : null}

            <View style={styles.grid}>
              {cards.map(c => (
                <View key={c.key} style={styles.cell}>
                  <View style={styles.kpi}>
                    <View style={[styles.kpiIcon, { backgroundColor: `${c.tint}18` }]}>
                      <c.Icon size={16} color={c.tint} />
                    </View>
                    <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                      {c.value}
                    </Text>
                    <Text style={styles.kpiLabel} numberOfLines={1}>{c.label}</Text>
                    <Text style={styles.kpiSub} numberOfLines={1}>{c.sub}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* أكثر الولايات مبيعاً — the page's table, as rows a phone can read */}
            {wilayas.length ? (
              <Panel pad={20}>
                <PanelTitle>أكثر الولايات مبيعاً</PanelTitle>
                <Text style={styles.panelSub}>{rangeLabel}</Text>
                <View style={styles.tableHead}>
                  <Text style={[styles.th, { flex: 1 }]}>الولاية</Text>
                  <Text style={[styles.th, styles.colNum]}>الطلبات</Text>
                  <Text style={[styles.th, styles.colNum]}>التسليم</Text>
                  <Text style={[styles.th, styles.colMoney]}>الإيرادات</Text>
                </View>
                {wilayas.map(w => (
                  <View key={String(w.wilaya_id ?? 'none')} style={styles.tr}>
                    <Text style={[styles.tdName, { flex: 1 }]} numberOfLines={1}>
                      {w.wilaya_name ?? '—'}
                    </Text>
                    <Text style={[styles.td, styles.colNum]}>{fmtNum(w.total)}</Text>
                    <Text
                      style={[
                        styles.tdRate, styles.colNum,
                        { color: w.delivery_rate >= 70 ? web.emerald600 : w.delivery_rate >= 40 ? '#FFA500' : web.red500 },
                      ]}
                    >
                      {w.delivery_rate}%
                    </Text>
                    <Text style={[styles.tdMoney, styles.colMoney]} numberOfLines={1}>
                      {fmtDZD(w.revenue)}
                    </Text>
                  </View>
                ))}
              </Panel>
            ) : null}

            {/* The page links to Orders and Confirmili from its header. */}
            <View style={styles.actions}>
              <Button title="عرض الطلبات" variant="secondary" onPress={() => router.navigate('/(tabs)/orders')} />
              <Button title="الخريطة" variant="secondary" icon={<Map size={15} color={color.ink} />}
                onPress={() => router.push('/map')} />
            </View>
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.page },
  scroll: { padding: 16, gap: 16 },
  note: { ...text('xs'), color: color.ink2, lineHeight: 18 },

  // The page's grid-cols-2 at phone width.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cell: { width: '47%', flexGrow: 1, flexDirection: 'row' },
  kpi: {
    flex: 1, backgroundColor: color.raised, borderRadius: radius.lg,
    borderWidth: 1, borderColor: color.border, padding: 14, gap: 2,
  },
  kpiIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  kpiValue: { fontFamily: fontFamily.bold, fontSize: 19, color: color.ink, letterSpacing: -0.4 },
  kpiLabel: { ...text('xs', 'medium'), color: color.ink, marginTop: 2 },
  kpiSub: { ...text('xs'), color: color.ink3 },

  panelSub: { ...text('xs'), color: color.ink3, marginTop: 4, marginBottom: 10 },
  tableHead: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingBottom: space[2], borderBottomWidth: 1, borderBottomColor: color.border,
  },
  th: { ...text('xs', 'semibold'), color: color.ink3 },
  tr: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingVertical: space[3], borderBottomWidth: 1, borderBottomColor: color.border,
  },
  tdName: { ...text('sm', 'medium'), color: color.ink },
  td: { ...text('sm'), color: color.ink2, fontVariant: ['tabular-nums'] },
  tdRate: { ...text('sm', 'semibold'), fontVariant: ['tabular-nums'] },
  tdMoney: { ...text('sm', 'semibold'), color: primary[700], fontVariant: ['tabular-nums'] },
  colNum: { width: 58, textAlign: 'center' },
  colMoney: { width: 96, textAlign: 'center' },

  actions: { flexDirection: 'row', gap: space[2] },
})
