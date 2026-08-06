// ============================================================
// SETTINGS — notifications · security · language
// All three write to REAL stores: device_tokens (per-device push prefs),
// SecureStore (biometrics), store_settings (alert prefs, whitelisted).
// ============================================================
import React, { useEffect, useState } from 'react'
import { View, Text, ScrollView, StyleSheet, Pressable, Switch, Alert } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import * as Notifications from 'expo-notifications'
import { api } from '../../src/lib/api'
import * as Push from '../../src/lib/push'
import {
  biometricAvailable, isBiometricEnabled, setBiometricEnabled,
} from '../../src/lib/auth'
import { Card, Loading, ErrorState, Button } from '../../src/components/ui'
import TopBar from '../../src/components/TopBar'
import { IconBack, IconBell, IconShield, IconGlobe, IconCheck } from '../../src/components/Icons'
import { color, font, radius, shadow , fontFamily } from '../../src/theme/tokens'

const TITLES: Record<string, { title: string; sub: string }> = {
  notifications: { title: 'إعدادات الإشعارات', sub: 'الصوت والاهتزاز والتنبيهات' },
  security: { title: 'الأمان', sub: 'البصمة وحماية الجلسة' },
  language: { title: 'اللغة', sub: 'لغة واجهة التطبيق' },
}

export default function SettingsSection() {
  const { section } = useLocalSearchParams<{ section: string }>()
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const meta = TITLES[String(section)] ?? { title: 'الإعدادات', sub: '' }

  return (
    <View style={styles.root}>
      <TopBar title={meta.title} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 50 }}>
        {section === 'notifications' && <NotificationSettings />}
        {section === 'security' && <SecuritySettings />}
        {section === 'language' && <LanguageSettings />}
      </ScrollView>
    </View>
  )
}

// ── Notifications ──────────────────────────────────────────
function NotificationSettings() {
  const qc = useQueryClient()
  const [perm, setPerm] = useState<string>('undetermined')
  const [push, setPush] = useState(true)
  const [sound, setSound] = useState(true)
  const [vibration, setVibration] = useState(true)
  const [token, setToken] = useState<string | null>(null)

  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.settings() })

  useEffect(() => {
    (async () => {
      const p = await Notifications.getPermissionsAsync()
      setPerm(p.status)
      setToken(await Push.getStoredToken())
    })()
  }, [])

  const savePrefs = useMutation({
    mutationFn: (prefs: Record<string, boolean>) => Push.updatePrefs(prefs),
    onSuccess: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
    onError: () => Alert.alert('تعذّر الحفظ', 'تحقّق من الاتصال'),
  })

  const saveStore = useMutation({
    mutationFn: (body: Record<string, unknown>) => api.updateSettings(body),
    onSuccess: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (e: any) => Alert.alert('تعذّر الحفظ', e?.message ?? 'حاول مرة أخرى'),
  })

  const enable = async () => {
    const t = await Push.registerDevice()
    setToken(t)
    const p = await Notifications.getPermissionsAsync()
    setPerm(p.status)
    if (!t) Alert.alert('الإشعارات معطّلة', 'مكّن الإشعارات لـ COMMERCO من إعدادات النظام.')
  }

  const s = settings.data?.settings ?? {}

  return (
    <>
      <Text style={styles.section}>إشعارات هذا الجهاز</Text>
      {perm !== 'granted' ? (
        <Card>
          <View style={styles.rowStart}>
            <IconBell size={20} color={color.br700} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>الإشعارات غير مفعّلة</Text>
              <Text style={styles.hint}>
                فعّلها لتصلك تنبيهات الطلبات الجديدة فوراً، حتى والتطبيق مغلق.
              </Text>
            </View>
          </View>
          <Button title="تفعيل الإشعارات" onPress={enable} style={{ marginTop: 12 }} />
        </Card>
      ) : (
        <Card>
          <Toggle label="الإشعارات" hint="تفعيل كل إشعارات هذا الجهاز"
            value={push} onChange={v => { setPush(v); savePrefs.mutate({ push_enabled: v }) }} />
          <Divider />
          <Toggle label="الصوت" hint="صوت COMMERCO عند وصول طلب جديد"
            value={sound} onChange={v => { setSound(v); savePrefs.mutate({ sound_enabled: v }) }} />
          <Divider />
          <Toggle label="الاهتزاز" hint="نبضة مزدوجة مميّزة للطلب الجديد"
            value={vibration} onChange={v => { setVibration(v); savePrefs.mutate({ vibration_enabled: v }) }} />
        </Card>
      )}

      <Text style={styles.section}>تنبيهات المتجر</Text>
      {settings.isLoading ? <Loading /> : settings.isError ? (
        <ErrorState onRetry={() => settings.refetch()} />
      ) : (
        <Card>
          <Toggle label="رسائل SMS للطلبات" hint="إرسال SMS عند إنشاء طلب"
            value={!!s.order_sms} onChange={v => saveStore.mutate({ order_sms: v })} />
          <Divider />
          <Toggle label="بريد إلكتروني للطلبات" hint="إشعار بالبريد عند طلب جديد"
            value={!!s.order_email} onChange={v => saveStore.mutate({ order_email: v })} />
          <Divider />
          <Toggle label="تنبيه المخزون المنخفض" hint={`الحد الحالي: ${s.low_stock_threshold ?? 5}`}
            value={!!s.low_stock_alert} onChange={v => saveStore.mutate({ low_stock_alert: v })} />
        </Card>
      )}

      <Card style={{ marginTop: 16 }}>
        <Text style={styles.techTitle}>البنية التقنية</Text>
        <Text style={styles.tech}>
          Android — قناة orders_v1 · IMPORTANCE_HIGH · صوت مخصص في res/raw{'\n'}
          iOS — new-order.caf عبر APNs · interruption-level: time-sensitive
        </Text>
        {token ? <Text style={styles.tokenNote}>الجهاز مُسجَّل للإشعارات ✓</Text> : null}
      </Card>
    </>
  )
}

