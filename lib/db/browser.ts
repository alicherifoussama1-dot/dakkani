// Browser client with the supabase-js surface the dashboard/storefront use.
// Queries go to /api/db (scoped by lib/db/policy), auth to /api/auth/session.
import { QueryBuilder, type DbResult, type QuerySpec } from './builder'

async function post(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(body) })
  return res.json()
}

const exec = (spec: QuerySpec): Promise<DbResult> => post('/api/db', spec)

type Listener = (event: string, session: unknown) => void
const listeners = new Set<Listener>()
const emit = (event: string, session: unknown) => listeners.forEach(l => { try { l(event, session) } catch { /* noop */ } })

export function createBrowserDb() {
  return {
    from: (table: string) => new QueryBuilder(table, exec),
    async rpc(_fn: string, _args?: unknown) {
      return { data: null, error: { message: 'rpc is not available from the browser' } }
    },
    auth: {
      async getUser() {
        const r = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }).then(x => x.json()).catch(() => ({}))
        return r.user ? { data: { user: r.user }, error: null } : { data: { user: null }, error: { message: 'Auth session missing!' } }
      },
      async getSession() {
        const r = await fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store' }).then(x => x.json()).catch(() => ({}))
        return { data: { session: r.session ?? null }, error: null }
      },
      async signInWithPassword(c: { email: string; password: string }) {
        const r = await post('/api/auth/session', { action: 'signIn', ...c })
        if (!r.error) emit('SIGNED_IN', r.data?.session)
        return r
      },
      async signUp(c: { email: string; password: string; options?: unknown }) {
        const r = await post('/api/auth/session', { action: 'signUp', email: c.email, password: c.password })
        if (!r.error) emit('SIGNED_IN', r.data?.session)
        return r
      },
      async signOut() { const r = await post('/api/auth/session', { action: 'signOut' }); emit('SIGNED_OUT', null); return r },
      async updateUser(attrs: { password?: string; email?: string }) { return post('/api/auth/session', { action: 'updateUser', ...attrs }) },
      async verifyOtp(args: { token_hash?: string; type?: string }) { return post('/api/auth/session', { action: 'verifyOtp', ...args }) },
      async exchangeCodeForSession(_code: string) { return { data: { session: null }, error: { message: 'Not supported' } } },
      async resetPasswordForEmail(email: string) {
        const res = await fetch('/api/auth/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
        const j = await res.json().catch(() => ({}))
        return { data: {}, error: res.ok ? null : { message: j.error ?? 'Failed' } }
      },
      onAuthStateChange(cb: Listener) {
        listeners.add(cb)
        return { data: { subscription: { unsubscribe: () => listeners.delete(cb) } } }
      },
    },
    storage: {
      from: (_bucket: string) => ({
        getPublicUrl: (p: string) => ({ data: { publicUrl: `${process.env.NEXT_PUBLIC_STORAGE_PUBLIC_URL ?? '/uploads'}/${_bucket}/${p}` } }),
      }),
    },
    channel: (_name: string) => {
      // Realtime is not available; callers fall back to polling/refresh.
      const ch = { on: () => ch, subscribe: () => ch, unsubscribe: () => Promise.resolve('ok') }
      return ch
    },
    removeChannel: (_c: unknown) => Promise.resolve('ok'),
  }
}
