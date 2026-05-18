// Vercel Cron: runs hourly — auto-blacklists customers with 3+ cancellations
import { createClient } from '@supabase/supabase-js'
import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Find all stores
  const { data: stores } = await supabase.from('stores').select('id')
  let flagged = 0

  for (const store of stores ?? []) {
    // Get customers with 3+ cancellations not yet blacklisted
    const { data: candidates } = await supabase.rpc('get_blacklist_candidates' as any, {
      p_store_id: store.id,
      p_threshold: 3,
    })

    for (const c of candidates ?? []) {
      await supabase.from('blacklisted_customers').upsert({
        store_id:  store.id,
        phone:     c.customer_phone,
        full_name: c.customer_name,
        reason:    `حظر تلقائي: ${c.cancel_count} طلبات ملغاة/مرجعة`,
      }, { onConflict: 'store_id,phone' })
      flagged++
    }
  }

  return NextResponse.json({ ok: true, flagged })
}
