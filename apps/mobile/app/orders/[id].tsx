// ============================================================
// ORDER DETAIL — real data, real status mutations.
//
// This is the deep-link target: commerco://orders/<uuid>
// Status changes PATCH /api/mobile/v1/orders/[id] with an optimistic
// update, then reconcile. All 19 production statuses are offered.
//
// Layout ports app/(dashboard)/orders/[id]/page.tsx in its order:
//   breadcrumb → title + badges → stepper → items table → totals
//   → delivery → customer → source → history
// The web's 3-column grid collapses to one below lg, which is what a
// phone gets, so the single column here IS the site's mobile layout.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, Alert } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import {
  Truck, User, Phone, MapPin, Package, MoreHorizontal, Copy, MessageCircle, History,
} from 'lucide-react-native'
import { api } from '../../src/lib/api'
import {
  Card, StatusPill, Badge, Button, Sheet, ErrorState, Skeleton, Divider,
} from '../../src/components/ui'
import Stepper, { ORDER_STEPS } from '../../src/components/Stepper'
import TopBar from '../../src/components/TopBar'
import {
  color, primary, space, radius, text, fontFamily, ORDER_STATUS, fmtDZD, fmtNum,
} from '../../src/theme/tokens'
import { relativeTime, formatDateShort } from '../../src/lib/time'
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
  const history: any[] = q.data?.history ?? []
  const items: any[] = o?.order_items ?? []

  // currentStep: the furthest STEP the order has reached. A cancelled or
  // returned order is not on the happy path, so the stepper is hidden —
  // the web does the same.
  const currentStep = useMemo(() => {
    if (!o?.status) return -1
    const direct = ORDER_STEPS.findIndex(s => s.key === o.status)
    if (direct >= 0) return direct
    // Shipping sub-states all sit on the "shipped" step.
    if (['in_transit', 'out_for_delivery', 'with_driver', 'at_stopdesk'].includes(o.status)) return 3
    return -1
  }, [o?.status])

  const call = useCallback(() => callPhone(o?.customer_phone), [o?.customer_phone])
  const whatsapp = useCallback(
    () => openWhatsApp(o?.customer_phone, `السلام عليكم ${o?.customer_name}، بخصوص طلبك ${o?.order_number}`),
    [o?.customer_phone, o?.customer_name, o?.order_number],
  )
  const copy = useCallback(async () => {
    if (!o?.customer_phone) return
    await Clipboard.setStringAsync(o.customer_phone)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    Alert.alert('تم النسخ', 'نُسخ رقم الهاتف')
  }, [o?.customer_phone])

  return (
    <View style={styles.root}>
      <TopBar
        title={o?.order_number ? `طلب #${o.order_number}` : 'الطلب'}
        onBack={() => router.back()}
        actions={[{ key: 'more', label: 'إجراءات', Icon: MoreHorizontal, onPress: () => setSheet(true) }]}
      />

      {q.isError ? (
        <ErrorState message={(q.error as Error)?.message} onRetry={() => q.refetch()} />
      ) : q.isLoading || !o ? (
        <View style={styles.scroll}>
          <Skeleton height={64} rounded={radius.lg} />
          <Skeleton height={120} rounded={radius.lg} />
          <Skeleton height={160} rounded={radius.lg} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + space[10] }]}>
          {/* ── Breadcrumb ── */}
          <View style={styles.crumbs}>
            <Pressable onPress={() => router.back()} accessibilityRole="link">
              <Text style={styles.crumbLink}>الطلبات</Text>
            </Pressable>
            <Text style={styles.crumbSep}>›</Text>
            <Text style={styles.crumbNow}>#{o.order_number}</Text>
          </View>

          {/* ── Title + badges ── */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>طلب #{o.order_number}</Text>
            <StatusPill status={o.status} />
            {o.is_duplicate ? <Badge label="مكرر" tone="warning" /> : null}
            {o.is_blacklisted ? <Badge label="قائمة سوداء" tone="error" /> : null}
          </View>
          <Text style={styles.when}>{relativeTime(o.created_at)} · {formatDateShort(o.created_at)}</Text>

          {/* ── Stepper ── */}
          {currentStep >= 0 ? (
            <Card style={styles.stepCard}>
              <Stepper current={currentStep} />
            </Card>
          ) : null}

          {/* ── Items ── */}
          <Card padded={false}>
            <SectionHead Icon={Package} title="المنتجات" trailing={`${fmtNum(items.length)} صنف`} />
            {items.map((it, i) => (
              <View key={it.id ?? i} style={[styles.item, i === 0 && { borderTopWidth: 0 }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.itemName} numberOfLines={2}>{it.product_name ?? '—'}</Text>
                  {it.product_sku ? <Text style={styles.sku}>SKU: {it.product_sku}</Text> : null}
                  <Text style={styles.itemMeta}>×{fmtNum(it.quantity)} · {fmtDZD(it.unit_price)}</Text>
                </View>
                <Text style={styles.itemTotal}>{fmtDZD(it.total_price)}</Text>
              </View>
            ))}

            {/* ── Totals ── */}
            <View style={styles.totals}>
              <TotalRow label="المجموع الفرعي" value={fmtDZD(o.subtotal ?? 0)} />
              <TotalRow label="رسوم التوصيل" value={fmtDZD(o.delivery_fee ?? 0)} />
              {o.discount_amount ? (
                <TotalRow
                  label={`خصم${o.coupon_code ? ` (${o.coupon_code})` : ''}`}
                  value={`−${fmtDZD(o.discount_amount)}`}
                />
              ) : null}
              <Divider style={{ marginVertical: space[2] }} />
              <View style={styles.totalRow}>
                <Text style={styles.grandLabel}>المجموع الكلي</Text>
                <Text style={styles.grandValue}>{fmtDZD(o.total ?? 0)}</Text>
              </View>
            </View>
          </Card>

          {/* ── Delivery ── */}
          <Card padded={false}>
            <SectionHead Icon={Truck} title="معلومات التوصيل" />
            <View style={styles.body}>
              <InfoRow label="نوع التوصيل" value={o.delivery_type === 'stopdesk' ? 'مكتب' : 'منزل'} />
              <InfoRow label="الولاية" value={o.wilaya?.name_ar ?? o.wilaya_name ?? '—'} />
              <InfoRow label="البلدية" value={o.commune?.name_ar ?? o.commune ?? '—'} />
              {o.stopdesk_office ? <InfoRow label="المكتب" value={o.stopdesk_office} /> : null}
              {o.address ? (
                <View style={styles.addr}>
                  <MapPin size={14} color={color.ink3} />
                  <Text style={styles.addrText}>{o.address}</Text>
                </View>
              ) : null}
            </View>
          </Card>

          {/* ── Customer ── */}
          <Card padded={false}>
            <SectionHead Icon={User} title="العميل" />
            <View style={styles.body}>
              <Text style={styles.custName}>{o.customer_name}</Text>
              <View style={styles.phoneRow}>
                <Phone size={13} color={color.ink3} />
                <Text style={styles.phone}>{o.customer_phone}</Text>
              </View>
              {o.customer_phone2 ? (
                <View style={styles.phoneRow}>
                  <Phone size={13} color={color.ink3} />
                  <Text style={styles.phone}>{o.customer_phone2}</Text>
                </View>
              ) : null}

              {/* Native affordances a browser cannot offer as directly. */}
              <View style={styles.actions}>
                <Button title="اتصال" size="sm" onPress={call} icon={<Phone size={14} color={color.onBrand} />} />
                <Button title="واتساب" size="sm" variant="secondary" onPress={whatsapp} icon={<MessageCircle size={14} color={color.ink} />} />
                <Button title="نسخ" size="sm" variant="ghost" onPress={copy} icon={<Copy size={14} color={color.ink2} />} />
              </View>
            </View>
          </Card>

          {/* ── Source ── */}
          {o.source || o.utm_source ? (
            <Card>
              <Text style={styles.sectionTitle}>مصدر الطلب</Text>
              <Text style={styles.sourceText}>{o.utm_source ?? o.source}</Text>
            </Card>
          ) : null}

          {/* ── History ── */}
          {history.length ? (
            <Card padded={false}>
              <SectionHead Icon={History} title="سجل التغييرات" />
              <View style={styles.body}>
                {history.map((h, i) => (
                  <View key={h.id ?? i} style={styles.histRow}>
                    <View style={styles.histDot} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.histText}>
                        {(ORDER_STATUS as any)[h.status]?.ar ?? h.status}
                      </Text>
                      {h.note ? <Text style={styles.histNote}>{h.note}</Text> : null}
                    </View>
                    <Text style={styles.histWhen}>{relativeTime(h.created_at)}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ) : null}
        </ScrollView>
      )}

      {/* ── Status sheet: all 19 production statuses ── */}
      <Sheet visible={sheet} onClose={() => setSheet(false)} title="تغيير حالة الطلب">
        <ScrollView style={{ maxHeight: 380 }}>
          {ALL_STATUSES.map(s => {
            const meta = (ORDER_STATUS as any)[s]
            const on = o?.status === s
            return (
              <Pressable
                key={s}
                onPress={() => { setSheet(false); if (!on) mutate.mutate(s) }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.opt, pressed && { backgroundColor: color.sunken }]}
              >
                <View style={[styles.optDot, { backgroundColor: meta.fg }]} />
                <Text style={[styles.optText, on && { fontFamily: fontFamily.bold, color: primary[700] }]}>
                  {meta.ar}
                </Text>
                {on ? <Text style={styles.optNow}>الحالية</Text> : null}
              </Pressable>
            )
          })}
        </ScrollView>
      </Sheet>
    </View>
  )
}

