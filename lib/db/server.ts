// Server-side database client: a drop-in replacement for the Supabase client
// surface the app uses — from() / rpc() / auth / storage — backed by the
// local PostgreSQL (Namecheap) and local disk storage.
import { promises as fs } from 'fs'
import path from 'path'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import { QueryBuilder, type DbResult, type QuerySpec } from './builder'
import { compile, qi } from './compile'
import { getMeta } from './meta'
import { getPool, query } from './pool'
import { signSession, toUser, verifySession, type SessionUser } from './session'

// ── query execution ──────────────────────────────────────────
function pgError(e: any) {
  return { message: e?.message ?? String(e), code: e?.code ?? 'PGRST000', details: e?.detail ?? null, hint: e?.hint ?? null }
}

export async function executeSpec(spec: QuerySpec, scope: string[] = [], scopeParams: unknown[] = []): Promise<DbResult> {
  try {
    const meta = await getMeta()
    const c = compile(spec, meta, scope)
    const shift = (sql: string, base: number) => scopeParams.length ? sql.replace(/\$S(\d+)/g, (_, n) => `$${base + Number(n)}`) : sql
    let count: number | null = null
    if (c.countSql) {
      const r = await getPool().query(shift(c.countSql, c.countParams!.length), [...c.countParams!, ...scopeParams] as any[])
      count = r.rows[0]?.n ?? 0
    }
    if (spec.head) return { data: null, error: null, count, status: 200, statusText: 'OK' }
    const res = await getPool().query(shift(c.sql, c.params.length), [...c.params, ...scopeParams] as any[])
    let rows: any[] = res.rows
    if (spec.action !== 'select' && spec.count) count = res.rowCount ?? rows.length
    if (spec.action !== 'select' && !c.returns) return { data: null, error: null, count, status: spec.action === 'insert' ? 201 : 204, statusText: 'OK' }
    if (spec.single) {
      if (rows.length === 1) return { data: rows[0], error: null, count, status: 200, statusText: 'OK' }
      if (rows.length === 0 && spec.single === 'maybe') return { data: null, error: null, count, status: 200, statusText: 'OK' }
      return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', details: `The result contains ${rows.length} rows`, hint: null }, count, status: 406, statusText: 'Not Acceptable' }
    }
    rows = rows ?? []
    return { data: rows, error: null, count, status: 200, statusText: 'OK' }
  } catch (e) {
    return { data: null, error: pgError(e), count: null, status: 400, statusText: 'Bad Request' }
  }
}

// ── rpc ──────────────────────────────────────────────────────
const retsetCache = new Map<string, boolean>()
export async function rpc(fn: string, args: Record<string, unknown> = {}, opts: { head?: boolean; count?: string } = {}): Promise<DbResult> {
  try {
    qi(fn)
    if (!retsetCache.has(fn)) {
      const r = await query<{ proretset: boolean }>(`select proretset from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1 limit 1`, [fn])
      if (!r.length) throw Object.assign(new Error(`function public.${fn} does not exist`), { code: '42883' })
      retsetCache.set(fn, r[0].proretset)
    }
    const keys = Object.keys(args)
    const params = keys.map(k => { const v = args[k]; return v !== null && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v })
    const call = `public.${qi(fn)}(${keys.map((k, i) => `${qi(k)} => $${i + 1}`).join(', ')})`
    const rows = await query<{ j: unknown }>(`SELECT to_jsonb(r) AS j FROM ${call} r`, params)
    const data = retsetCache.get(fn) ? rows.map(r => r.j) : (rows[0]?.j ?? null)
    void opts
    return { data, error: null, count: null, status: 200, statusText: 'OK' }
  } catch (e) {
    return { data: null, error: pgError(e), count: null, status: 400, statusText: 'Bad Request' }
  }
}

