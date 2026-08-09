// ============================================================
// GET /api/mobile/v1/products — list with stock + performance.
// Read-only; product mutations reuse the existing web endpoints.
// ============================================================
export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { getMobileContext, ok, fail, ilikeTerm } from '@/lib/mobile/context'

export async function GET(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const url = new URL(req.url)
  const search = url.searchParams.get('q')?.trim()
  const filter = url.searchParams.get('filter') ?? 'all'
  const limit = Math.min(Number(url.searchParams.get('limit') ?? 30), 60)

  let q = ctx.supabase
    .from('products')
    .select('id,name,name_ar,slug,sku,price,compare_price,images,is_active,variants,created_at')
    .eq('store_id', ctx.store.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  // SKU is included because both clients advertise it ("ابحث باسم المنتج أو
  // SKU"); searching only the names made that promise false.
  if (search) {
    const v = ilikeTerm(search)
    q = q.or(`name.ilike.${v},name_ar.ilike.${v},sku.ilike.${v}`)
  }
  if (filter === 'active') q = q.eq('is_active', true)
  if (filter === 'hidden') q = q.eq('is_active', false)

  const { data, error } = await q
  if (error) return ok({ products: [], error: error.message })

  const ids = (data ?? []).map((p: any) => p.id)

  // Stock and order counts in two batched queries, not N+1.
  const [stockRes, itemsRes] = await Promise.all([
    ids.length
      ? ctx.supabase.from('warehouse_stock').select('product_id,quantity,reserved')
          .eq('store_id', ctx.store.id).in('product_id', ids)
      : Promise.resolve({ data: [] as any[] }),
    ids.length
      ? ctx.supabase.from('order_items').select('product_id,orders!inner(status)')
          .eq('store_id', ctx.store.id).in('product_id', ids)
      : Promise.resolve({ data: [] as any[] }),
  ])

  const stock: Record<string, number> = {}
  for (const s of (stockRes as any).data ?? []) {
    stock[s.product_id] = (stock[s.product_id] ?? 0) + (s.quantity - s.reserved)
  }

  const orders: Record<string, number> = {}
  const abandoned: Record<string, number> = {}
  for (const it of (itemsRes as any).data ?? []) {
    orders[it.product_id] = (orders[it.product_id] ?? 0) + 1
    if (it.orders?.status === 'abandoned') abandoned[it.product_id] = (abandoned[it.product_id] ?? 0) + 1
  }

  const products = (data ?? []).map((p: any) => {
    const ord = orders[p.id] ?? 0
    return {
      id: p.id,
      name: p.name_ar ?? p.name,
      slug: p.slug,
      sku: p.sku ?? null,
      price: Number(p.price ?? 0),
      compare_price: p.compare_price ? Number(p.compare_price) : null,
      discount_pct: p.compare_price && p.compare_price > p.price
        ? Math.round(((p.compare_price - p.price) / p.compare_price) * 100) : 0,
      image: Array.isArray(p.images) ? p.images[0]?.url ?? null : null,
      is_active: p.is_active,
      variants: p.variants ?? [],
      stock: stock[p.id] ?? 0,
      orders_count: ord,
      abandonment_rate: ord ? Math.round(((abandoned[p.id] ?? 0) / ord) * 100) : 0,
    }
  })

  const out = filter === 'out' ? products.filter((p: any) => p.stock <= 0)
            : filter === 'low' ? products.filter((p: any) => p.stock > 0 && p.stock < 15)
            : products

  return ok({ products: out, total: out.length })
}

// ── POST /api/mobile/v1/products — create ──────────────────
const createSchema = z.object({
  name: z.string().min(2, 'اسم المنتج مطلوب'),
  name_ar: z.string().optional(),
  price: z.number().positive('السعر يجب أن يكون أكبر من صفر'),
  compare_price: z.number().nonnegative().nullable().optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  sku: z.string().optional(),
  images: z.array(z.object({ url: z.string().url() }).passthrough()).optional(),
  variants: z.array(z.any()).optional(),
  is_active: z.boolean().default(true),
})

/** name → url slug; Arabic-safe. Explicit ranges instead of \p{L}\p{N},
 *  because the Unicode property flag `u` needs an ES6+ target and this
 *  project compiles below that. Keeps: Arabic (0600–06FF), Latin, digits. */
function slugify(s: string) {
  return s.trim().toLowerCase()
    .replace(/[^a-z0-9؀-ۿ]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `product-${Date.now()}`
}

export async function POST(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'بيانات غير صالحة')

  const d = parsed.data
  if (d.compare_price != null && d.compare_price > 0 && d.compare_price <= d.price) {
    return fail('السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي')
  }

  // Unique slug within the store — retry once with a suffix on collision.
  let slug = slugify(d.name_ar || d.name)
  const { data: clash } = await ctx.supabase
    .from('products').select('id').eq('store_id', ctx.store.id).eq('slug', slug).maybeSingle()
  if (clash) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  const { data, error } = await ctx.supabase
    .from('products')
    .insert({
      store_id: ctx.store.id,
      name: d.name,
      name_ar: d.name_ar ?? d.name,
      slug,
      price: d.price,
      compare_price: d.compare_price ?? null,
      description: d.description ?? null,
      description_ar: d.description_ar ?? null,
      sku: d.sku ?? null,
      images: d.images ?? [],
      variants: d.variants ?? [],
      is_active: d.is_active,
    })
    .select('*').single()

  if (error) return fail(error.message, 500)
  return ok({ product: data }, { status: 201 })
}
