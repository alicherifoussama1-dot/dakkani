// ============================================================
// ORDER DETAIL — real data, real status mutations.
//
// This is the deep-link target: commerco://orders/<uuid>
// Status changes PATCH /api/mobile/v1/orders/[id] with an optimistic
// update, then reconcile. All 19 production statuses are offered.
// ============================================================
import React, { useState } from 'react'
import {
  View, Text, ScrollView, StyleSheet, Pressable, Alert, ActivityIndicator,
} from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { api } from '../../src/lib/api'
import {
  GlassCard, BrandHero, StatusPill, Button, Sheet, SheetOption,
  Loading, ErrorState, Skeleton,
} from '../../src/components/ui'
import {
  IconBack, IconPhone, IconWhatsApp, IconCopy, IconRefresh, IconCheck, IconMore,
} from '../../src/components/Icons'
import { color, font, radius, shadow, ORDER_STATUS, fmtDZD, fmtNum } from '../../src/theme/tokens'
import { relativeTime } from '../../src/lib/time'
import { callPhone, openWhatsApp } from '../../src/lib/contact'

const ALL_STATUSES = Object.keys(ORDER_STATUS)

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const [sheet, setSheet] = useState(false)

  const q = useQuery({
    queryKey: ['order', id],
    queryFn: () => api.order(String(id)),
    enabled: !!id,
  })

  const mutate = useMutation({
    mutationFn: (status: string) => api.setOrderStatus(String(id), status),
    onMutate: async (status) => {
      // Optimistic: the pill flips instantly, feels native even on 3G.
      await qc.cancelQueries({ queryKey: ['order', id] })
      const prev = qc.getQueryData<any>(['order', id])
      qc.setQueryData<any>(['order', id], (old: any) =>
        old ? { ...old, order: { ...old.order, status } } : old)
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      qc.setQueryData(['order', id], ctx?.prev)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
      Alert.alert('تعذّر التحديث', 'لم يتم تغيير حالة الطلب. تحقّق من الاتصال.')
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['bootstrap'] })
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['order', id] }),
  })

  const o = q.data?.order
  const items: any[] = o?.order_items ?? []

  const call = () => callPhone(o?.customer_phone)
  const whatsapp = () =>
    openWhatsApp(o?.customer_phone, `السلام عليكم ${o?.customer_name}، بخصوص طلبك ${o?.order_number}`)
  const copy = async () => {
    if (!o?.customer_phone) return
    await Clipboard.setStringAsync(o.customer_phone)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    Alert.alert('تم النسخ', 'نُسخ رقم الهاتف')
  }

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <IconBack size={18} color={color.ink2} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.title} numberOfLines={1}>{o?.order_number ?? 'الطلب'}</Text>
          <Text style={styles.sub}>{o?.created_at ? relativeTime(o.created_at) : '—'}</Text>
        </View>
        <Pressable style={styles.iconBtn} onPress={() => setSheet(true)} hitSlop={8}>
          <IconMore size={18} color={color.ink2} />
        </Pressable>
      </View>

      {q.isError ? (
        <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading ? (
        <View style={{ paddingHorizontal: 16, gap: 12 }}>
          <Skeleton h={130} style={{ borderRadius: 30 }} />
          <Skeleton h={90} /><Skeleton h={120} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
          <BrandHero>
            <View style={styles.rowBetween}>
              <Text style={styles.heroLabel}>إجمالي الطلب</Text>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>
                  {(ORDER_STATUS as any)[o.status]?.ar ?? o.status}
                </Text>
              </View>
            </View>
            <Text style={styles.heroValue}>{fmtDZD(Number(o.total ?? 0))}</Text>
            <Text style={styles.heroLabel}>
              المجموع {fmtDZD(Number(o.subtotal ?? 0))} + توصيل {fmtDZD(Number(o.delivery_fee ?? 0))}
            </Text>
          </BrandHero>

          {/* actions */}
          <View style={styles.actions}>
            <Action icon={<IconPhone size={19} color={color.em700} />} label="اتصال" onPress={call} />
            <Action icon={<IconWhatsApp size={19} color={color.em700} />} label="واتساب" onPress={whatsapp} />
            <Action icon={<IconCopy size={19} color={color.em700} />} label="نسخ" onPress={copy} />
            <Action icon={<IconRefresh size={19} color={color.em700} />} label="الحالة" onPress={() => setSheet(true)} />
          </View>

          <Text style={styles.section}>بيانات العميل</Text>
          <GlassCard index={0}>
            <KV k="الاسم" v={o.customer_name} />
            <KV k="الهاتف" v={o.customer_phone} ltr />
            {o.customer_phone2 ? <KV k="هاتف بديل" v={o.customer_phone2} ltr /> : null}
            <KV k="الولاية" v={`${o.wilaya_name ?? '—'}${o.wilaya_id ? ` (${o.wilaya_id})` : ''}`} />
            <KV k="البلدية" v={o.baladia ?? '—'} />
            <KV k="طريقة التوصيل" v={o.delivery_type === 'stopdesk' ? 'مكتب الاستلام' : 'التوصيل للمنزل'} />
            {o.stopdesk_office_name ? <KV k="المكتب" v={o.stopdesk_office_name} /> : null}
            {o.address ? <KV k="العنوان" v={o.address} /> : null}
          </GlassCard>

          <Text style={styles.section}>المنتجات</Text>
          <GlassCard index={1}>
            {items.map((it, i) => (
              <View key={it.id ?? i}>
                <View style={styles.rowBetween}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemName} numberOfLines={1}>
                      {it.products?.name_ar ?? it.products?.name ?? it.product_name ?? 'منتج'}
                    </Text>
                    <Text style={styles.kvK}>الكمية {fmtNum(it.quantity)}</Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    {fmtDZD(Number(it.unit_price ?? it.products?.price ?? 0) * Number(it.quantity ?? 1))}
                  </Text>
                </View>
                {i < items.length - 1 && <View style={styles.divider} />}
              </View>
            ))}
            <View style={styles.divider} />
            <KV k="المجموع الفرعي" v={fmtDZD(Number(o.subtotal ?? 0))} />
            {Number(o.discount_amount ?? 0) > 0 && (
              <KV k={`خصم${o.coupon_code ? ` (${o.coupon_code})` : ''}`} v={`- ${fmtDZD(Number(o.discount_amount))}`} />
            )}
            <KV k="رسوم التوصيل" v={fmtDZD(Number(o.delivery_fee ?? 0))} />
            <View style={styles.rowBetween}>
              <Text style={styles.totalK}>الإجمالي</Text>
              <Text style={styles.totalV}>{fmtDZD(Number(o.total ?? 0))}</Text>
            </View>
          </GlassCard>

          <Text style={styles.section}>المصدر والإسناد</Text>
          <GlassCard index={2}>
            <KV k="المصدر" v={o.utm_source ?? o.source ?? 'مباشر'} />
            {o.utm_campaign ? <KV k="الحملة" v={o.utm_campaign} ltr /> : null}
            <KV k="طريقة الدفع" v={o.payment_method === 'cod' ? 'الدفع عند الاستلام' : String(o.payment_method)} />
            <View style={styles.rowBetween}>
              <Text style={styles.kvK}>درجة الاحتيال</Text>
              <Text style={[styles.kvV, { color: (o.fraud_score ?? 0) > 40 ? '#B91C1C' : color.em700 }]}>
                {fmtNum(o.fraud_score ?? 0)}/100
              </Text>
            </View>
            <Text style={[styles.kvK, { marginTop: 8, lineHeight: 18 }]}>
              الإسناد للقراءة فقط — التطبيق لا يعدّل نظام التتبّع
            </Text>
          </GlassCard>

          {(q.data?.history?.length ?? 0) > 0 && (
            <>
              <Text style={styles.section}>سجل الحالات</Text>
              <GlassCard index={3}>
                {q.data!.history.map((h: any, i: number) => (
                  <View key={h.id ?? i} style={styles.rowBetween}>
                    <View style={styles.row}>
                      <View style={styles.tick}><IconCheck size={11} color={color.white} /></View>
                      <Text style={styles.itemName}>
                        {(ORDER_STATUS as any)[h.to_status]?.ar ?? h.to_status}
                      </Text>
                    </View>
                    <Text style={styles.kvK}>{h.created_at ? relativeTime(h.created_at) : ''}</Text>
                  </View>
                ))}
              </GlassCard>
            </>
          )}

          {o.status === 'new' && (
            <Button title="تأكيد الطلب" onPress={() => mutate.mutate('confirmed')}
              loading={mutate.isPending} style={{ marginTop: 16 }}
              icon={<IconCheck size={17} color={color.white} />} />
          )}
        </ScrollView>
      )}

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="تغيير حالة الطلب">
        {ALL_STATUSES.map(s => (
          <SheetOption key={s} active={o?.status === s}
            onPress={() => { setSheet(false); if (o?.status !== s) mutate.mutate(s) }}>
            <StatusPill status={s} />
            <Text style={styles.statusCode}>{s}</Text>
          </SheetOption>
        ))}
      </Sheet>
    </View>
  )
}

