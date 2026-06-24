// Merchant-managed delivery offices (stopdesk pickup points). Owner-scoped.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'

function db() {
  const c = cookies()
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get: (n) => c.get(n)?.value,
      set: (n, v, o: CookieOptions) => { try { c.set({ name: n, value: v, ...o }) } catch {} },
      remove: (n, o: CookieOptions) => { try { c.set({ name: n, value: '', ...o }) } catch {} },
    },
  })
}
async function ownStore(supabase: ReturnType<typeof db>, storeId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  const { data: store } = await supabase.from('stores').select('id, owner_id').eq('id', storeId).single()
  if (!store || store.owner_id !== user.id) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  return { user }
}
const migErr = () => NextResponse.json({ error: 'شغّل ترحيل 021_store_delivery_offices.sql في Supabase.', code: 'MIGRATION_REQUIRED' }, { status: 409 })

export async function GET(req: Request) {
  const storeId = new URL(req.url).searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })
  const supabase = db()
  const a = await ownStore(supabase, storeId); if ('error' in a) return a.error
  const { data, error } = await supabase.from('store_delivery_offices')
    .select('*').eq('store_id', storeId).order('wilaya_code')
  if (error) return migErr()
  return NextResponse.json({ offices: data ?? [] })
}

const postSchema = z.object({
  storeId: z.string().uuid(),
  provider_id: z.string().uuid().nullable().optional(),
  wilaya_code: z.string().min(1),
  name: z.string().min(1),
  address: z.string().optional(),
})
export async function POST(req: Request) {
  let body: z.infer<typeof postSchema>
  try { body = postSchema.parse(await req.json()) } catch { return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 }) }
  const supabase = db()
  const a = await ownStore(supabase, body.storeId); if ('error' in a) return a.error
  const { data, error } = await supabase.from('store_delivery_offices').insert({
    store_id: body.storeId, provider_id: body.provider_id ?? null,
    wilaya_code: String(body.wilaya_code).padStart(2, '0'), name: body.name, address: body.address ?? null,
  }).select('*').single()
  if (error) return migErr()
  return NextResponse.json({ office: data })
}

export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}))
  const storeId = body.storeId as string, id = body.id as string
  if (!storeId || !id) return NextResponse.json({ error: 'storeId + id required' }, { status: 400 })
  const supabase = db()
  const a = await ownStore(supabase, storeId); if ('error' in a) return a.error
  const { error } = await supabase.from('store_delivery_offices').delete().eq('id', id).eq('store_id', storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
