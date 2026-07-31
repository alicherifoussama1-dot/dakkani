// ============================================================
// GET /api/mobile/v1/customers — derived from orders (same as the web,
// which has no customers table; the phone number is the identity key).
// ============================================================
export const dynamic = 'force-dynamic'

import { getMobileContext, ok } from '@/lib/mobile/context'

export async function GET(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const url = new URL(req.url)
  const search = url.searchParams.get('q')?.trim()
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)

  let q = ctx.supabase
    .from('orders')
    .select('customer_name,customer_phone,total,status,wilaya_id,baladia,created_at')
    .eq('store_id', ctx.store.id)
    .order('created_at', { ascending: false })
    .limit(1000) // aggregate window

  if (search) q = q.or(`customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%`)

  const { data, error } = await q
  if (error) return ok({ customers: [], error: error.message })

  // Aggregate by phone. Spend excludes abandoned — same rule as revenue.
  const map = new Map<string, any>()
  for (const o of data ?? []) {
    const key = (o as any).customer_phone
    if (!key) continue
    const cur = map.get(key) ?? {
      phone: key, name: (o as any).customer_name,
      wilaya_id: (o as any).wilaya_id, commune: (o as any).baladia,
      orders: 0, spend: 0, last_order: (o as any).created_at,
    }
    cur.orders += 1
    if ((o as any).status !== 'abandoned') cur.spend += Number((o as any).total ?? 0)
    map.set(key, cur)
  }

  const customers = Array.from(map.values()).sort((a, b) => b.spend - a.spend).slice(0, limit)

  const ids = Array.from(new Set(customers.map((c: any) => c.wilaya_id).filter(Boolean)))
  if (ids.length) {
    const { data: ws } = await ctx.supabase.from('wilayas').select('id,name_ar,name_fr').in('id', ids)
    const names: Record<number, string> = {}
    for (const w of ws ?? []) names[(w as any).id] = (w as any).name_ar ?? (w as any).name_fr
    customers.forEach((c: any) => { c.wilaya_name = names[c.wilaya_id] ?? null })
  }

  return ok({ customers, total: customers.length })
}
