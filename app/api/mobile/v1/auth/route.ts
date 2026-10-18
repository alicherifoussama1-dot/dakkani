// Mobile login (replaces Supabase Auth for the native app).
//   POST { email, password } → { access_token, expires_at, user }
// The token is the same signed session used by the web cookie, sent back by
// the app as `Authorization: Bearer <token>` on every /api/mobile/v1 call.
import { NextResponse } from 'next/server'
import { authApi } from '@/lib/db/server'
import { verifySession } from '@/lib/db/session'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = String(body.email ?? '').trim()
  const password = String(body.password ?? '')
  if (!email || !password) return NextResponse.json({ error: 'Invalid login credentials' }, { status: 400 })

  const { data, error } = await authApi({ token: null }).signInWithPassword({ email, password })
  if (error || !data.session) return NextResponse.json({ error: error?.message ?? 'Invalid login credentials' }, { status: 401 })

  const p = await verifySession(data.session.access_token)
  return NextResponse.json({ access_token: data.session.access_token, expires_at: p?.exp ?? null, user: data.user })
}
