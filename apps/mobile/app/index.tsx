// ============================================================
// THE SHELL — the entire app.
//
// One WebView showing the production site, plus the native capabilities a
// browser tab cannot give it: splash, FCM push, deep links, camera/file
// picker, authenticated downloads, offline detection, session persistence.
//
// Deliberately absent: any UI of our own. The website is the interface.
// The only pixels drawn here are the splash and the offline screen, and
// both disappear the moment the page can show itself.
// ============================================================
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet, BackHandler, Platform, AppState } from 'react-native'
import { WebView, type WebViewNavigation } from 'react-native-webview'
import type { WebViewMessageEvent } from 'react-native-webview'
import { SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import * as FileSystem from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import NetInfo from '@react-native-community/netinfo'

import { START_URL, SITE, UA_SUFFIX, APP_VERSION, isInternal, pathFromDeepLink } from '../src/lib/site'
import {
  DOWNLOAD_INTERCEPTOR, registerDeviceScript, navigateScript, fetchFileScript,
  type BridgeMessage,
} from '../src/lib/bridge'
import * as Push from '../src/lib/push'
import LaunchAnimation from '../src/components/LaunchAnimation'
import OfflineScreen from '../src/components/OfflineScreen'
import { color } from '../src/theme/tokens'

/** Same-origin URLs that are files rather than pages. Navigating to one
 *  would leave the WebView on a blank screen, so they are downloaded
 *  through the page's session instead. */
const FILE_URL = /\.(pdf|csv|xlsx?|docx?|zip|txt)(\?|#|$)/i

export default function Shell() {
  const webRef = useRef<WebView>(null)
  const canGoBack = useRef(false)
  const registered = useRef(false)

  const [ready, setReady] = useState(false)      // first paint done → drop splash
  const [online, setOnline] = useState(true)
  const [reloadKey, setReloadKey] = useState(0)  // forces a fresh WebView after offline

  // ── Network ──────────────────────────────────────────────
  useEffect(() => {
    // `isInternetReachable` is null until probed; treat only an explicit
    // false as offline, or the app flashes the offline screen on launch.
    const sub = NetInfo.addEventListener(s => {
      setOnline(s.isConnected !== false && s.isInternetReachable !== false)
    })
    return () => sub()
  }, [])

  // ── Android hardware back → browser history ──────────────
  useEffect(() => {
    if (Platform.OS !== 'android') return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (canGoBack.current) { webRef.current?.goBack(); return true }
      return false // at the first page — let Android close the app
    })
    return () => sub.remove()
  }, [])

  const go = useCallback((path: string) => {
    webRef.current?.injectJavaScript(navigateScript(path))
  }, [])

  // ── Deep links (commerco://… and https://<site>/…) ───────
  useEffect(() => {
    Linking.getInitialURL().then(u => {
      const p = u && pathFromDeepLink(u)
      // Cold start: the WebView has not mounted yet, so hand the path to
      // the initial URL rather than injecting into a page that isn't there.
      if (p) setTimeout(() => go(p), 600)
    })
    const sub = Linking.addEventListener('url', ({ url }) => {
      const p = pathFromDeepLink(url)
      if (p) go(p)
    })
    return () => sub.remove()
  }, [go])

  // ── Push: taps route the site; the token registers in-page ───
  useEffect(() => {
    Push.configureForegroundHandler()
    const tapSub = Push.onNotificationTap(go)
    const refreshSub = Push.onTokenRefresh(() => { registered.current = false })
    return () => { tapSub.remove(); refreshSub.remove() }
  }, [go])

  /** Runs after the first page load: by then the merchant has seen the app,
   *  and if they are logged in the POST lands authenticated. */
  const registerPush = useCallback(async () => {
    if (registered.current) return
    const token = await Push.getNativeToken()
    if (!token) return
    const previous = await Push.getStoredToken()
    webRef.current?.injectJavaScript(registerDeviceScript({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      appVersion: APP_VERSION,
      previous,
    }))
    await Push.storeToken(token)
    registered.current = true
  }, [])

  // Re-assert the badge/token when the merchant returns to the app.
  useEffect(() => {
    const sub = AppState.addEventListener('change', s => {
      if (s === 'active') Push.setBadge(0)
    })
    return () => sub.remove()
  }, [])

  // ── Downloads posted up from the page ────────────────────
  const onMessage = useCallback(async (e: WebViewMessageEvent) => {
    let msg: BridgeMessage
    try { msg = JSON.parse(e.nativeEvent.data) } catch { return }
    if (msg.type !== 'download' || !msg.base64) return

    // Cache, not documents: these are the merchant's copies to open or
    // share, and the OS may reclaim them freely afterwards.
    const safe = msg.name.replace(/[^\w.\-؀-ۿ ]/g, '_') || 'download'
    const uri = `${FileSystem.cacheDirectory}${Date.now()}-${safe}`
    try {
      await FileSystem.writeAsStringAsync(uri, msg.base64, {
        encoding: FileSystem.EncodingType.Base64,
      })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: msg.mime, UTI: msg.mime })
      }
    } catch { /* the merchant can retry from the page */ }
  }, [])

  // ── Link routing ─────────────────────────────────────────
  const onShouldStart = useCallback((req: WebViewNavigation) => {
    const { url } = req
    if (!url || url === 'about:blank') return true

    // Files: fetch with the session instead of navigating to them.
    if (isInternal(url) && FILE_URL.test(url)) {
      const name = decodeURIComponent(url.split('?')[0].split('/').pop() || 'download')
      webRef.current?.injectJavaScript(fetchFileScript(url, name))
      return false
    }

    if (isInternal(url)) return true

    // tel:, mailto:, sms:, whatsapp:, intent: — hand to the OS.
    if (!/^https?:/i.test(url)) {
      Linking.openURL(url).catch(() => {})
      return false
    }

    // Anything else on the open web (payment gateways, carrier tracking)
    // opens in a browser tab so it cannot navigate away from the app.
    WebBrowser.openBrowserAsync(url).catch(() => {})
    return false
  }, [])

  const onNavChange = useCallback((nav: WebViewNavigation) => {
    canGoBack.current = nav.canGoBack
  }, [])

  const retry = useCallback(() => {
    setReloadKey(k => k + 1)
    setReady(false)
  }, [])

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {online ? (
          <WebView
            key={reloadKey}
            ref={webRef}
            source={{ uri: START_URL }}
            originWhitelist={['https://*', 'http://*']}
            applicationNameForUserAgent={UA_SUFFIX.trim()}
            // Session lives here. domStorage carries the Supabase session,
            // cookies carry the middleware's; both are persistent, so the
            // merchant stays logged in across restarts.
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            // <input type="file"> and capture= need these to reach the
            // Android file chooser and camera.
            allowFileAccess
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptCanOpenWindowsAutomatically
            setSupportMultipleWindows={false}
            injectedJavaScript={DOWNLOAD_INTERCEPTOR}
            onMessage={onMessage}
            onShouldStartLoadWithRequest={onShouldStart}
            onNavigationStateChange={onNavChange}
            onLoadEnd={() => { setReady(true); registerPush() }}
            // A failed load leaves a blank view; the offline screen is the
            // honest thing to show, and its retry remounts the WebView.
            onError={() => setReady(true)}
            onRenderProcessGone={retry}
            style={styles.web}
            containerStyle={styles.web}
            pullToRefreshEnabled={false}
            allowsBackForwardNavigationGestures
          />
        ) : (
          <OfflineScreen onRetry={retry} />
        )}
      </SafeAreaView>
      {!ready && online && <LaunchAnimation onDone={() => {}} />}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  safe: { flex: 1, backgroundColor: color.bg },
  web: { flex: 1, backgroundColor: color.bg },
})
