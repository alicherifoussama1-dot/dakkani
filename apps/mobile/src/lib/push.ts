// ============================================================
// PUSH NOTIFICATIONS — FCM (Android) + APNs (iOS).
//
// Pairs with the server pipeline already built and verified:
//   orders INSERT → emit('order.created') → job_queue 'push.order'
//   → lib/push/send.ts → FCM v1 / APNs → this device.
//
// Handles: permission, token registration + refresh, Android channels
// (custom sound), foreground vs background, tap → deep link to the order,
// badge, and duplicate suppression across multiple devices.
// ============================================================
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import * as SecureStore from 'expo-secure-store'
import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { api } from './api'

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

/** Foreground behaviour — we show our own in-app banner for orders, so we
 *  suppress the OS alert but still play the sound. */
export function configureForegroundHandler(showInApp: (data: NewOrderPayload) => void) {
  Notifications.setNotificationHandler({
    handleNotification: async (n) => {
      const data = n.request.content.data as any
      if (data?.type === 'new_order') {
        showInApp(parsePayload(data))
        // Unawaited: rejects on devices without a haptic engine.
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
        return { shouldShowAlert: false, shouldPlaySound: true, shouldSetBadge: true }
      }
      return { shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }
    },
  })
}

export interface NewOrderPayload {
  orderId: string
  orderNumber: string
  customer: string
  itemsCount: number
  total: number
  wilaya?: string
}

function parsePayload(d: any): NewOrderPayload {
  return {
    orderId: String(d.order_id ?? ''),
    orderNumber: String(d.order_number ?? ''),
    customer: String(d.customer ?? ''),
    itemsCount: Number(d.items_count ?? 0),
    total: Number(d.total ?? 0),
    wilaya: d.wilaya || undefined,
  }
}

/** Ask permission (contextually — call AFTER first successful login, never
 *  on cold launch, or merchants deny and never re-enable). */
export async function requestPermission(): Promise<boolean> {
  if (!Device.isDevice) return false // simulators cannot receive real pushes
  const { status: existing } = await Notifications.getPermissionsAsync()
  if (existing === 'granted') return true
  const { status } = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true, allowBadge: true, allowSound: true,
      // Time-sensitive breaks through Focus modes. Needs NO special Apple
      // entitlement (unlike Critical Alerts).
      allowProvisional: false,
    },
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
async function getNativeToken(): Promise<string | null> {
  const t = await Notifications.getDevicePushTokenAsync()
  return typeof t?.data === 'string' && t.data ? t.data : null
}

/** Register (or refresh) this device with the backend. Idempotent: the
 *  server upserts on `token`, so re-registering never double-notifies. */
export async function registerDevice(): Promise<string | null> {
  if (!Device.isDevice) return null
  if (!(await requestPermission())) return null

  await setupAndroidChannels()

  const token = await getNativeToken()
  if (!token) return null

  const previous = await SecureStore.getItemAsync(K_PUSH_TOKEN).catch(() => null)
  if (previous && previous !== token) {
    // Token rotated — drop the old row so the merchant isn't notified twice.
    try { await api.unregisterDevice(previous) } catch { /* best effort */ }
  }

  await api.registerDevice({
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    app_version: Constants.expoConfig?.version ?? '1.0.0',
    locale: 'ar',
  })
  await SecureStore.setItemAsync(K_PUSH_TOKEN, token)
  return token
}

/** Fires when FCM/APNs rotates the token while the app is running. */
export function onTokenRefresh() {
  return Notifications.addPushTokenListener(async (next) => {
    // Same native-token contract as registerDevice(); ignore anything else.
    const token = typeof next?.data === 'string' ? next.data : null
    if (!token) return
    try {
      const previous = await SecureStore.getItemAsync(K_PUSH_TOKEN).catch(() => null)
      if (previous === token) return
      if (previous) { try { await api.unregisterDevice(previous) } catch { /* best effort */ } }
      await api.registerDevice({
        token, platform: Platform.OS === 'ios' ? 'ios' : 'android',
        app_version: Constants.expoConfig?.version ?? '1.0.0', locale: 'ar',
      })
      await SecureStore.setItemAsync(K_PUSH_TOKEN, token)
    } catch { /* offline — re-registered on next launch */ }
  })
}

/** Tap handling — works from background AND cold start. */
export function onNotificationTap(navigateToOrder: (orderId: string) => void) {
  const sub = Notifications.addNotificationResponseReceivedListener(res => {
    const d = res.notification.request.content.data as any
    if (d?.order_id) navigateToOrder(String(d.order_id))
  })

  // Cold start: the app was launched BY the notification, so the response
  // was delivered before any listener existed.
  Notifications.getLastNotificationResponseAsync().then(res => {
    const d = res?.notification.request.content.data as any
    if (d?.order_id) navigateToOrder(String(d.order_id))
  })

  return sub
}

export async function setBadge(count: number) {
  try { await Notifications.setBadgeCountAsync(Math.max(0, count)) } catch {}
}

export async function getStoredToken() {
  return SecureStore.getItemAsync(K_PUSH_TOKEN).catch(() => null)
}

/** Per-device preferences, persisted server-side on device_tokens. */
export async function updatePrefs(prefs: {
  push_enabled?: boolean; sound_enabled?: boolean; vibration_enabled?: boolean
}) {
  const token = await getStoredToken()
  if (!token) return
  await api.updateDevicePrefs({ token, ...prefs })
}
