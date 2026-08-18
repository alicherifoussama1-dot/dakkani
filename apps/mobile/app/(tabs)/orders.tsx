// ============================================================
// ORDERS — real data from /api/mobile/v1/orders.
// FlashList virtualisation + infinite scroll + filter chips + search.
//
// Ported from components/dashboard/OrdersPageClient.tsx. That page renders
// a .c-table, which cannot survive 375px, so each row becomes a .c-card
// carrying the SAME five columns in the same hierarchy and typography:
//   #number + date · name + phone · wilaya + commune · total + delivery
//   · status badge
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Search, ShoppingCart, X } from 'lucide-react-native'
import { api, type OrderRow } from '../../src/lib/api'
import {
  Card, StatusPill, Chips, ListSkeleton, EmptyState, ErrorState, Input, Button,
} from '../../src/components/ui'
import TopBar from '../../src/components/TopBar'
import { color, primary, space, radius, text, fontFamily, fmtDZD, fmtNum } from '../../src/theme/tokens'
import { formatDateShort } from '../../src/lib/time'

/** STATUS_VALUES from OrdersPageClient — same set, same order, same labels.
 *
 *  Two deliberate differences, both documented:
 *  · "شُحن" sends the `shipping` GROUP (shipped + in_transit +
 *    out_for_delivery + with_driver + at_stopdesk) rather than the bare
 *    `shipped` the web sends. The mobile API defines that group for exactly
 *    this chip, and a merchant checking shipments on a phone wants every
 *    order in flight, not just the ones stamped `shipped`.
 *  · "مهجور" is a chip here; the web exposes it through its type dropdown,
 *    which has no room on a phone. Same filter, reachable in one tap. */
const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'new', label: 'جديد' },
  { key: 'confirmed', label: 'مؤكد' },
  { key: 'processing', label: 'يُعالج' },
  { key: 'shipping', label: 'شُحن' },
  { key: 'delivered', label: 'مُسلَّم' },
  { key: 'cancelled', label: 'ملغى' },
  { key: 'returned', label: 'مُرجَع' },
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
  useEffect(() => {
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

  const rows: OrderRow[] = useMemo(() => q.data?.pages.flatMap(p => p.orders) ?? [], [q.data])
  const total = q.data?.pages[0]?.total ?? 0
  const filtered = filter !== 'all' || !!debounced

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['orders'] })
    setRefreshing(false)
  }, [qc])

  const openOrder = useCallback((id: string) => router.push(`/orders/${id}`), [router])

  return (
    <View style={styles.root}>
      <TopBar title="الطلبات" />

      {/* .c-card wrapping the secondary filters, padding: var(--space-3) */}
      <View style={styles.filters}>
        <View style={styles.searchWrap}>
          <Search size={14} color={color.ink3} style={styles.searchIcon} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث برقم الطلب أو الاسم أو الهاتف"
            accessibilityLabel="ابحث برقم الطلب أو الاسم أو الهاتف"
            returnKeyType="search"
            style={styles.searchInput}
          />
          {search ? (
            <Pressable
              onPress={() => setSearch('')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="مسح البحث"
              style={styles.clear}
            >
              <X size={14} color={color.ink3} />
            </Pressable>
          ) : null}
        </View>

        <Chips items={FILTERS} active={filter} onChange={setFilter} />

        <Text style={styles.count}>{fmtNum(total)} طلب</Text>
      </View>

      {q.isError ? (
        <ErrorState message={(q.error as Error)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <View style={styles.listPad}><ListSkeleton rows={6} /></View>
      ) : (
        <FlashList<OrderRow>
          data={rows}
          keyExtractor={o => o.id}
          contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary[600]} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => { if (q.hasNextPage && !q.isFetchingNextPage) q.fetchNextPage() }}
          ListEmptyComponent={
            // .c-empty — 56px primary-50 circle, lg bold title, action button
            // The web offers "إنشاء طلب" here, but /api/mobile/v1/orders is
            // GET-only — order creation is production commerce logic and is
            // deliberately not exposed to the app. Offering the button would
            // route to the detail screen with id="new" and 404. So the empty
            // state says where orders come from instead of dead-ending.
            <EmptyState
              icon={<ShoppingCart size={24} color={primary[600]} />}
              title="لا توجد طلبات"
              sub={debounced
                ? 'لا نتائج لبحثك — جرّب كلمة أخرى.'
                : filtered
                  ? 'لا يوجد طلب بهذه الحالة حالياً.'
                  : 'ستظهر الطلبات هنا فور وصولها من متجرك.'}
              action={filtered
                ? <Button title="الكل" variant="secondary" onPress={() => { setSearch(''); setFilter('all') }} />
                : undefined}
            />
          }
          ListFooterComponent={q.isFetchingNextPage ? <View style={{ paddingTop: space[3] }}><ListSkeleton rows={2} /></View> : null}
          renderItem={({ item }) => <OrderCard order={item} onPress={openOrder} />}
        />
      )}
    </View>
  )
}

