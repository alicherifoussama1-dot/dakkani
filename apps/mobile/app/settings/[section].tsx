// ============================================================
// SETTINGS — notifications · security · language
// All three write to REAL stores: device_tokens (per-device push prefs),
// SecureStore (biometrics), store_settings (alert prefs, whitelisted).
// ============================================================
import React, { useCallback, useEffect, useState } from 'react'
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
import { useI18n, LOCALES, isRTLLocale, type Locale } from '../../src/i18n'

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
  // Seeded from the server row, NOT from `true`. Hard-coding the defaults
  // showed every switch as on each time the screen opened, so a merchant who
  // had muted the sound was told it was unmuted.
  const [prefs, setPrefs] = useState<Push.DevicePrefs | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [diag, setDiag] = useState<Push.PushDiagnostics | null>(null)
  const [testing, setTesting] = useState<'local' | 'server' | null>(null)

  const settings = useQuery({ queryKey: ['settings'], queryFn: () => api.settings() })

  const loadPrefs = useCallback(async () => {
    // A device with no row yet legitimately has the DB defaults.
    const stored = await Push.getPrefs().catch(() => null)
    setPrefs(stored ?? Push.DEFAULT_PREFS)
  }, [])

  useEffect(() => {
    (async () => {
      const p = await Notifications.getPermissionsAsync()
      setPerm(p.status)
      setToken(await Push.getStoredToken())
      setDiag(await Push.diagnose().catch(() => null))
      await loadPrefs()
    })()
  }, [loadPrefs])

  /** Device-side test: proves this phone rings. Never leaves the device. */
  const runLocalTest = async () => {
    setTesting('local')
    try {
      const fired = await Push.sendLocalTest(2)
      if (!fired) {
        Alert.alert('الإشعارات غير مسموحة', 'فعّل إشعارات COMMERCO من إعدادات النظام أولاً.')
        return
      }
      Alert.alert(
        'أُرسل الاختبار',
        'أقفل الشاشة الآن — سيصلك الإشعار خلال ثانيتين بنفس صوت واهتزاز الطلب الجديد.',
      )
    } catch (e: any) {
      Alert.alert('تعذّر الاختبار', e?.message ?? 'حاول مرة أخرى')
    } finally { setTesting(null) }
  }

  /** Full-chain test: server → FCM/APNs → this device. */
  const runServerTest = async () => {
    const t = token ?? await Push.getStoredToken()
    if (!t) {
      Alert.alert('الجهاز غير مُسجَّل', 'اضغط «تفعيل الإشعارات» أولاً حتى يُسجَّل هذا الجهاز.')
      return
    }
    setTesting('server')
    try {
      await api.testPush(t)
      Alert.alert(
        'أرسل الخادم الإشعار',
        'أغلق التطبيق أو أقفل الشاشة. وصوله يعني أن السلسلة كاملة تعمل: الخادم ← FCM ← جهازك.',
      )
    } catch (e: any) {
      // The route returns a specific reason; showing it verbatim is the
      // whole point — "لم يصل" would not tell the merchant what to fix.
      Alert.alert('لم يصل الإشعار', e?.message ?? 'تحقّق من الاتصال')
    } finally { setTesting(null) }
  }

  const savePrefs = useMutation({
    mutationFn: (patch: Partial<Push.DevicePrefs>) => Push.updatePrefs(patch),
    onSuccess: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
    onError: async () => {
      // Roll the switch back to what the server actually holds, so the UI
      // never claims a preference that failed to save.
      Alert.alert('تعذّر الحفظ', 'تحقّق من الاتصال')
      await loadPrefs()
    },
  })

  /** Optimistic flip + write. On failure onError re-reads the truth. */
  const setPref = (key: keyof Push.DevicePrefs, value: boolean) => {
    setPrefs(prev => ({ ...(prev ?? Push.DEFAULT_PREFS), [key]: value }))
    savePrefs.mutate({ [key]: value })
  }

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
    // A row exists now, so its stored preferences are readable.
    if (t) await loadPrefs()
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
            value={prefs?.push_enabled ?? true}
            onChange={v => setPref('push_enabled', v)} />
          <Divider />
          <Toggle label="الصوت" hint="صوت التنبيه عند وصول طلب جديد"
            value={prefs?.sound_enabled ?? true}
            onChange={v => setPref('sound_enabled', v)} />
          <Divider />
          <Toggle label="الاهتزاز" hint="نبضة مزدوجة مميّزة للطلب الجديد"
            value={prefs?.vibration_enabled ?? true}
            onChange={v => setPref('vibration_enabled', v)} />
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

      {/* ── Does it actually work? ──────────────────────────────
          Two buttons because "الإشعارات لا تعمل" has two very different
          causes, and only separating them tells the merchant what to fix. */}
      <Text style={styles.section}>اختبار الإشعارات</Text>
      <Card>
        <Text style={styles.rowTitle}>تحقّق أن الإشعارات تصلك</Text>
        <Text style={styles.hint}>
          الاختبار المحلي يثبت أن هاتفك يرنّ. اختبار الخادم يثبت أن الطلبات الجديدة
          ستصلك فعلاً حتى والتطبيق مغلق.
        </Text>

        <View style={styles.testRow}>
          <Button
            title={testing === 'local' ? '...' : 'اختبار الصوت'}
            variant="secondary"
            onPress={runLocalTest}
            disabled={testing !== null}
            style={{ flex: 1 }}
          />
          <Button
            title={testing === 'server' ? '...' : 'اختبار من الخادم'}
            onPress={runServerTest}
            disabled={testing !== null || !token}
            style={{ flex: 1 }}
          />
        </View>

        {/* Each line is a precondition that can independently be the reason
            nothing arrives, so each is reported separately. */}
        {diag ? (
          <View style={styles.diag}>
            <DiagRow label="إذن النظام" ok={diag.permission === 'granted'}
              value={diag.permission === 'granted' ? 'مسموح' : 'غير مسموح'} />
            <DiagRow label="تسجيل الجهاز" ok={diag.hasToken}
              value={diag.hasToken ? 'مُسجَّل' : 'غير مُسجَّل'} />
            <DiagRow label="قناة الطلبات" ok={diag.channelReady}
              value={diag.channelReady ? 'جاهزة' : 'غير منشأة'} />
            <DiagRow label="صوت مخصص" ok={diag.customSound}
              value={diag.customSound ? 'مُفعّل' : 'صوت النظام'} />
          </View>
        ) : null}
      </Card>

      <Card style={{ marginTop: 16 }}>
        <Text style={styles.techTitle}>البنية التقنية</Text>
        {/* Describes what this build actually does. It used to claim a custom
            sound in res/raw, but assets/sounds/new_order.wav is not in the
            repo and app.config.js drops the declaration when it is missing —
            so the channel falls back to the system sound. */}
        <Text style={styles.tech}>
          Android — قناة orders_v1 · IMPORTANCE_HIGH · اهتزاز مخصص{'\n'}
          iOS — APNs · interruption-level: time-sensitive
        </Text>
        <Text style={styles.hint}>
          صوت التنبيه هو صوت النظام الافتراضي في هذه النسخة.
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
function LanguageSettings() {
  const { locale, setLocale, t, needsRestart } = useI18n()

  const pick = async (l: Locale) => {
    if (l === locale) return
    const flips = isRTLLocale(l) !== isRTLLocale(locale)
    await setLocale(l)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    // Strings swap immediately; the writing direction is a start-time native
    // decision in React Native, so say so rather than half-flipping.
    if (flips) Alert.alert(t('settings.restartTitle'), t('settings.restartBody'))
  }

  return (
    <>
      <Text style={styles.section}>{t('settings.interfaceLanguage')}</Text>

      {/* A one-shot Alert is missed if the merchant taps through it, and the
          layout stays in the old direction until relaunch. This states the
          pending change for as long as it is pending. */}
      {needsRestart ? (
        <Card style={{ marginBottom: 12 }}>
          <View style={styles.rowStart}>
            <IconGlobe size={20} color={color.br700} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>{t('settings.restartTitle')}</Text>
              <Text style={styles.hint}>{t('settings.restartBody')}</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <Card style={{ padding: 0 }}>
        {LOCALES.map((l, i) => (
          <Pressable
            key={l.key}
            onPress={() => pick(l.key)}
            accessibilityRole="button"
            accessibilityLabel={l.label}
            accessibilityState={{ selected: l.key === locale }}
            style={[styles.langRow, i < LOCALES.length - 1 && styles.langBorder]}
          >
            <IconGlobe size={18} color={l.key === locale ? color.br700 : color.ink3} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, l.key === locale && { color: color.br700 }]}>{l.label}</Text>
              <Text style={styles.hint}>{l.sub}</Text>
            </View>
            {l.key === locale ? <IconCheck size={17} color={color.br700} /> : null}
          </Pressable>
        ))}
      </Card>
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

/** One precondition, with the state it is actually in. `ok=false` is not an
 *  error for every row — "صوت النظام" is a normal, working configuration. */
const DiagRow: React.FC<{ label: string; value: string; ok: boolean }> = ({ label, value, ok }) => (
  <View style={styles.diagRow}>
    <View style={[styles.diagDot, { backgroundColor: ok ? color.br600 : color.ink3 }]} />
    <Text style={styles.diagLabel}>{label}</Text>
    <Text style={[styles.diagValue, ok && { color: color.br700 }]}>{value}</Text>
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
  testRow: { flexDirection: 'row', gap: 9, marginTop: 12 },
  diag: { marginTop: 14, borderTopWidth: 1, borderTopColor: color.border, paddingTop: 10, gap: 7 },
  diagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  diagDot: { width: 7, height: 7, borderRadius: 4 },
  diagLabel: { flex: 1, fontSize: 11.5, fontFamily: fontFamily.semibold, color: color.ink2 },
  diagValue: { fontSize: 11.5, fontFamily: fontFamily.bold, color: color.ink3 },
  techTitle: { fontSize: 12, fontFamily: fontFamily.bold, color: color.ink, marginBottom: 6 },
  tech: { fontSize: 10.5, fontFamily: fontFamily.semibold, color: color.ink3, lineHeight: 18, writingDirection: 'ltr' },
  tokenNote: { fontSize: 11, fontFamily: fontFamily.bold, color: color.br700, marginTop: 8 },
})
