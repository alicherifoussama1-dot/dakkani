// Storefront newsletter signup (NewsletterBlock). Idempotent per store+email.
import { NextResponse } from 'next/server'
import { query } from '@/lib/db/pool'

export const dynamic = 'force-dynamic'

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i
const UUID = /^[0-9a-f-]{36}$/i

export async function POST(req: Request) {
  const { store_id, email } = await req.json().catch(() => ({}))
  const clean = String(email ?? '').trim().toLowerCase()
  if (!UUID.test(String(store_id ?? '')) || !EMAIL.test(clean)) {
    return NextResponse.json({ error: 'أدخل بريداً إلكترونياً صحيحاً' }, { status: 400 })
  }
  const rows = await query(
    `insert into newsletter_subscribers (store_id, email)
     select id, $2 from stores where id = $1 and is_active
     on conflict (store_id, email) do nothing
     returning id`,
    [store_id, clean],
  )
  return NextResponse.json({ ok: true, new: rows.length > 0 })
}
