// ============================================================
// MODULE SCREENS — one route handling the remaining merchant modules.
//
// Each module reads REAL data from the existing backend where an endpoint
// exists today. Where the web has an endpoint the mobile API layer has not
// wrapped yet, the screen states that explicitly instead of showing fake
// numbers — no mock data reaches a production screen.
// ============================================================
import React from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import {
  api, type DeliveryProviderRow, type DeliveryPriceRow, type StopdeskOfficeRow,
} from '../../src/lib/api'
import {
  GlassCard, BrandHero, EmptyState, Loading, ErrorState, ListSkeleton,
} from '../../src/components/ui'
import { IconBack, IconTruck, IconLocation, IconSheet, IconCoins, IconCard } from '../../src/components/Icons'
import { color, font, radius, shadow, fmtDZD, fmtNum } from '../../src/theme/tokens'
import { WILAYA_NAMES } from '../../src/components/WilayaMap'
import CatalogScreen, { CATALOGS } from '../../src/components/CatalogScreen'
import ReviewsScreen from '../../src/components/ReviewsScreen'
import ConfirmiliScreen from '../../src/components/ConfirmiliScreen'

/** Delivery zones (carrier ids 59–69). NOT wilayas — they are towns inside
 *  existing wilayas that Yalidine/ZR price as separate zones. Verified:
 *  orders.wilaya_id is a FK to wilayas(1–58), so these can never appear on
 *  the order map. They belong here, in Delivery. */
const DELIVERY_ZONES: Array<{ name: string; parent: string }> = [
  { name: 'أفلو', parent: 'الأغواط' },
  { name: 'بريكة', parent: 'باتنة' },
  { name: 'قصر البخاري', parent: 'المدية' },
  { name: 'عين وسارة', parent: 'الجلفة' },
  { name: 'مسعد', parent: 'الجلفة' },
  { name: 'بوسعادة', parent: 'المسيلة' },
  { name: 'الأبيض سيدي الشيخ', parent: 'البيض' },
  { name: 'فرندة', parent: 'تيارت' },
  { name: 'القرارة', parent: 'غرداية' },
  { name: 'متليلي', parent: 'غرداية' },
  { name: 'توقرت الكبرى', parent: 'تقرت' },
]

const TITLES: Record<string, { title: string; sub: string }> = {
  landing: { title: 'صفحات الهبوط', sub: 'صفحات المنتجات التسويقية' },
  'landing-pages': { title: 'صفحات الهبوط', sub: 'صفحات المنتجات التسويقية' },
  reviews: { title: 'التقييمات', sub: 'آراء العملاء' },
  coupons: { title: 'الكوبونات', sub: 'عروض وخصومات' },
  categories: { title: 'الأقسام', sub: 'تنظيم المنتجات' },
  confirmili: { title: 'Confirmili', sub: 'مركز تأكيد الطلبات' },
  delivery: { title: 'التوصيل', sub: 'الشركات والأسعار والمناطق' },
  stopdesk: { title: 'مكاتب الاستلام', sub: 'نقاط الاستلام حسب الولاية' },
  warehouses: { title: 'المخازن', sub: 'إدارة المخزون' },
  sheets: { title: 'Google Sheets', sub: 'مزامنة الطلبات' },
  blacklist: { title: 'القائمة السوداء', sub: 'العملاء المحظورون' },
  store: { title: 'إعدادات المتجر', sub: 'المعلومات والهوية' },
  plans: { title: 'الاشتراك', sub: 'الباقة والاستهلاك' },
  account: { title: 'الحساب', sub: 'ملفك الشخصي' },
}

export default function ModuleScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  // The More menu uses 'landing'; the catalog resource is 'landing-pages'.
  const ALIAS: Record<string, string> = { landing: 'landing-pages' }
  const key = ALIAS[String(slug)] ?? String(slug)
  const catalog = CATALOGS[key]
  const selfScrolling = !!catalog || slug === 'reviews' || slug === 'confirmili'
  const meta = TITLES[String(slug)] ?? TITLES[key] ?? { title: 'وحدة', sub: '' }

  const boot = useQuery({ queryKey: ['bootstrap'], queryFn: () => api.bootstrap() })

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} hitSlop={8}>
          <IconBack size={18} color={color.ink2} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{meta.title}</Text>
          <Text style={styles.sub}>{meta.sub}</Text>
        </View>
      </View>

      {/* These render their OWN scroll container — never nest them. */}
      {catalog ? <CatalogScreen config={catalog} /> : null}
      {slug === 'reviews' && <ReviewsScreen />}
      {slug === 'confirmili' && <ConfirmiliScreen />}

      {selfScrolling ? null : (
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 60 }}>
        {slug === 'delivery' && <Delivery />}
        {slug === 'stopdesk' && <Stopdesk />}
        {slug === 'plans' && <Plans boot={boot} />}
        {slug === 'store' && <StoreInfo boot={boot} />}
        {slug === 'account' && <StoreInfo boot={boot} account />}
        {!['delivery', 'stopdesk', 'plans', 'store', 'account']
          .includes(String(slug)) && (
          <UnknownModule name={meta.title} />
        )}
      </ScrollView>
      )}
    </View>
  )
}