// ── Card header: 16px icon in primary-600 + base semibold title ──
const SectionHead: React.FC<{ Icon: any; title: string; trailing?: string }> = ({ Icon, title, trailing }) => (
  <View style={styles.head}>
    <Icon size={16} color={primary[600]} />
    <Text style={styles.sectionTitle}>{title}</Text>
    {trailing ? <Text style={styles.headTrailing}>{trailing}</Text> : null}
  </View>
)

const TotalRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.totalRow}>
    <Text style={styles.totalLabel}>{label}</Text>
    <Text style={styles.totalValue}>{value}</Text>
  </View>
)

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
  </View>
)

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.page },
  // p-4 on the web page
  scroll: { padding: space[4], gap: space[4] },

  crumbs: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  crumbLink: { ...text('xs'), color: color.ink3 },
  crumbSep: { ...text('xs'), color: color.ink3 },
  crumbNow: { ...text('xs', 'semibold'), color: color.ink, fontVariant: ['tabular-nums'] },

  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space[2] },
  // --text-2xl bold, letter-spacing -0.015em
  title: { ...text('2xl', 'bold'), color: color.ink, letterSpacing: -0.36 },
  when: { ...text('xs'), color: color.ink3, marginTop: -space[2] },

  // .c-card padding: var(--space-5) var(--space-6)
  stepCard: { paddingVertical: space[5], paddingHorizontal: space[6] },

  // px-5 py-4 with a bottom hairline
  head: {
    flexDirection: 'row', alignItems: 'center', gap: space[2],
    paddingHorizontal: space[5], paddingVertical: space[4],
    borderBottomWidth: 1, borderBottomColor: color.border,
  },
  sectionTitle: { ...text('base', 'semibold'), color: color.ink },
  headTrailing: { ...text('xs'), color: color.ink3, marginStart: 'auto' },
  body: { padding: space[5], gap: space[3] },

  item: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space[3],
    paddingHorizontal: space[5], paddingVertical: space[3],
    borderTopWidth: 1, borderTopColor: color.border,
  },
  itemName: { ...text('sm', 'medium'), color: color.ink },
  sku: { ...text('xs'), color: color.ink3, marginTop: 2, writingDirection: 'ltr' },
  itemMeta: { ...text('xs'), color: color.ink2, marginTop: 4, fontVariant: ['tabular-nums'] },
  itemTotal: { ...text('sm', 'semibold'), color: color.ink, fontVariant: ['tabular-nums'] },

  totals: { padding: space[5], borderTopWidth: 1, borderTopColor: color.border, gap: space[2] },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space[3] },
  totalLabel: { ...text('sm'), color: color.ink2 },
  totalValue: { ...text('sm'), color: color.ink2, fontVariant: ['tabular-nums'] },
  grandLabel: { ...text('sm', 'semibold'), color: color.ink },
  grandValue: { ...text('base', 'bold'), color: primary[700], fontVariant: ['tabular-nums'] },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: space[3] },
  infoLabel: { ...text('sm'), color: color.ink2 },
  infoValue: { ...text('sm', 'medium'), color: color.ink, flex: 1, textAlign: 'left' },
  addr: { flexDirection: 'row', alignItems: 'flex-start', gap: space[2] },
  addrText: { ...text('sm'), color: color.ink2, flex: 1, lineHeight: 21 },

  custName: { ...text('base', 'semibold'), color: color.ink },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  phone: { ...text('sm'), color: color.ink2, fontVariant: ['tabular-nums'], writingDirection: 'ltr' },
  actions: { flexDirection: 'row', gap: space[2], marginTop: space[2], flexWrap: 'wrap' },

  sourceText: { ...text('sm'), color: color.ink2, marginTop: space[2] },

  histRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  histDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: primary[600], marginTop: 5 },
  histText: { ...text('sm', 'medium'), color: color.ink },
  histNote: { ...text('xs'), color: color.ink2, marginTop: 2 },
  histWhen: { ...text('xs'), color: color.ink3 },

  opt: { flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], paddingHorizontal: space[2], borderRadius: radius.md },
  optDot: { width: 8, height: 8, borderRadius: radius.full },
  optText: { ...text('base'), color: color.ink, flex: 1 },
  optNow: { ...text('xs'), color: color.ink3 },
})
