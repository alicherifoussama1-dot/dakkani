// ============================================================
// Google OAuth — start: redirects the merchant to Google consent.
// state = signed storeId so the callback knows which store to bind.
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { buildAuthUrl, signState } from '@/lib/google/sheets'

export async function GET(req: Request) {
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

  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId مطلوب' }, { status: 400 })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })

  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('owner_id', user.id).single()
  if (!store) return NextResponse.json({ error: 'المتجر غير موجود' }, { status: 404 })

  try {
    return NextResponse.redirect(buildAuthUrl(signState(storeId)))
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