/** Courier display names — the DB stores a slug. */
const PROVIDER_AR: Record<string, string> = {
  yalidine: 'ياليدين', zrexpress: 'ZR Express', ecotrack: 'Ecotrack',
  maystro: 'مايسترو', noest: 'Noest',
}

function Delivery() {
  // Read through the mobile API layer (Bearer + X-Commerco-Store). The web
  // route /api/delivery/providers authenticates by COOKIE, so calling it from
  // the app would always 401 — this reads the same rows, credentials excluded.
  const providers = useQuery({
    queryKey: ['catalog', 'delivery-providers'],
    queryFn: () => api.catalog<DeliveryProviderRow>('delivery-providers'),
  })
  const prices = useQuery({
    queryKey: ['catalog', 'delivery-prices'],
    queryFn: () => api.catalog<DeliveryPriceRow>('delivery-prices', 200),
  })

  const rows: DeliveryProviderRow[] = providers.data?.items ?? []
  const priceRows: DeliveryPriceRow[] = prices.data?.items ?? []

  return (
    <>
      <Text style={styles.section}>شركات التوصيل</Text>
      {providers.isError ? (
        <ErrorState message={(providers.error as any)?.message} onRetry={() => providers.refetch()} />
      ) : providers.isLoading ? (
        <ListSkeleton rows={2} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<IconTruck size={42} color={color.ink3} />}
          title="لا توجد شركة توصيل مربوطة"
          body="اربط شركة التوصيل من لوحة التحكم على الموقع لتظهر هنا."
        />
      ) : rows.map((p, i) => (
        <GlassCard key={p.id} index={i}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.planName} numberOfLines={1}>{p.display_name}</Text>
              <Text style={styles.hint}>
                {PROVIDER_AR[p.provider_type] ?? p.provider_type}
                {p.from_wilaya_code ? ` · الانطلاق من ${p.from_wilaya_code}` : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 6 }}>
              <View style={[styles.badge, !p.is_active && styles.badgeOff]}>
                <Text style={[styles.badgeText, !p.is_active && styles.badgeTextOff]}>
                  {p.is_active ? 'مفعّلة' : 'موقوفة'}
                </Text>
              </View>
              {p.is_automatic ? (
                <Text style={styles.hint}>شحن تلقائي</Text>
              ) : null}
            </View>
          </View>
        </GlassCard>
      ))}

      <Text style={styles.section}>أسعار التوصيل</Text>
      {prices.isLoading ? (
        <ListSkeleton rows={2} />
      ) : priceRows.length === 0 ? (
        <GlassCard index={0}>
          <Text style={styles.body}>لم تُستورد أسعار بعد. تُستورد من لوحة التحكم على الموقع.</Text>
        </GlassCard>
      ) : (
        <GlassCard index={0}>
          <View style={styles.priceHead}>
            <Text style={[styles.kvK, { flex: 1 }]}>الولاية</Text>
            <Text style={[styles.kvK, styles.priceCol]}>للمنزل</Text>
            <Text style={[styles.kvK, styles.priceCol]}>للمكتب</Text>
          </View>
          <View style={styles.divider} />
          {priceRows.map(r => (
            <View key={r.id} style={styles.priceRow}>
              <Text style={[styles.zoneName, { flex: 1 }]} numberOfLines={1}>
                {WILAYA_NAMES[Number(r.wilaya_code)]?.ar ?? r.wilaya_code}
              </Text>
              <Text style={[styles.priceVal, styles.priceCol]}>
                {r.home_price != null ? fmtDZD(r.home_price) : '—'}
              </Text>
              <Text style={[styles.priceVal, styles.priceCol]}>
                {r.stopdesk_price != null ? fmtDZD(r.stopdesk_price) : '—'}
              </Text>
            </View>
          ))}
        </GlassCard>
      )}

      <Text style={styles.section}>مناطق التوصيل الإضافية</Text>
      <GlassCard index={1}>
        <Text style={styles.body}>
          هذه بلديات داخل ولايات قائمة، تسعّرها شركات التوصيل كمناطق مستقلة.
          ليست ولايات رسمية — لذلك لا تظهر على خريطة الطلبات.
        </Text>
        <View style={styles.divider} />
        {DELIVERY_ZONES.map(z => (
          <View key={z.name} style={styles.zoneRow}>
            <IconLocation size={15} color={color.br600} />
            <Text style={styles.zoneName}>{z.name}</Text>
            <Text style={styles.zoneParent}>داخل {z.parent}</Text>
          </View>
        ))}
      </GlassCard>

      <Text style={styles.hint}>
        الأسعار والشركات تُدار من لوحة التحكم على الموقع — يعرضها التطبيق للقراءة فقط.
      </Text>
    </>
  )
}

