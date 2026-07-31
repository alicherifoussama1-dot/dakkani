// ============================================================
// GET   /api/mobile/v1/reviews — list
// PATCH /api/mobile/v1/reviews — approve / hide / reply
// ============================================================
export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { getMobileContext, ok, fail } from '@/lib/mobile/context'

export async function GET(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const status = new URL(req.url).searchParams.get('status') // approved | pending
  let q = ctx.supabase
    .from('reviews')
    .select('id,product_id,customer_name,rating,comment,is_approved,is_verified,reply,replied_at,created_at,products(name,name_ar)')
    .eq('store_id', ctx.store.id)
    .order('created_at', { ascending: false })
    .limit(100)

  if (status === 'approved') q = q.eq('is_approved', true)
  if (status === 'pending') q = q.eq('is_approved', false)

  const { data, error } = await q
  if (error) return ok({ reviews: [], avg: 0, total: 0 })

  const rows = (data ?? []).map((r: any) => ({
    id: r.id,
    product_name: r.products?.name_ar ?? r.products?.name ?? null,
    customer_name: r.customer_name,
    rating: r.rating,
    comment: r.comment,
    is_approved: r.is_approved,
    is_verified: r.is_verified,
    reply: r.reply,
    created_at: r.created_at,
  }))
  const avg = rows.length
    ? Math.round((rows.reduce((a: number, r: any) => a + (r.rating ?? 0), 0) / rows.length) * 10) / 10
    : 0

  return ok({ reviews: rows, avg, total: rows.length })
}

const patchSchema = z.object({
  id: z.string().uuid(),
  is_approved: z.boolean().optional(),
  reply: z.string().max(1000).optional(),
}).refine(v => v.is_approved !== undefined || v.reply !== undefined, {
  message: 'لا يوجد تغيير',
})

export async function PATCH(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail(parsed.error.errors[0]?.message ?? 'بيانات غير صالحة')

  const { id, ...rest } = parsed.data
  const patch: Record<string, unknown> = { ...rest }
  if (rest.reply !== undefined) patch.replied_at = new Date().toISOString()

  const { error } = await ctx.supabase
    .from('reviews').update(patch).eq('id', id).eq('store_id', ctx.store.id)
  if (error) return fail(error.message, 500)
  return ok({ updated: true })
}
