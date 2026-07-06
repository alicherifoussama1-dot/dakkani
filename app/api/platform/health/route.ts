// Platform health as JSON (for uptime monitors and the dashboard).
export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { requirePlatformPermission, rbacResponse, RbacError } from '@/lib/platform/rbac'
import { platformHealth } from '@/lib/platform/health'

export async function GET(req: Request) {
  try {
    // Uptime monitors can use the cron secret instead of a session.
    const isCronAuth = req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`
    if (!isCronAuth) await requirePlatformPermission('platform.health.read')
    const health = await platformHealth()
    return NextResponse.json(health, { status: health.overall === 'down' ? 503 : 200 })
  } catch (e) {
    if (e instanceof RbacError) return rbacResponse(e)
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 })
  }
}
