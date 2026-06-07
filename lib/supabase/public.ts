// ============================================================
// Public Supabase client — for storefront server components
// Uses service role to bypass RLS completely
// Safe: only reads public data (active stores, active products)
//
// ── ROOT-CAUSE FIX (stale storefront data / "themes don't change") ──
// @supabase/supabase-js makes its REST calls through the global `fetch`,
// which Next.js's App Router patches to participate in its persistent
// Data Cache. Even on routes marked `export const dynamic = 'force-dynamic'`,
// requests issued by *libraries* (rather than the page's own top-level
// `fetch`) can still be served from that cache on Vercel — so merchants
// changing theme_key / price / stock / images never saw the change reflected
// on the live storefront (product/[slug], store home, products list, checkout…
// every route built on this client) until a redeploy happened to evict it.
//
// Forcing `cache: 'no-store'` on every request this client makes guarantees
// each storefront render hits Supabase directly with fresh data — exactly
// what a `force-dynamic` public storefront page is supposed to do.
// ============================================================
import { createClient } from '@supabase/supabase-js'

export function createPublicClient() {
  // No singleton — create fresh per request (required for Next.js serverless)
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    // Service role bypasses ALL RLS policies
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        // Bypass Next.js / Vercel's fetch Data Cache so every query returns
        // live data — critical for a storefront where merchants expect their
        // dashboard changes (theme, price, stock, images…) to show instantly.
        fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}
