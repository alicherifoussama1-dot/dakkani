// Support Mode sessions — start (POST) / end (PATCH). Audited + merchant-visible.
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformPermission, rbacResponse, RbacError } from '@/lib/platform/rbac'
import { startSupportSession, endSupportSession } from '@/lib/platform/support'
import { checkRateLimit, rateLimitResponse } from '@/lib/platform/rate-limit'

const startSchema = z.object({
  store_id: z.string().uuid(),
  reason: z.string().min(5).max(500),
})

export async function POST(req: Request) {
  try {
    const ctx = await requirePlatformPermission('platform.support.start')
    const rl = checkRateLimit(`support-start:${ctx.userId}`, { limit: 10, windowMs: 60_000 })
    if (!rl.allowed) return rateLimitResponse(rl)

    const body = startSchema.parse(await req.json())
    const session = await startSupportSession({
      supportUserId: ctx.userId,
      supportEmail: ctx.email,
      storeId: body.store_id,
      reason: body.reason,
      request: req,
    })
    return NextResponse.json({ session })
  } catch (e) {
    if (e instanceof RbacError) return rbacResponse(e)
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid payload', details: e.errors }, { status: 400 })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to start session' }, { status: 500 })
  }
}

const endSchema = z.object({ session_id: z.string().uuid() })

export async function PATCH(req: Request) {
  try {
    const ctx = await requirePlatformPermission('platform.support.start')
    const body = endSchema.parse(await req.json())
    const session = await endSupportSession({
      sessionId: body.session_id,
      supportUserId: ctx.userId,
      request: req,
    })
    return NextResponse.json({ session })
  } catch (e) {
    if (e instanceof RbacError) return rbacResponse(e)
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid payload', details: e.errors }, { status: 400 })
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to end session' }, { status: 500 })
  }
}
