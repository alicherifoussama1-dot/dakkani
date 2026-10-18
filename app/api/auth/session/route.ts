// Browser auth endpoint (replaces Supabase Auth's client calls).
//   GET  → current user/session
//   POST { action: 'signIn' | 'signUp' | 'signOut' | 'updateUser' | 'verifyOtp', ... }
import { NextRequest, NextResponse } from 'next/server'
import { authApi } from '@/lib/db/server'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/db/session'

export const dynamic = 'force-dynamic'

function api(req: NextRequest) {
  let next: string | null | undefined
  const a = authApi({ token: req.cookies.get(SESSION_COOKIE)?.value ?? null, setToken: t => { next = t } })
  const finish = (body: unknown) => {
    const res = NextResponse.json(body)
    if (next !== undefined) {
      if (next) res.cookies.set(SESSION_COOKIE, next, sessionCookieOptions)
      else res.cookies.set(SESSION_COOKIE, '', { ...sessionCookieOptions, maxAge: 0 })
    }
    return res
  }
  return { a, finish }
}

export async function GET(req: NextRequest) {
  const { a, finish } = api(req)
  const [{ data: u }, { data: s }] = await Promise.all([a.getUser(), a.getSession()])
  return finish({ user: u.user, session: s.session })
}

export async function POST(req: NextRequest) {
  const { a, finish } = api(req)
  const body = await req.json().catch(() => ({}))
  switch (body.action) {
    case 'signIn': return finish(await a.signInWithPassword({ email: String(body.email ?? ''), password: String(body.password ?? '') }))
    case 'signUp': return finish(await a.signUp({ email: String(body.email ?? ''), password: String(body.password ?? '') }))
    case 'signOut': return finish(await a.signOut())
    case 'updateUser': return finish(await a.updateUser({ password: body.password, email: body.email }))
    case 'verifyOtp': return finish(await a.verifyOtp({ token_hash: body.token_hash, type: body.type }))
    default: return NextResponse.json({ error: { message: 'Unknown action' } }, { status: 400 })
  }
}
