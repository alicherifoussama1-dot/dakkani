// Public/service client for storefront server components — direct PostgreSQL
// access (no per-user scoping), exactly like the old service-role client.
import { createDb } from '@/lib/db/server'

export function createPublicClient() {
  return createDb({ token: null })
}
