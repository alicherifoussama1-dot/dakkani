// ============================================================
// CONFIRMILI — the call queue. Real orders, real status writes.
//
// Reuses /api/mobile/v1/orders (the same source as the Orders tab), so
// there is no second definition of "what needs calling".
// ============================================================
import React, { useCallback, useState } from 'react'
import { View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { api, type OrderRow } from '../lib/api'
import { GlassCard, Chips, ListSkeleton, EmptyState, ErrorState, StatusPill } from './ui'
import { IconPhone, IconWhatsApp, IconCheck, IconClose, IconOrders } from './Icons'
import { color, font, radius, shadow, fmtDZD, fmtNum } from '../theme/tokens'
import { relativeTime } from '../lib/time'
import { callPhone, openWhatsApp } from '../lib/contact'

/** Queue buckets — each maps to real DB statuses. */
const QUEUES = [
  { key: 'new', label: 'بانتظار التأكيد' },
  { key: 'failed', label: 'لم يرد' },
  { key: 'postponed', label: 'مؤجل' },
  { key: 'confirmed', label: 'مؤكد' },
]

export default function ConfirmiliScreen() {
  const qc = useQueryClient()
  const router = useRouter()
  const [queue, setQueue] = useState('new')
  const [refreshing, setRefreshing] = useState(false)

  const q = useQuery({
    queryKey: ['confirmili', queue],
    queryFn: () => api.orders({ status: queue, limit: 50 }),
  })

  // Counts for the header cards — one request per bucket, cached 60s.
  const counts = useQuery({
    queryKey: ['confirmili-counts'],
    queryFn: async () => {
      const [n, f, p, c] = await Promise.all([
        api.orders({ status: 'new', limit: 1 }),
        api.orders({ status: 'failed', limit: 1 }),
        api.orders({ status: 'postponed', limit: 1 }),
        api.orders({ status: 'confirmed', limit: 1 }),
      ])
      return { new: n.total, failed: f.total, postponed: p.total, confirmed: c.total }
    },
    staleTime: 60_000,
  })

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.setOrderStatus(id, status, 'من مركز Confirmili في التطبيق'),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      qc.invalidateQueries({ queryKey: ['confirmili'] })
      qc.invalidateQueries({ queryKey: ['confirmili-counts'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['bootstrap'] })
    },
    onError: (e: any) => Alert.alert('تعذّر التحديث', e?.message ?? ''),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['confirmili'] }),
      qc.invalidateQueries({ queryKey: ['confirmili-counts'] }),
    ])
    setRefreshing(false)
  }, [qc])

  const rows: OrderRow[] = q.data?.orders ?? []
  const c = counts.data

  const call = (o: OrderRow) => {
    callPhone(o.customer_phone)
    // Calling is a real touchpoint: mark the attempt so the queue reflects it.
    // 'failed_1' is the platform's first no-answer state.
    if (o.status === 'new') {
      Alert.alert('بعد الاتصال', 'ما نتيجة الاتصال؟', [
        { text: 'لاحقاً', style: 'cancel' },
        { text: 'لم يرد', onPress: () => setStatus.mutate({ id: o.id, status: 'failed_1' }) },
        { text: 'مؤجل', onPress: () => setStatus.mutate({ id: o.id, status: 'postponed' }) },
        { text: 'مؤكد', onPress: () => setStatus.mutate({ id: o.id, status: 'confirmed' }) },
      ])
    }
  }

  const wa = (o: OrderRow) =>
    openWhatsApp(o.customer_phone, `السلام عليكم ${o.customer_name}، بخصوص طلبك ${o.order_number}`)

  return (
    <>
      <View style={styles.stats}>
        <Stat label="بانتظار" value={c ? fmtNum(c.new) : '—'} tint="#B45309" bg={color.amber50} />
        <Stat label="مؤكد" value={c ? fmtNum(c.confirmed) : '—'} tint={color.em700} bg={color.em50} />
        <Stat label="لم يرد" value={c ? fmtNum(c.failed) : '—'} tint="#B91C1C" bg={color.rose50} />
        <Stat label="مؤجل" value={c ? fmtNum(c.postponed) : '—'} tint={color.ink2} bg={color.sunken} />
      </View>

      <Chips items={QUEUES} active={queue} onChange={setQueue} />

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.em500} />}
      >
        {q.isError ? (
          <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <ListSkeleton rows={5} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<IconOrders size={44} color={color.ink3} />}
            title="لا شيء في هذه القائمة" body="كل الطلبات في هذه المرحلة تمّت معالجتها." />
        ) : (
          rows.map((o, i) => (
            <GlassCard key={o.id} index={i}>
              <Pressable onPress={() => router.push(`/orders/${o.id}`)}>
                <View style={styles.head}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{o.customer_name}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {o.order_number} · {o.wilaya_name ?? '—'} · {relativeTime(o.created_at)}
                    </Text>
                    <Text style={styles.phone}>{o.customer_phone}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <StatusPill status={o.status} />
                    <Text style={styles.total}>{fmtDZD(o.total)}</Text>
                  </View>
                </View>
              </Pressable>

              <View style={styles.actions}>
                <Pressable style={[styles.act, styles.actCall]} onPress={() => call(o)}>
                  <IconPhone size={15} color={color.white} />
                  <Text style={styles.actTextW}>اتصال</Text>
                </Pressable>
                <Pressable style={[styles.act, styles.actWa]} onPress={() => wa(o)}>
                  <IconWhatsApp size={15} color={color.em700} />
                  <Text style={styles.actText}>واتساب</Text>
                </Pressable>
                {o.status !== 'confirmed' && (
                  <Pressable style={[styles.act, styles.actOk]}
                    onPress={() => setStatus.mutate({ id: o.id, status: 'confirmed' })}>
                    <IconCheck size={15} color={color.em700} />
                    <Text style={styles.actText}>تأكيد</Text>
                  </Pressable>
                )}
                <Pressable style={[styles.act, styles.actNo]}
                  onPress={() => Alert.alert('إلغاء الطلب؟', 'لا يمكن التراجع بسهولة.', [
                    { text: 'إلغاء', style: 'cancel' },
                    {
                      text: 'إلغاء الطلب', style: 'destructive',
                      onPress: () => setStatus.mutate({ id: o.id, status: 'cancelled' }),
                    },
                  ])}>
                  <IconClose size={15} color="#B91C1C" />
                </Pressable>
              </View>
            </GlassCard>
          ))
        )}
      </ScrollView>
    </>
  )
}

