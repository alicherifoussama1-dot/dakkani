// ============================================================
// BACKGROUND ORDER CHECK — the best iOS allows without push.
//
// Registers a BGAppRefreshTask. When iOS decides to grant it, the same
// check the foreground poller runs happens in the background and raises a
// local notification.
//
// What this is NOT: a replacement for push. iOS alone decides when — and
// whether — a refresh runs. It learns the merchant's usage pattern, refuses
// on Low Power Mode, and NEVER runs it for an app the user force-quit from
// the app switcher. Treat any delivery from here as a bonus, not a guarantee;
// the foreground poller is what actually holds this together.
//
// Registered as a separate module from order-watch.ts because defineTask must
// run at module scope, before React mounts, and importing it for that side
// effect should be obvious at the import site rather than hidden.
// ============================================================
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'
import { checkForNewOrders } from './order-watch'

export const ORDER_CHECK_TASK = 'commerco.order-check'

TaskManager.defineTask(ORDER_CHECK_TASK, async () => {
  try {
    const found = await checkForNewOrders()
    // Reporting NewData when something arrived is not cosmetic: iOS weighs
    // whether past wake-ups were productive when scheduling future ones, so a
    // task that always claims NoData gets granted less and less often.
    return found > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData
  } catch {
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
})

/** Ask iOS to schedule the task. Never throws — a device that refuses
 *  background refresh must not break app start. */
export async function registerBackgroundOrderCheck() {
  if (Platform.OS === 'android') return // Android has real push; this is waste
  try {
    const already = await TaskManager.isTaskRegisteredAsync(ORDER_CHECK_TASK)
    if (already) return
    await BackgroundFetch.registerTaskAsync(ORDER_CHECK_TASK, {
      // A floor, not a promise. iOS treats it as the earliest it will
      // consider running, and routinely waits far longer.
      minimumInterval: 15 * 60,
      stopOnTerminate: false,
      startOnBoot: true,
    })
  } catch { /* background refresh disabled by the user or the OS */ }
}

export async function unregisterBackgroundOrderCheck() {
  try {
    if (await TaskManager.isTaskRegisteredAsync(ORDER_CHECK_TASK)) {
      await BackgroundFetch.unregisterTaskAsync(ORDER_CHECK_TASK)
    }
  } catch { /* nothing registered */ }
}