function Stopdesk() {
  const q = useQuery({
    queryKey: ['catalog', 'stopdesk-offices'],
    queryFn: () => api.catalog<StopdeskOfficeRow>('stopdesk-offices', 200),
  })

  // Depend on q.data?.items directly — `items ?? []` would be a new array on
  // every render, so the memo would never actually hold.
  const items = q.data?.items
  const offices: StopdeskOfficeRow[] = React.useMemo(() => items ?? [], [items])
  // Group by wilaya so a merchant scans by region, not one flat list.
  const byWilaya = React.useMemo(() => {
    const m = new Map<string, StopdeskOfficeRow[]>()
    for (const o of offices) {
      const k = o.wilaya_code
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(o)
    }
    return [...m.entries()].sort((a, b) => Number(a[0]) - Number(b[0]))
  }, [offices])

  if (q.isError) return <ErrorState message={(q.error as any)?.message} onRetry={() => q.refetch()} />
  if (q.isLoading) return <ListSkeleton rows={3} />
  if (!offices.length) {
    return (
      <EmptyState
        icon={<IconLocation size={42} color={color.ink3} />}
        title="لا توجد مكاتب استلام"
        body="تُضاف مكاتب الاستلام من لوحة التحكم على الموقع، أو تُجلب تلقائياً من شركة التوصيل."
      />
    )
  }

  return (
    <>
      <Text style={styles.section}>مكاتب الاستلام ({fmtNum(offices.length)})</Text>
      {byWilaya.map(([code, list], i) => (
        <GlassCard key={code} index={i}>
          <Text style={styles.planName}>
            {WILAYA_NAMES[Number(code)]?.ar ?? code} <Text style={styles.hint}>({fmtNum(list.length)})</Text>
          </Text>
          <View style={styles.divider} />
          {list.map(o => (
            <View key={o.id} style={styles.officeRow}>
              <IconLocation size={14} color={o.is_active ? color.br600 : color.ink3} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.zoneName} numberOfLines={1}>{o.name}</Text>
                {o.address ? (
                  <Text style={styles.hint} numberOfLines={1}>{o.address}</Text>
                ) : null}
              </View>
              {!o.is_active ? <Text style={styles.zoneParent}>موقوف</Text> : null}
            </View>
          ))}
        </GlassCard>
      ))}
    </>
  )
}

/** Mirrors PLAN_LIMITS in components/dashboard/BillingPlansClient.tsx.
 *  Kept identical so the app and the website never quote different limits. */
const PLAN_LIMITS: Record<string, { orders: number; products: number; members: number }> = {
  free: { orders: 100, products: 20, members: 1 },
  starter: { orders: 500, products: 50, members: 2 },
  pro: { orders: 5000, products: 100, members: 3 },
  enterprise: { orders: 50000, products: 999, members: 10 },
}
const PLAN_AR: Record<string, string> = {
  free: 'أساسي', starter: 'ستارتر', pro: 'Pro', enterprise: 'Elite',
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0
  // Amber at 80%, red at 100% — the merchant sees a cap coming before it bites.
  const tint = pct >= 100 ? color.rose : pct >= 80 ? color.amber : color.br500
  return (
    <View style={{ marginTop: 12 }}>
      <View style={styles.rowBetween}>
        <Text style={styles.kvK}>{label}</Text>
        <Text style={styles.usageVal}>
          {fmtNum(used)} <Text style={styles.kvK}>/ {fmtNum(limit)}</Text>
        </Text>
      </View>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: limit, now: Math.min(used, limit) }}
        accessibilityLabel={`${label}: ${used} من ${limit}`}
      >
        <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: tint }]} />
      </View>
    </View>
  )
}

