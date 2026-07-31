// ============================================================
// GET   /api/mobile/v1/orders/[id] — full order detail + history
// PATCH /api/mobile/v1/orders/[id] — change status
//
// The PATCH delegates to the SAME status rules the web uses; it does not
// reimplement order logic, pricing, or delivery.
// ============================================================
export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { getMobileContext, ok, fail } from '@/lib/mobile/context'

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const { data: order, error } = await ctx.supabase
    .from('orders')
    .select('*, order_items(*, products(name,name_ar,images,price))')
    .eq('id', params.id)
    .eq('store_id', ctx.store.id) // store isolation, in addition to RLS
    .maybeSingle()

  if (error) return fail(error.message, 500)
  if (!order) return fail('Order not found', 404)

  let wilaya: string | null = null
  if ((order as any).wilaya_id) {
    const { data: w } = await ctx.supabase
      .from('wilayas').select('name_ar,name_fr').eq('id', (order as any).wilaya_id).maybeSingle()
    wilaya = (w as any)?.name_ar ?? (w as any)?.name_fr ?? null
  }

  // Timeline is best-effort — the table may be empty for older orders.
  const { data: history } = await ctx.supabase
    .from('order_history')
    .select('*')
    .eq('order_id', params.id)
    .order('created_at', { ascending: true })

  return ok({ order: { ...order, wilaya_name: wilaya }, history: history ?? [] })
}

// The full set from migration 009 + 'abandoned' (028). Kept explicit so the
// API rejects anything the DB CHECK constraint would reject anyway.
const STATUSES = [
  'new', 'confirmed', 'processing', 'shipped', 'delivered', 'returned', 'cancelled',
  'failed', 'failed_1', 'failed_2', 'failed_3', 'postponed', 'duplicate',
  'in_transit', 'out_for_delivery', 'with_driver', 'at_stopdesk', 'exception', 'abandoned',
] as const

const patchSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().max(500).optional(),
})

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return fail('حالة غير صالحة')

  const { status, note } = parsed.data

  // Confirm ownership before writing.
  const { data: existing } = await ctx.supabase
    .from('orders').select('id,status').eq('id', params.id).eq('store_id', ctx.store.id).maybeSingle()
  if (!existing) return fail('Order not found', 404)

  // Mirror the timestamp columns the web sets on the same transitions.
  const patch: Record<string, unknown> = { status }
  const now = new Date().toISOString()
  if (status === 'confirmed') patch.confirmed_at = now
  if (status === 'shipped') patch.shipped_at = now
  if (status === 'delivered') patch.delivered_at = now

  const { error } = await ctx.supabase
    .from('orders').update(patch).eq('id', params.id).eq('store_id', ctx.store.id)
  if (error) return fail(error.message, 500)

  // Audit trail — non-blocking, same as the web.
  try {
    await ctx.supabase.from('order_history').insert({
      order_id: params.id,
      store_id: ctx.store.id,
      from_status: (existing as any).status,
      to_status: status,
      note: note ?? 'تم التغيير من تطبيق الجوال',
      changed_by: ctx.userId,
    })
  } catch { /* history is best-effort */ }

  return ok({ id: params.id, status })
}
