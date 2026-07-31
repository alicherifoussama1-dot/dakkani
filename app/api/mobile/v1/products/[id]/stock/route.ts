// ============================================================
// PATCH /api/mobile/v1/products/[id]/stock — set available quantity.
//
// Writes to warehouse_stock (the same table the web editor uses), never
// to a duplicated column, so web and mobile always agree on stock.
// ============================================================
export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { getMobileContext, ok, fail } from '@/lib/mobile/context'

const schema = z.object({
  quantity: z.number().int().min(0, 'الكمية لا يمكن أن تكون سالبة'),
  variant_key: z.string().default('default'),
  warehouse_id: z.string().uuid().optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'بيانات غير صالحة')
  const { quantity, variant_key } = parsed.data

  // Ownership check before any write.
  const { data: product } = await ctx.supabase
    .from('products').select('id').eq('id', params.id).eq('store_id', ctx.store.id).maybeSingle()
  if (!product) return fail('Product not found', 404)

  // Default warehouse — the web editor uses the store's first warehouse.
  let warehouseId = parsed.data.warehouse_id
  if (!warehouseId) {
    const { data: wh } = await ctx.supabase
      .from('warehouses').select('id').eq('store_id', ctx.store.id)
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    warehouseId = (wh as any)?.id
  }
  if (!warehouseId) return fail('لا يوجد مخزن لهذا المتجر — أنشئ مخزناً أولاً', 409)

  const { data: existing } = await ctx.supabase
    .from('warehouse_stock').select('id,reserved')
    .eq('product_id', params.id).eq('store_id', ctx.store.id)
    .eq('warehouse_id', warehouseId).eq('variant_key', variant_key).maybeSingle()

  if (existing) {
    // `quantity` from the app is AVAILABLE stock; reserved units are already
    // committed to open orders, so store quantity = available + reserved.
    const reserved = Number((existing as any).reserved ?? 0)
    const { error } = await ctx.supabase
      .from('warehouse_stock').update({ quantity: quantity + reserved })
      .eq('id', (existing as any).id)
    if (error) return fail(error.message, 500)
  } else {
    const { error } = await ctx.supabase.from('warehouse_stock').insert({
      store_id: ctx.store.id, product_id: params.id, warehouse_id: warehouseId,
      variant_key, quantity, reserved: 0,
    })
    if (error) return fail(error.message, 500)
  }

  return ok({ stock: quantity, variant_key })
}
