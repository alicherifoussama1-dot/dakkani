// ============================================================
// GET    /api/mobile/v1/products/[id] — full product for the editor
// PATCH  /api/mobile/v1/products/[id] — update (partial)
// DELETE /api/mobile/v1/products/[id] — soft delete (is_active=false) or hard
//
// Every query is scoped by store_id in addition to RLS.
// ============================================================
export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { getMobileContext, ok, fail } from '@/lib/mobile/context'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const { data: product, error } = await ctx.supabase
    .from('products').select('*')
    .eq('id', params.id).eq('store_id', ctx.store.id).maybeSingle()

  if (error) return fail(error.message, 500)
  if (!product) return fail('Product not found', 404)

  // Per-variant available stock, keyed like the storefront expects.
  const { data: stock } = await ctx.supabase
    .from('warehouse_stock').select('variant_key,quantity,reserved')
    .eq('product_id', params.id).eq('store_id', ctx.store.id)

  const stockMap: Record<string, number> = {}
  for (const s of stock ?? []) {
    const k = (s as any).variant_key || 'default'
    stockMap[k] = (stockMap[k] ?? 0) + ((s as any).quantity - (s as any).reserved)
  }

  return ok({ product, stock: stockMap })
}

// Only fields the mobile editor is allowed to touch. Anything not listed
// here (tracking columns, routing, theme, store_id…) is unreachable from
// the app by construction.
const patchSchema = z.object({
  name: z.string().min(2).optional(),
  name_ar: z.string().min(2).optional(),
  description: z.string().optional(),
  description_ar: z.string().optional(),
  price: z.number().nonnegative().optional(),
  compare_price: z.number().nonnegative().nullable().optional(),
  sku: z.string().optional(),
  is_active: z.boolean().optional(),
  images: z.array(z.object({ url: z.string().url() }).passthrough()).optional(),
  variants: z.array(z.any()).optional(),
}).strict()

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'بيانات غير صالحة')
  if (Object.keys(parsed.data).length === 0) return fail('لا توجد حقول للتحديث')

  // Mirror the web rule: a discount price must exceed the selling price.
  const body: Record<string, unknown> = { ...parsed.data }
  if (body.compare_price != null && body.price != null &&
      Number(body.compare_price) > 0 && Number(body.compare_price) <= Number(body.price)) {
    return fail('السعر قبل الخصم يجب أن يكون أكبر من السعر الحالي')
  }

  const { data, error } = await ctx.supabase
    .from('products').update(body)
    .eq('id', params.id).eq('store_id', ctx.store.id)
    .select('*').maybeSingle()

  if (error) return fail(error.message, 500)
  if (!data) return fail('Product not found', 404)
  return ok({ product: data })
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const hard = new URL(req.url).searchParams.get('hard') === 'true'

  // A product referenced by existing orders must NEVER be hard-deleted —
  // it would break order history. Fall back to deactivating it.
  if (hard) {
    const { count } = await ctx.supabase
      .from('order_items').select('id', { count: 'exact', head: true })
      .eq('product_id', params.id)
    if ((count ?? 0) > 0) {
      return fail('لا يمكن حذف منتج مرتبط بطلبات — تم إخفاؤه بدلاً من ذلك', 409)
    }
    const { error } = await ctx.supabase
      .from('products').delete().eq('id', params.id).eq('store_id', ctx.store.id)
    if (error) return fail(error.message, 500)
    return ok({ deleted: 'hard' })
  }

  const { error } = await ctx.supabase
    .from('products').update({ is_active: false })
    .eq('id', params.id).eq('store_id', ctx.store.id)
  if (error) return fail(error.message, 500)
  return ok({ deleted: 'soft' })
}
