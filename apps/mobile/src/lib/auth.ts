// ============================================================
// AUTH — Supabase session in the platform secure store.
//
// · Tokens live in iOS Keychain / Android Keystore via expo-secure-store.
//   NEVER AsyncStorage (unencrypted, readable on a rooted device).
// · Single-flight refresh: concurrent 401s trigger ONE refresh, not N.
// · Biometrics gate APP OPEN, not login — the session persists and Face ID
//   simply unlocks access to it.
// ============================================================
// MUST be the first import: supabase-js parses URLs internally and Hermes'
// built-in URL is incomplete. Without this, auth requests fail on device.
import 'react-native-url-polyfill/auto'
import { createClient, type Session } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { configureApi } from './api'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

// EXPO_PUBLIC_* vars are inlined at build time. When they are missing,
// createClient() throws during module evaluation and the app white-screens
// with no usable stack. Fail loudly instead, naming the exact cause.
if (!SUPABASE_URL || !SUPABASE_ANON) {
  throw new Error(
    'Missing EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
    'Create apps/mobile/.env (see .env.example) before building — ' +
    'these are inlined at bundle time, not read at runtime.',
  )
}

const K_SESSION = 'commerco.session'
const K_STORE = 'commerco.store_id'
const K_BIOMETRIC = 'commerco.biometric_enabled'

/** SecureStore adapter — Supabase persists the session through this. */
const secureStorage = {
  getItem: (k: string) => SecureStore.getItemAsync(k),
  setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
  removeItem: (k: string) => SecureStore.deleteItemAsync(k),
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: secureStorage as any,
    storageKey: K_SESSION,
    autoRefreshToken: true,
    persistSession: true,
    // No URL session detection: this is a native app, not a browser.
    detectSessionInUrl: false,
  },
})

let currentStoreId: string | null = null
let onLogout: (() => void) | null = null
let refreshing: Promise<Session | null> | null = null

// ── Session transitions ─────────────────────────────────────
// The root layout resolves auth once at boot. Nothing told it when the login
// screen succeeded, so for the whole first session it still believed the
// merchant was signed out: push handlers were never wired, notification taps
// and deep links were queued and dropped, and the badge stopped refreshing
// until the app was relaunched. Sign-out had the mirror bug — the listeners
// stayed wired for a merchant who had left.
//
// Deliberately NOT supabase.auth.onAuthStateChange: that emits
// INITIAL_SESSION the moment you subscribe, which would report "signed in"
// before the biometric gate has run and hand a locked app to the push and
// deep-link wiring. These events are raised only at explicit transitions.
type SessionListener = (signedIn: boolean) => void
const sessionListeners = new Set<SessionListener>()

/** Subscribe to explicit sign-in / sign-out transitions. Returns unsubscribe. */
export function onSessionChange(cb: SessionListener) {
  sessionListeners.add(cb)
  return () => { sessionListeners.delete(cb) }
}

function emitSession(signedIn: boolean) {
  for (const cb of sessionListeners) {
    try { cb(signedIn) } catch { /* one bad listener must not stop the rest */ }
  }
}

/** Raised by the login screen once the session AND the active store are
 *  resolved — not inside signIn(), so the first query after navigation
 *  always carries the right X-Commerco-Store header. */
export function notifySignedIn() { emitSession(true) }

export function setActiveStore(id: string | null) {
  currentStoreId = id
  if (id) SecureStore.setItemAsync(K_STORE, id).catch(() => {})
  else SecureStore.deleteItemAsync(K_STORE).catch(() => {})
}
export function getActiveStoreId() { return currentStoreId }

export async function restoreActiveStore() {
  currentStoreId = await SecureStore.getItemAsync(K_STORE).catch(() => null)
  return currentStoreId
}

/** Valid access token, refreshing once if it expires within 60s. */
async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  const s = data.session
  if (!s) return null

  const expiresIn = (s.expires_at ?? 0) * 1000 - Date.now()
  if (expiresIn > 60_000) return s.access_token

  // Single-flight: everyone awaits the same refresh promise.
  if (!refreshing) {
    refreshing = supabase.auth.refreshSession()
      .then(r => r.data.session ?? null)
      .catch(() => null)
      .finally(() => { refreshing = null })
  }
  const fresh = await refreshing
  return fresh?.access_token ?? null
}

/** Wire the API client to this auth module. Call once at app start. */
export function initAuth(handlers: { onUnauthorized: () => void }) {
  onLogout = handlers.onUnauthorized
  configureApi({
    getAccessToken,
    getStoreId: () => currentStoreId,
    onUnauthorized: () => { onLogout?.(); emitSession(false) },
  })
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw new Error(mapAuthError(error.message))
  return data.session
}

export async function signOut() {
  const token = await SecureStore.getItemAsync('commerco.push_token').catch(() => null)
  if (token) {
    // Best-effort: unregister this device so it stops receiving pushes.
    try {
      const { api } = await import('./api')
      await api.unregisterDevice(token)
    } catch { /* offline — the 410 prune on next send handles it */ }
  }
  // Local state must be cleared even if the network sign-out fails, otherwise
  // an offline logout leaves the merchant signed in on the next launch.
  try {
    await supabase.auth.signOut()
  } catch { /* offline — the local session is dropped below regardless */ }
  await SecureStore.deleteItemAsync(K_SESSION).catch(() => {})
  await SecureStore.deleteItemAsync(K_STORE).catch(() => {})
  currentStoreId = null
  // Tear down push listeners and the badge for a merchant who has left.
  emitSession(false)
}

export async function getSession() {
  const { data } = await supabase.auth.getSession()
  return data.session
}

// ── Biometrics ──
export async function biometricAvailable() {
  const hw = await LocalAuthentication.hasHardwareAsync()
  const enrolled = await LocalAuthentication.isEnrolledAsync()
  return hw && enrolled
}

export async function isBiometricEnabled() {
  return (await SecureStore.getItemAsync(K_BIOMETRIC).catch(() => null)) === '1'
}

export async function setBiometricEnabled(on: boolean) {
  if (on) await SecureStore.setItemAsync(K_BIOMETRIC, '1')
  else await SecureStore.deleteItemAsync(K_BIOMETRIC)
}

/** Gate app open. Returns true when unlocked (or biometrics are off). */
export async function unlockWithBiometrics(): Promise<boolean> {
  if (!(await isBiometricEnabled())) return true
  if (!(await biometricAvailable())) return true
  const res = await LocalAuthentication.authenticateAsync({
    promptMessage: 'افتح تطبيق COMMERCO',
    cancelLabel: 'إلغاء',
    disableDeviceFallback: false,
  })
  return res.success
}

/** Supabase errors → Arabic the merchant can act on. */
function mapAuthError(msg: string) {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
  if (m.includes('email not confirmed')) return 'لم يتم تأكيد بريدك الإلكتروني بعد'
  if (m.includes('network') || m.includes('fetch')) return 'تعذّر الاتصال — تحقّق من الإنترنت'
  if (m.includes('rate')) return 'محاولات كثيرة — أعد المحاولة بعد قليل'
  return 'تعذّر تسجيل الدخول، حاول مرة أخرى'
}
