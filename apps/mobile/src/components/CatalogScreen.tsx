// ============================================================
// CATALOG SCREEN — one real, data-driven screen powering
// Coupons · Warehouses · Blacklist · Google Sheets · Landing Pages.
//
// Each config declares how to render and (where the server allows it) how
// to create/toggle/delete. Everything hits /api/mobile/v1/catalog/:resource,
// which whitelists tables and columns server-side.
// ============================================================
import React, { useCallback, useMemo, useState } from 'react'
import {
  View, Text, StyleSheet, Pressable, RefreshControl, ScrollView,
  TextInput, Switch, Alert,
} from 'react-native'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { api, type CatalogResource } from '../lib/api'
import {
  Card, ListSkeleton, EmptyState, ErrorState, Button, Sheet,
} from './ui'
import {
  IconTicket, IconWarehouse, IconBlock, IconSheet, IconRocket, IconBox,
  IconPlus, IconTrash, IconCheck, IconClose,
} from './Icons'
import { color, font, radius, shadow, fmtDZD, fmtNum , fontFamily } from '../theme/tokens'
import { relativeTime } from '../lib/time'

export interface CatalogConfig {
  resource: CatalogResource
  Icon: any
  emptyTitle: string
  emptyBody: string
  /** Rows → card content. */
  title: (r: any) => string
  subtitle?: (r: any) => string
  badge?: (r: any) => { text: string; ok: boolean } | null
  /** null ⇒ creation not supported from mobile (server enforces it too). */
  createFields?: Array<{
    key: string; label: string; placeholder?: string
    type?: 'text' | 'number' | 'bool'; required?: boolean
  }>
  canDelete?: boolean
  /** Field toggled by the switch on each row. */
  toggleField?: string
  readOnlyNote?: string
}

export const CATALOGS: Record<string, CatalogConfig> = {
  coupons: {
    resource: 'coupons', Icon: IconTicket,
    emptyTitle: 'لا توجد كوبونات', emptyBody: 'أنشئ كوبون خصم لعملائك.',
    title: r => r.code,
    subtitle: r => `${r.type === 'percent' ? `${r.value}%` : fmtDZD(r.value)} · استُخدم ${fmtNum(r.used_count ?? 0)}${r.max_uses ? ` / ${r.max_uses}` : ''}`,
    badge: r => ({ text: r.is_active ? 'مفعّل' : 'موقوف', ok: !!r.is_active }),
    createFields: [
      { key: 'code', label: 'رمز الكوبون', placeholder: 'SUMMER20', required: true },
      { key: 'value', label: 'القيمة', placeholder: '20', type: 'number', required: true },
      { key: 'min_order_amount', label: 'أدنى قيمة للطلب (دج)', placeholder: '0', type: 'number' },
      { key: 'max_uses', label: 'أقصى عدد استخدامات', placeholder: 'اختياري', type: 'number' },
    ],
    canDelete: true, toggleField: 'is_active',
  },
  warehouses: {
    resource: 'warehouses', Icon: IconWarehouse,
    emptyTitle: 'لا توجد مخازن', emptyBody: 'أنشئ مخزناً لتتمكّن من إدارة المخزون.',
    title: r => r.name_ar || r.name,
    subtitle: r => r.address || (r.is_default ? 'المخزن الافتراضي' : '—'),
    badge: r => (r.is_default ? { text: 'افتراضي', ok: true } : null),
    createFields: [
      { key: 'name', label: 'اسم المخزن', placeholder: 'المخزن الرئيسي', required: true },
      { key: 'name_ar', label: 'الاسم بالعربية', placeholder: 'اختياري' },
      { key: 'address', label: 'العنوان', placeholder: 'اختياري' },
      { key: 'phone', label: 'الهاتف', placeholder: 'اختياري' },
      { key: 'is_default', label: 'المخزن الافتراضي', type: 'bool' },
    ],
    canDelete: true, toggleField: 'is_active',
  },
  blacklist: {
    resource: 'blacklist', Icon: IconBlock,
    emptyTitle: 'القائمة السوداء فارغة', emptyBody: 'لم تحظر أي عميل بعد.',
    title: r => r.full_name || r.phone,
    subtitle: r => `${r.phone}${r.reason ? ` · ${r.reason}` : ''}`,
    createFields: [
      { key: 'phone', label: 'رقم الهاتف', placeholder: '0555123456', required: true },
      { key: 'full_name', label: 'الاسم', placeholder: 'اختياري' },
      { key: 'reason', label: 'السبب', placeholder: 'اختياري' },
    ],
    canDelete: true,
  },
  sheets: {
    resource: 'sheets', Icon: IconSheet,
    emptyTitle: 'لا يوجد جدول مرتبط', emptyBody: 'اربط Google Sheets من لوحة التحكم على الموقع.',
    title: r => r.sheet_name || 'جدول',
    subtitle: r => `${r.sheet_page_name ?? ''}${r.last_sync ? ` · آخر مزامنة ${relativeTime(r.last_sync)}` : ''}`,
    badge: r => ({ text: r.is_active ? 'مزامن' : 'موقوف', ok: !!r.is_active }),
    toggleField: 'is_active',
    readOnlyNote: 'الربط والمصادقة يتمّان من الموقع؛ هنا يمكنك إيقاف/تشغيل المزامنة.',
  },
  categories: {
    resource: 'categories', Icon: IconBox,
    emptyTitle: 'لا توجد أقسام', emptyBody: 'أنشئ أقساماً لتنظيم منتجات متجرك.',
    title: r => r.name_ar || r.name,
    subtitle: r => `${r.slug}${r.sort_order ? ` · الترتيب ${fmtNum(r.sort_order)}` : ''}`,
    badge: r => ({ text: r.is_active ? 'ظاهر' : 'مخفي', ok: !!r.is_active }),
    createFields: [
      { key: 'name', label: 'اسم القسم', placeholder: 'أحذية رياضية', required: true },
      { key: 'name_ar', label: 'الاسم بالعربية', placeholder: 'اختياري' },
      { key: 'slug', label: 'المعرّف (بالإنجليزية)', placeholder: 'sport-shoes', required: true },
      { key: 'sort_order', label: 'ترتيب العرض', placeholder: '0', type: 'number' },
    ],
    canDelete: true, toggleField: 'is_active',
  },
  'landing-pages': {
    resource: 'landing-pages', Icon: IconRocket,
    emptyTitle: 'لا توجد صفحات هبوط', emptyBody: 'أنشئ صفحة هبوط من لوحة التحكم على الموقع.',
    title: r => r.title_ar || r.title,
    subtitle: r => `${fmtNum(r.views ?? 0)} مشاهدة · ${fmtNum(r.conversions ?? 0)} تحويل`,
    badge: r => ({ text: r.is_active ? 'منشورة' : 'مسودة', ok: !!r.is_active }),
    toggleField: 'is_active',
    readOnlyNote: 'المحرِّر الكامل (بما فيه إعدادات البكسل) يبقى على الموقع فقط.',
  },
}

