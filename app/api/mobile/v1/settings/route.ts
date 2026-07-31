// ============================================================
// GET   /api/mobile/v1/settings — store settings
// PATCH /api/mobile/v1/settings — update a SAFE SUBSET only
//
// The whitelist deliberately EXCLUDES anything that would alter money,
// delivery or tracking behaviour: fraud_auto_block_score, checkout_* ,
// default_delivery_partner, free_delivery_threshold, order_routing, and
// every pixel/attribution field. Those stay web-only.
// ============================================================
export const dynamic = 'force-dynamic'

import { z } from 'zod'
import { getMobileContext, ok, fail } from '@/lib/mobile/context'

export async function GET(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const { data, error } = await ctx.supabase
    .from('store_settings').select('*').eq('store_id', ctx.store.id).maybeSingle()

  if (error) return ok({ settings: null })
  return ok({ settings: data ?? null })
}

/** Notification + contact preferences only — nothing that changes pricing,
 *  delivery routing, checkout behaviour or attribution. */
const schema = z.object({
  order_sms: z.boolean().optional(),
  order_email: z.boolean().optional(),
  low_stock_alert: z.boolean().optional(),
  low_stock_threshold: z.number().int().min(0).max(1000).optional(),
  whatsapp_number: z.string().max(20).nullable().optional(),
  call_number: z.string().max(20).nullable().optional(),
  thankyou_wa_enabled: z.boolean().optional(),
  thankyou_call_enabled: z.boolean().optional(),
}).strict()

export async function PATCH(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const parsed = schema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) {
    return fail(parsed.error.errors[0]?.message ?? 'هذا الإعداد غير قابل للتعديل من التطبيق')
  }
  if (Object.keys(parsed.data).length === 0) return fail('لا توجد حقول للتحديث')

  const { data, error } = await ctx.supabase
    .from('store_settings').update(parsed.data)
    .eq('store_id', ctx.store.id).select('*').maybeSingle()

  if (error) return fail(error.message, 500)
  return ok({ settings: data })
}
