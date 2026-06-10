// ============================================================
// Google OAuth — callback: exchanges code → refresh token,
// stores the account in google_accounts, redirects back to the
// Google Sheets settings page.
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { exchangeCode, verifyState } from '@/lib/google/sheets'

function back(path: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  return NextResponse.redirect(`${base}${path}`)
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const oauthError = searchParams.get('error')

  if (oauthError) return back(`/google-sheets?error=${encodeURIComponent(oauthError)}`)
  if (!code || !state) return back('/google-sheets?error=missing_code')

  const storeId = verifyState(state)
  if (!storeId) return back('/google-sheets?error=bad_state')

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n) => cookieStore.get(n)?.value,
        set: (n, v, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
        remove: (n, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return back('/login')

  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('owner_id', user.id).single()
  if (!store) return back('/google-sheets?error=store_not_found')

  const ex = await exchangeCode(code)
  if (!ex.ok) return back(`/google-sheets?error=${encodeURIComponent(ex.error)}`)

  // Upsert by (store_id, email) — reconnecting refreshes the token
  const { error } = await supabase
    .from('google_accounts')
    .upsert(
      { store_id: storeId, email: ex.email, refresh_token: ex.refreshToken, status: true },
      { onConflict: 'store_id,email' }
    )
  if (error) return back(`/google-sheets?error=${encodeURIComponent(error.message)}`)

  return back('/google-sheets?connected=1')
}
