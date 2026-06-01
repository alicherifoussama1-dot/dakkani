// ============================================================
// Customer Review Submission API
// ============================================================
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  store_id:      z.string().uuid(),
  product_id:    z.string().uuid().optional(),
  customer_name: z.string().min(2).max(50),
  rating:        z.number().int().min(1).max(5),
  comment:       z.string().max(500).optional(),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase.from('reviews').insert({
      store_id:      data.store_id,
      product_id:    data.product_id,
      customer_name: data.customer_name,
      rating:        data.rating,
      comment:       data.comment,
      is_approved:   false, // Requires manual approval
      created_at:    new Date().toISOString(),
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, message: 'شكراً! رأيك سيظهر بعد المراجعة' })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'بيانات غير صالحة' }, { status: 400 })
    }
    return NextResponse.json({ error: 'خطأ في الخادم' }, { status: 500 })
  }
}
