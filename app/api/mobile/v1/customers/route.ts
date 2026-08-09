// ============================================================
// GET /api/mobile/v1/customers — derived from orders (same as the web,
// which has no customers table; the phone number is the identity key).
// ============================================================
export const dynamic = 'force-dynamic'

import { getMobileContext, ok, ilikeTerm } from '@/lib/mobile/context'

export async function GET(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const url = new URL(req.url)
  const search = url.searchParams.get('q')?.trim()
  const phone = url.searchParams.get('phone')?.trim()
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)

  // ── Single-customer aggregate ────────────────────────────────
  // The detail screen used to recompute totals from one page of a fuzzy
  // order search, so a customer with more orders than the page showed the
  // page length as their order count. An exact phone match aggregates every
  // one of their orders instead.
  if (phone) {
    const { data, error, count } = await ctx.supabase
      .from('orders')
      .select('customer_name,total,status,wilaya_id,baladia,created_at', { count: 'exact' })
      .eq('store_id', ctx.store.id)
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) return ok({ customer: null, error: error.message })
    const rows = data ?? []
    if (rows.length === 0) return ok({ customer: null })

    const first: any = rows[0]
    // Spend excludes abandoned — the same rule revenue uses everywhere.
    const spend = rows
      .filter((o: any) => o.status !== 'abandoned')
      .reduce((a: number, o: any) => a + Number(o.total ?? 0), 0)

    let wilaya_name: string | null = null
    if (first.wilaya_id) {
      const { data: w } = await ctx.supabase
        .from('wilayas').select('name_ar,name_fr').eq('id', first.wilaya_id).maybeSingle()
      wilaya_name = (w as any)?.name_ar ?? (w as any)?.name_fr ?? null
    }

    return ok({
      customer: {
        phone,
        name: first.customer_name,
        wilaya_id: first.wilaya_id ?? null,
        wilaya_name,
        commune: first.baladia ?? null,
        // `count` is PostgREST's exact count, not the page length.
        orders: count ?? rows.length,
        spend,
        last_order: first.created_at,
      },
    })
  }

  let q = ctx.supabase
    .from('orders')
    .select('customer_name,customer_phone,total,status,wilaya_id,baladia,created_at')
    .eq('store_id', ctx.store.id)
    .order('created_at', { ascending: false })
    .limit(1000) // aggregate window

  if (search) {
    const v = ilikeTerm(search)
    q = q.or(`customer_name.ilike.${v},customer_phone.ilike.${v}`)
  }

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
