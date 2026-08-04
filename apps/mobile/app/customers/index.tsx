// ============================================================
// CUSTOMERS — derived from real orders (the web has no customers table;
// the phone number is the identity key, same as the web page).
// ============================================================
import React, { useCallback, useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, RefreshControl } from 'react-native'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { api, type CustomerRow } from '../../src/lib/api'
import { GlassCard, ListSkeleton, EmptyState, ErrorState } from '../../src/components/ui'
import { IconBack, IconSearch, IconUsers, IconClose } from '../../src/components/Icons'
import { color, font, radius, shadow, fmtDZD, fmtNum } from '../../src/theme/tokens'

export default function Customers() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400)
    return () => clearTimeout(t)
  }, [search])

  const q = useQuery({
    queryKey: ['customers', debounced],
    queryFn: () => api.customers({ q: debounced || undefined, limit: 100 }),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['customers'] })
    setRefreshing(false)
  }, [qc])

  const rows: CustomerRow[] = q.data?.customers ?? []

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <IconBack size={18} color={color.ink2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>العملاء</Text>
          <Text style={styles.sub}>{fmtNum(rows.length)} عميل</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <IconSearch size={17} color={color.ink3} />
        <TextInput value={search} onChangeText={setSearch}
          placeholder="ابحث بالاسم أو رقم الهاتف" placeholderTextColor={color.ink3}
          style={styles.search} keyboardType="default" />
        {search ? (
          <Pressable onPress={() => setSearch('')} hitSlop={8}><IconClose size={16} color={color.ink3} /></Pressable>
        ) : null}
      </View>

      {q.isError ? (
        <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <View style={{ paddingHorizontal: 16 }}><ListSkeleton rows={6} /></View>
      ) : (
        <FlashList<CustomerRow>
          data={rows}
          estimatedItemSize={96}
          keyExtractor={c => c.phone}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.br500} />}
          ListEmptyComponent={
            <EmptyState icon={<IconUsers size={44} color={color.ink3} />}
              title="لا يوجد عملاء" body={debounced ? 'لا نتائج لبحثك.' : 'سيظهر عملاؤك هنا بعد أول طلب.'} />
          }
          renderItem={({ item, index }: { item: CustomerRow; index: number }) => (
            <GlassCard index={index}
              onPress={() => router.push(`/customers/${encodeURIComponent(item.phone)}`)}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(item.name || '؟').charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.spend}>{fmtDZD(item.spend)}</Text>
                  </View>
                  <Text style={styles.phone}>{item.phone}</Text>
                  <View style={styles.rowBetween}>
                    <Text style={styles.meta} numberOfLines={1}>
                      {item.wilaya_name ?? '—'}{item.commune ? ` · ${item.commune}` : ''}
                    </Text>
                    <Text style={styles.meta}>{fmtNum(item.orders)} طلبات</Text>
                  </View>
                </View>
              </View>
            </GlassCard>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: color.glass2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  title: { fontSize: 21, fontWeight: '800', color: color.ink },
  sub: { fontSize: 11.5, fontWeight: '600', color: color.ink3, marginTop: 1 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 9, marginHorizontal: 16, marginBottom: 8,
    paddingHorizontal: 14, height: 44, borderRadius: radius.md,
    backgroundColor: color.glass2, borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  search: { flex: 1, fontSize: 13.5, color: color.ink, paddingVertical: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  avatar: {
    width: 44, height: 44, borderRadius: 14, backgroundColor: color.br50,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(41,82,227,0.14)',
  },
  avatarText: { fontSize: 16, fontWeight: '800', color: color.br700 },
  name: { fontSize: 13.5, fontWeight: '800', color: color.ink, flexShrink: 1 },
  spend: { fontSize: 13.5, fontWeight: '800', color: color.br700, fontVariant: ['tabular-nums'] },
  phone: { fontSize: font.label, fontWeight: '700', color: color.ink3, marginTop: 3, writingDirection: 'ltr' },
  meta: { fontSize: font.label, fontWeight: '700', color: color.ink3, marginTop: 4, flexShrink: 1 },
})
