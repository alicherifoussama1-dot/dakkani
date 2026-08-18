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
/** Written by src/i18n. Read here (not imported) so this module stays free
 *  of React context — it runs from listeners outside the tree. */
const K_LOCALE = 'commerco.locale'

/** The merchant's chosen interface language, for the push payload. It used
 *  to be hard-coded to 'ar', so a merchant who switched to French kept
 *  receiving Arabic notifications. */
async function currentLocale(): Promise<string> {
  const saved = await SecureStore.getItemAsync(K_LOCALE).catch(() => null)
  return saved === 'fr' || saved === 'en' || saved === 'ar' ? saved : 'ar'
}

/** Android channels. Separate channels let merchants mute categories in OS
 *  settings (required by Play policy) and are the ONLY place a custom sound
 *  can be set on API 26+. Channels are IMMUTABLE once created — hence the
 *  _v1 suffix: changing the sound later means creating _v2. */
export const CHANNELS = {
  // _v2 because the cash-register sound was added AFTER v1 shipped. An
  // Android channel is immutable once created: re-declaring orders_v1 with a
  // sound is silently ignored on every device that already has it, so every
  // existing install would have kept the default chime forever. Bumping the
  // id is the only way the new sound reaches them.
  orders: 'orders_v2',
  abandoned: 'abandoned_v1',
  shipping: 'shipping_v1',
  system: 'system_v1',
} as const

/** Channel ids this app has retired. Deleted on setup so a merchant does not
 *  find two "الطلبات الجديدة" entries in Android's notification settings,
 *  one of them dead. */
const RETIRED_CHANNELS = ['orders_v1'] as const

export async function setupAndroidChannels() {
  if (Platform.OS !== 'android') return

  // Drop superseded channels first, so the merchant sees one orders channel.
  for (const old of RETIRED_CHANNELS) {
    await Notifications.deleteNotificationChannelAsync(old).catch(() => {})
  }

  await Notifications.setNotificationChannelAsync(CHANNELS.orders, {
    name: 'الطلبات الجديدة',
    description: 'صوت الصندوق عند وصول طلب جديد',
    importance: Notifications.AndroidImportance.HIGH,
    // Filename WITHOUT extension, resolved from res/raw. The asset is
    // assets/sounds/new_order.wav, bundled by the expo-notifications plugin
    // — app.config.js only declares it once the file exists, which is why it
    // was silently absent before.
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
        return { shouldShowBanner: false, shouldShowList: false, shouldShowAlert: false, shouldPlaySound: true, shouldSetBadge: true }
      }
      return { shouldShowBanner: true, shouldShowList: true, shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }
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

/** True when this JS is running inside the Expo Go app rather than our own
 *  build. Constants.appOwnership is 'expo' only there. */
export const IS_EXPO_GO = Constants.appOwnership === 'expo'

/** The push token this build should register.
 *
 *  In our OWN builds this must be the NATIVE FCM/APNs token: the backend
 *  talks to fcm.googleapis.com/v1 and to APNs over HTTP/2 directly. An
 *  `ExponentPushToken[...]` would be rejected by FCM with INVALID_ARGUMENT,
 *  which the server classifies as stale and prunes — silently unregistering
 *  the device for good.
 *
 *  In Expo Go the opposite is true, and it is the whole reason iPhone works
 *  without an Apple Developer membership. The native token there belongs to
 *  the Expo Go container, and we hold no credential that can push to it.
 *  getExpoPushTokenAsync() instead registers with Expo's push service, which
 *  delivers using EXPO's Apple credentials. The server routes on the token's
 *  shape, so both kinds coexist.
 */
async function getPushToken(): Promise<string | null> {
  if (IS_EXPO_GO) {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId
    if (!projectId) return null // cannot address Expo's service without it
    const t = await Notifications.getExpoPushTokenAsync({ projectId })
    return typeof t?.data === 'string' && t.data ? t.data : null
  }
  const t = await Notifications.getDevicePushTokenAsync()
  return typeof t?.data === 'string' && t.data ? t.data : null
}

/** Register (or refresh) this device with the backend. Idempotent: the
 *  server upserts on `token`, so re-registering never double-notifies. */
export async function registerDevice(): Promise<string | null> {
  if (!Device.isDevice) return null
  if (!(await requestPermission())) return null

  await setupAndroidChannels()

  const token = await getPushToken()
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
    locale: await currentLocale(),
  })
  await SecureStore.setItemAsync(K_PUSH_TOKEN, token)
  return token
}

/** Fires when FCM/APNs rotates the token while the app is running.
 *
 *  Not wired in Expo Go: this listener reports the NATIVE token, which there
 *  belongs to the Expo Go container. Registering it would replace the working
 *  ExponentPushToken with one nothing can push to, and the merchant would go
 *  silent. Expo's token is stable for the install, and registerDevice()
 *  refreshes it on every launch anyway. */
