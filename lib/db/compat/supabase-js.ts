// Drop-in for `import { createClient } from '@supabase/supabase-js'` in server
// code: URL/key arguments are ignored; returns a direct PostgreSQL client with
// service-role semantics (no row scoping), like the old service-role key.
import { createDb, type Db } from '@/lib/db/server'
import { bearer } from '@/lib/db/session'

export type SupabaseClient = Db

export function createClient(_url?: string, _key?: string, opts?: any): Db {
  const auth = opts?.global?.headers?.Authorization ?? opts?.global?.headers?.authorization
  return createDb({ token: bearer(auth) })
}
