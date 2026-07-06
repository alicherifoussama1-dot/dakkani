// Feature Flags — enable/disable platform features without deploying.
export const dynamic = 'force-dynamic'
import { redirect } from 'next/navigation'
import { requirePlatformPermission } from '@/lib/platform/rbac'
import { createServiceClient } from '@/lib/platform/service-client'
import FlagsClient from './flags-client'

export default async function FlagsPage() {
  let canWrite = true
  try {
    await requirePlatformPermission('platform.flags.read')
  } catch {
    redirect('/dashboard')
  }
  try {
    await requirePlatformPermission('platform.flags.write')
  } catch {
    canWrite = false
  }

  const client = createServiceClient()
  const { data: flags } = await client
    .from('feature_flags')
    .select('key, enabled, description, config, updated_at')
    .order('key')

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Feature Flags</h1>
      <p className="text-sm text-slate-400 mb-6">
        Changes apply within 30 seconds (per-instance cache) — no deployment needed.
        Flags with <code className="text-slate-300">store_ids</code> in config target specific merchants.
      </p>
      <FlagsClient flags={flags ?? []} canWrite={canWrite} />
    </div>
  )
}
