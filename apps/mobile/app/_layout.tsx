// ============================================================
// ROOT LAYOUT — providers, RTL, launch animation, auth gate,
// push wiring and deep links. Everything boots from here.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, I18nManager, Platform, AppState } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import * as Linking from 'expo-linking'
import { color } from '../src/theme/tokens'
import LaunchAnimation from '../src/components/LaunchAnimation'
import { initAuth, getSession, restoreActiveStore, setActiveStore, unlockWithBiometrics } from '../src/lib/auth'
import { api } from '../src/lib/api'
import * as Push from '../src/lib/push'
import { OrderAlertHost, showOrderAlert } from '../src/components/OrderAlert'

// Arabic-first. RTL is set NATIVELY by the expo-localization config plugin
// (forcesRTL in app.json), which lands before the first JS frame — a JS-only
// forceRTL() does not take effect until the app is restarted, so a fresh
// install would otherwise render its whole first session left-to-right.
// This stays as a fallback for Expo Go / dev clients, where the native flag
// is not applied; the guard makes it a no-op in a real build.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true)
  I18nManager.forceRTL(true)
}

SplashScreen.preventAutoHideAsync().catch(() => {})

/** Expo Router picks this up automatically. Without it an unexpected render
 *  error is a hard crash in a release build (no red box to fall back on). */
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={styles.fallback}>
      <Text style={styles.fallbackTitle}>حدث خطأ غير متوقع</Text>
      <Text style={styles.fallbackBody} numberOfLines={4}>{error?.message ?? ''}</Text>
      <Text
        style={styles.fallbackAction}
        accessibilityRole="button"
        accessibilityLabel="إعادة المحاولة"
        onPress={() => { SplashScreen.hideAsync().catch(() => {}); retry() }}
      >
        إعادة المحاولة
      </Text>
    </View>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale-while-revalidate: screens paint from cache instantly on 3G,
      // then refresh in the background.
      staleTime: 30_000,
      gcTime: 30 * 60_000,
      retry: (count, err: any) => (err?.status === 401 ? false : count < 2),
      refetchOnWindowFocus: false,
    },
  },
})

export default function RootLayout() {
  const router = useRouter()
  const [phase, setPhase] = useState<'launch' | 'app'>('launch')
  const [authed, setAuthed] = useState<boolean | null>(null)
  const pushSubs = useRef<Array<{ remove: () => void }>>([])

  // Cold start ordering: a notification tap or deep link resolves BEFORE the
  // auth gate has run router.replace('/(tabs)'), and that replace would wipe
  // the order screen. Queue the target until the shell is on screen, then go.
  const navReady = useRef(false)
  const pendingOrder = useRef<string | null>(null)

  const onLaunchDone = useCallback(() => setPhase('app'), [])

  const goToOrder = useCallback((orderId: string) => {
    if (!orderId) return
    if (!navReady.current) { pendingOrder.current = orderId; return }
    router.push(`/orders/${orderId}`)
  }, [router])

  // ── boot ──
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // Every step is inside this try: an unhandled rejection here would
      // leave the splash screen up forever with no way to recover.
      try {
        initAuth({ onUnauthorized: () => { if (!cancelled) setAuthed(false) } })
        await restoreActiveStore()

        const session = await getSession()
        if (cancelled) return
        if (!session) { setAuthed(false); return }

        // Biometric gate on app open (no-op when the merchant hasn't enabled it).
        const unlocked = await unlockWithBiometrics()
        if (cancelled) return
        if (!unlocked) { setAuthed(false); return }

        // Resolve the active store BEFORE any screen queries fire.
        try {
          const boot = await api.bootstrap()
          setActiveStore(boot.store.id)
          Push.setBadge(boot.counters.newOrders)
        } catch { /* offline — cached store id from SecureStore still applies */ }

        if (!cancelled) setAuthed(true)
      } catch {
        // Storage unreadable, clock skew, malformed session… send them to login
        // rather than stranding the app on the splash screen.
        if (!cancelled) setAuthed(false)
      } finally {
        await SplashScreen.hideAsync().catch(() => {})
      }
    })()
    return () => { cancelled = true }
  }, [])

  // ── push: only after we know who the merchant is ──
  useEffect(() => {
    if (authed !== true) return
    Push.configureForegroundHandler(p => showOrderAlert(p, () => goToOrder(p.orderId)))
    Push.registerDevice().catch(() => {})
    pushSubs.current = [
      Push.onNotificationTap(goToOrder),
      Push.onTokenRefresh(),
    ]
    return () => { pushSubs.current.forEach(s => s?.remove?.()); pushSubs.current = [] }
  }, [authed, goToOrder])

  // ── deep links while running: commerco://orders/<uuid> ──
  useEffect(() => {
    const sub = Linking.addEventListener('url', ({ url }) => {
      const m = url.match(/orders\/([0-9a-f-]{36})/i)
      if (m?.[1]) goToOrder(m[1])
    })
    Linking.getInitialURL().then(url => {
      const m = url?.match(/orders\/([0-9a-f-]{36})/i)
      if (m?.[1]) goToOrder(m[1])
    })
    return () => sub.remove()
  }, [goToOrder])

  // Refresh the badge when returning to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active' && authed) {
        api.bootstrap().then(b => Push.setBadge(b.counters.newOrders)).catch(() => {})
      }
    })
    return () => sub.remove()
  }, [authed])

  // Route once both the animation finished AND auth resolved.
  useEffect(() => {
    if (phase !== 'app' || authed === null) return
    router.replace(authed ? '/(tabs)' : '/login')

    // The shell is mounted now, so deferred deep links are safe to follow.
    // Only signed-in merchants may land on an order.
    if (!authed) { navReady.current = false; pendingOrder.current = null; return }
    navReady.current = true
    const queued = pendingOrder.current
    if (queued) {
      pendingOrder.current = null
      router.push(`/orders/${queued}`)
    }
  }, [phase, authed, router])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <StatusBar style="dark" backgroundColor={color.bg} />
          <View style={styles.root}>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: color.bg },
                // Native push semantics; RN flips direction automatically in RTL.
                animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
              }}
            />
            <OrderAlertHost />
            {phase === 'launch' && <LaunchAnimation onDone={onLaunchDone} />}
          </View>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: color.bg, gap: 12 },
  fallbackTitle: { fontSize: 18, fontWeight: '700', color: color.ink, textAlign: 'center' },
  fallbackBody: { fontSize: 13, color: color.ink2, textAlign: 'center' },
  fallbackAction: { fontSize: 15, fontWeight: '700', color: color.br600, paddingVertical: 12, paddingHorizontal: 24 },
})