const Stat: React.FC<{ label: string; value: string; tint: string; bg: string }> =
  ({ label, value, tint, bg }) => (
    <View style={[styles.stat, { backgroundColor: bg }]}>
      <Text style={[styles.statValue, { color: tint }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  stat: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: radius.md },
  statValue: { fontSize: 17, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { fontSize: 9.5, fontWeight: '700', color: color.ink3, marginTop: 3 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 13.5, fontWeight: '800', color: color.ink },
  meta: { fontSize: font.label, fontWeight: '700', color: color.ink3, marginTop: 3 },
  phone: { fontSize: 12.5, fontWeight: '700', color: color.ink2, marginTop: 4, writingDirection: 'ltr' },
  total: { fontSize: 14, fontWeight: '800', color: color.em700, fontVariant: ['tabular-nums'] },
  actions: { flexDirection: 'row', gap: 7, marginTop: 12 },
  act: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderRadius: radius.sm, flex: 1,
  },
  actCall: { backgroundColor: color.em600 },
  actWa: { backgroundColor: color.white, borderWidth: 1, borderColor: color.hairline },
  actOk: { backgroundColor: color.em50 },
  actNo: { backgroundColor: color.rose50, flex: 0.5 },
  actText: { fontSize: 11.5, fontWeight: '800', color: color.ink },
  actTextW: { fontSize: 11.5, fontWeight: '800', color: color.white },
})
