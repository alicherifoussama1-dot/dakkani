// ============================================================
// MORE — every remaining merchant feature, grouped.
// Nothing from the website is hidden: each entry either navigates to a
// built screen or opens the module screen.
// ============================================================
import React from 'react'
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { api } from '../../src/lib/api'
import { signOut } from '../../src/lib/auth'
import { GlassCard } from '../../src/components/ui'
import { LOGO_ICON_XML } from '../../src/assets/logo'
import {
  IconUsers, IconRocket, IconStar, IconTicket, IconPhone, IconTruck, IconStore,
  IconWarehouse, IconSheet, IconBlock, IconCard, IconBox,
  IconBell, IconShield, IconGlobe, IconUser, IconLogout, IconChevron, IconLocation,
} from '../../src/components/Icons'
import { color, font, radius, shadow } from '../../src/theme/tokens'

type Entry = { key: string; label: string; sub: string; Icon: any; route?: string }

const GROUPS: Array<{ title: string; items: Entry[] }> = [
  {
    title: 'العملاء والتسويق', items: [
      { key: 'customers', label: 'العملاء', sub: 'قاعدة العملاء وسجل الطلبات', Icon: IconUsers, route: '/customers' },
      { key: 'categories', label: 'الأقسام', sub: 'تنظيم المنتجات', Icon: IconBox, route: '/module/categories' },
      { key: 'landing', label: 'صفحات الهبوط', sub: 'صفحات المنتجات التسويقية', Icon: IconRocket, route: '/module/landing' },
      { key: 'reviews', label: 'التقييمات', sub: 'آراء العملاء', Icon: IconStar, route: '/module/reviews' },
      { key: 'coupons', label: 'الكوبونات', sub: 'عروض وخصومات', Icon: IconTicket, route: '/module/coupons' },
    ],
  },
  {
    title: 'العمليات', items: [
      { key: 'confirmili', label: 'Confirmili', sub: 'مركز تأكيد الطلبات', Icon: IconPhone, route: '/module/confirmili' },
      { key: 'delivery', label: 'التوصيل', sub: 'الشركات والأسعار', Icon: IconTruck, route: '/module/delivery' },
      { key: 'stopdesk', label: 'مكاتب الاستلام', sub: 'نقاط الاستلام', Icon: IconLocation, route: '/module/stopdesk' },
      { key: 'warehouses', label: 'المخازن', sub: 'إدارة المخزون', Icon: IconWarehouse, route: '/module/warehouses' },
    ],
  },
  {
    title: 'التكاملات', items: [
      { key: 'sheets', label: 'Google Sheets', sub: 'مزامنة الطلبات', Icon: IconSheet, route: '/module/sheets' },
      { key: 'blacklist', label: 'القائمة السوداء', sub: 'العملاء المحظورون', Icon: IconBlock, route: '/module/blacklist' },
    ],
  },
  {
    title: 'المتجر والحساب', items: [
      { key: 'store', label: 'إعدادات المتجر', sub: 'المعلومات والهوية', Icon: IconStore, route: '/module/store' },
      { key: 'plans', label: 'الاشتراك', sub: 'الباقة والاستهلاك', Icon: IconCard, route: '/module/plans' },
      // NOTE: no "الرصيد" entry. There is no credits table, endpoint or web
      // page anywhere in the platform — the row only ever led to a placeholder.
      { key: 'account', label: 'الحساب', sub: 'ملفك الشخصي', Icon: IconUser, route: '/module/account' },
    ],
  },
  {
    title: 'التفضيلات', items: [
      { key: 'notifs', label: 'إعدادات الإشعارات', sub: 'الصوت والاهتزاز', Icon: IconBell, route: '/settings/notifications' },
      { key: 'security', label: 'الأمان', sub: 'البصمة ورمز الدخول', Icon: IconShield, route: '/settings/security' },
      { key: 'lang', label: 'اللغة', sub: 'عربية · Français · English', Icon: IconGlobe, route: '/settings/language' },
    ],
  },
]

export default function More() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['bootstrap'], queryFn: () => api.bootstrap() })

  const logout = () => Alert.alert('تسجيل الخروج؟', 'ستحتاج إلى تسجيل الدخول مرة أخرى.', [
    { text: 'إلغاء', style: 'cancel' },
    {
      text: 'خروج', style: 'destructive',
      onPress: async () => { await signOut(); qc.clear(); router.replace('/login') },
    },
  ])

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>المزيد</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 130 }}>
        <GlassCard index={0} onPress={() => router.push('/module/account')}>
          <View style={styles.row}>
            <View style={styles.logoBox}><SvgXml xml={LOGO_ICON_XML} width={26} height={26} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.storeName} numberOfLines={1}>{data?.store.name ?? '—'}</Text>
              <Text style={styles.sub}>{data?.store.slug ?? ''}</Text>
            </View>
            <View style={styles.plan}><Text style={styles.planText}>{(data?.store.plan ?? 'free').toUpperCase()}</Text></View>
          </View>
        </GlassCard>

        {GROUPS.map((g, gi) => (
          <View key={g.title}>
            <Text style={styles.section}>{g.title}</Text>
            <GlassCard index={gi + 1} style={{ padding: 0 }}>
              {g.items.map((it, i) => (
                <Pressable key={it.key}
                  style={[styles.item, i < g.items.length - 1 && styles.itemBorder]}
                  onPress={() => it.route && router.push(it.route as never)}>
                  <View style={styles.itemIcon}><it.Icon size={18} color={color.em700} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.itemLabel}>{it.label}</Text>
                    <Text style={styles.itemSub} numberOfLines={1}>{it.sub}</Text>
                  </View>
                  <IconChevron size={15} color={color.ink3} />
                </Pressable>
              ))}
            </GlassCard>
          </View>
        ))}

        <Pressable style={styles.logout} onPress={logout}>
          <IconLogout size={17} color="#B91C1C" />
          <Text style={styles.logoutText}>تسجيل الخروج</Text>
        </Pressable>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  header: { paddingHorizontal: 16, paddingBottom: 10 },
  title: { fontSize: 21, fontWeight: '800', color: color.ink },
  row: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  logoBox: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: color.white,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.hairline,
  },
  storeName: { fontSize: 15, fontWeight: '800', color: color.ink },
  sub: { fontSize: 11.5, fontWeight: '600', color: color.ink3, marginTop: 2 },
  plan: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: color.em50 },
  planText: { fontSize: 10.5, fontWeight: '800', color: color.em700 },
  section: { fontSize: 14.5, fontWeight: '800', color: color.ink, marginTop: 22, marginBottom: 11 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  itemBorder: { borderBottomWidth: 1, borderBottomColor: color.hairline },
  itemIcon: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: color.em50,
    alignItems: 'center', justifyContent: 'center',
  },
  itemLabel: { fontSize: 13.5, fontWeight: '800', color: color.ink },
  itemSub: { fontSize: 11, fontWeight: '600', color: color.ink3, marginTop: 2 },
  logout: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9,
    marginTop: 22, paddingVertical: 15, borderRadius: radius.md,
    backgroundColor: color.rose50, borderWidth: 1, borderColor: '#FECACA',
  },
  logoutText: { color: '#B91C1C', fontWeight: '800', fontSize: 14 },
})
