// ============================================================
// LOGIN — real Supabase auth via the secure-store session.
// Offers biometric unlock when the merchant has already signed in once.
// ============================================================
import React, { useEffect, useState } from 'react'
import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform,
  ScrollView, Pressable, Alert,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { SvgXml } from 'react-native-svg'
import { useQueryClient } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'
import { LOGO_PRIMARY_XML } from '../src/assets/logo'
import { Button } from '../src/components/ui'
import { color, radius, shadow, font } from '../src/theme/tokens'
import {
  signIn, setActiveStore, biometricAvailable, isBiometricEnabled,
  unlockWithBiometrics, getSession, setBiometricEnabled,
} from '../src/lib/auth'
import { api } from '../src/lib/api'
import * as Push from '../src/lib/push'

export default function Login() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const qc = useQueryClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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
    // Permission is requested HERE (contextually), never on cold launch.
    Push.registerDevice().catch(() => {})
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    router.replace('/(tabs)')
  }

  const submit = async () => {
    setError('')
    if (!email.trim() || !password) { setError('أدخل البريد الإلكتروني وكلمة المرور'); return }
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
      setError((e as Error).message)
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
      setError((e as Error).message)
    } finally { setBusy(false) }
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.center,
          // Keeps the form clear of the notch and the gesture bar when the
          // keyboard shrinks the viewport on small devices.
          { paddingTop: insets.top + 30, paddingBottom: insets.bottom + 30 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <SvgXml xml={LOGO_PRIMARY_XML} width={210} height={36} />
        <Text style={styles.title}>أهلاً بعودتك</Text>
        <Text style={styles.sub}>سجّل الدخول لإدارة متجرك</Text>

        <TextInput
          value={email} onChangeText={setEmail}
          placeholder="البريد الإلكتروني" placeholderTextColor={color.ink3}
          autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
          textContentType="emailAddress" style={styles.input}
          // autoComplete is what Android password managers key off.
          autoComplete="email"
          accessibilityLabel="البريد الإلكتروني"
          editable={!busy}
          returnKeyType="next"
        />
        <TextInput
          value={password} onChangeText={setPassword}
          placeholder="كلمة المرور" placeholderTextColor={color.ink3}
          secureTextEntry textContentType="password" style={styles.input}
          onSubmitEditing={submit} returnKeyType="go"
          autoComplete="password"
          accessibilityLabel="كلمة المرور"
          editable={!busy}
        />

        {error ? (
          // liveRegion makes the screen reader announce the failure instead of
          // leaving a blind merchant with a silently unchanged screen.
          <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
            {error}
          </Text>
        ) : null}

        <Button title="تسجيل الدخول" onPress={submit} loading={busy} style={{ marginTop: 6, width: '100%' }} />

        {canBio && (
          <Button title="الدخول بالبصمة" variant="glass" onPress={bio}
            style={{ marginTop: 10, width: '100%' }} />
        )}

        <Pressable style={{ marginTop: 22 }} onPress={() =>
          Alert.alert('استعادة كلمة المرور', 'استخدم صفحة استعادة كلمة المرور على موقع COMMERCO.')}>
          <Text style={styles.link}>نسيت كلمة المرور؟</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  center: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  title: { fontSize: 23, fontWeight: '800', color: color.ink, marginTop: 24 },
  sub: { fontSize: font.label, fontWeight: '700', color: color.ink3, marginTop: 4, marginBottom: 26 },
  input: {
    width: '100%', paddingHorizontal: 16, paddingVertical: 15, marginBottom: 11,
    borderRadius: radius.md, fontSize: 14, color: color.ink,
    backgroundColor: color.white, borderWidth: 1, borderColor: color.hairline, ...shadow.xs,
  },
  error: { color: '#B91C1C', fontSize: 12.5, fontWeight: '700', marginBottom: 10, textAlign: 'center' },
  link: { color: color.ink3, fontSize: font.label, fontWeight: '700' },
})
