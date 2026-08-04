// ============================================================
// FULL-SCREEN ALGERIA MAP — 58 official wilayas, real order density.
// Tap a wilaya → Arabic name, French name, orders, % of total, revenue.
// ============================================================
import React, { useState } from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, type DatePreset } from '../src/lib/api'
import WilayaMap, { WILAYA_NAMES } from '../src/components/WilayaMap'
import { GlassCard, Chips, Loading, ErrorState } from '../src/components/ui'
import { IconBack, IconLocation } from '../src/components/Icons'
import { color, font, radius, shadow, fmtDZD, fmtNum } from '../src/theme/tokens'

const PRESETS = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'أمس' },
  { key: '7d', label: 'آخر 7 أيام' },
  { key: '30d', label: 'آخر 30 يوم' },
]

export default function MapScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [preset, setPreset] = useState<DatePreset>('30d')
  const [sel, setSel] = useState<{ id: number; count: number; pct: number } | null>(null)

  const q = useQuery({
    queryKey: ['analytics', preset],
    queryFn: () => api.analytics(preset),
    placeholderData: prev => prev,
  })

  const dist = q.data?.wilayaDistribution
  const rows: Array<{ id: number; name: string; count: number; pct: number }> = dist?.sortedWilayas ?? []
  const total = dist?.totalOrders ?? rows.reduce((a: number, r: { count: number }) => a + r.count, 0)

  // Revenue per wilaya isn't in the analytics payload, so we derive an
  // average-order estimate from the SAME period rather than inventing a
  // number — and label it as an estimate.
  const kRevenue = Number((q.data?.kpis as any)?.revenue?.value ?? 0)
  const kOrders = Number((q.data?.kpis as any)?.normalOrders?.value ?? 0)
  const aov = kOrders > 0 ? kRevenue / kOrders : 0

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <IconBack size={18} color={color.ink2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>توزيع الطلبات</Text>
          <Text style={styles.sub}>58 ولاية · بيانات حقيقية</Text>
        </View>
      </View>

      <Chips items={PRESETS} active={preset} onChange={k => setPreset(k as DatePreset)} />

      {q.isError ? (
        <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading && !q.data ? (
        <Loading />
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}>
          <GlassCard index={0} style={{ padding: 8 }}>
            <WilayaMap
              data={rows}
              onSelect={d => setSel({ id: d.id, count: d.count, pct: d.pct })}
            />
          </GlassCard>

          {sel && (
            <GlassCard index={1} style={styles.selCard}>
              <View style={styles.selHead}>
                <IconLocation size={18} color={color.br700} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.selAr}>{WILAYA_NAMES[sel.id]?.ar ?? sel.id}</Text>
                  <Text style={styles.selFr}>{WILAYA_NAMES[sel.id]?.fr ?? ''}</Text>
                </View>
                <Text style={styles.selCode}>{String(sel.id).padStart(2, '0')}</Text>
              </View>
              <View style={styles.selStats}>
                <SelStat label="الطلبات" value={fmtNum(sel.count)} />
                <SelStat label="من الإجمالي" value={`${total ? Math.round((sel.count / total) * 100) : 0}%`} />
                <SelStat label="إيراد تقديري" value={fmtDZD(sel.count * aov)} />
              </View>
              <Text style={styles.estimate}>
                الإيراد تقديري = عدد الطلبات × متوسط قيمة السلة لنفس الفترة
              </Text>
            </GlassCard>
          )}

          <Text style={styles.section}>ترتيب الولايات</Text>
          {rows.map((w, i: number) => (
            <GlassCard key={w.id} index={Math.min(i, 8)} style={{ padding: 12 }}
              onPress={() => setSel({ id: w.id, count: w.count, pct: w.pct })}>
              <View style={styles.rankRow}>
                <Text style={styles.rank}>{i + 1}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rankName} numberOfLines={1}>
                    {WILAYA_NAMES[w.id]?.ar ?? w.name}
                  </Text>
                  <Text style={styles.rankFr} numberOfLines={1}>
                    {WILAYA_NAMES[w.id]?.fr ?? ''} · {w.pct}%
                  </Text>
                </View>
                <Text style={styles.rankCount}>{fmtNum(w.count)}</Text>
              </View>
            </GlassCard>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const SelStat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.selStat}>
    <Text style={styles.selStatValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.selStatLabel}>{label}</Text>
  </View>
)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: color.glass2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  title: { fontSize: 17, fontWeight: '800', color: color.ink },
  sub: { fontSize: 11.5, fontWeight: '600', color: color.ink3, marginTop: 1 },
  section: { fontSize: 14.5, fontWeight: '800', color: color.ink, marginTop: 20, marginBottom: 11 },
  selCard: { borderColor: color.br300, borderWidth: 1.5 },
  selHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selAr: { fontSize: 16, fontWeight: '800', color: color.ink },
  selFr: { fontSize: 11.5, fontWeight: '600', color: color.ink3, marginTop: 2 },
  selCode: { fontSize: 13, fontWeight: '800', color: color.br700, fontVariant: ['tabular-nums'] },
  selStats: { flexDirection: 'row', gap: 9, marginTop: 12 },
  selStat: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.md, backgroundColor: color.br50 },
  selStatValue: { fontSize: 14, fontWeight: '800', color: color.br700, fontVariant: ['tabular-nums'] },
  selStatLabel: { fontSize: 10, fontWeight: '700', color: color.ink3, marginTop: 3 },
  estimate: { fontSize: 10.5, fontWeight: '600', color: color.ink3, marginTop: 9, lineHeight: 16 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rank: {
    width: 26, textAlign: 'center', fontSize: 12, fontWeight: '800', color: color.ink3,
    fontVariant: ['tabular-nums'],
  },
  rankName: { fontSize: 13, fontWeight: '800', color: color.ink },
  rankFr: { fontSize: 10.5, fontWeight: '600', color: color.ink3, marginTop: 2 },
  rankCount: { fontSize: 15, fontWeight: '800', color: color.br700, fontVariant: ['tabular-nums'] },
})
