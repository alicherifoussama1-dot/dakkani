// ============================================================
// CUSTOMER DETAIL — profile + real order history for that phone.
// Order history reuses /api/mobile/v1/orders?q=<phone>, so there is no
// second source of truth for orders.
// ============================================================
import React from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { api, type OrderRow } from '../../src/lib/api'
import { Card, Skeleton, ErrorState, EmptyState, Button } from '../../src/components/ui'
import TopBar from '../../src/components/TopBar'
import { OrderCard } from '../(tabs)/orders'
import {
  IconBack, IconPhone, IconWhatsApp, IconCopy, IconBlock, IconOrders,
} from '../../src/components/Icons'
import { color, font, radius, shadow, fmtDZD, fmtNum , fontFamily , text } from '../../src/theme/tokens'
import { callPhone, openWhatsApp } from '../../src/lib/contact'

export default function CustomerDetail() {
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const p = decodeURIComponent(String(phone ?? ''))
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()

  // Stats come from the server-side aggregate over EVERY order this phone
  // placed. Deriving them from one page of orders reported the page length
  // as the order count and undercounted spend.
  const agg = useQuery({
    queryKey: ['customer', p],
    queryFn: () => api.customer(p),
    enabled: !!p,
  })

  // History is paginated on an EXACT phone match, so a customer with more
  // orders than one page is fully reachable.
  const q = useInfiniteQuery({
    queryKey: ['customer-orders', p],
    initialPageParam: 0,
    queryFn: ({ pageParam }) => api.orders({ phone: p, limit: 25, offset: pageParam as number }),
    getNextPageParam: last => last.next_offset ?? undefined,
    enabled: !!p,
  })

  const rows: OrderRow[] = React.useMemo(
    () => q.data?.pages.flatMap(pg => pg.orders) ?? [], [q.data])
  const c = agg.data?.customer
  const name = c?.name ?? rows[0]?.customer_name ?? p
  const totalOrders = c?.orders ?? q.data?.pages[0]?.total ?? rows.length
  const spend = c?.spend ?? 0
  const lastWilaya = c?.wilaya_name ?? rows[0]?.wilaya_name ?? null
  const lastCommune = c?.commune ?? rows[0]?.commune ?? null

  const block = useMutation({
    mutationFn: () => api.catalogCreate('blacklist', {
      phone: p, full_name: name, reason: 'أُضيف من تطبيق الجوال',
    }),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      qc.invalidateQueries({ queryKey: ['catalog', 'blacklist'] })
      Alert.alert('تم', 'أُضيف العميل إلى القائمة السوداء')
    },
    onError: (e: any) => Alert.alert('تعذّر', e?.message ?? 'حاول مرة أخرى'),
  })

  const call = () => callPhone(p)
  const wa = () => openWhatsApp(p, `السلام عليكم ${name}`)
  const copy = async () => {
    await Clipboard.setStringAsync(p)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    Alert.alert('تم النسخ', 'نُسخ رقم الهاتف')
  }

  return (
    <View style={styles.root}>
      <TopBar title={name} onBack={() => router.back()} />

      {q.isError ? (
        <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Skeleton height={130} style={{ borderRadius: 30 }} /><Skeleton height={90} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}>
          <Card>
            <View style={{ alignItems: 'center' }}>
              <View style={styles.bigAvatar}>
                <Text style={styles.bigAvatarText}>{(name || '؟').charAt(0)}</Text>
              </View>
              <Text style={styles.heroName} numberOfLines={1}>{name}</Text>
              <Text style={styles.heroPhone}>{p}</Text>
            </View>
          </Card>

          <View style={styles.stats}>
            <Stat label="الطلبات" value={fmtNum(totalOrders)} />
            <Stat label="الإنفاق" value={fmtDZD(spend)} />
            <Stat label="الولاية" value={lastWilaya ?? '—'} />
          </View>

          <View style={styles.actions}>
            <Action icon={<IconPhone size={19} color={color.br700} />} label="اتصال" onPress={call} />
            <Action icon={<IconWhatsApp size={19} color={color.br700} />} label="واتساب" onPress={wa} />
            <Action icon={<IconCopy size={19} color={color.br700} />} label="نسخ" onPress={copy} />
            <Action icon={<IconBlock size={19} color="#B91C1C" />} label="حظر"
              onPress={() => Alert.alert('حظر العميل؟', 'سيُضاف رقمه إلى القائمة السوداء.', [
                { text: 'إلغاء', style: 'cancel' },
                { text: 'حظر', style: 'destructive', onPress: () => block.mutate() },
              ])} />
          </View>

          {lastCommune ? (
            <Card style={{ marginTop: 14 }}>
              <View style={styles.kv}>
                <Text style={styles.kvK}>آخر عنوان</Text>
                <Text style={styles.kvV}>{lastWilaya} · {lastCommune}</Text>
              </View>
            </Card>
          ) : null}

          <Text style={styles.section}>سجل الطلبات</Text>
          {rows.length === 0 ? (
            <EmptyState icon={<IconOrders size={40} color={color.ink3} />} title="لا توجد طلبات" />
          ) : (
            <>
              {rows.map(o => (
                <OrderCard key={o.id} order={o} onPress={id => router.push(`/orders/${id}`)} />
              ))}
              {q.hasNextPage ? (
                <Button
                  title="تحميل المزيد"
                  variant="secondary"
                  loading={q.isFetchingNextPage}
                  onPress={() => q.fetchNextPage()}
                  style={{ marginTop: 4 }}
                />
              ) : null}
            </>
          )}
        </ScrollView>
      )}
    </View>
  )
}

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.stat}>
    <Text style={styles.statValue} numberOfLines={1}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
)

