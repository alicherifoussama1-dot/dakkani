// Sheets registry (service-account model). Owner-scoped via RLS + explicit check.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseSpreadsheetId, testAccess } from '@/lib/google/service-account'

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

const migrationErr = () => NextResponse.json(
  { error: 'الميزة تحتاج تحديث قاعدة البيانات: شغّل ترحيل 020_sheets_service_account.sql في Supabase.', code: 'MIGRATION_REQUIRED' },
  { status: 409 }
)

// ── GET ?storeId — list sheets + how many products use each ──
export async function GET(req: Request) {
  const storeId = new URL(req.url).searchParams.get('storeId')
  if (!storeId) return NextResponse.json({ error: 'storeId required' }, { status: 400 })
  const supabase = db()
  const auth = await ownStore(supabase, storeId); if ('error' in auth) return auth.error

  const { data: sheets, error } = await supabase.from('sheets').select('*').eq('store_id', storeId).order('created_at')
  if (error) return migrationErr()

  const ids = (sheets ?? []).map(s => s.id)
  const [{ data: prods }, { data: maps }] = await Promise.all([
    supabase.from('products').select('id,google_sheet_id').eq('store_id', storeId).in('google_sheet_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
    supabase.from('sheet_mapping').select('sheet_id,linked_to_type').in('sheet_id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']),
  ])
  const productCount: Record<string, number> = {}
  ;(prods ?? []).forEach(p => { if (p.google_sheet_id) productCount[p.google_sheet_id] = (productCount[p.google_sheet_id] ?? 0) + 1 })
  const defaultSheetId = (maps ?? []).find(m => m.linked_to_type === 'default')?.sheet_id ?? null

  return NextResponse.json({
    sheets: (sheets ?? []).map(s => ({ ...s, product_count: productCount[s.id] ?? 0, is_default: s.id === defaultSheetId })),
  })
}

// ── POST — add a sheet (validates access first) ──
const postSchema = z.object({
  storeId: z.string().uuid(),
  sheet_name: z.string().min(1),
  sheet_id: z.string().min(1),               // raw URL or ID
  sheet_page_name: z.string().optional().default('Sheet1'),
  isDefault: z.boolean().optional().default(false),
})
export async function POST(req: Request) {
  let body: z.infer<typeof postSchema>
  try { body = postSchema.parse(await req.json()) } catch { return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 }) }
  const supabase = db()
  const auth = await ownStore(supabase, body.storeId); if ('error' in auth) return auth.error

  const spreadsheetId = parseSpreadsheetId(body.sheet_id)
  const access = await testAccess(spreadsheetId)
  if (!access.ok) return NextResponse.json({ error: access.error }, { status: 400 })

  const { data: sheet, error } = await supabase.from('sheets').insert({
    store_id: body.storeId, sheet_name: body.sheet_name,
    sheet_id: spreadsheetId, sheet_page_name: body.sheet_page_name || 'Sheet1',
  }).select('*').single()
  if (error) return migrationErr()

  if (body.isDefault) {
    await supabase.from('sheet_mapping').delete().eq('linked_to_type', 'default')
      .in('sheet_id', (await supabase.from('sheets').select('id').eq('store_id', body.storeId)).data?.map(s => s.id) ?? [])
    await supabase.from('sheet_mapping').insert({ sheet_id: sheet.id, linked_to_type: 'default', linked_to_id: null })
  }
  return NextResponse.json({ sheet })
}

// ── PATCH — edit a sheet / set default ──
const patchSchema = z.object({
  storeId: z.string().uuid(), id: z.string().uuid(),
  sheet_name: z.string().optional(), sheet_page_name: z.string().optional(),
  is_active: z.boolean().optional(), isDefault: z.boolean().optional(),
})
export async function PATCH(req: Request) {
  let body: z.infer<typeof patchSchema>
  try { body = patchSchema.parse(await req.json()) } catch { return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 }) }
  const supabase = db()
  const auth = await ownStore(supabase, body.storeId); if ('error' in auth) return auth.error

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.sheet_name !== undefined) patch.sheet_name = body.sheet_name
  if (body.sheet_page_name !== undefined) patch.sheet_page_name = body.sheet_page_name
  if (body.is_active !== undefined) patch.is_active = body.is_active
  const { error } = await supabase.from('sheets').update(patch).eq('id', body.id).eq('store_id', body.storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (body.isDefault) {
    const ids = (await supabase.from('sheets').select('id').eq('store_id', body.storeId)).data?.map(s => s.id) ?? []
    await supabase.from('sheet_mapping').delete().eq('linked_to_type', 'default').in('sheet_id', ids)
    await supabase.from('sheet_mapping').insert({ sheet_id: body.id, linked_to_type: 'default', linked_to_id: null })
  }
  return NextResponse.json({ ok: true })
}

// ── DELETE — block if products still reference it ──
export async function DELETE(req: Request) {
  const body = await req.json().catch(() => ({}))
  const storeId = body.storeId as string, id = body.id as string
  if (!storeId || !id) return NextResponse.json({ error: 'storeId + id required' }, { status: 400 })
  const supabase = db()
  const auth = await ownStore(supabase, storeId); if ('error' in auth) return auth.error

  const { count } = await supabase.from('products').select('id', { count: 'exact', head: true })
    .eq('store_id', storeId).eq('google_sheet_id', id)
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: `لا يمكن الحذف: الشيت مربوط بـ ${count} منتج نشط. غيّر وجهتها أولاً.` }, { status: 409 })
  }
  const { error } = await supabase.from('sheets').delete().eq('id', id).eq('store_id', storeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