// ── One .c-table row, folded into a card ────────────────────
export const OrderCard = React.memo(function OrderCard({
  order, onPress,
}: { order: OrderRow; onPress: (id: string) => void }) {
  return (
    <Card
      onPress={() => onPress(order.id)}
      accessibilityLabel={`طلب ${order.order_number} — ${order.customer_name}`}
      style={styles.card}
      padded={false}
    >
      <View style={styles.cardInner}>
        {/* col 1 + 5: number, date, status */}
        <View style={styles.line}>
          <Text style={styles.number}>#{order.order_number}</Text>
          <StatusPill status={order.status} />
        </View>

        {/* col 2: customer */}
        <Text style={styles.name} numberOfLines={1}>{order.customer_name}</Text>
        {/* Phone numbers are LTR even inside an RTL paragraph. */}
        <Text style={styles.phone} numberOfLines={1}>{order.customer_phone}</Text>

        {/* col 3 + 4: destination, total, delivery type */}
        <View style={styles.foot}>
          <Text style={styles.place} numberOfLines={1}>
            {order.wilaya_name ?? '—'}
            {order.commune ? ` · ${order.commune}` : ''}
          </Text>
          <View style={styles.totalCol}>
            <Text style={styles.total}>{fmtDZD(order.total)}</Text>
            <Text style={styles.delivery}>
              {order.delivery_type === 'stopdesk' ? 'مكتب' : 'منزل'}
            </Text>
          </View>
        </View>

        <Text style={styles.date}>{formatDateShort(order.created_at)}</Text>
      </View>
    </Card>
  )
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.page },
  filters: { paddingHorizontal: space[4], paddingBottom: space[3], gap: space[2] },
  searchWrap: { justifyContent: 'center' },
  // .c-input.ps-9 — icon inset at start
  searchIcon: { position: 'absolute', start: 12, zIndex: 1 },
  searchInput: { paddingStart: 34, paddingEnd: 34 },
  clear: { position: 'absolute', end: 10, padding: 4 },
  count: { ...text('xs'), color: color.ink3 },
  listPad: { paddingHorizontal: space[4] },

  card: { marginBottom: space[3] },
  cardInner: { padding: space[4], gap: 2 },
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[2] },
  // .c-table col 1: font-semibold text-xs, text-link, tabular
  number: { ...text('xs', 'semibold'), color: color.link, fontVariant: ['tabular-nums'] },
  // col 2: font-medium text-sm, text-primary
  name: { ...text('base', 'medium'), color: color.ink, marginTop: space[2] },
  phone: { ...text('xs'), color: color.ink3, fontVariant: ['tabular-nums'], writingDirection: 'ltr', textAlign: 'right' },
  foot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space[2], marginTop: space[2] },
  // col 3: text-xs, text-secondary
  place: { ...text('xs'), color: color.ink2, flex: 1 },
  totalCol: { alignItems: 'flex-start' },
  // col 4: font-semibold text-sm, tabular
  total: { fontFamily: fontFamily.semibold, fontSize: 14, color: color.ink, fontVariant: ['tabular-nums'] },
  delivery: { ...text('xs'), color: color.ink3 },
  // col 1 sub: text-[11px], text-muted
  date: { fontFamily: fontFamily.regular, fontSize: 11, color: color.ink3, marginTop: space[1] },
})
