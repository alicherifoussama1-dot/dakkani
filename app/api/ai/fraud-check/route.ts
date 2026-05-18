// ============================================================
// AI-Enhanced Fraud Check
// Combines rule-based scoring + optional AI analysis
// ============================================================
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { checkFraud } from '@/lib/fraud/score'

const schema = z.object({
  store_id:   z.string().uuid(),
  phone:      z.string(),
  name:       z.string(),
  wilaya_id:  z.number().int(),
  order_total: z.number(),
  order_id:   z.string().uuid().optional(),
})

export async function POST(req: Request) {
  try {
    const body   = await req.json()
    const data   = schema.parse(body)
    const cookieStore = cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { cookies: { get: (n) => cookieStore.get(n)?.value, set: (n,v,o) => { try { cookieStore.set({name:n,value:v,...o}) } catch {} }, remove: (n,o) => { try { cookieStore.set({name:n,value:'',...o}) } catch {} } } })

    const result = await checkFraud(supabase, {
      storeId:    data.store_id,
      phone:      data.phone,
      name:       data.name,
      wilayaId:   data.wilaya_id,
      orderTotal: data.order_total,
    })

    // Auto-blacklist if score >= 90
    if (result.score >= 90 && !result.isBlacklisted && data.order_id) {
      await supabase.from('blacklisted_customers').upsert({
        store_id:  data.store_id,
        phone:     data.phone,
        full_name: data.name,
        reason:    `تم الحظر تلقائياً: نقاط احتيال ${result.score}%`,
      }, { onConflict: 'store_id,phone' })
    }

    return NextResponse.json({
      score:          result.score,
      isBlacklisted:  result.isBlacklisted,
      shouldBlock:    result.shouldBlock,
      reasons:        result.reasons,
      recommendation: result.score >= 70 ? 'block'  :
                      result.score >= 40 ? 'review' : 'approve',
    })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    return NextResponse.json({ score: 0, shouldBlock: false }, { status: 200 })
  }
}
