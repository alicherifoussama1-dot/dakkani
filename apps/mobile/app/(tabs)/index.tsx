// ============================================================
// ANALYTICS DASHBOARD — the default screen after login.
//
// Data comes from /api/mobile/v1/dashboard, which is a RE-EXPORT of the
// web dashboard handler. Verified identical to the web on all presets, so
// the merchant sees the same numbers on phone and desktop.
//
// Africa/Algiers is handled server-side (getAlgiersDateRange), so "today"
// resets at 00:00 Algeria time without any client date math.
// ============================================================
import React, { useCallback, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { api, type DatePreset } from '../../src/lib/api'
import { LOGO_ICON_XML } from '../../src/assets/logo'
import {
  GlassCard, BrandHero, KpiCard, AnimatedNumber, Chips, Sparkline, Bars,
  ListSkeleton, ErrorState, Loading,
} from '../../src/components/ui'
import {
  IconBell, IconUser, IconOrders, IconCheck, IconTruck, IconBox,
  IconClose, IconRevenue, IconLocation, IconChevron,
} from '../../src/components/Icons'
import { color, font, radius, shadow, space, fmtDZD, fmtNum } from '../../src/theme/tokens'
import WilayaMap from '../../src/components/WilayaMap'

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
  const k = an.data?.kpis ?? {}
  const num = (v: any) => Number(v?.value ?? v ?? 0)

  return (
    <View style={styles.root}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.logoBox}><SvgXml xml={LOGO_ICON_XML} width={26} height={26} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.storeName} numberOfLines={1}>{store?.name ?? '—'}</Text>
          <View style={styles.statusRow}>
            <View style={styles.dot} />
            <Text style={styles.sub}>نشط · {(store?.plan ?? 'free').toUpperCase()}</Text>
          </View>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => router.push('/notifications')}>
          <IconBell size={18} color={color.ink2} />
          {!!counters?.unreadNotifications && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {counters.unreadNotifications > 99 ? '99+' : counters.unreadNotifications}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={() => router.push('/(tabs)/more')}>
          <IconUser size={18} color={color.ink2} />
        </Pressable>
      </View>

      <Chips items={PRESETS.map(p => ({ key: p.key, label: p.label }))}
        active={preset} onChange={k => setPreset(k as DatePreset)} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.br500} />}
      >
        {an.isError ? (
          <ErrorState message={(an.error as any)?.message} onRetry={() => an.refetch()} />
        ) : an.isLoading && !an.data ? (
          <>
            <GlassCard><Loading /></GlassCard>
            <ListSkeleton rows={3} />
          </>
        ) : (
          <>
            {/* ── Revenue hero ── */}
            <BrandHero>
              <View style={styles.heroTop}>
                <Text style={styles.heroLabel}>إجمالي الإيرادات</Text>
                {num(k.revenue) >= 0 && k.revenue?.change !== undefined && (
                  <View style={styles.heroChip}>
                    <Text style={styles.heroChipText}>
                      {k.revenue.change >= 0 ? '▲' : '▼'} {Math.abs(k.revenue.change).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </View>
              <AnimatedNumber value={num(k.revenue)} suffix=" دج" style={styles.heroValue} />
              <Text style={styles.heroLabel}>
                {fmtNum(num(k.totalOrders))} طلب · {PRESETS.find(p => p.key === preset)?.label}
              </Text>
              <View style={{ marginTop: 12 }}>
                <Sparkline
                  data={(an.data?.periodSeries ?? []).map((s: { revenue: number }) => s.revenue)}
                  stroke="rgba(255,255,255,0.95)" height={36}
                />
              </View>
            </BrandHero>

            {/* ── KPI grid ── */}
            <Text style={styles.section}>مؤشرات الطلبات</Text>
            <View style={styles.grid}>
              <KpiCard index={0} label="إجمالي الطلبات" value={num(k.totalOrders)}
                delta={k.totalOrders?.change} icon={<IconOrders size={16} color="#1D4ED8" />} iconBg="#EFF6FF" />
              <KpiCard index={1} label="طلبات عادية" value={num(k.normalOrders)}
                delta={k.normalOrders?.change} icon={<IconCheck size={16} color={color.br700} />} iconBg={color.br50} />
            </View>
            <View style={styles.grid}>
              <KpiCard index={2} label="طلبات مهجورة" value={num(k.abandonedOrders)}
                delta={k.abandonedOrders?.change} icon={<IconClose size={16} color="#B45309" />} iconBg={color.amber50} />
              <KpiCard index={3} label="طلبات جديدة" value={counters?.newOrders ?? 0}
                icon={<IconTruck size={16} color="#6D28D9" />} iconBg="#F5F3FF" />
            </View>

            {/* ── Attribution (read-only from orders.utm_source) ── */}
            <Text style={styles.section}>مصادر الطلبات</Text>
            <GlassCard index={4}>
              {[
                { l: 'فيسبوك', v: num(k.facebookOrders), c: '#1877F2' },
                { l: 'تيك توك', v: num(k.tiktokOrders), c: '#111827' },
                { l: 'أخرى', v: num(k.otherOrders), c: '#94A3B8' },
              ].map(row => {
                const total = num(k.totalOrders) || 1
                return (
                  <View key={row.l} style={{ paddingVertical: 6 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.rowLabel}>{row.l}</Text>
                      <Text style={styles.rowValue}>
                        {fmtNum(row.v)} <Text style={styles.label}>({Math.round((row.v / total) * 100)}%)</Text>
                      </Text>
                    </View>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${(row.v / total) * 100}%`, backgroundColor: row.c }]} />
                    </View>
                  </View>
                )
              })}
              <Text style={[styles.label, { marginTop: 8, lineHeight: 18 }]}>
                من orders.utm_source — قراءة فقط، لا يُمسّ نظام التتبّع
              </Text>
            </GlassCard>

            {/* ── Hourly ── */}
            <Text style={styles.section}>توقيت دخول الطلبات</Text>
            <GlassCard index={5}>
              <Bars data={(an.data?.hourlyData ?? []).map((h: { orders: number }) => h.orders)} />
              <View style={styles.rowBetween}>
                <Text style={styles.label}>00:00</Text>
                <Text style={styles.label}>12:00</Text>
                <Text style={styles.label}>23:00</Text>
              </View>
            </GlassCard>

            {/* ── 58-wilaya map ── */}
            <Pressable onPress={() => router.push('/map')}>
              <View style={styles.sectionRow}>
                <Text style={styles.section}>توزيع الولايات</Text>
                <View style={styles.linkRow}>
                  <Text style={styles.link}>الخريطة</Text>
                  <IconChevron size={13} color={color.br600} />
                </View>
              </View>
              <GlassCard index={6} style={{ padding: 8 }}>
                <WilayaMap
                  data={an.data?.wilayaDistribution?.sortedWilayas ?? []}
                  compact
                />
              </GlassCard>
            </Pressable>

            {/* ── Top products ── */}
            <Text style={styles.section}>أفضل المنتجات</Text>
            {(an.data?.productPerformance ?? []).slice(0, 4).map((p: any, i: number) => (
              <GlassCard key={p.id} index={7 + i}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.rowLabel} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.label, { marginTop: 3 }]}>
                      {p.total_orders} طلب · مهجور {p.abandonment_rate}%
                    </Text>
                  </View>
                  <IconBox size={20} color={color.br600} />
                </View>
              </GlassCard>
            ))}
          </>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 10 },
  logoBox: {
    width: 40, height: 40, borderRadius: 13, backgroundColor: color.white,
    alignItems: 'center', justifyContent: 'center', ...shadow.xs,
    borderWidth: 1, borderColor: color.hairline,
  },
  storeName: { fontSize: 17, fontWeight: '800', color: color.ink },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: color.br500 },
  sub: { fontSize: 11.5, fontWeight: '600', color: color.ink3 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: color.glass2,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  badge: {
    position: 'absolute', top: -3, end: -3, minWidth: 17, height: 17, paddingHorizontal: 4,
    borderRadius: 9, backgroundColor: color.rose, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: color.bg,
  },
  badgeText: { color: color.white, fontSize: 9.5, fontWeight: '800' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroLabel: { fontSize: font.label, fontWeight: '700', color: 'rgba(255,255,255,0.88)' },
  heroChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroChipText: { color: color.white, fontSize: 10.5, fontWeight: '800' },
  heroValue: {
    fontSize: 38, fontWeight: '800', color: color.white, marginTop: 7, marginBottom: 3,
    fontVariant: ['tabular-nums'], letterSpacing: -1,
  },
  section: { fontSize: 14.5, fontWeight: '800', color: color.ink, marginTop: 22, marginBottom: 11 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 11 },
  link: { fontSize: 11.5, fontWeight: '800', color: color.br600 },
  grid: { flexDirection: 'row', gap: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 13, fontWeight: '700', color: color.ink },
  rowValue: { fontSize: 14, fontWeight: '800', color: color.ink, fontVariant: ['tabular-nums'] },
  label: { fontSize: font.label, fontWeight: '700', color: color.ink3 },
  track: { height: 7, borderRadius: 4, backgroundColor: color.sunken, marginTop: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
})
