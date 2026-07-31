import { createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * @param authHeader Optional `Authorization: Bearer <jwt>` — used by native
 *   mobile clients, which have no cookie jar. OMITTED (the default) ⇒ the
 *   client behaves EXACTLY as before, cookie-only. Backward compatible.
 */
export function createServerClient(authHeader?: string | null) {
  const cookieStore = cookies()
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(authHeader ? { global: { headers: { Authorization: authHeader } } } : {}),
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try { cookieStore.set({ name, value, ...options }) } catch {}
        },
        remove(name: string, options: CookieOptions) {
          try { cookieStore.set({ name, value: '', ...options }) } catch {}
        },
      },
    }
  )
}

export function createActionClient() {
  return createServerClient()
}

/**
 * @param preferredStoreId Optional store id — used by native mobile clients
 *   via the `X-Commerco-Store` header. OMITTED (the default) ⇒ resolution is
 *   cookie-based exactly as before. The id is only ever honoured if it appears
 *   in the user's OWN stores, so it can never select another merchant's store.
 */
export async function getActiveStore(supabase: any, userId: string, preferredStoreId?: string | null) {
  const cookieStore = cookies()
  const activeStoreId = preferredStoreId ?? cookieStore.get('dakkani_active_store_id')?.value

  // Fetch all stores for this user
  const { data: stores } = await supabase
    .from('stores')
    .select('*')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })

  if (!stores || stores.length === 0) {
    return { activeStore: null, allStores: [] }
  }

  // Find store matching activeStoreId, or fallback to the first store
  let activeStore = stores.find((s: any) => s.id === activeStoreId)
  if (!activeStore) {
    activeStore = stores[0]
  }

  return { activeStore, allStores: stores }
}
