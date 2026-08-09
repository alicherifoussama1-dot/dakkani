// ============================================================
// LOGIN — real Supabase auth via the secure-store session.
// Offers biometric unlock when the merchant has already signed in once.
//
// Layout is the website's .auth-shell / .auth-card at mobile width: the
// .auth-brand panel is desktop-only (min-width: 1024px), so the phone
// shows the card alone, centred, exactly as the site does.
// ============================================================
import React, { useEffect, useState } from 'react'
import {
  View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Pressable, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { useQueryClient } from '@tanstack/react-query'
import { Eye, EyeOff } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { LOGO_PRIMARY_XML } from '../src/assets/logo'
import { Button, Field, Input } from '../src/components/ui'
import { color, space, radius, shadow, text, control, error as errorScale } from '../src/theme/tokens'
import {
  signIn, setActiveStore, biometricAvailable, isBiometricEnabled,
  unlockWithBiometrics, getSession, setBiometricEnabled, notifySignedIn,
} from '../src/lib/auth'
import { api } from '../src/lib/api'
import * as Push from '../src/lib/push'

export default function Login() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [reveal, setReveal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [canBio, setCanBio] = useState(false)

  useEffect(() => {
    (async () => {
      const [hw, enabled, session] = await Promise.all([
        biometricAvailable(), isBiometricEnabled(), getSession(),
      ])
      setCanBio(hw && enabled && !!session)
    })()
  }, [])

  const finish = async () => {
    // Resolve the store BEFORE navigating, so the dashboard's first query
    // already has the right X-Commerco-Store header. Best-effort only: the
    // sign-in has already succeeded at this point, so a failed bootstrap
    // (offline, slow 3G) must NOT strand the merchant on the login screen.
    // The dashboard re-fetches and shows its own offline state.
    try {
      const boot = await api.bootstrap()
      setActiveStore(boot.store.id)
      qc.setQueryData(['bootstrap'], boot)
    } catch { /* offline — restoreActiveStore() supplies the cached store id */ }
    // Tell the root layout the session is live. Raised HERE, after the store
    // is resolved, so the wiring it turns on (push handlers, deep links, the
    // badge) never runs against a missing X-Commerco-Store header.
    notifySignedIn()
    // Permission is requested HERE (contextually), never on cold launch.
    Push.registerDevice().catch(() => {})
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    router.replace('/(tabs)')
  }

  const submit = async () => {
    setErr('')
    if (!email.trim() || !password) { setErr('أدخل البريد الإلكتروني وكلمة المرور'); return }
    setBusy(true)
    try {
      await signIn(email, password)
      // Offer biometrics once, right after the first successful password login.
      if (await biometricAvailable()) {
        Alert.alert('تسجيل دخول أسرع', 'هل تريد استخدام البصمة أو بصمة الوجه في المرة القادمة؟', [
          { text: 'لاحقاً', style: 'cancel' },
          { text: 'تمكين', onPress: () => setBiometricEnabled(true) },
        ])
      }
      await finish()
    } catch (e) {
      setErr((e as Error).message)
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {})
    } finally {
      setBusy(false)
    }
  }

  const bio = async () => {
    setBusy(true)
    try {
      if (await unlockWithBiometrics()) await finish()
    } catch (e) {
      setErr((e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          // .auth-main padding, plus the notch and gesture bar.
          { paddingTop: insets.top + space[12], paddingBottom: insets.bottom + space[12] },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* .auth-card */}
        <View style={styles.card}>
          {/* .auth-mark — shown below 1024px, which is every phone */}
          <View style={styles.mark}>
            <SvgXml xml={LOGO_PRIMARY_XML} width={186} height={32} />
          </View>

          <Text style={styles.title}>أهلاً بعودتك</Text>
          <Text style={styles.sub}>سجّل الدخول لإدارة متجرك</Text>

          {/* .auth-form { display: grid; gap: var(--space-5) } */}
          <View style={styles.form}>
            <Field label="البريد الإلكتروني">
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                // autoComplete is what Android password managers key off.
                autoComplete="email"
                accessibilityLabel="البريد الإلكتروني"
                editable={!busy}
                returnKeyType="next"
                invalid={!!err}
                // .auth-form .c-input { block-size: control-h-lg }
                style={styles.tallInput}
              />
            </Field>

            <Field label="كلمة المرور">
              {/* .auth-input-wrap — trailing 34px reveal button */}
              <View style={styles.inputWrap}>
                <Input
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  secureTextEntry={!reveal}
                  textContentType="password"
                  autoComplete="password"
                  accessibilityLabel="كلمة المرور"
                  editable={!busy}
                  onSubmitEditing={submit}
                  returnKeyType="go"
                  invalid={!!err}
                  style={[styles.tallInput, styles.inputWithButton]}
                />
                <Pressable
                  onPress={() => setReveal(r => !r)}
                  accessibilityRole="button"
                  accessibilityLabel={reveal ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                  style={styles.inputBtn}
                >
                  {reveal
                    ? <EyeOff size={18} color={color.ink3} strokeWidth={1.8} />
                    : <Eye size={18} color={color.ink3} strokeWidth={1.8} />}
                </Pressable>
              </View>
            </Field>

            {err ? (
              // liveRegion makes the screen reader announce the failure instead of
              // leaving a blind merchant with a silently unchanged screen.
              <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
                {err}
              </Text>
            ) : null}

            {/* .auth-form .c-btn--primary { block-size: control-h-lg } */}
            <Button title="تسجيل الدخول" onPress={submit} loading={busy} size="lg" fullWidth />

            {canBio ? (
              <Button title="الدخول بالبصمة" variant="secondary" size="lg" onPress={bio} fullWidth />
            ) : null}
          </View>

          {/* .auth-foot */}
          <Pressable
            style={styles.foot}
            accessibilityRole="button"
            onPress={() => Alert.alert(
              'استعادة كلمة المرور',
              'استخدم صفحة استعادة كلمة المرور على موقع COMMERCO.',
            )}
          >
            <Text style={styles.link}>نسيت كلمة المرور؟</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.page },
  // .auth-main { padding: space-12 space-6 } + margin:auto centring
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: space[6] },
  // .auth-card
  card: {
    width: '100%', maxWidth: 440, alignSelf: 'center',
    backgroundColor: color.raised,
    borderWidth: 1, borderColor: color.border,
    borderRadius: radius.xl,
    paddingVertical: space[8], paddingHorizontal: space[6],
    ...shadow.lg,
  },
  mark: { flexDirection: 'row', alignItems: 'center', gap: space[2], marginBottom: space[6] },
  title: { ...text('2xl', 'bold'), color: color.ink, marginBottom: space[1] },
  sub: { ...text('base'), color: color.ink2, marginBottom: space[8], lineHeight: 22 },
  form: { gap: space[5] },
  tallInput: { height: control.height.lg, fontSize: control.fontSize.lg },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  // .auth-input-wrap .c-input { padding-inline-end: 42px }
  inputWithButton: { paddingEnd: 42 },
  inputBtn: {
    position: 'absolute', end: 6,
    width: 34, height: 34, borderRadius: radius.sm,
    alignItems: 'center', justifyContent: 'center',
  },
  error: { ...text('sm', 'medium'), color: errorScale[600], textAlign: 'center' },
  foot: { marginTop: space[6], alignItems: 'center' },
  link: { ...text('sm', 'medium'), color: color.link },
})