export default function CatalogScreen({ config }: { config: CatalogConfig }) {
  const qc = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState<Record<string, any>>({})

  // Memoised so it is a stable dependency for the callbacks below rather
  // than a fresh array on every render.
  const key = useMemo(() => ['catalog', config.resource], [config.resource])
  const q = useQuery({ queryKey: key, queryFn: () => api.catalog(config.resource) })

  const create = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = {}
      for (const f of config.createFields ?? []) {
        const v = form[f.key]
        if (v === undefined || v === '') continue
        body[f.key] = f.type === 'number' ? Number(v) : v
      }
      // Coupons: the DB requires a discount type; percent is the common case.
      if (config.resource === 'coupons' && !body.type) body.type = 'percent'
      return api.catalogCreate(config.resource, body)
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      setCreating(false); setForm({})
      qc.invalidateQueries({ queryKey: key })
    },
    onError: (e: any) => Alert.alert('تعذّر الإنشاء', e?.message ?? 'تحقّق من البيانات'),
  })

  const toggle = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) =>
      api.catalogUpdate(config.resource, id, { [config.toggleField!]: value }),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      qc.invalidateQueries({ queryKey: key })
    },
    onError: (e: any) => Alert.alert('تعذّر التحديث', e?.message ?? ''),
  })

  const remove = useMutation({
    mutationFn: (id: string) => api.catalogDelete(config.resource, id),
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
      qc.invalidateQueries({ queryKey: key })
    },
    onError: (e: any) => Alert.alert('تعذّر الحذف', e?.message ?? ''),
  })

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await qc.invalidateQueries({ queryKey: key })
    setRefreshing(false)
  }, [qc, key])

  const rows: any[] = q.data?.items ?? []
  const unavailable = q.data?.unavailable

  const missingRequired = (config.createFields ?? [])
    .some(f => f.required && !form[f.key])

  return (
    <>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={color.br500} />}
      >
        {config.readOnlyNote ? (
          <Card><Text style={styles.note}>{config.readOnlyNote}</Text></Card>
        ) : null}

        {q.isError ? (
          <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
        ) : q.isLoading ? (
          <ListSkeleton rows={5} />
        ) : unavailable ? (
          <Card>
            <Text style={styles.note}>
              هذه الوحدة غير متاحة على قاعدة البيانات الحالية (لم تُطبَّق هجرتها بعد).
            </Text>
          </Card>
        ) : rows.length === 0 ? (
          <EmptyState icon={<config.Icon size={44} color={color.ink3} />}
            title={config.emptyTitle} sub={config.emptyBody} />
        ) : (
          rows.map((r, i) => {
            const b = config.badge?.(r)
            return (
              <Card key={r.id} >
                <View style={styles.row}>
                  <View style={styles.icon}><config.Icon size={17} color={color.br700} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.rowBetween}>
                      <Text style={styles.title} numberOfLines={1}>{config.title(r)}</Text>
                      {b ? (
                        <View style={[styles.badge, b.ok ? styles.badgeOk : styles.badgeOff]}>
                          <Text style={[styles.badgeText, { color: b.ok ? color.br700 : color.ink2 }]}>{b.text}</Text>
                        </View>
                      ) : null}
                    </View>
                    {config.subtitle ? (
                      <Text style={styles.sub} numberOfLines={2}>{config.subtitle(r)}</Text>
                    ) : null}
                  </View>

                  {config.toggleField ? (
                    <Switch
                      value={!!r[config.toggleField]}
                      onValueChange={v => toggle.mutate({ id: r.id, value: v })}
                      trackColor={{ true: color.br500, false: color.border }} thumbColor={color.white}
                    />
                  ) : null}

                  {config.canDelete ? (
                    <Pressable hitSlop={8} style={{ padding: 4 }} accessibilityRole="button" accessibilityLabel="حذف"
                      onPress={() => Alert.alert('حذف؟', 'لا يمكن التراجع.', [
                        { text: 'إلغاء', style: 'cancel' },
                        { text: 'حذف', style: 'destructive', onPress: () => remove.mutate(r.id) },
                      ])}>
                      <IconTrash size={16} color={color.ink3} />
                    </Pressable>
                  ) : null}
                </View>
              </Card>
            )
          })
        )}

        {config.createFields ? (
          <Button title="إضافة جديد" onPress={() => setCreating(true)}
            icon={<IconPlus size={17} color={color.white} />} style={{ marginTop: 16 }} />
        ) : null}
      </ScrollView>

      <Sheet visible={creating} onClose={() => setCreating(false)} title="إضافة جديد">
        {(config.createFields ?? []).map(f => (
          <View key={f.key} style={{ marginBottom: 12 }}>
            <Text style={styles.fieldLabel}>{f.label}{f.required ? ' *' : ''}</Text>
            {f.type === 'bool' ? (
              <Switch value={!!form[f.key]}
                onValueChange={v => setForm(s => ({ ...s, [f.key]: v }))}
                trackColor={{ true: color.br500, false: color.border }} thumbColor={color.white} />
            ) : (
              <TextInput
                value={String(form[f.key] ?? '')}
                onChangeText={v => setForm(s => ({ ...s, [f.key]: v }))}
                placeholder={f.placeholder} placeholderTextColor={color.ink3}
                keyboardType={f.type === 'number' ? 'numeric' : 'default'}
                style={styles.input}
              />
            )}
          </View>
        ))}
        {/* disabled, not just dimmed — otherwise the create fires with the
            required columns missing and fails server-side instead of here. */}
        <Button title="إنشاء" onPress={() => create.mutate()} loading={create.isPending}
          disabled={missingRequired} style={{ marginTop: 6 }} />
        {missingRequired ? (
          <Text style={styles.note}>أكمل الحقول المطلوبة (*) أولاً.</Text>
        ) : null}
      </Sheet>
    </>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  icon: {
    width: 38, height: 38, borderRadius: 13, backgroundColor: color.br50,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 13.5, fontFamily: fontFamily.bold, color: color.ink, flexShrink: 1 },
  sub: { fontSize: font.label, fontFamily: fontFamily.bold, color: color.ink3, marginTop: 3, lineHeight: 17 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  badgeOk: { backgroundColor: color.br50 }, badgeOff: { backgroundColor: color.sunken },
  badgeText: { fontSize: 10, fontFamily: fontFamily.bold },
  note: { fontSize: 12, color: color.ink2, lineHeight: 20 },
  fieldLabel: { fontSize: font.label, fontFamily: fontFamily.bold, color: color.ink3, marginBottom: 6 },
  input: {
    paddingHorizontal: 14, paddingVertical: 12, borderRadius: radius.md, fontSize: 14,
    color: color.ink, backgroundColor: color.white, borderWidth: 1, borderColor: color.border,
  },
})
