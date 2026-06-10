// ============================================================
// Google Sheets registry API
//   GET    ?storeId=…                  → accounts + registered sheets
//   GET    ?storeId=…&lookup=<url|id>&accountId=… → spreadsheet meta (title + worksheets)
//   POST   { storeId, accountId, spreadsheet, worksheetName, isDefault } → register sheet
//   PATCH  { storeId, sheetId, status?, isDefault?, worksheetName? }     → update
//   DELETE { storeId, sheetId }        → remove
// Refresh tokens never leave this server.
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getAccessToken, getSpreadsheetMeta, parseSpreadsheetId } from '@/lib/google/sheets'

function sb() {
  const cookieStore = cookies()
  return createServerClient(
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
}

async function authStore(supabase: ReturnType<typeof sb>, storeId: string) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: store } = await supabase
    .from('stores').select('id').eq('id', storeId).eq('owner_id', user.id).single()
  return store ? user : null
}

// ── GET: list accounts + sheets, or lookup spreadsheet meta ───
export async function GET(req: Request) {
  const supabase = sb()
  const { searchParams } = new URL(req.url)
  const storeId = searchParams.get('storeId') ?? ''
  if (!storeId || !(await authStore(supabase, storeId))) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const lookup = searchParams.get('lookup')
  if (lookup) {
    const accountId = searchParams.get('accountId') ?? ''
    const spreadsheetId = parseSpreadsheetId(lookup)
    if (!spreadsheetId) return NextResponse.json({ error: 'رابط الشيت غير صالح' }, { status: 400 })

    const { data: account } = await supabase
      .from('google_accounts').select('refresh_token')
      .eq('id', accountId).eq('store_id', storeId).single()
    if (!account) return NextResponse.json({ error: 'حساب Google غير موجود' }, { status: 404 })

    const tok = await getAccessToken(account.refresh_token)
    if (!tok.ok) return NextResponse.json({ error: 'تعذر الاتصال بحساب Google — أعد ربط الحساب' }, { status: 502 })

    const meta = await getSpreadsheetMeta(tok.token, spreadsheetId)
    if (!meta.ok) return NextResponse.json({ error: meta.error }, { status: 400 })

    return NextResponse.json({ spreadsheetId, title: meta.title, worksheets: meta.worksheets })
  }

  const [accountsRes, sheetsRes] = await Promise.all([
    supabase.from('google_accounts').select('id,email,status,created_at').eq('store_id', storeId).order('created_at'),
    supabase.from('google_sheets').select('*').eq('store_id', storeId).order('created_at'),
  ])
  return NextResponse.json({ accounts: accountsRes.data ?? [], sheets: sheetsRes.data ?? [] })
}

// ── POST: register a sheet ────────────────────────────────────
const postSchema = z.object({
  storeId: z.string().uuid(),
  accountId: z.string().uuid(),
  spreadsheet: z.string().min(10),        // pasted URL or raw ID
  worksheetName: z.string().min(1),
  isDefault: z.boolean().default(false),
})

export async function POST(req: Request) {
  const supabase = sb()
  try {
    const body = postSchema.parse(await req.json())
    if (!(await authStore(supabase, body.storeId))) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const spreadsheetId = parseSpreadsheetId(body.spreadsheet)
    if (!spreadsheetId) return NextResponse.json({ error: 'رابط الشيت غير صالح' }, { status: 400 })

    const { data: account } = await supabase
      .from('google_accounts').select('refresh_token')
      .eq('id', body.accountId).eq('store_id', body.storeId).single()
    if (!account) return NextResponse.json({ error: 'حساب Google غير موجود' }, { status: 404 })

    // Verify access + grab the real title
    const tok = await getAccessToken(account.refresh_token)
    if (!tok.ok) return NextResponse.json({ error: 'تعذر الاتصال بحساب Google' }, { status: 502 })
    const meta = await getSpreadsheetMeta(tok.token, spreadsheetId)
    if (!meta.ok) return NextResponse.json({ error: `تعذر الوصول للشيت: ${meta.error}` }, { status: 400 })
    if (!meta.worksheets.includes(body.worksheetName)) {
      return NextResponse.json({ error: `ورقة العمل "${body.worksheetName}" غير موجودة في الشيت` }, { status: 400 })
    }

    if (body.isDefault) {
      await supabase.from('google_sheets').update({ is_default: false }).eq('store_id', body.storeId)
    }

    const { data: sheet, error } = await supabase
      .from('google_sheets')
      .insert({
        store_id: body.storeId,
        account_id: body.accountId,
        spreadsheet_id: spreadsheetId,
        spreadsheet_name: meta.title,
        worksheet_name: body.worksheetName,
        is_default: body.isDefault,
        status: true,
      })
      .select()
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ sheet })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// ── PATCH: toggle status / set default / change worksheet ─────
const patchSchema = z.object({
  storeId: z.string().uuid(),
  sheetId: z.string().uuid(),
  status: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  worksheetName: z.string().min(1).optional(),
})

export async function PATCH(req: Request) {
  const supabase = sb()
  try {
    const body = patchSchema.parse(await req.json())
    if (!(await authStore(supabase, body.storeId))) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    if (body.isDefault === true) {
      await supabase.from('google_sheets').update({ is_default: false }).eq('store_id', body.storeId)
    }

    const patch: Record<string, any> = {}
    if (body.status !== undefined)        patch.status = body.status
    if (body.isDefault !== undefined)     patch.is_default = body.isDefault
    if (body.worksheetName !== undefined) patch.worksheet_name = body.worksheetName

    const { error } = await supabase
      .from('google_sheets').update(patch)
      .eq('id', body.sheetId).eq('store_id', body.storeId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}

// ── DELETE: remove a sheet registration ───────────────────────
export async function DELETE(req: Request) {
  const supabase = sb()
  try {
    const { storeId, sheetId } = z.object({ storeId: z.string().uuid(), sheetId: z.string().uuid() }).parse(await req.json())
    if (!(await authStore(supabase, storeId))) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }
    const { error } = await supabase.from('google_sheets').delete().eq('id', sheetId).eq('store_id', storeId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
  }
}
