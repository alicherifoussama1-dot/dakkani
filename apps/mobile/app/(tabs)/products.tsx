// ============================================================
// PRODUCTS — real data from /api/mobile/v1/products.
//
// Ported from components/dashboard/ProductsPageClient.tsx. Its `.c-table`
// row becomes a `.c-card` carrying the same cells in the same hierarchy:
//   40px thumb (radius-md, surface-sunken) + name + routing badges
//   · price + cost · SKU (ltr) · stock badge · active toggle badge
// The header badge trio (count / active / hidden) is kept verbatim.
// ============================================================
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { View, Text, Pressable, StyleSheet, RefreshControl, Image, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { Search, Package, X, Plus } from 'lucide-react-native'
import { api, type ProductRow } from '../../src/lib/api'
import {
  Card, Badge, Chips, ListSkeleton, EmptyState, ErrorState, Input, Button,
} from '../../src/components/ui'
import TopBar from '../../src/components/TopBar'
import { color, primary, space, radius, text, fontFamily, fmtDZD, fmtNum } from '../../src/theme/tokens'

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'معروض' },
  { key: 'hidden', label: 'مخفي' },
  { key: 'out', label: 'نفد المخزون' },
]

export default function Products() {
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

  const q = useQuery({
    queryKey: ['products', filter, debounced],
    queryFn: () => api.products({ filter, q: debounced || undefined, limit: 60 }),
  })

  const del = useMutation({
    mutationFn: (id: string) => api.deleteProduct(id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      qc.invalidateQueries({ queryKey: ['products'] })
    },
    onError: (e: Error) => Alert.alert('تعذّر الحذف', e?.message ?? 'حاول مرة أخرى'),
  })

  const confirmDelete = useCallback((p: ProductRow) => {
    Alert.alert('إخفاء المنتج؟', `سيتم إخفاء «${p.name}» من المتجر. يمكنك إظهاره لاحقاً.`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إخفاء', style: 'destructive', onPress: () => del.mutate(p.id) },
    ])
  }, [del])

  // Memoised, not just annotated: a fresh [] each render would defeat the
  // useMemo below and recount on every keystroke.
  const rows: ProductRow[] = useMemo(() => q.data?.products ?? [], [q.data])
  const counts = useMemo(() => ({
    total: q.data?.total ?? rows.length,
    active: rows.filter(p => p.is_active).length,
    hidden: rows.filter(p => !p.is_active).length,
  }), [rows, q.data?.total])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['products'] })
    setRefreshing(false)
  }, [qc])

  const open = useCallback((id: string) => router.push(`/products/${id}`), [router])
  const filtered = filter !== 'all' || !!debounced

  return (
    <View style={styles.root}>
      <TopBar title="المنتجات" />

      <View style={styles.filters}>
        {/* Header badge trio, verbatim from the web page. */}
        <View style={styles.badges}>
          <Badge label={`${fmtNum(counts.total)} منتج`} tone="neutral" />
          <Badge label={`${fmtNum(counts.active)} معروض`} tone="success" />
          {counts.hidden > 0 ? <Badge label={`${fmtNum(counts.hidden)} مخفي`} tone="warning" /> : null}
        </View>

        <View style={styles.searchWrap}>
          <Search size={14} color={color.ink3} style={styles.searchIcon} />
          <Input
            value={search}
            onChangeText={setSearch}
            placeholder="ابحث باسم المنتج أو SKU"
            accessibilityLabel="ابحث باسم المنتج أو SKU"
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
      </View>

      {q.isError ? (
        <ErrorState message={(q.error as Error)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <View style={styles.listPad}><ListSkeleton rows={6} /></View>
      ) : (
        <FlashList<ProductRow>
          data={rows}
          estimatedItemSize={96}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: insets.bottom + 96 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={primary[600]} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Package size={24} color={primary[600]} />}
              title="لا توجد منتجات"
              sub={debounced ? 'لا نتائج لبحثك — جرّب كلمة أخرى.' : undefined}
              action={filtered
                ? <Button title="الكل" variant="secondary" onPress={() => { setSearch(''); setFilter('all') }} />
                : <Button title="إضافة منتج" icon={<Plus size={15} color={color.onBrand} />} onPress={() => router.push('/products/new' as never)} />}
            />
          }
          renderItem={({ item }) => (
            <ProductCard product={item} onPress={open} onLongPress={confirmDelete} />
          )}
        />
      )}
    </View>
  )
}