const Action: React.FC<{ icon: React.ReactNode; label: string; onPress: () => void }> = ({ icon, label, onPress }) => (
  <Pressable style={styles.action} onPress={onPress}>
    {icon}<Text style={styles.actionLabel}>{label}</Text>
  </Pressable>
)

const KV: React.FC<{ k: string; v: string; ltr?: boolean }> = ({ k, v, ltr }) => (
  <View style={styles.kv}>
    <Text style={styles.kvK}>{k}</Text>
    <Text style={[styles.kvV, ltr && { writingDirection: 'ltr' }]}>{v}</Text>
  </View>
)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: color.glass2,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  title: { fontSize: 17, fontWeight: '800', color: color.ink },
  sub: { fontSize: 11.5, fontWeight: '600', color: color.ink3, marginTop: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingVertical: 4 },
  heroLabel: { fontSize: font.label, fontWeight: '700', color: 'rgba(255,255,255,0.88)' },
  heroPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.25)' },
  heroPillText: { color: color.white, fontSize: 11, fontWeight: '800' },
  heroValue: {
    fontSize: 32, fontWeight: '800', color: color.white, marginVertical: 6,
    fontVariant: ['tabular-nums'], letterSpacing: -0.8,
  },
  actions: { flexDirection: 'row', gap: 9, marginTop: 14 },
  action: {
    flex: 1, alignItems: 'center', gap: 5, paddingVertical: 13, borderRadius: radius.md,
    backgroundColor: color.glass2, borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  actionLabel: { fontSize: 10.5, fontWeight: '700', color: color.ink2 },
  section: { fontSize: 14.5, fontWeight: '800', color: color.ink, marginTop: 22, marginBottom: 11 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  kvK: { fontSize: font.label, fontWeight: '700', color: color.ink3 },
  kvV: { fontSize: 13.5, fontWeight: '700', color: color.ink, flexShrink: 1, textAlign: 'left' },
  itemName: { fontSize: 13.5, fontWeight: '700', color: color.ink },
  itemPrice: { fontSize: 13.5, fontWeight: '800', color: color.ink, fontVariant: ['tabular-nums'] },
  divider: { height: 1, backgroundColor: color.hairline, marginVertical: 10 },
  totalK: { fontSize: 15, fontWeight: '800', color: color.ink },
  totalV: { fontSize: 16, fontWeight: '800', color: color.em700, fontVariant: ['tabular-nums'] },
  tick: { width: 20, height: 20, borderRadius: 10, backgroundColor: color.em500, alignItems: 'center', justifyContent: 'center' },
  statusCode: { marginStart: 'auto', fontSize: 10, color: color.ink3, writingDirection: 'ltr' },
})
