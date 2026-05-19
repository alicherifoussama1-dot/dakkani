// ============================================================
// Public Supabase client — for storefront pages
// Uses service role to bypass RLS for public data reads
// Only reads public data (active stores, active products)
// ============================================================
import { createClient } from '@supabase/supabase-js'

let _client: ReturnType<typeof createClient> | null = null

export function createPublicClient() {
  if (!_client) {
    _client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      // Use service role to bypass RLS for storefront public reads
      // This is safe because we only read public data
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )
  }
  return _client
}
