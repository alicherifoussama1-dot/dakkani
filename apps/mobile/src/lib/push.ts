// ============================================================
// PUSH NOTIFICATIONS — FCM (Android) + APNs (iOS).
//
// Pairs with the server pipeline already built and verified:
//   orders INSERT → emit('order.created') → job_queue 'push.order'
//   → lib/push/send.ts → FCM v1 / APNs → this device.
//
// This module only OBTAINS the token and reports taps. It deliberately
// does NOT call /api/mobile/v1/devices itself: in the shell the session
// lives in the WebView's cookie jar, which React Native's fetch does not
// share. The shell registers by running the fetch inside the page, where
// the cookies already are (see registerDeviceScript in app/index.tsx).
// ============================================================
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const K_PUSH_TOKEN = 'commerco.push_token'

/** Android channels. Separate channels let merchants mute categories in OS
 *  settings (required by Play policy) and are the ONLY place a custom sound
 *  can be set on API 26+. Channels are IMMUTABLE once created — hence the
 *  _v1 suffix: changing the sound later means creating _v2. */
export const CHANNELS = {
  orders: 'orders_v1',
  abandoned: 'abandoned_v1',
  shipping: 'shipping_v1',
  system: 'system_v1',
} as const

export async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return

  await Notifications.setNotificationChannelAsync(CHANNELS.orders, {
    name: 'الطلبات الجديدة',
    description: 'تنبيه فوري عند وصول طلب جديد',
    importance: Notifications.AndroidImportance.HIGH,
    // Filename WITHOUT extension, resolved from res/raw (bundled via the
    // expo-notifications plugin `sounds` array in app.json).
    sound: 'new_order',
    vibrationPattern: [0, 250, 150, 250],
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    showBadge: true,
    enableVibrate: true,
    lightColor: '#2952E3',
  })
  await Notifications.setNotificationChannelAsync(CHANNELS.abandoned, {
    name: 'السلات المهجورة', importance: Notifications.AndroidImportance.DEFAULT, showBadge: true,
  })
  await Notifications.setNotificationChannelAsync(CHANNELS.shipping, {
    name: 'تحديثات الشحن', importance: Notifications.AndroidImportance.LOW, showBadge: false,
  })
  await Notifications.setNotificationChannelAsync(CHANNELS.system, {
    name: 'إشعارات النظام', importance: Notifications.AndroidImportance.DEFAULT,
  })
}

/** The shell shows no UI of its own, so every notification goes to the OS
 *  tray — including while the app is foregrounded. Tapping it routes the
 *  WebView, which is what the merchant expects from a website in an app. */
export function configureForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true,
    }),
  })
}

/** Ask permission. Called after the first page load rather than on cold
 *  launch — asked at boot, merchants deny and never re-enable. */
export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) return false // simulators cannot receive real pushes
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true, allowProvisional: false },
  })
  return status === 'granted'
}

/** NATIVE FCM/APNs token — NOT an Expo push token.
 *
 *  The backend (lib/push/send.ts) talks to fcm.googleapis.com/v1 and to APNs
 *  over HTTP/2 directly, so it needs the raw device token. An
 *  `ExponentPushToken[...]` would be rejected by FCM with INVALID_ARGUMENT,
 *  which the server classifies as stale and prunes — silently unregistering
 *  the device for good. getDevicePushTokenAsync() returns what FCM/APNs want.
 */
export async function getNativeToken(): Promise<string | null> {
  if (!Device.isDevice) return null
  if (!(await requestPermission())) return null
  await setupAndroidChannels()
  const t = await Notifications.getDevicePushTokenAsync()
  return typeof t?.data === 'string' && t.data ? t.data : null
}

/** Previous token, so a rotation can unregister the row it replaced —
 *  otherwise the merchant gets notified twice per order. */
export function getStoredToken() {
  return SecureStore.getItemAsync(K_PUSH_TOKEN).catch(() => null)
}

export async function storeToken(token: string) {
  try { await SecureStore.setItemAsync(K_PUSH_TOKEN, token) } catch { /* non-fatal */ }
}

/** Fires when FCM/APNs rotates the token while the app is running. */
export function onTokenRefresh(handler: (token: string) => void) {
  return Notifications.addPushTokenListener(next => {
    const token = typeof next?.data === 'string' ? next.data : null
    if (token) handler(token)
  })
}

/** Tap handling — works from background AND cold start.
 *  Returns the site-relative path the notification points at. */
export function onNotificationTap(navigate: (path: string) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener(res => {
    const p = pathFromData(res.notification.request.content.data)
    if (p) navigate(p)
  })

  // Cold start: the app was launched BY the notification, so the response
  // was delivered before any listener existed.
  Notifications.getLastNotificationResponseAsync().then(res => {
    const p = pathFromData(res?.notification.request.content.data)
    if (p) navigate(p)
  })

  return sub
}

/** The server sends `url` for anything routable and `order_id` for the
 *  order pipeline; both map onto a website path. */
function pathFromData(d: any): string | null {
  if (!d) return null
  if (typeof d.url === 'string' && d.url.startsWith('/')) return d.url
  if (d.order_id) return `/orders/${String(d.order_id)}`
  return null
}

export async function setBadge(count: number) {
  try { await Notifications.setBadgeCountAsync(Math.max(0, count)) } catch {}
}
