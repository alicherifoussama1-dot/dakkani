// ============================================================
// ROOT LAYOUT — providers, RTL and the native splash handoff.
//
// There is exactly one route (the shell in ./index.tsx), so this file
// carries no navigator chrome: a header or tab bar here would be app UI
// the website never asked for. It boots the shell and gets out of the way.
// ============================================================
import React, { useEffect } from 'react'
import { View, Text, StyleSheet, I18nManager } from 'react-native'
import { Stack } from 'expo-router'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import * as SplashScreen from 'expo-splash-screen'
import { color } from '../src/theme/tokens'

// Arabic-first. RTL is set NATIVELY by the expo-localization config plugin
// (forcesRTL in app.json), which lands before the first JS frame — a JS-only
// forceRTL() does not take effect until the app is restarted, so a fresh
// install would otherwise render its whole first session left-to-right.
// This stays as a fallback for Expo Go / dev clients, where the native flag
// is not applied; the guard makes it a no-op in a real build.
//
// It governs only the shell's own pixels (splash, offline screen). The site
// inside the WebView sets its own direction, as it does in any browser.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true)
  I18nManager.forceRTL(true)
}

// Held until React mounts, so the handoff to the animated splash has no
// white flash between them.
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

export default function RootLayout() {
  useEffect(() => {
    // The animated splash takes over from here; the shell drops it once the
    // site has painted.
    SplashScreen.hideAsync().catch(() => {})
  }, [])

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: color.bg },
            animation: 'none',
          }}
        />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  fallback: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: 32, gap: 10, backgroundColor: color.bg,
  },
  fallbackTitle: { fontSize: 18, fontWeight: '700', color: color.ink, textAlign: 'center' },
  fallbackBody: { fontSize: 13, lineHeight: 20, color: color.ink2, textAlign: 'center' },
  fallbackAction: {
    marginTop: 10, fontSize: 15, fontWeight: '700', color: color.brand,
    paddingVertical: 10, paddingHorizontal: 20,
  },
})