// ── storage (local disk) ─────────────────────────────────────
function storageRoot() { return process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads') }
function publicBase() { return (process.env.STORAGE_PUBLIC_URL ?? `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/uploads`).replace(/\/$/, '') }
function safeJoin(bucket: string, p: string) {
  const rel = path.posix.normalize(`${bucket}/${p}`).replace(/^(\.\.(\/|$))+/, '')
  if (rel.includes('..')) throw new Error('Invalid storage path')
  return rel
}

export function storageBucket(bucket: string) {
  return {
    async upload(p: string, body: ArrayBuffer | Buffer | Blob | Uint8Array, _opts: { contentType?: string; upsert?: boolean; cacheControl?: string } = {}) {
      try {
        const rel = safeJoin(bucket, p)
        const abs = path.join(storageRoot(), rel)
        await fs.mkdir(path.dirname(abs), { recursive: true })
        let buf: Buffer
        if (body instanceof Blob) buf = Buffer.from(await body.arrayBuffer())
        else if (Buffer.isBuffer(body)) buf = body
        else buf = Buffer.from(body as ArrayBuffer)
        await fs.writeFile(abs, buf)
        return { data: { path: p, fullPath: rel, id: rel }, error: null }
      } catch (e) { return { data: null, error: pgError(e) } }
    },
    getPublicUrl(p: string) {
      return { data: { publicUrl: `${publicBase()}/${safeJoin(bucket, p)}` } }
    },
    async remove(paths: string[]) {
      for (const p of paths) await fs.rm(path.join(storageRoot(), safeJoin(bucket, p)), { force: true }).catch(() => {})
      return { data: paths.map(name => ({ name })), error: null }
    },
    async download(p: string) {
      try { const b = await fs.readFile(path.join(storageRoot(), safeJoin(bucket, p))); return { data: new Blob([b]), error: null } }
      catch (e) { return { data: null, error: pgError(e) } }
    },
    async list(prefix = '') {
      try {
        const dir = path.join(storageRoot(), safeJoin(bucket, prefix))
        const names = await fs.readdir(dir).catch(() => [] as string[])
        return { data: names.map(name => ({ name })), error: null }
      } catch (e) { return { data: null, error: pgError(e) } }
    },
  }
}

const sha256hex = (v: string) => createHash('sha256').update(v).digest('hex')

// ── auth ─────────────────────────────────────────────────────
export interface AuthCtx {
  token: string | null
  setToken?: (token: string | null) => void
}

export async function findUserByEmail(email: string) {
  const r = await query<{ id: string; email: string; password_hash: string | null; created_at: string }>(
    `select id, email, password_hash, created_at from app_users where lower(email) = lower($1) limit 1`, [email.trim()])
  return r[0] ?? null
}

export function authApi(ctx: AuthCtx) {
  const getUser = async (_jwt?: string) => {
    const p = await verifySession(_jwt ?? ctx.token)
    if (!p) return { data: { user: null as SessionUser | null }, error: { message: 'Auth session missing!', status: 401 } }
    return { data: { user: toUser(p) as SessionUser | null }, error: null }
  }
  return {
    getUser,
    async getSession() {
      const p = await verifySession(ctx.token)
      return { data: { session: p ? { access_token: ctx.token!, token_type: 'bearer', expires_at: p.exp, user: toUser(p) } : null }, error: null }
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      const u = await findUserByEmail(email)
      if (!u || !u.password_hash || !(await bcrypt.compare(password, u.password_hash))) {
        return { data: { user: null, session: null }, error: { message: 'Invalid login credentials', status: 400 } }
      }
      await query(`update app_users set last_sign_in_at = now() where id = $1`, [u.id])
      const token = await signSession({ id: u.id, email: u.email })
      ctx.setToken?.(token)
      const user = toUser((await verifySession(token))!)
      return { data: { user, session: { access_token: token, token_type: 'bearer', user } }, error: null }
    },
    async signUp({ email, password }: { email: string; password: string; options?: unknown }) {
      if (!email || !password || password.length < 6) return { data: { user: null, session: null }, error: { message: 'Password should be at least 6 characters', status: 422 } }
      if (await findUserByEmail(email)) return { data: { user: null, session: null }, error: { message: 'User already registered', status: 422 } }
      const hash = await bcrypt.hash(password, 10)
      const r = await query<{ id: string; email: string }>(`insert into app_users (email, password_hash) values (lower($1), $2) returning id, email`, [email.trim(), hash])
      const token = await signSession(r[0])
      ctx.setToken?.(token)
      const user = toUser((await verifySession(token))!)
      return { data: { user, session: { access_token: token, token_type: 'bearer', user } }, error: null }
    },
    async signOut() { ctx.setToken?.(null); return { error: null } },
    async updateUser(attrs: { password?: string; email?: string }) {
      const p = await verifySession(ctx.token)
      if (!p) return { data: { user: null }, error: { message: 'Auth session missing!', status: 401 } }
      if (attrs.password) {
        if (attrs.password.length < 6) return { data: { user: null }, error: { message: 'Password should be at least 6 characters', status: 422 } }
        await query(`update app_users set password_hash = $2, updated_at = now() where id = $1`, [p.sub, await bcrypt.hash(attrs.password, 10)])
      }
      if (attrs.email) await query(`update app_users set email = lower($2), updated_at = now() where id = $1`, [p.sub, attrs.email])
      return { data: { user: toUser(p) }, error: null }
    },
    // Supabase PKCE/OTP flows are replaced by /api/auth/reset-password tokens.
    async exchangeCodeForSession(_code: string) { return { data: { session: null, user: null }, error: { message: 'Not supported', status: 400 } } },
    /** Password-recovery tokens minted by admin.generateLink({ type: 'recovery' }). */
    async verifyOtp(args: { token_hash?: string; type?: string }) {
      const fail = { data: { session: null, user: null }, error: { message: 'Token has expired or is invalid', status: 403 } }
      if (!args?.token_hash) return fail
      const r = await query<{ user_id: string; email: string }>(
        `update password_resets pr set used_at = now() from app_users u
          where pr.token_hash = $1 and pr.used_at is null and pr.expires_at > now() and u.id = pr.user_id
          returning pr.user_id, u.email`, [sha256hex(args.token_hash)])
      if (!r[0]) return fail
      const token = await signSession({ id: r[0].user_id, email: r[0].email })
      ctx.setToken?.(token)
      const user = toUser((await verifySession(token))!)
      return { data: { user, session: { access_token: token, token_type: 'bearer', user } }, error: null }
    },
    admin: {
      async generateLink(args: { type: string; email: string; options?: { redirectTo?: string } }) {
        const u = await findUserByEmail(args.email)
        if (!u) return { data: null, error: { message: 'User not found', status: 404 } }
        const raw = randomBytes(32).toString('hex')
        await query(`insert into password_resets (user_id, token_hash, expires_at) values ($1, $2, now() + interval '1 hour')`, [u.id, sha256hex(raw)])
        const link = `${args.options?.redirectTo ?? ''}?token_hash=${raw}&type=recovery`
        return { data: { properties: { hashed_token: raw, action_link: link }, user: { id: u.id, email: u.email } }, error: null }
      },
      async getUserById(id: string) {
        const r = await query<{ id: string; email: string; created_at: string }>(`select id, email, created_at from app_users where id = $1`, [id])
        return { data: { user: r[0] ? { ...r[0], user_metadata: {}, app_metadata: {} } : null }, error: r[0] ? null : { message: 'User not found' } }
      },
      async listUsers() {
        const r = await query<{ id: string; email: string; created_at: string }>(`select id, email, created_at from app_users order by created_at`)
        return { data: { users: r }, error: null }
      },
    },
  }
}

// ── client factory ───────────────────────────────────────────
export function createDb(ctx: AuthCtx = { token: null }) {
  return {
    from: (table: string) => new QueryBuilder(table, spec => executeSpec(spec)),
    rpc: (fn: string, args?: Record<string, unknown>, opts?: { head?: boolean; count?: string }) => rpc(fn, args ?? {}, opts),
    auth: authApi(ctx),
    storage: { from: (bucket: string) => storageBucket(bucket) },
  }
}
export type Db = ReturnType<typeof createDb>
