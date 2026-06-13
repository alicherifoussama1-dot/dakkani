// Vercel Cron — periodically sync unified tracking status into orders.
// Works across ALL providers and ALL stores (per-store encrypted creds).
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { adapterFromRow, UNIFIED_TO_ORDER_STATUS } from '@/lib/delivery'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  // In-flight orders that have a shipment but aren't in a terminal state.
  const { data: orders } = await supabase
    .from('orders')
    .select('id, tracking_number, delivery_provider_id, status')
    .not('tracking_number', 'is', null)
    .not('delivery_provider_id', 'is', null)
    .not('status', 'in', '(delivered,returned,cancelled)')
    .limit(80)

  // Cache adapters per provider id to avoid rebuilding/decrypting repeatedly.
  const adapterCache = new Map<string, ReturnType<typeof adapterFromRow>>()
  let updated = 0

  for (const order of orders ?? []) {
    try {
      let adapter = adapterCache.get(order.delivery_provider_id!)
      if (!adapter) {
        const { data: provider } = await supabase.from('delivery_providers').select('*').eq('id', order.delivery_provider_id).single()
        if (!provider) continue
        adapter = adapterFromRow(provider)
        adapterCache.set(order.delivery_provider_id!, adapter)
      }
      const result = await adapter.getTracking(order.tracking_number!)
      if (result.success && result.status) {
        const newStatus = UNIFIED_TO_ORDER_STATUS[result.status]
        if (newStatus && newStatus !== order.status) {
          await supabase.from('orders').update({
            status: newStatus,
            tracking_status: result.status,
            ...(result.status === 'delivered' ? { delivered_at: new Date().toISOString() } : {}),
          }).eq('id', order.id)
          updated++
        }
      }
    } catch { /* skip */ }
  }

  return NextResponse.json({ ok: true, checked: orders?.length ?? 0, updated })
}
