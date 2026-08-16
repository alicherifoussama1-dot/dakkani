// ============================================================
// ORDER WATCH — new-order alerts WITHOUT push notifications.
//
// A standalone iOS build signed with a free Apple ID cannot receive remote
// push: the aps-environment entitlement is only issued to paid Apple
// Developer memberships, so APNs is closed to this build entirely. This is
// the honest best that remains — poll while the app is running, and raise a
// LOCAL notification, which needs no entitlement and does ring with our own
// bundled cash-register sound.
//
// It is deliberately NOT a general replacement for push:
//   · foreground        → works, within one poll interval
//   · backgrounded      → only when iOS grants a background refresh, which it
//                         schedules on its own judgement and often skips
//   · force-quit        → nothing at all. iOS runs no code in an app the user
//                         swiped away, and only a remote push can wake it.
//
// Android never runs any of this. It has real FCM push, and polling there
// would burn battery to deliver something it already gets instantly.
// ============================================================
import * as Notifications from 'expo-notifications'
import * as SecureStore from 'expo-secure-store'
import { AppState, Platform, type AppStateStatus } from 'react-native'
import { api } from './api'
import { CHANNELS } from './push'

/** Watermark: the created_at of the newest order already announced. Stored
 *  rather than held in memory so a relaunch does not re-announce yesterday's
 *  orders — the duplicate-suppression the merchant actually notices. */
const K_WATERMARK = 'commerco.orders_watermark'

/** 45s. A merchant wants to know quickly, but this runs only while the app is
 *  open and foregrounded, so the ceiling is ~80 small requests an hour and
 *  zero when the phone is in their pocket. Anything faster spends battery to
 *  shave seconds off a number that is already bounded by iOS itself. */
const POLL_MS = 45_000

export interface WatchedOrder {
  id: string
  orderNumber: string
  customerName: string
  total: number
  createdAt: string
}

let timer: ReturnType<typeof setInterval> | null = null
let appStateSub: { remove: () => void } | null = null
let running = false

async function getWatermark(): Promise<string | null> {
  return SecureStore.getItemAsync(K_WATERMARK).catch(() => null)
}
async function setWatermark(iso: string) {
  await SecureStore.setItemAsync(K_WATERMARK, iso).catch(() => {})
}

/** Raise the alert for one order. Uses the same channel and sound a real push
 *  would, so the merchant cannot tell the difference by ear. */
async function announce(o: WatchedOrder) {
  const money = new Intl.NumberFormat('ar-DZ').format(Math.round(o.total))
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔔 طلب جديد · ${money} دج`,
      body: `الاسم: ${o.customerName}\nرقم الطلب: ${o.orderNumber}`,
      // Our own build bundles new_order.wav, so unlike Expo Go this really is
      // the cash register. iOS still obeys Silent Mode and Focus.
      sound: Platform.OS === 'ios' ? 'new_order.wav' : true,
      badge: undefined,
      // Same shape the push payload uses, so the tap handler in push.ts
      // navigates identically whichever path produced the notification.
      data: { type: 'new_order', order_id: o.id, order_number: o.orderNumber },
      ...(Platform.OS === 'android' ? { vibrate: [0, 250, 150, 250] } : {}),
    },
    trigger: Platform.OS === 'android' ? { channelId: CHANNELS.orders, seconds: 1 } : null,
  })
}

/**
 * One pass: fetch the newest orders, announce anything past the watermark.
 * Exported so the background task can run exactly the same logic.
 *
 * Returns how many alerts were raised — the background task uses it to tell
 * iOS whether the wake-up was worth granting, which affects how generously it
 * schedules the next one.
 */
export async function checkForNewOrders(): Promise<number> {
  const res = await api.orders({ status: 'new', limit: 10 })
  const orders = res.orders ?? []
  if (orders.length === 0) return 0

  // The API returns newest first; sort defensively so the watermark advances
  // monotonically even if that ever changes.
  const sorted = [...orders].sort((a, b) => a.created_at.localeCompare(b.created_at))
  const newest = sorted[sorted.length - 1].created_at

  const mark = await getWatermark()

  // First run on this install: adopt the current state silently. Announcing
  // here would fire a burst of notifications for orders the merchant has
  // already seen, the moment they open the app.
  if (!mark) {
    await setWatermark(newest)
    return 0
  }

  const fresh = sorted.filter(o => o.created_at > mark)
  for (const o of fresh) {
    await announce({
      id: o.id,
      orderNumber: o.order_number,
      customerName: o.customer_name,
      total: Number(o.total ?? 0),
      createdAt: o.created_at,
    })
  }

  if (fresh.length) await setWatermark(newest)
  return fresh.length
}

/**
 * Start watching. Safe to call repeatedly — a second call is a no-op.
 * Polls only while the app is foregrounded; iOS suspends timers anyway, and
 * leaving one armed in the background just wastes the first tick on resume.
 */
export function startOrderWatch(): () => void {
  if (running) return stopOrderWatch
  running = true

  const tick = () => { checkForNewOrders().catch(() => { /* offline — next tick */ }) }

  const arm = () => {
    if (timer) return
    tick() // check immediately on foreground, not after a full interval
    timer = setInterval(tick, POLL_MS)
  }
  const disarm = () => {
    if (timer) { clearInterval(timer); timer = null }
  }

  const onChange = (s: AppStateStatus) => { s === 'active' ? arm() : disarm() }
  appStateSub = AppState.addEventListener('change', onChange)
  if (AppState.currentState === 'active') arm()

  return stopOrderWatch
}

export function stopOrderWatch() {
  running = false
  if (timer) { clearInterval(timer); timer = null }
  appStateSub?.remove()
  appStateSub = null
}

/** Whether the watcher is currently armed — surfaced in the diagnostics card
 *  so the merchant can see which mechanism is actually protecting them. */
export function isWatching(): boolean {
  return running
}
