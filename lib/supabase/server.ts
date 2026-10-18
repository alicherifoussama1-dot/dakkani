// Server client — now backed by the local PostgreSQL (lib/db), not Supabase.
// Keeps the original exports so every server component / route works unchanged.
import { cookies } from 'next/headers'
import { createDb } from '@/lib/db/server'
import { bearer, SESSION_COOKIE, sessionCookieOptions } from '@/lib/db/session'

/**
 * @param authHeader Optional `Authorization: Bearer <token>` — used by native
 *   mobile clients, which have no cookie jar. Omitted ⇒ cookie session.
 */
export function createServerClient(authHeader?: string | null) {
  const cookieStore = cookies()
  const token = bearer(authHeader) ?? cookieStore.get(SESSION_COOKIE)?.value ?? null
  return createDb({
    token,
    setToken: t => {
      try {
        if (t) cookieStore.set({ name: SESSION_COOKIE, value: t, ...sessionCookieOptions })
        else cookieStore.set({ name: SESSION_COOKIE, value: '', ...sessionCookieOptions, maxAge: 0 })
      } catch { /* read-only context (server component) */ }
    },
  })
}

export function createActionClient() {
  return createServerClient()
}

/**
 * @param preferredStoreId Optional store id — used by native mobile clients
 *   via the `X-Commerco-Store` header. Only honoured if it is one of the
 *   user's OWN stores, so it can never select another merchant's store.
 */
export async function getActiveStore(supabase: any, userId: string, preferredStoreId?: string | null) {
  const cookieStore = cookies()
  const activeStoreId = preferredStoreId ?? cookieStore.get('dakkani_active_store_id')?.value

  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })

  if (!stores || stores.length === 0) {
    return { activeStore: null, allStores: [] }
  }

  let activeStore = stores.find((s: any) => s.id === activeStoreId)
  if (!activeStore) activeStore = stores[0]

  return { activeStore, allStores: stores }
}
