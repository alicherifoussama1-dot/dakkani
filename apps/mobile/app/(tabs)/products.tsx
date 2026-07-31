// ============================================================
// PRODUCTS — real list + create/edit/delete via the verified API.
// ============================================================
import React, { useCallback, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, RefreshControl, Alert } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { api, type ProductRow } from '../../src/lib/api'
import {
  GlassCard, Chips, ListSkeleton, EmptyState, ErrorState,
} from '../../src/components/ui'
import { IconSearch, IconPlus, IconBox, IconClose } from '../../src/components/Icons'
import { color, font, radius, shadow, fmtDZD, fmtNum } from '../../src/theme/tokens'

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'متوفر' },
  { key: 'low', label: 'مخزون منخفض' },
  { key: 'out', label: 'نفد' },
  { key: 'hidden', label: 'مخفي' },
]

export default function Products() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  React.useEffect(() => {
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
    onError: (e: any) => Alert.alert('تعذّر الحذف', e?.message ?? 'حاول مرة أخرى'),
  })

  const confirmDelete = (p: ProductRow) => {
    Alert.alert('إخفاء المنتج؟', `سيتم إخفاء «${p.name}» من المتجر. يمكنك إظهاره لاحقاً.`, [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'إخفاء', style: 'destructive', onPress: () => del.mutate(p.id) },
    ])
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['products'] })
    setRefreshing(false)
  }, [qc])

  const rows: ProductRow[] = q.data?.products ?? []

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>المنتجات</Text>
          <Text style={styles.sub}>{fmtNum(rows.length)} منتج</Text>
        </View>
        <Pressable style={styles.addBtn} onPress={() => router.push('/products/new')} hitSlop={8}>
          <IconPlus size={19} color={color.white} />
        </Pressable>
      </View>

      <View style={styles.searchWrap}>
        <IconSearch size={17} color={color.ink3} />
        <TextInput value={search} onChangeText={setSearch}
          placeholder="ابحث عن منتج" placeholderTextColor={color.ink3} style={styles.search} />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}><IconClose size={16} color={color.ink3} /></Pressable>
        ) : null}
      </View>

      <Chips items={FILTERS} active={filter} onChange={setFilter} />

      {q.isError ? (
        <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <View style={{ paddingHorizontal: 16 }}><ListSkeleton rows={5} /></View>
      ) : (
        <FlashList<ProductRow>
          data={rows}
          estimatedItemSize={112}
          keyExtractor={p => p.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.em500} />}
          ListEmptyComponent={
            <EmptyState icon={<IconBox size={44} color={color.ink3} />}
              title="لا توجد منتجات"
              body={debounced ? 'لا نتائج لبحثك.' : 'أضف أول منتج لتبدأ البيع.'} />
          }
          renderItem={({ item, index }: { item: ProductRow; index: number }) => (
            <GlassCard index={index} onPress={() => router.push(`/products/${item.id}`)}>
              <View style={styles.row}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.thumb} contentFit="cover"
                    transition={180} cachePolicy="memory-disk" alt={item.name} />
                ) : (
                  <View style={[styles.thumb, styles.thumbEmpty]}><IconBox size={22} color={color.ink3} /></View>
                )}
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <View style={[styles.pill, stockStyle(item)]}>
                      <Text style={[styles.pillText, stockTextStyle(item)]}>{stockLabel(item)}</Text>
                    </View>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.price}>{fmtDZD(item.price)}</Text>
                    {item.compare_price ? (
                      <>
                        <Text style={styles.compare}>{fmtDZD(item.compare_price)}</Text>
                        <View style={styles.discount}><Text style={styles.discountText}>-{item.discount_pct}%</Text></View>
                      </>
                    ) : null}
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.meta}>المخزون {fmtNum(item.stock)}</Text>
                    <Text style={styles.meta}>{fmtNum(item.orders_count)} طلب</Text>
                    <Text style={[styles.meta, item.abandonment_rate > 25 && { color: '#B45309' }]}>
                      مهجور {item.abandonment_rate}%
                    </Text>
                  </View>
                </View>
                <Pressable onPress={() => confirmDelete(item)} hitSlop={10} style={{ padding: 4 }}>
                  <IconClose size={16} color={color.ink3} />
                </Pressable>
              </View>
            </GlassCard>
          )}
        />
      )}
    </View>
  )
}

const stockLabel = (p: ProductRow) =>
  !p.is_active ? 'مخفي' : p.stock <= 0 ? 'نفد' : p.stock < 15 ? 'منخفض' : 'متوفر'
const stockStyle = (p: ProductRow) =>
  !p.is_active ? { backgroundColor: color.sunken }
    : p.stock <= 0 ? { backgroundColor: color.rose50 }
    : p.stock < 15 ? { backgroundColor: color.amber50 }
    : { backgroundColor: color.em50 }
const stockTextStyle = (p: ProductRow) =>
  !p.is_active ? { color: color.ink2 }
    : p.stock <= 0 ? { color: '#B91C1C' }
    : p.stock < 15 ? { color: '#B45309' }
    : { color: color.em700 }

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 11 },
  title: { fontSize: 21, fontWeight: '800', color: color.ink },
  sub: { fontSize: 11.5, fontWeight: '600', color: color.ink3, marginTop: 1 },
  addBtn: {
    width: 40, height: 40, borderRadius: 999, backgroundColor: color.em600,
    alignItems: 'center', justifyContent: 'center', ...shadow.emerald,
  },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 16, marginBottom: 4,
    paddingHorizontal: 14, height: 44, borderRadius: radius.md,
    backgroundColor: color.glass2, borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  search: { flex: 1, fontSize: 13.5, color: color.ink, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  thumb: { width: 56, height: 56, borderRadius: 15, backgroundColor: color.sunken },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.hairline },
  name: { fontSize: 14, fontWeight: '800', color: color.ink, flexShrink: 1 },
  pill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { fontSize: 10, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 4 },
  price: { fontSize: 15, fontWeight: '800', color: color.em700, fontVariant: ['tabular-nums'] },
  compare: { fontSize: 11.5, color: color.ink3, textDecorationLine: 'line-through' },
  discount: { backgroundColor: color.em50, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  discountText: { fontSize: 10, fontWeight: '800', color: color.em700 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 5 },
  meta: { fontSize: font.label, fontWeight: '700', color: color.ink3 },
})
