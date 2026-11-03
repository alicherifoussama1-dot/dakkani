// Bulk manual send of selected orders / abandoned drafts to Google Sheets.
// Owner-scoped: the store must belong to the signed-in merchant, and every
// order is looked up with that store_id, so foreign ids are simply not found.
import { createServerClient, type CookieOptions } from '@/lib/db/compat/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { resendOrderToSheet } from '@/lib/orders/resend-to-sheet'

// Sheets appends are sequential (keeps row order and stays under the API
// rate limit), so one request is capped; the UI only sends one page anyway.
const MAX_ORDERS = 50

const schema = z.object({
  storeId: z.string().uuid(),
  orderIds: z.array(z.string().uuid()).min(1).max(MAX_ORDERS),
})

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

export async function POST(req: Request) {
  let body: z.infer<typeof schema>
  try { body = schema.parse(await req.json()) } catch { return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 }) }

  const supabase = db()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: store } = await supabase.from('stores').select('id, owner_id').eq('id', body.storeId).single()
  if (!store || store.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const results: { id: string; ok: boolean; error?: string }[] = []
  for (const id of Array.from(new Set(body.orderIds))) {
    const r = await resendOrderToSheet(id, body.storeId)
    results.push(r.ok ? { id, ok: true } : { id, ok: false, error: r.error })
  }
  const sent = results.filter(r => r.ok).length
  return NextResponse.json({ sent, failed: results.length - sent, results })
}
