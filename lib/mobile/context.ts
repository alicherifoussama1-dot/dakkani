// ============================================================
// MOBILE API CONTEXT — auth + store resolution for /api/mobile/v1.
//
// The web resolves the active store from the `dakkani_active_store_id`
// COOKIE (lib/supabase/server.ts → getActiveStore). A native app has no
// cookie jar, so mobile clients send `X-Commerco-Store: <uuid>` instead.
//
// Resolution order (a FALLBACK CHAIN, never a replacement):
//   1. X-Commerco-Store header   ← mobile
//   2. dakkani_active_store_id cookie ← web (unchanged)
//   3. first store owned by the user
//
// The requested store is ALWAYS re-validated against stores.owner_id, so a
// client cannot read another merchant's data by forging the header. RLS
// remains the real boundary; this is only a selector.
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const STORE_HEADER = 'x-commerco-store'

export interface MobileContext {
  supabase: ReturnType<typeof createServerClient>
  userId: string
  store: { id: string; name: string; slug: string | null; plan: string | null; logo_url: string | null }
  allStores: Array<{ id: string; name: string; slug: string | null }>
}

/** Bearer token (mobile) or cookie session (web) → Supabase client. */
function clientFor(req: Request) {
  const cookieStore = cookies()
  const bearer = req.headers.get('authorization') ?? ''

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // Native clients authenticate with the Authorization header; the cookie
      // adapter stays wired so the same routes still work from the browser.
      global: bearer ? { headers: { Authorization: bearer } } : undefined,
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
        remove: (n, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
      },
    },
  )
}

/**
 * Resolve the authenticated merchant + their active store.
 * Returns a NextResponse on failure so routes can `if ('error' in ctx) return ctx.error`.
 */
export async function getMobileContext(
  req: Request,
): Promise<MobileContext | { error: NextResponse }> {
  const supabase = clientFor(req)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  // Only stores this user OWNS are ever considered — the isolation boundary.
  const { data: stores } = await supabase
    .from('stores')
    .select('id,name,slug,plan,logo_url')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: true })

  if (!stores || stores.length === 0) {
    return { error: NextResponse.json({ error: 'No store for this account' }, { status: 404 }) }
  }

  const requested =
    req.headers.get(STORE_HEADER) ??
    cookies().get('dakkani_active_store_id')?.value ??
    null

  // A forged/stale header simply falls back — it can never select a store the
  // user doesn't own, because `stores` is already filtered by owner_id.
  const store = (requested && stores.find((s: any) => s.id === requested)) || stores[0]

  return {
    supabase,
    userId: user.id,
    store: store as MobileContext['store'],
    allStores: stores as MobileContext['allStores'],
  }
}

/** Uniform JSON success envelope. */
export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, ...data }, init)
}

/** Uniform JSON error envelope. */
export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

/**
 * A search term, safe to interpolate into a PostgREST `or=(...)` filter.
 *
 * PostgREST parses `,` `(` `)` and `.` structurally, so a customer searching
 * for "Ben, Ali" or a product code with a bracket produced a malformed filter
 * — at best an error, at worst an extra OR branch. Double-quoting is the
 * grammar's own escape hatch; `"` and `\` are escaped inside it. The `%`
 * wildcards stay outside the escaping because they are LIKE syntax, not
 * PostgREST syntax.
 */
export function ilikeTerm(term: string): string {
  const escaped = term.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
  return `"%${escaped}%"`
}
