import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { z } from 'zod'

const schema = z.object({
  store_id: z.string().uuid(),
  email: z.string().email().max(200),
})

export async function POST(req: Request) {
  try {
    const { store_id, email } = schema.parse(await req.json())
    const supabase = createPublicClient()
    // Idempotent: UNIQUE(store_id,email) — ignore duplicate as success.
    const { error } = await supabase.from('newsletter_subscribers').insert({ store_id, email })
    if (error && !/duplicate|unique/i.test(error.message)) {
      return NextResponse.json({ error: 'تعذّر الاشتراك' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'بيانات غير صحيحة' }, { status: 400 })
  }
}