function Plans({ boot }: { boot: any }) {
  if (boot.isLoading) return <Loading />
  if (boot.isError) return <ErrorState onRetry={() => boot.refetch()} />

  const plan = boot.data?.store?.plan ?? 'free'
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.free
  const c = boot.data?.counters
  const ordersUsed = c?.ordersThisMonth ?? 0
  const productsUsed = c?.productCount ?? 0

  return (
    <>
      <BrandHero>
        <Text style={styles.heroLabel}>باقتك الحالية</Text>
        <Text style={styles.heroValue}>{PLAN_AR[plan] ?? plan.toUpperCase()}</Text>
        <Text style={styles.heroLabel}>الاستهلاك يُحتسب لكل شهر ميلادي</Text>
      </BrandHero>

      <Text style={styles.section}>استهلاك هذا الشهر</Text>
      <GlassCard index={0}>
        <UsageBar label="الطلبات" used={ordersUsed} limit={limits.orders} />
        <UsageBar label="المنتجات" used={productsUsed} limit={limits.products} />
        <UsageBar label="أعضاء الفريق" used={1} limit={limits.members} />
      </GlassCard>

      <Text style={styles.section}>الباقات</Text>
      {Object.keys(PLAN_LIMITS).map((p, i) => {
        const current = p === plan
        const l = PLAN_LIMITS[p]
        return (
          <GlassCard key={p} index={i + 1} style={current ? styles.currentPlan : undefined}>
            <View style={styles.rowBetween}>
              <Text style={styles.planName}>{PLAN_AR[p] ?? p.toUpperCase()}</Text>
              {current ? (
                <View style={styles.badge}><Text style={styles.badgeText}>باقتك الحالية</Text></View>
              ) : null}
            </View>
            <Text style={styles.hint}>
              {fmtNum(l.orders)} طلب/شهر · {fmtNum(l.products)} منتج · {fmtNum(l.members)} عضو
            </Text>
          </GlassCard>
        )
      })}
      <Text style={styles.hint}>
        الترقية والفوترة تتمّان من لوحة التحكم على الموقع.
      </Text>
    </>
  )
}

function StoreInfo({ boot, account }: { boot: any; account?: boolean }) {
  const s = boot.data?.store
  if (boot.isLoading) return <Loading />
  if (boot.isError) return <ErrorState onRetry={() => boot.refetch()} />
  return (
    <>
      <Text style={styles.section}>{account ? 'حسابك' : 'معلومات المتجر'}</Text>
      <GlassCard index={0}>
        <KV k="اسم المتجر" v={s?.name ?? '—'} />
        <KV k="المعرّف (slug)" v={s?.slug ?? '—'} />
        <KV k="الباقة" v={(s?.plan ?? 'free').toUpperCase()} />
        <KV k="المتاجر المرتبطة" v={String(boot.data?.stores?.length ?? 1)} />
      </GlassCard>
      <Text style={styles.hint}>
        التعديل الكامل للإعدادات متاح في لوحة التحكم على الموقع.
      </Text>
    </>
  )
}

/** Reached only via a bad/removed deep link — every real module is routed
 *  above. Kept so an unknown slug shows a way back instead of a blank screen. */
function UnknownModule({ name }: { name: string }) {
  const router = useRouter()
  return (
    <EmptyState
      title="هذه الصفحة غير متاحة"
      body={`تعذّر فتح «${name}». قد يكون الرابط قديماً.`}
    />
  )
}

const KV: React.FC<{ k: string; v: string }> = ({ k, v }) => (
  <View style={styles.kv}><Text style={styles.kvK}>{k}</Text><Text style={styles.kvV}>{v}</Text></View>
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
  section: { fontSize: 14.5, fontWeight: '800', color: color.ink, marginTop: 20, marginBottom: 11 },
  body: { fontSize: 13, color: color.ink2, lineHeight: 22 },
  hint: { fontSize: 11, fontWeight: '600', color: color.ink3, lineHeight: 18, marginTop: 10 },
  divider: { height: 1, backgroundColor: color.hairline, marginVertical: 12 },
  zoneRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 7 },
  zoneName: { fontSize: 13, fontWeight: '800', color: color.ink },
  zoneParent: { fontSize: 11, fontWeight: '600', color: color.ink3, marginStart: 'auto' },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planName: { fontSize: 15, fontWeight: '800', color: color.ink },
  currentPlan: { borderColor: color.br400, borderWidth: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: color.br50 },
  badgeText: { fontSize: 10.5, fontWeight: '800', color: color.br700 },
  badgeOff: { backgroundColor: color.sunken },
  badgeTextOff: { color: color.ink2 },
  priceHead: { flexDirection: 'row', alignItems: 'center' },
  priceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  priceCol: { width: 92, textAlign: 'center' },
  priceVal: { fontSize: 12.5, fontWeight: '700', color: color.ink, fontVariant: ['tabular-nums'] },
  officeRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 8 },
  usageVal: { fontSize: 13, fontWeight: '800', color: color.ink, fontVariant: ['tabular-nums'] },
  track: { height: 7, borderRadius: 4, backgroundColor: color.sunken, marginTop: 7, overflow: 'hidden' },
  trackFill: { height: '100%', borderRadius: 4 },
  heroLabel: { fontSize: font.label, fontWeight: '700', color: 'rgba(255,255,255,0.88)' },
  heroValue: { fontSize: 38, fontWeight: '800', color: color.white, marginVertical: 6 },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  kvK: { fontSize: font.label, fontWeight: '700', color: color.ink3 },
  kvV: { fontSize: 13.5, fontWeight: '700', color: color.ink, flexShrink: 1 },
})
