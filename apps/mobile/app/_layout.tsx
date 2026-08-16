// ============================================================
// ROOT LAYOUT — providers, RTL, launch animation, auth gate,
// push wiring and deep links. Everything boots from here.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, StyleSheet, Platform, AppState } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import * as SplashScreen from 'expo-splash-screen'
import * as Linking from 'expo-linking'
import NetInfo from '@react-native-community/netinfo'
import { color, space, text } from '../src/theme/tokens'
import { useAppFonts } from '../src/theme/fonts'
import LaunchAnimation from '../src/components/LaunchAnimation'
import OfflineScreen from '../src/components/OfflineScreen'
import { I18nProvider } from '../src/i18n'
import {
  initAuth, getSession, restoreActiveStore, setActiveStore, unlockWithBiometrics, onSessionChange,
} from '../src/lib/auth'
import { api } from '../src/lib/api'
import * as Push from '../src/lib/push'
import { startOrderWatch, stopOrderWatch } from '../src/lib/order-watch'
// Imported for its side effect: defineTask must run before React mounts.
import { registerBackgroundOrderCheck } from '../src/lib/order-watch-task'
import { OrderAlertHost, showOrderAlert } from '../src/components/OrderAlert'

// Layout direction is owned ENTIRELY by src/i18n, which applies the stored
// locale's direction on every launch. It used to be forced to RTL here too:
// app.json sets forcesRTL:false, so this block ran on any launch that was
// LTR — which is exactly the launch after a merchant chose French — and put
// the app back into RTL behind their back. Do not reintroduce it.

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
  const [online, setOnline] = useState<boolean | null>(null)
  const pushSubs = useRef<Array<{ remove: () => void }>>([])
  const fontsReady = useAppFonts()

  // `isInternetReachable` is null until probed; only an explicit false is
  // offline, or the app flashes the notice on every cold launch.
  useEffect(() => {
    const sub = NetInfo.addEventListener(s => {
      setOnline(s.isConnected !== false && s.isInternetReachable !== false)
    })
    return () => sub()
  }, [])

  const retryConnection = useCallback(() => {
    NetInfo.refresh().then(s => {
      const up = s.isConnected !== false && s.isInternetReachable !== false
      setOnline(up)
      // Screens hold stale data while offline; a refetch is what makes the
      // retry meaningful rather than just dismissing the notice.
      if (up) queryClient.invalidateQueries()
    })
  }, [])

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

  // Sign-in and sign-out AFTER boot. Without this the layout kept the value
  // it resolved at launch, so a merchant who signed in during this session
  // got no push wiring, no notification-tap navigation and a frozen badge
  // until the next cold start — and one who signed out kept all three.
  useEffect(() => onSessionChange(signedIn => setAuthed(signedIn)), [])

  // ── push: only after we know who the merchant is ──
  useEffect(() => {
    if (authed !== true) return
    Push.configureForegroundHandler(p => showOrderAlert(p, () => goToOrder(p.orderId)))
    pushSubs.current = [
      Push.onNotificationTap(goToOrder),
      Push.onTokenRefresh(),
    ]

    // Whether this build can receive push is not a guess — registerDevice()
    // returns a token or it does not. On iOS signed with a free Apple ID it
    // cannot: Apple issues the aps-environment entitlement only to paid
    // memberships, so APNs is closed to the build and no token comes back.
    //
    // That failure is the signal. When there is no push, fall back to polling
    // plus local notifications; when there is, stay off so the merchant never
    // gets the same order announced twice. Nothing to configure, and it
    // corrects itself the day a paid account starts issuing tokens.
    let watching = false
    Push.registerDevice()
      .then(token => {
        if (!token && Platform.OS === 'ios') {
          watching = true
          startOrderWatch()
          registerBackgroundOrderCheck()
        }
      })
      .catch(() => {
        if (Platform.OS === 'ios') { watching = true; startOrderWatch() }
      })

    return () => {
      pushSubs.current.forEach(s => s?.remove?.()); pushSubs.current = []
      if (watching) stopOrderWatch()
    }
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
        {/* MUST wrap the tree: the provider was imported and never rendered,
            so every useT()/useI18n() resolved to the default context — whose
            setLocale is a no-op. The language picker appeared to work and
            persisted nothing. */}
        <I18nProvider>
          <QueryClientProvider client={queryClient}>
            <StatusBar style="dark" backgroundColor={color.page} />
            <View style={styles.root}>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: { backgroundColor: color.page },
                  // Native push semantics; RN flips direction automatically in RTL.
                  animation: Platform.OS === 'ios' ? 'default' : 'slide_from_right',
                }}
              />
              <OrderAlertHost />
              {/* Connectivity is app-wide: a screen that cannot reach the API has
                  nothing useful to render, so the notice sits above the stack
                  rather than being repeated per screen. */}
              {online === false && <OfflineScreen onRetry={retryConnection} />}
              {/* Fonts gate the splash: swapping the family mid-session would
                  reflow every screen the merchant is already reading. */}
              {(phase === 'launch' || !fontsReady) && <LaunchAnimation onDone={onLaunchDone} />}
            </View>
          </QueryClientProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.page },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space[6], backgroundColor: color.page, gap: space[3] },
  fallbackTitle: { ...text('lg', 'bold'), color: color.ink, textAlign: 'center' },
  fallbackBody: { ...text('sm'), color: color.ink2, textAlign: 'center' },
  fallbackAction: { ...text('md', 'bold'), color: color.primary, paddingVertical: space[3], paddingHorizontal: space[6] },
})
