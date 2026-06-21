// POST /api/sheets/test — verify the service account can access the sheet
// AND the required headers exist in row 1. Returns a clear Arabic status.
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { parseSpreadsheetId, testAccess, validateHeaders, ensureHeaders } from '@/lib/google/service-account'

const schema = z.object({
  sheet_id: z.string().min(1),
  sheet_page_name: z.string().optional().default('Sheet1'),
  writeHeaders: z.boolean().optional().default(false),
})

export async function POST(req: Request) {
  const c = cookies()
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get: (n) => c.get(n)?.value, set: (n, v, o: CookieOptions) => { try { c.set({ name: n, value: v, ...o }) } catch {} }, remove: (n, o: CookieOptions) => { try { c.set({ name: n, value: '', ...o }) } catch {} } },
  })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) } catch { return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 }) }

  const id = parseSpreadsheetId(body.sheet_id)
  const page = body.sheet_page_name || 'Sheet1'

  // 1) access (sheet exists + editor permission)
  const access = await testAccess(id)
  if (!access.ok) return NextResponse.json({ ok: false, stage: 'access', error: access.error }, { status: 200 })
  if (!access.worksheets.includes(page)) {
    return NextResponse.json({ ok: false, stage: 'worksheet', error: `الورقة "${page}" غير موجودة. الأوراق المتاحة: ${access.worksheets.join('، ')}` }, { status: 200 })
  }

  // 2) optionally write the header row when the sheet is empty
  if (body.writeHeaders) await ensureHeaders(id, page)

  // 3) headers present
  const headers = await validateHeaders(id, page)
  if (!headers.ok) return NextResponse.json({ ok: false, stage: 'headers', error: headers.error, title: access.title }, { status: 200 })

  return NextResponse.json({ ok: true, title: access.title, message: 'نجح الاتصال ✓ الشيت متاح وحساب الخدمة يملك صلاحية التعديل والأعمدة صحيحة.' })
}
