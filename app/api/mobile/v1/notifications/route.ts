// ============================================================
// GET   /api/mobile/v1/notifications — list + unread count
// PATCH /api/mobile/v1/notifications — mark one / all as read
//
// Same table the web notification bell already uses.
// ============================================================
export const dynamic = 'force-dynamic'

import { getMobileContext, ok, fail } from '@/lib/mobile/context'

export async function GET(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const { data, error } = await ctx.supabase
    .from('confirmili_notifications')
    .select('*')
    .eq('store_id', ctx.store.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Table may not exist on a database without migration 010 — degrade to empty
  // rather than 500ing the whole notification screen.
  if (error) return ok({ notifications: [], unread: 0 })

  const notifications = data ?? []
  return ok({
    notifications,
    unread: notifications.filter((n: any) => !n.is_read).length,
  })
}

export async function PATCH(req: Request) {
  const ctx = await getMobileContext(req)
  if ('error' in ctx) return ctx.error

  const body = await req.json().catch(() => ({})) as { id?: string; all?: boolean }

  let q = ctx.supabase
    .from('confirmili_notifications')
    .update({ is_read: true })
    .eq('store_id', ctx.store.id)

  if (body.id) q = q.eq('id', body.id)
  else if (!body.all) return fail('Supply { id } or { all: true }')

  const { error } = await q
  if (error) return fail(error.message, 500)

  return ok({ updated: true })
}