export function onTokenRefresh() {
  if (IS_EXPO_GO) return { remove: () => {} }
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
        app_version: Constants.expoConfig?.version ?? '1.0.0', locale: await currentLocale(),
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

// ── Diagnostics ─────────────────────────────────────────────
// "Are notifications working?" is three separate questions, and a merchant
// needs to be able to answer them without waiting for a real order:
//   1. does this DEVICE ring?          → sendLocalTest()
//   2. is this device REGISTERED?      → diagnose()
//   3. does the SERVER reach it?       → api.testPush() (real FCM/APNs)
// A local test proves 1 only; it never leaves the phone. Passing it while
// the real push fails means the problem is the server or the token, not the
// phone — which is exactly the distinction that makes this worth having.

export interface PushDiagnostics {
  /** OS-level permission: 'granted' | 'denied' | 'undetermined'. */
  permission: string
  /** A native FCM/APNs token is stored on this device. */
  hasToken: boolean
  /** The Android channel carrying the order sound exists. */
  channelReady: boolean
  /** Whether this build rings with the cash-register sound. */
  customSound: boolean
}

export async function diagnose(): Promise<PushDiagnostics> {
  const perm = await Notifications.getPermissionsAsync().catch(() => null)
  const token = await getStoredToken()

  let channelReady = false
  let customSound = false
  if (Platform.OS === 'android') {
    const ch = await Notifications.getNotificationChannelAsync(CHANNELS.orders).catch(() => null)
    channelReady = !!ch
    // The channel reports the sound it was CREATED with. Channels are
    // immutable, so this is the truth for this install regardless of what
    // app.json says today.
    customSound = !!ch?.sound && ch.sound !== 'default' && ch.sound !== null
  } else {
    channelReady = true // iOS has no channels
    // iOS gives no API to inspect a bundled sound, and unlike an Android
    // channel there is no per-install state that could disagree with the
    // build: the .wav is either compiled into the bundle or it is not.
    // Our own build ships it; Expo Go cannot, because the file would have to
    // be inside Expo Go's bundle rather than ours. There it rings with the
    // system sound — audible, just not the cash register.
    customSound = !IS_EXPO_GO
  }

  return {
    permission: perm?.status ?? 'undetermined',
    hasToken: !!token,
    channelReady,
    customSound,
  }
}

/**
 * Fire a notification from the device itself, through the REAL orders
 * channel — same importance, same sound, same vibration pattern a new order
 * uses. Delayed a couple of seconds so the merchant can lock the screen and
 * see it arrive the way it actually arrives.
 *
 * `type: 'test'` on purpose: the foreground handler suppresses the OS banner
 * for `new_order` (it draws the in-app card instead), and a test that shows
 * nothing would look like a failure. It also keeps the tap handler from
 * navigating to an order id that does not exist.
 */
export async function sendLocalTest(delaySeconds = 2): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync()
  if (status !== 'granted') return false

  // The channel is created on registration; a merchant testing before ever
  // registering would otherwise get a silent default-channel notification.
  await setupAndroidChannels()

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🔔 اختبار الإشعارات',
      body: 'إذا سمعت هذا الصوت وشعرت بالاهتزاز، فإشعارات هذا الجهاز تعمل.',
      sound: true,
      data: { type: 'test' },
      ...(Platform.OS === 'android' ? { vibrate: [0, 250, 150, 250] } : {}),
    },
    trigger: Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds, channelId: CHANNELS.orders }
      : { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: delaySeconds },
  })
  return true
}

export async function getStoredToken() {
  return SecureStore.getItemAsync(K_PUSH_TOKEN).catch(() => null)
}

export interface DevicePrefs {
  push_enabled: boolean; sound_enabled: boolean; vibration_enabled: boolean
}

/** The DB defaults, used only when this device has no row yet. */
export const DEFAULT_PREFS: DevicePrefs = {
  push_enabled: true, sound_enabled: true, vibration_enabled: true,
}

/** Per-device preferences, persisted server-side on device_tokens. */
export async function updatePrefs(prefs: Partial<DevicePrefs>) {
  const token = await getStoredToken()
  if (!token) return
  await api.updateDevicePrefs({ token, ...prefs })
}

/** Read this device's persisted preferences. `null` when the device is not
 *  registered, so the caller can tell "no row yet" from "all enabled". */
export async function getPrefs(): Promise<DevicePrefs | null> {
  const token = await getStoredToken()
  if (!token) return null
  const res = await api.devicePrefs(token)
  return res.prefs ?? null
}
