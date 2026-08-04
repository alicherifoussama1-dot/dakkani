// ============================================================
// NOTIFICATION CENTER — real data from confirmili_notifications.
// Mark one / mark all read · tap a new-order notice to open the order.
// ============================================================
import React, { useCallback, useState } from 'react'
import { View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { api } from '../src/lib/api'
import { GlassCard, ListSkeleton, EmptyState, ErrorState } from '../src/components/ui'
import {
  IconBack, IconCheck, IconBell, IconOrders, IconBox, IconTruck, IconStar, IconClose,
} from '../src/components/Icons'
import { color, font, radius, shadow } from '../src/theme/tokens'
import { relativeTime } from '../src/lib/time'
import * as Push from '../src/lib/push'

/** Notification type → icon + tint. Types come from the real table. */
function visual(type: string) {
  const t = (type ?? '').toLowerCase()
  if (t.includes('order') && !t.includes('abandon')) return { Icon: IconOrders, tint: '#1D4ED8', bg: '#EFF6FF' }
  if (t.includes('abandon')) return { Icon: IconClose, tint: '#B45309', bg: color.amber50 }
  if (t.includes('stock')) return { Icon: IconBox, tint: '#B45309', bg: color.amber50 }
  if (t.includes('ship') || t.includes('deliver')) return { Icon: IconTruck, tint: '#6D28D9', bg: '#F5F3FF' }
  if (t.includes('review')) return { Icon: IconStar, tint: '#B45309', bg: color.amber50 }
  return { Icon: IconBell, tint: color.br700, bg: color.br50 }
}

export default function Notifications() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  const q = useQuery({ queryKey: ['notifications'], queryFn: () => api.notifications() })

  const mark = useMutation({
    mutationFn: (body: { id?: string; all?: boolean }) => api.markNotifications(body),
    onSuccess: async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      await qc.invalidateQueries({ queryKey: ['notifications'] })
      const boot = await qc.fetchQuery({ queryKey: ['bootstrap'], queryFn: () => api.bootstrap() })
      Push.setBadge(boot.counters.newOrders)
    },
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['notifications'] })
    setRefreshing(false)
  }, [qc])

  const rows = q.data?.notifications ?? []
  const unread = q.data?.unread ?? 0

  const open = (n: any) => {
    if (!n.is_read) mark.mutate({ id: n.id })
    if (n.order_id) router.push(`/orders/${n.order_id}`)
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <IconBack size={18} color={color.ink2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>الإشعارات</Text>
          <Text style={styles.sub}>{unread ? `${unread} غير مقروءة` : 'كل الإشعارات مقروءة'}</Text>
        </View>
        {unread > 0 && (
          <Pressable style={styles.iconBtn} onPress={() => mark.mutate({ all: true })} hitSlop={8}>
            <IconCheck size={18} color={color.br700} />
          </Pressable>
        )}
      </View>

      {q.isError ? (
        <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <View style={{ paddingHorizontal: 16 }}><ListSkeleton rows={6} /></View>
      ) : (
        <FlashList
          data={rows}
          estimatedItemSize={92}
          keyExtractor={(n: any) => n.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.br500} />}
          ListEmptyComponent={
            <EmptyState icon={<IconBell size={44} color={color.ink3} />}
              title="لا توجد إشعارات"
              body="عند وصول طلب جديد سيظهر هنا فوراً مع إشعار على هاتفك." />
          }
          renderItem={({ item, index }: any) => {
            const v = visual(item.type)
            return (
              <GlassCard index={index} onPress={() => open(item)}
                style={!item.is_read ? styles.unread : undefined}>
                <View style={styles.row}>
                  <View style={[styles.icon, { backgroundColor: v.bg }]}>
                    <v.Icon size={18} color={v.tint} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.nTitle} numberOfLines={1}>{item.title ?? 'إشعار'}</Text>
                      <Text style={styles.time}>{item.created_at ? relativeTime(item.created_at) : ''}</Text>
                    </View>
                    {item.message ? (
                      <Text style={styles.body} numberOfLines={2}>{item.message}</Text>
                    ) : null}
                  </View>
                  {!item.is_read && <View style={styles.dot} />}
                </View>
              </GlassCard>
            )
          }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: color.glass2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  title: { fontSize: 21, fontWeight: '800', color: color.ink },
  sub: { fontSize: 11.5, fontWeight: '600', color: color.ink3, marginTop: 1 },
  unread: { borderStartWidth: 4, borderStartColor: color.br500 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  nTitle: { fontSize: 13.5, fontWeight: '800', color: color.ink, flexShrink: 1 },
  time: { fontSize: font.label, fontWeight: '700', color: color.ink3 },
  body: { fontSize: 12.5, color: color.ink2, marginTop: 3, lineHeight: 19 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.br500 },
})
