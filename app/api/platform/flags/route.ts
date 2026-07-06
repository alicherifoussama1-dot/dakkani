// Feature flag management — platform staff only, fully audited.
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requirePlatformPermission, rbacResponse, RbacError } from '@/lib/platform/rbac'
import { createServiceClient } from '@/lib/platform/service-client'
import { invalidateFlagCache } from '@/lib/platform/flags'
import { audit } from '@/lib/platform/audit'

export async function GET() {
  try {
    await requirePlatformPermission('platform.flags.read')
    const client = createServiceClient()
    const { data, error } = await client.from('feature_flags').select('*').order('key')
    if (error) throw new Error(error.message)
    return NextResponse.json({ flags: data })
  } catch (e) {
    if (e instanceof RbacError) return rbacResponse(e)
    return NextResponse.json({ error: 'Failed to load flags' }, { status: 500 })
  }
}

const patchSchema = z.object({
  key: z.string().min(1).max(100),
  enabled: z.boolean().optional(),
  description: z.string().max(500).optional(),
  config: z.record(z.unknown()).optional(),
})

export async function PATCH(req: Request) {
  try {
    const ctx = await requirePlatformPermission('platform.flags.write')
    const body = patchSchema.parse(await req.json())

    const client = createServiceClient()
    const { data: before } = await client.from('feature_flags').select('*').eq('key', body.key).maybeSingle()

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: ctx.userId }
    if (body.enabled !== undefined) patch.enabled = body.enabled
    if (body.description !== undefined) patch.description = body.description
    if (body.config !== undefined) patch.config = body.config

    const { data: after, error } = await client.from('feature_flags')
      .upsert({ key: body.key, ...patch }, { onConflict: 'key' })
      .select().single()
    if (error) throw new Error(error.message)

    invalidateFlagCache()
    await audit({
      action: 'platform.flag_changed',
      userId: ctx.userId, userEmail: ctx.email, role: ctx.role,
      resource: `feature_flags/${body.key}`,
      before, after,
      severity: 'warning',
      request: req,
    })
    return NextResponse.json({ flag: after })
  } catch (e) {
    if (e instanceof RbacError) return rbacResponse(e)
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Invalid payload', details: e.errors }, { status: 400 })
    return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 })
  }
}
