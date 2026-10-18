// ============================================================
// AUTH — backend session token (POST /api/mobile/v1/auth) in the platform secure store.
//
// · Tokens live in iOS Keychain / Android Keystore via expo-secure-store.
//   NEVER AsyncStorage (unencrypted, readable on a rooted device).
// · Sessions are 30-day signed tokens; on expiry the merchant signs in again.
// · Biometrics gate APP OPEN, not login — the session persists and Face ID
//   simply unlocks access to it.
// ============================================================
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { API_URL, configureApi } from './api'

// Session issued by our own backend (POST /api/mobile/v1/auth) — no Supabase.
interface StoredSession { access_token: string; expires_at: number | null; user: { id: string; email: string } }

const K_SESSION = 'commerco.session'
const K_STORE = 'commerco.store_id'
const K_BIOMETRIC = 'commerco.biometric_enabled'

async function readSession(): Promise<StoredSession | null> {
  const raw = await SecureStore.getItemAsync(K_SESSION).catch(() => null)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as StoredSession
    if (s.expires_at && s.expires_at * 1000 < Date.now()) return null
    return s
  } catch { return null }
}

let currentStoreId: string | null = null
let onLogout: (() => void) | null = null

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

/** Valid access token (sessions last 30 days; the app signs in again after). */
async function getAccessToken(): Promise<string | null> {
  return (await readSession())?.access_token ?? null
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
  let res: Response
  try {
    res = await fetch(`${API_URL}/api/mobile/v1/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), password }),
    })
  } catch {
    throw new Error(mapAuthError('network'))
  }
  const j = await res.json().catch(() => ({} as any))
  if (!res.ok || !j.access_token) throw new Error(mapAuthError(String(j.error ?? 'invalid login')))
  const session: StoredSession = { access_token: j.access_token, expires_at: j.expires_at ?? null, user: j.user }
  await SecureStore.setItemAsync(K_SESSION, JSON.stringify(session))
  return session
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
  // Sessions are stateless tokens: signing out is dropping the local copy.
  await SecureStore.deleteItemAsync(K_SESSION).catch(() => {})
  await SecureStore.deleteItemAsync(K_STORE).catch(() => {})
  currentStoreId = null
  // Tear down push listeners and the badge for a merchant who has left.
  emitSession(false)
}

export async function getSession() {
  return readSession()
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

/** Auth errors → Arabic the merchant can act on. */
function mapAuthError(msg: string) {
  const m = msg.toLowerCase()
  if (m.includes('invalid login')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
  if (m.includes('email not confirmed')) return 'لم يتم تأكيد بريدك الإلكتروني بعد'
  if (m.includes('network') || m.includes('fetch')) return 'تعذّر الاتصال — تحقّق من الإنترنت'
  if (m.includes('rate')) return 'محاولات كثيرة — أعد المحاولة بعد قليل'
  return 'تعذّر تسجيل الدخول، حاول مرة أخرى'
}