const Action: React.FC<{ icon: React.ReactNode; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
  <Pressable style={styles.action} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
    {icon}<Text style={styles.actionLabel}>{label}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.page },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: color.raised,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.border, ...shadow.sm,
  },
  title: { fontSize: 17, fontFamily: fontFamily.bold, color: color.ink },
  sub: { fontSize: 11.5, fontFamily: fontFamily.semibold, color: color.ink3, marginTop: 1 },
  // Leftover from a gradient hero that became a plain white Card: white on
  // white made the initial invisible. Matches the list avatar instead.
  bigAvatar: {
    width: 64, height: 64, borderRadius: 20, backgroundColor: color.br50,
    borderWidth: 1, borderColor: 'rgba(41,82,227,0.14)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  bigAvatarText: { fontSize: 25, fontFamily: fontFamily.bold, color: color.br700 },
  heroName: { ...text("lg", "bold"), color: color.ink },
  heroPhone: { ...text('sm'), color: color.ink2, marginTop: 4, writingDirection: 'ltr' },
  stats: { flexDirection: 'row', gap: 9, marginTop: 13 },
  stat: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: radius.lg,
    backgroundColor: color.raised, borderWidth: 1, borderColor: color.border, ...shadow.sm,
  },
  statValue: { fontSize: 15, fontFamily: fontFamily.bold, color: color.ink, fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 10, fontFamily: fontFamily.bold, color: color.ink3, marginTop: 4 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 12 },
  action: {
    flex: 1, alignItems: 'center', gap: 5, paddingVertical: 13, borderRadius: radius.md,
    backgroundColor: color.raised, borderWidth: 1, borderColor: color.border, ...shadow.sm,
  },
  actionLabel: { fontSize: 10.5, fontFamily: fontFamily.bold, color: color.ink2 },
  section: { fontSize: 14.5, fontFamily: fontFamily.bold, color: color.ink, marginTop: 22, marginBottom: 11 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  kvK: { fontSize: font.label, fontFamily: fontFamily.bold, color: color.ink3 },
  kvV: { fontSize: 13.5, fontFamily: fontFamily.bold, color: color.ink },
})
