import { createServerClient as createSSRServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()
  return createSSRServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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

export async function getActiveStore(supabase: any, userId: string) {
  const cookieStore = cookies()
  const activeStoreId = cookieStore.get('dakkani_active_store_id')?.value

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
