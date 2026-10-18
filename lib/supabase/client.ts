// Browser client — now backed by /api/db + /api/auth/session (lib/db/browser).
import { createBrowserDb } from '@/lib/db/browser'

export function createClient() {
  return createBrowserDb()
}
