// ============================================================
// ORDERS — real data from /api/mobile/v1/orders.
// FlashList virtualisation + infinite scroll + filter chips + search.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, type OrderRow } from '../../src/lib/api'
import {
  GlassCard, StatusPill, Chips, ListSkeleton, EmptyState, ErrorState, OfflineBanner,
} from '../../src/components/ui'
import { IconSearch, IconOrders, IconClose } from '../../src/components/Icons'
import { color, font, radius, shadow, fmtDZD, fmtNum } from '../../src/theme/tokens'
import { relativeTime } from '../../src/lib/time'

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديد' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'processing', label: 'تجهيز' },
  { key: 'shipping', label: 'شحن' },
  { key: 'delivered', label: 'تسليم' },
  { key: 'cancelled', label: 'ملغى' },
  { key: 'abandoned', label: 'مهجور' },
]

const PAGE = 20

export default function Orders() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  // Debounce so typing doesn't fire a request per keystroke on 3G.
  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  const q = useInfiniteQuery({
    queryKey: ['orders', filter, debounced],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      api.orders({ status: filter, q: debounced || undefined, limit: PAGE, offset: pageParam as number }),
    getNextPageParam: last => last.next_offset ?? undefined,
  })

  const rows: OrderRow[] = useMemo(
    () => q.data?.pages.flatMap(p => p.orders) ?? [], [q.data])
  const total = q.data?.pages[0]?.total ?? 0

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['orders'] })
    setRefreshing(false)
  }, [qc])

  const isOffline = (q.error as any)?.isOffline

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>الطلبات</Text>
          <Text style={styles.sub}>{fmtNum(total)} طلب</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <IconSearch size={17} color={color.ink3} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث برقم الطلب أو الاسم أو الهاتف"
          placeholderTextColor={color.ink3}
          style={styles.search}
          returnKeyType="search"
        />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}>
            <IconClose size={16} color={color.ink3} />
          </Pressable>
        ) : null}
      </View>

      <Chips items={FILTERS} active={filter} onChange={setFilter} />

      {q.isError && !isOffline ? (
        <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <View style={{ paddingHorizontal: 16 }}><ListSkeleton rows={6} /></View>
      ) : (
        <FlashList<OrderRow>
          data={rows}
          estimatedItemSize={104}
          keyExtractor={o => o.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.br500} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage() }}
          ListHeaderComponent={isOffline ? <OfflineBanner /> : null}
          ListEmptyComponent={
            <EmptyState
              icon={<IconOrders size={44} color={color.ink3} />}
              title="لا توجد طلبات"
              body={debounced ? 'لا نتائج لبحثك — جرّب كلمة أخرى.' : 'لا يوجد طلب بهذه الحالة حالياً.'}
            />
          }
          ListFooterComponent={q.isFetchingNextPage ? <ListSkeleton rows={2} /> : null}
          renderItem={({ item, index }: { item: OrderRow; index: number }) => (
            <OrderCard order={item} index={index} onPress={() => router.push(`/orders/${item.id}`)} />
          )}
        />
      )}
    </View>
  )
}

export function OrderCard({ order, index, onPress }: {
  order: OrderRow; index: number; onPress: () => void
}) {
  const when = relativeTime(order.created_at)
  return (
    <GlassCard index={index} onPress={onPress}>
      <View style={styles.row}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(order.customer_name || '؟').charAt(0)}</Text>
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.rowBetween}>
            <Text style={styles.name} numberOfLines={1}>{order.customer_name}</Text>
            <StatusPill status={order.status} />
          </View>
          <Text style={styles.meta} numberOfLines={1}>
            {order.order_number} · {order.product_name ?? '—'} ×{order.items_count}
          </Text>
          <View style={styles.rowBetween}>
            <Text style={styles.meta} numberOfLines={1}>
              {order.wilaya_name ?? '—'} · {order.delivery_type === 'stopdesk' ? 'مكتب' : 'منزل'} · {when}
            </Text>
            <Text style={styles.total}>{fmtDZD(order.total)}</Text>
          </View>
        </View>
      </View>
    </GlassCard>
  )
}

/** Arabic relative time — no dependency needed for this small a case. */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  title: { fontSize: 21, fontWeight: '800', color: color.ink },
  sub: { fontSize: 11.5, fontWeight: '600', color: color.ink3, marginTop: 1 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 16, marginBottom: 4,
    paddingHorizontal: 14, height: 44, borderRadius: radius.md,
    backgroundColor: color.glass2, borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  search: { flex: 1, fontSize: 13.5, color: color.ink, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: color.br50,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(41,82,227,0.14)',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: color.br700 },
  name: { fontSize: 13.5, fontWeight: '800', color: color.ink, flexShrink: 1 },
  meta: { fontSize: font.label, fontWeight: '700', color: color.ink3, marginTop: 3, flexShrink: 1 },
  total: { fontSize: 14.5, fontWeight: '800', color: color.br700, fontVariant: ['tabular-nums'] },
})
