// Vercel Cron: runs every 30 min — syncs delivery status from providers
import { createClient } from '@supabase/supabase-js'
import { NextResponse }  from 'next/server'
import type { NextRequest } from 'next/server'
import { YalidineDelivery } from '@/lib/delivery/yalidine'
import { NORMALIZED_TO_ORDER_STATUS } from '@/lib/delivery/types'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get all shipped orders with tracking numbers
  const { data: orders } = await supabase
    .from('orders')
    .select('id, store_id, tracking_number, delivery_partner, status, delivery_timeline')
    .eq('status', 'shipped')
    .not('tracking_number', 'is', null)
    .limit(50)

  let updated = 0

  for (const order of orders ?? []) {
    if (!order.tracking_number) continue

    try {
      if (order.delivery_partner === 'yalidine' && process.env.YALIDINE_API_ID) {
        const provider = new YalidineDelivery(
          process.env.YALIDINE_API_ID,
          process.env.YALIDINE_API_TOKEN ?? ''
        )
        const result = await provider.trackParcel(order.tracking_number)
        if (result.success && result.normalizedStatus) {
          const newStatus = NORMALIZED_TO_ORDER_STATUS[result.normalizedStatus]
          if (newStatus && newStatus !== order.status) {
            await supabase.from('orders').update({
              status: newStatus,
              ...(newStatus === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
            }).eq('id', order.id)
            updated++
          }
        }
      }
    } catch { /* skip this order */ }
  }

  return NextResponse.json({ ok: true, checked: orders?.length ?? 0, updated })
}