// ── One .c-table row, folded into a card ────────────────────
export const ProductCard = React.memo(function ProductCard({
  product: p, onPress, onLongPress,
}: {
  product: ProductRow
  onPress: (id: string) => void
  onLongPress?: (p: ProductRow) => void
}) {
  const out = p.stock <= 0
  const low = p.stock > 0 && p.stock <= 5

  return (
    <Card
      onPress={() => onPress(p.id)}
      accessibilityLabel={p.name}
      style={styles.card}
      padded={false}
    >
      <Pressable
        onLongPress={() => onLongPress?.(p)}
        // Long-press mirrors the web's row action menu, which has no
        // touch equivalent.
        accessibilityRole="button"
        accessibilityLabel={p.name}
        style={styles.cardInner}
      >
        {/* w-10 h-10 rounded-[--radius-md] on --surface-sunken */}
        {p.image ? (
          <Image source={{ uri: p.image }} style={styles.thumb} resizeMode="cover" alt={p.name} />
        ) : (
          <View style={[styles.thumb, styles.thumbEmpty]}>
            <Package size={16} color={color.ink3} />
          </View>
        )}

        <View style={styles.info}>
          {/* font-medium text-sm truncate */}
          <Text style={styles.name} numberOfLines={1}>{p.name}</Text>

          <View style={styles.metaRow}>
            {/* font-semibold text-sm, tabular */}
            <Text style={styles.price}>{fmtDZD(p.price)}</Text>
            {p.compare_price ? <Text style={styles.compare}>{fmtDZD(p.compare_price)}</Text> : null}
          </View>

          <View style={styles.badgeRow}>
            <Badge label={p.is_active ? 'معروض' : 'مخفي'} tone={p.is_active ? 'success' : 'neutral'} />
            {out ? (
              <Badge label="نفد" tone="error" />
            ) : low ? (
              <Badge label={fmtNum(p.stock)} tone="warning" />
            ) : (
              <Text style={styles.stock}>{fmtNum(p.stock)} في المخزون</Text>
            )}
          </View>
        </View>
      </Pressable>
    </Card>
  )
})

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.page },
  filters: { paddingHorizontal: space[4], paddingBottom: space[3], gap: space[2] },
  badges: { flexDirection: 'row', gap: space[2], flexWrap: 'wrap' },
  searchWrap: { justifyContent: 'center' },
  searchIcon: { position: 'absolute', start: 12, zIndex: 1 },
  searchInput: { paddingStart: 34, paddingEnd: 34 },
  clear: { position: 'absolute', end: 10, padding: 4 },
  listPad: { paddingHorizontal: space[4] },

  card: { marginBottom: space[3] },
  cardInner: { flexDirection: 'row', alignItems: 'center', gap: space[3], padding: space[4] },
  thumb: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: color.sunken },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, minWidth: 0, gap: 4 },
  name: { ...text('sm', 'medium'), color: color.ink },
  metaRow: { flexDirection: 'row', alignItems: 'baseline', gap: space[2] },
  price: { fontFamily: fontFamily.semibold, fontSize: 14, color: color.ink, fontVariant: ['tabular-nums'] },
  compare: { ...text('xs'), color: color.ink3, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: space[2], flexWrap: 'wrap' },
  stock: { ...text('xs'), color: color.ink2, fontVariant: ['tabular-nums'] },
})
