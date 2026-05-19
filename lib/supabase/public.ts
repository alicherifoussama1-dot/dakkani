// ============================================================
// Public Supabase client — for storefront server components
// Uses service role to bypass RLS completely
// Safe: only reads public data (active stores, active products)
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
    }
  )
}