// ── Security ───────────────────────────────────────────────
function SecuritySettings() {
  const [available, setAvailable] = useState(false)
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    (async () => {
      setAvailable(await biometricAvailable())
      setEnabled(await isBiometricEnabled())
    })()
  }, [])

  const toggle = async (v: boolean) => {
    await setBiometricEnabled(v)
    setEnabled(v)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }

  return (
    <>
      <Text style={styles.section}>فتح التطبيق</Text>
      <Card>
        {available ? (
          <Toggle
            label="بصمة الإصبع / بصمة الوجه"
            hint="يُطلب التحقّق عند فتح التطبيق"
            value={enabled} onChange={toggle}
          />
        ) : (
          <View style={styles.rowStart}>
            <IconShield size={20} color={color.ink3} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>البصمة غير متاحة</Text>
              <Text style={styles.hint}>
                لم يُسجَّل أي قياس حيوي على هذا الجهاز. أضفه من إعدادات النظام أولاً.
              </Text>
            </View>
          </View>
        )}
      </Card>

      <Text style={styles.section}>حماية الجلسة</Text>
      <Card>
        <Item label="تخزين آمن للجلسة" value="iOS Keychain / Android Keystore" done />
        <Divider />
        <Item label="تجديد التوكن" value="تلقائي قبل انتهاء الصلاحية" done />
        <Divider />
        <Item label="كلمة المرور" value="لا تُخزَّن على الجهاز إطلاقاً" done />
        <Divider />
        <Item label="عزل المتاجر" value="لا يمكن الوصول لبيانات متجر آخر" done />
      </Card>
    </>
  )
}

// ── Language ───────────────────────────────────────────────
/** The website ships ar/fr/en through next-intl. The app has no translation
 *  layer yet — every string in it is written in Arabic — so a picker here
 *  could only flip the writing direction, leaving Arabic text in an LTR
 *  layout. That is worse than no picker, so the screen states what is
 *  actually true instead of offering a choice it cannot honour.
 *
 *  Wiring real i18n means keying every string across all screens; it is a
 *  scoped piece of work, not a toggle. */
function LanguageSettings() {
  return (
    <>
      <Text style={styles.section}>لغة الواجهة</Text>
      <Card style={{ padding: 0 }}>
        <View style={styles.langRow}>
          <IconGlobe size={18} color={color.br700} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: color.br700 }]}>العربية</Text>
            <Text style={styles.hint}>لغة التطبيق</Text>
          </View>
          <IconCheck size={17} color={color.br700} />
        </View>
      </Card>
      <Text style={styles.hint}>
        التطبيق بالعربية حالياً. الفرنسية والإنجليزية متاحتان في لوحة التحكّم على
        الموقع. التطبيق مبني RTL-first: كل التخطيطات تستخدم خصائص منطقية
        (start/end) فتنقلب تلقائياً مع اتجاه الكتابة.
      </Text>
    </>
  )
}

// ── shared bits ────────────────────────────────────────────
const Toggle: React.FC<{
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void
}> = ({ label, hint, value, onChange }) => (
  <View style={styles.toggleRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{label}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
    <Switch value={value} onValueChange={onChange}
      trackColor={{ true: color.br500, false: color.border }} thumbColor={color.white} />
  </View>
)

const Item: React.FC<{ label: string; value: string; done?: boolean }> = ({ label, value, done }) => (
  <View style={styles.toggleRow}>
    <View style={{ flex: 1 }}>
      <Text style={styles.rowTitle}>{label}</Text>
      <Text style={styles.hint}>{value}</Text>
    </View>
    {done && <IconCheck size={17} color={color.br700} />}
  </View>
)

const Divider = () => <View style={styles.divider} />

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.page },
  header: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingBottom: 10 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 999, backgroundColor: color.raised,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.border, ...shadow.sm,
  },
  title: { fontSize: 17, fontFamily: fontFamily.bold, color: color.ink },
  sub: { fontSize: 11.5, fontFamily: fontFamily.semibold, color: color.ink3, marginTop: 1 },
  section: { fontSize: 14.5, fontFamily: fontFamily.bold, color: color.ink, marginTop: 20, marginBottom: 11 },
  rowStart: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  rowTitle: { fontSize: 13.5, fontFamily: fontFamily.bold, color: color.ink },
  hint: { fontSize: 11, fontFamily: fontFamily.semibold, color: color.ink3, marginTop: 3, lineHeight: 18 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  divider: { height: 1, backgroundColor: color.border, marginVertical: 8 },
  langRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 14 },
  langBorder: { borderBottomWidth: 1, borderBottomColor: color.border },
  techTitle: { fontSize: 12, fontFamily: fontFamily.bold, color: color.ink, marginBottom: 6 },
  tech: { fontSize: 10.5, fontFamily: fontFamily.semibold, color: color.ink3, lineHeight: 18, writingDirection: 'ltr' },
  tokenNote: { fontSize: 11, fontFamily: fontFamily.bold, color: color.br700, marginTop: 8 },
})
