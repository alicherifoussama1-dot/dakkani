// Customer-facing order tracking: phone number → that store's recent orders.
// Returns only what a customer needs to follow a parcel (no address, no full
// name), and is rate-limited per IP so it cannot be used to scan numbers.
import { NextResponse } from 'next/server'
import { query } from '@/lib/db/pool'

export const dynamic = 'force-dynamic'

const WINDOW = 10 * 60_000, MAX_HITS = 15
const hits = new Map<string, { n: number; at: number }>()
function limited(ip: string) {
  const now = Date.now()
  const h = hits.get(ip)
  if (!h || now - h.at > WINDOW) { hits.set(ip, { n: 1, at: now }); return false }
  h.n++
  return h.n > MAX_HITS
}

export async function POST(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  if (limited(ip)) return NextResponse.json({ error: 'محاولات كثيرة، أعد المحاولة بعد قليل' }, { status: 429 })

  const { storeSlug, phone } = await req.json().catch(() => ({}))
  // Compare on the last 9 digits so 0555…, +213555… and 213555… all match.
  const digits = String(phone ?? '').replace(/\D/g, '')
  if (!storeSlug || digits.length < 9) return NextResponse.json({ error: 'أدخل رقم هاتف صحيحاً' }, { status: 400 })
  const last9 = digits.slice(-9)

  const orders = await query(
    `select o.id, o.order_number, o.created_at, o.status, o.total, o.tracking_number,
            o.delivery_partner, o.delivery_type, o.confirmed_at, o.shipped_at, o.delivered_at,
            split_part(coalesce(o.customer_name, ''), ' ', 1) as first_name,
            coalesce((select json_agg(json_build_object('name', i.product_name, 'qty', i.quantity, 'variant', i.variant_key))
                        from order_items i where i.order_id = o.id), '[]') as items
       from orders o join stores s on s.id = o.store_id
      where s.slug = $1 and s.is_active
        and right(regexp_replace(coalesce(o.customer_phone, ''), '\\D', '', 'g'), 9) = $2
        and o.status not in ('abandoned', 'duplicate')
        and coalesce(o.is_trashed, false) = false
      order by o.created_at desc
      limit 5`,
    [storeSlug, last9],
  )
  return NextResponse.json({ orders: orders.map(({ id, ...o }) => o) })
}
