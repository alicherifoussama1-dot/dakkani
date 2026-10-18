// Drop-in for `import { createServerClient } from '@supabase/ssr'` in route
// handlers that pass their own cookie adapter. The session cookie is read and
// written through that adapter.
import { createDb } from '@/lib/db/server'
import { bearer, SESSION_COOKIE, sessionCookieOptions } from '@/lib/db/session'

export type CookieOptions = Record<string, any>

interface CookieAdapter {
  get?: (name: string) => string | undefined
  set?: (name: string, value: string, options: CookieOptions) => void
  remove?: (name: string, options: CookieOptions) => void
  getAll?: () => { name: string; value: string }[]
  setAll?: (c: { name: string; value: string; options: CookieOptions }[]) => void
}

export function createServerClient(_url: string, _key: string, opts: { cookies: CookieAdapter; global?: { headers?: Record<string, string> } }) {
  const c = opts.cookies
  const fromAll = () => c.getAll?.().find(x => x.name === SESSION_COOKIE)?.value
  const token = bearer(opts.global?.headers?.Authorization) ?? c.get?.(SESSION_COOKIE) ?? fromAll() ?? null
  return createDb({
    token,
    setToken: t => {
      try {
        if (t) { c.set ? c.set(SESSION_COOKIE, t, sessionCookieOptions) : c.setAll?.([{ name: SESSION_COOKIE, value: t, options: sessionCookieOptions }]) }
        else { c.remove ? c.remove(SESSION_COOKIE, sessionCookieOptions) : c.setAll?.([{ name: SESSION_COOKIE, value: '', options: { ...sessionCookieOptions, maxAge: 0 } }]) }
      } catch { /* read-only */ }
    },
  })
}

export function createBrowserClient(): any {
  // Never used server-side; kept for API parity.
  throw new Error('createBrowserClient is not available on the server')
}
