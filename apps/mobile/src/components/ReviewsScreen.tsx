// ============================================================
// REVIEWS — real data; approve / hide / reply against the real API.
// ============================================================
import React, { useCallback, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, ScrollView, RefreshControl, TextInput, Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { api, type ReviewRow } from '../lib/api'
import { Card, Chips, ListSkeleton, EmptyState, ErrorState, Sheet, Button } from './ui'
import { IconStar, IconCheck, IconClose } from './Icons'
import { color, font, radius, shadow , fontFamily } from '../theme/tokens'
import { relativeTime } from '../lib/time'

const FILTERS = [
  { key: 'all', label: 'الكل' },
  { key: 'approved', label: 'منشورة' },
  { key: 'pending', label: 'بانتظار الموافقة' },
]

export default function ReviewsScreen() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)
  const [replyTo, setReplyTo] = useState<ReviewRow | null>(null)
  const [replyText, setReplyText] = useState('')

  const key = ['reviews', filter]
  const q = useQuery({
    queryKey: key,
    queryFn: () => api.reviews(filter === 'all' ? undefined : (filter as 'approved' | 'pending')),
  })

  const patch = useMutation({
    mutationFn: (body: { id: string; is_approved?: boolean; reply?: string }) => api.patchReview(body),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      qc.invalidateQueries({ queryKey: ['reviews'] })
      setReplyTo(null); setReplyText('')
    },
    onError: (e: any) => Alert.alert('تعذّر التحديث', e?.message ?? ''),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: ['reviews'] })
    setRefreshing(false)
  }, [qc])

  const rows: ReviewRow[] = q.data?.reviews ?? []
  const avg = q.data?.avg ?? 0
  // The server's total, not the filtered page length — "متوسط 3 تقييم" while
  // showing only the pending ones described the wrong population.
  const total = q.data?.total ?? rows.length

  return (
    <>
      <Chips items={FILTERS} active={filter} onChange={setFilter} />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.br500} />}
      >
        {q.isError ? (
          <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <ListSkeleton rows={4} />
        ) : rows.length === 0 ? (
          <EmptyState icon={<IconStar size={44} color={color.ink3} />}
            title="لا توجد تقييمات" sub="سيظهر هنا رأي العملاء بعد أول تقييم." />
        ) : (
          <>
            <Card>
              <View style={styles.avgRow}>
                <Text style={styles.avgValue}>{avg.toFixed(1)}</Text>
                <View>
                  <Stars n={Math.round(avg)} />
                  <Text style={styles.avgLabel}>متوسط {total} تقييم</Text>
                </View>
              </View>
            </Card>

            {rows.map((r, i) => (
              <Card key={r.id} >
                <View style={styles.head}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name} numberOfLines={1}>{r.customer_name || 'عميل'}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                      {r.product_name ?? '—'} · {relativeTime(r.created_at)}
                      {r.is_verified ? ' · شراء موثّق' : ''}
                    </Text>
                  </View>
                  <Stars n={r.rating} />
                </View>

                {r.comment ? <Text style={styles.comment}>{r.comment}</Text> : null}

                {r.reply ? (
                  <View style={styles.reply}>
                    <Text style={styles.replyLabel}>ردّك</Text>
                    <Text style={styles.replyText}>{r.reply}</Text>
                  </View>
                ) : null}

                <View style={styles.actions}>
                  {r.is_approved ? (
                    <Pressable style={[styles.act, styles.actOff]} accessibilityRole="button" accessibilityLabel="إخفاء التقييم"
                      onPress={() => patch.mutate({ id: r.id, is_approved: false })}>
                      <IconClose size={14} color={color.ink2} />
                      <Text style={styles.actTextOff}>إخفاء</Text>
                    </Pressable>
                  ) : (
                    <Pressable style={[styles.act, styles.actOn]} accessibilityRole="button" accessibilityLabel="اعتماد التقييم"
                      onPress={() => patch.mutate({ id: r.id, is_approved: true })}>
                      <IconCheck size={14} color={color.br700} />
                      <Text style={styles.actTextOn}>نشر</Text>
                    </Pressable>
                  )}
                  <Pressable style={[styles.act, styles.actNeutral]} accessibilityRole="button" accessibilityLabel="إجراء"
                    onPress={() => { setReplyTo(r); setReplyText(r.reply ?? '') }}>
                    <Text style={styles.actTextNeutral}>{r.reply ? 'تعديل الردّ' : 'ردّ'}</Text>
                  </Pressable>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      <Sheet visible={!!replyTo} onClose={() => setReplyTo(null)} title="الردّ على التقييم">
        <TextInput
          value={replyText} onChangeText={setReplyText} multiline
          placeholder="اكتب ردّك على العميل" placeholderTextColor={color.ink3}
          style={styles.input}
        />
        <Button title="حفظ الردّ" loading={patch.isPending}
          onPress={() => replyTo && patch.mutate({ id: replyTo.id, reply: replyText.trim() })}
          style={{ marginTop: 10 }} />
      </Sheet>
    </>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <IconStar key={i} size={13} color={i <= n ? color.amber : color.border} strokeWidth={2} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  avgRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avgValue: { fontSize: 34, fontFamily: fontFamily.bold, color: color.ink, fontVariant: ['tabular-nums'] },
  avgLabel: { fontSize: font.label, fontFamily: fontFamily.bold, color: color.ink3, marginTop: 4 },
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  name: { fontSize: 13.5, fontFamily: fontFamily.bold, color: color.ink },
  meta: { fontSize: font.label, fontFamily: fontFamily.bold, color: color.ink3, marginTop: 3 },
  comment: { fontSize: 12.5, color: color.ink2, lineHeight: 21, marginTop: 9 },
  reply: {
    marginTop: 10, padding: 11, borderRadius: radius.sm,
    backgroundColor: color.br50, borderStartWidth: 3, borderStartColor: color.br500,
  },
  replyLabel: { fontSize: 10, fontFamily: fontFamily.bold, color: color.br700 },
  replyText: { fontSize: 12, color: color.ink2, marginTop: 3, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  act: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
  },
  actOn: { backgroundColor: color.br50 },
  actOff: { backgroundColor: color.sunken },
  actNeutral: { backgroundColor: color.white, borderWidth: 1, borderColor: color.border },
  actTextOn: { fontSize: 11.5, fontFamily: fontFamily.bold, color: color.br700 },
  actTextOff: { fontSize: 11.5, fontFamily: fontFamily.bold, color: color.ink2 },
  actTextNeutral: { fontSize: 11.5, fontFamily: fontFamily.bold, color: color.ink },
  input: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.md, fontSize: 14,
    color: color.ink, backgroundColor: color.white, borderWidth: 1, borderColor: color.border,
    height: 100, textAlignVertical: 'top',
  },
})
