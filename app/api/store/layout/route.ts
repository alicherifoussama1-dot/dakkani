// PATCH /api/store/layout — save the builder's layout JSON + theme.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { normalizeLayout } from '@/lib/storefront/sections'
import { PRODUCT_THEMES } from '@/lib/product-themes'

const schema = z.object({
  storeId:   z.string().uuid(),
  layout:    z.array(z.any()),
  theme_key: z.string().optional(),
})
const THEME_KEYS = PRODUCT_THEMES.map(t => t.key)

export async function PATCH(req: Request) {
  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) }
  catch { return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 }) }

  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {
      get: (n) => cookieStore.get(n)?.value,
      set: (n, v, o: CookieOptions) => { try { cookieStore.set({ name: n, value: v, ...o }) } catch {} },
      remove: (n, o: CookieOptions) => { try { cookieStore.set({ name: n, value: '', ...o }) } catch {} },
    } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: store } = await supabase.from('stores').select('id, owner_id').eq('id', body.storeId).single()
  if (!store || store.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const layout = normalizeLayout(body.layout)
  const patch: Record<string, unknown> = { layout }
  if (body.theme_key && THEME_KEYS.includes(body.theme_key)) patch.theme_key = body.theme_key

  const { error } = await supabase.from('stores').update(patch).eq('id', body.storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, layout })
}
