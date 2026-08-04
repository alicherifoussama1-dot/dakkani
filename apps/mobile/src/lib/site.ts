// ============================================================
// The one place that knows what the app points at.
// ============================================================
import Constants from 'expo-constants'

/** Production site. EXPO_PUBLIC_API_URL is honoured so a staging build can
 *  point elsewhere without touching code (it already feeds eas.json). */
export const SITE =
  (process.env.EXPO_PUBLIC_API_URL || 'https://dakkani.vercel.app').replace(/\/+$/, '')

/** Merchants open the app to work, not to read the marketing page. The
 *  site's own middleware bounces this to /login when logged out and back
 *  again after — so the shell needs no auth logic of its own. */
export const START_PATH = '/dashboard'

export const START_URL = SITE + START_PATH

export const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0'

/** Marks requests as coming from the shell. Appended to — never replacing —
 *  the system user agent, so the site's own browser/feature detection and
 *  Vercel's bot rules keep seeing a normal Android WebView. */
export const UA_SUFFIX = ` CommercoApp/${APP_VERSION}`

const siteHost = SITE.replace(/^https?:\/\//, '')

/** Same-origin, or a subdomain of it — merchant storefronts live on
 *  `<store>.dakkani.…`, and following one must stay inside the app. */
export function isInternal(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return false
    return u.host === siteHost || u.host.endsWith('.' + siteHost)
  } catch {
    return false
  }
}

/** Turn a deep link (commerco://orders/123, https://site/orders/123) into a
 *  site path. Returns null for anything that isn't ours. */
export function pathFromDeepLink(url: string): string | null {
  try {
    if (url.startsWith('commerco://')) {
      const rest = url.slice('commerco://'.length)
      return '/' + rest.replace(/^\/+/, '')
    }
    if (isInternal(url)) {
      const u = new URL(url)
      return u.pathname + u.search + u.hash
    }
  } catch { /* malformed link — ignore */ }
  return null
}
